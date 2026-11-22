'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { STARTER_TEMPLATES, starterContent } from '@/lib/template/starters';

export interface StarterTemplateRow {
  id: string;
  title: string;
  icon: string | null;
  category: string;
}

/**
 * G1672 —— 「模板图库」的内容源。
 *
 * 官方图库是外部内容服务（数百个模板）；本地不接那条源，改成把 `STARTER_TEMPLATES` 里这套起始
 * 模板**种进本账号**：第一次打开图库时建出缺失的那几张（按标题＋`isTemplate` 幂等），之后它们
 * 就是普通的模板文档——能改、能删、能改名，和官方图库"打开即落一篇模板"的手感一致。
 */
export async function ensureStarterTemplates(): Promise<StarterTemplateRow[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = await getDb();
  const existing = (await db.orm.public.Document
    .where({ userId: session.user.id, isTemplate: true, isDeleted: false })
    .all()) as { id: string; title: string; icon: string | null }[];

  const byTitle = new Map(existing.map((doc) => [doc.title, doc]));
  const rows: StarterTemplateRow[] = [];
  const now = new Date().toISOString();

  for (const starter of STARTER_TEMPLATES) {
    const found = byTitle.get(starter.title);
    if (found) {
      rows.push({ id: found.id, title: found.title, icon: found.icon, category: starter.category });
      continue;
    }
    const id = crypto.randomUUID();
    const content = starterContent(starter.lines);
    await db.orm.public.Document.create({
      id,
      title: starter.title,
      userId: session.user.id,
      parentId: null,
      folderId: null,
      icon: starter.icon,
      coverImage: null,
      coverType: null,
      content,
      plainText: starter.lines.join('\n'),
      width: null,
      pageStyle: null,
      isTemplate: true,
      isDailyNote: false,
      dailyNoteDate: null,
      metaUpdatedAt: now,
    });
    await emitSyncEventSafe(db, session.user.id, ['document'], id);
    rows.push({ id, title: starter.title, icon: starter.icon, category: starter.category });
  }

  return rows;
}
