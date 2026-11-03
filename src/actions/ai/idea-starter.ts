'use server';

import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { serializeDocument } from '@/lib/document-codec';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { ideaSkeleton, ideaTitle, type IdeaType } from '@/lib/ai/idea-starter';

const TYPES: readonly IdeaType[] = ['guide', 'list', 'meeting', 'project', 'travel', 'weekly'];

/** G70：Idea Starter 的创建步——类型决定骨架，自由描述作标题与引导段。 */
export async function createIdeaDocument(input: {
  type: IdeaType | null;
  description: string;
}): Promise<{ id: string; title: string }> {
  const userId = await requireUserId();
  if (input.type !== null && !TYPES.includes(input.type)) throw new Error('未知的建议类型');

  const description = input.description.slice(0, 500);
  const content = ideaSkeleton(input.type, description);
  const title = ideaTitle(input.type, description);
  const db = await getDb();
  const document = await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    title,
    userId,
    content,
    plainText: serializeDocument(content, 'text'),
    metaUpdatedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, userId, ['document'], (document as { id: string }).id);
  return { id: (document as { id: string }).id, title: (document as { title: string }).title };
}
