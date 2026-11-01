'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { DOC_META_COLS } from '@/lib/sync/tables';
import { checkPayloadPlacement } from '@/lib/document-codec/block-payload';
import { emitSyncEvent } from '@/lib/sync/emit-event';
import { changedFields, shouldSnapshot, versionMeta } from '@/lib/versioning/snapshot';

type Row = Record<string, unknown>;

export async function updateDocument(id: string, data: {
  title?: string;
  content?: unknown;
  plainText?: string;
  icon?: string | null;
  coverImage?: string | null;
  coverType?: string | null;
  wordCount?: number;
  charCount?: number;
  version?: number;
  font?: string | null;
  width?: string | null;
  pageStyle?: unknown;
}) {
  const userId = await requireUserId();
  await requireDocumentAccess(id, userId, 'editor');

  const db = await getDb();

  // 快照要判「哪几列动了」，所以更新前先留一份。
  const before = await db.orm.public.Document.first({ id });

  // Spec 4.2/5.6: only metadata field changes bump metaUpdatedAt (the document
  // incremental-sync timestamp) and broadcast; content-only saves must not.
  const incoming = Object.keys(data);
  const touchesMeta = incoming.some(k => (DOC_META_COLS as readonly string[]).includes(k));
  const payload: Record<string, unknown> = { ...data };
  let metaTs = '';
  if (touchesMeta) {
    metaTs = new Date().toISOString();
    payload.metaUpdatedAt = metaTs;
  }
  const doc = await db.orm.public.Document.where({ id }).update(payload);

  // 自动版本快照：改标题或样式当场存一版；只改正文本则每十分钟最多一版
  // （正文每次按键都在变，逐次存会把历史淹掉）。
  try {
    const current = await db.orm.public.Document.first({ id });
    if (before && current) {
      const after = current as Row;
      const moved = changedFields(before as Row, after);
      if (moved.length > 0) {
        const latest = await db.orm.public.DocumentVersion
          .where({ documentId: id })
          .orderBy((v: any) => v.version.desc())
          .limit(1)
          .all();
        const last = latest[0] as Row | undefined;
        if (shouldSnapshot(moved, (last?.createdAt as string | undefined) ?? null)) {
          const nextVersion = last ? Number(last.version) + 1 : 1;
          const snapshotContent = after.content ?? { type: 'doc', content: [] };
          await db.orm.public.DocumentVersion.create({
            id: crypto.randomUUID(),
            documentId: id,
            version: nextVersion,
            title: after.title as string,
            // 没有正文的文档也要有版本——就是它的空正文那一版。
            content: snapshotContent,
            plainText: (after.plainText as string) ?? '',
            wordCount: (after.wordCount as number) ?? 0,
            meta: versionMeta(after),
          });
          // G400: a block whose structured payload landed in the wrong container is reported rather
          // than silently snapshotted — the official build logs the same condition.
          const misplaced = misplacedPayloads(snapshotContent);
          if (misplaced.length) {
            console.warn('[document-codec] unexpected payload placement', misplaced.join(', '));
          }
          // G18：版本号必须跟着快照单调递增，否则列表能读到版本、文档自身却永远停在 1。
          await db.orm.public.Document.where({ id }).update({ version: nextVersion });
        }
      }
    }
  } catch {
    // version snapshot must never block saving
  }

  // Metadata change → broadcast; failure never blocks saving (same posture as
  // the version snapshot above).
  if (touchesMeta) {
    try {
      await emitSyncEvent(db, userId, ['document'], { ts: metaTs, id });
    } catch {
      // broadcast failure must never block saving
    }
  }

  return doc;
}

/**
 * G400: walk a document's JSON and report blocks whose structured payload sits in a container their
 * type does not allow (the official build logs `Unexpected <container> data for block type …`).
 * Local blocks keep their payload inline, so the check reads the projected containers if present.
 */
function misplacedPayloads(content: unknown): string[] {
  const problems: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.type === 'string' && node.type !== 'doc' && node.type !== 'text') {
      const check = checkPayloadPlacement(node.type, {
        pluginData: node.pluginData,
        objectData: node.objectData,
        blob: node.blob,
      });
      if (!check.ok) problems.push(check.error);
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(content);
  return problems;
}
