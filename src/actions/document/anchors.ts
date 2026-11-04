'use server';

import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { collectAnchorCandidates } from '@/lib/search/anchors';
import { untitledFor } from '@/lib/document/untitled-copy';

export interface BlockAnchorHit {
  documentId: string;
  documentTitle: string;
  blockIndex: number;
  blockId: string | null;
  text: string;
}

/**
 * Block-level link targets. An id is only present once a jump has stamped one
 * into the block, so a fresh hit is addressed by position.
 */
/**
 * @param options.all 空查询时也列块。集合 `linkToBlock` 的弹层要这个（官方选择器的数据源是
 *   全量块）；正文里带搜索的区块链接菜单不要（空查询应当什么都不列）。
 */
export async function searchBlockAnchors(
  query: string,
  options: { all?: boolean } = {},
): Promise<BlockAnchorHit[]> {
  const userId = await requireUserId();
  const term = query.trim().toLowerCase();
  if (!term && !options.all) return [];

  const db = await getDb();
  const docs = (await db.orm.public.Document
    .where({ userId, isDeleted: false })
    .orderBy((d: any) => d.updatedAt.desc())
    .limit(30)
    .all()) as any[];

  const hits: BlockAnchorHit[] = [];
  for (const doc of docs) {
    for (const candidate of collectAnchorCandidates(doc.content)) {
      if (term && !candidate.text.toLowerCase().includes(term)) continue;
      hits.push({
        documentId: doc.id,
        documentTitle: doc.title || untitledFor('list'),
        blockIndex: candidate.index,
        blockId: candidate.blockId,
        text: candidate.text,
      });
      if (hits.length >= 8) return hits;
    }
  }
  return hits;
}
