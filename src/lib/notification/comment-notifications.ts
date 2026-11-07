/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Comment/mention delivery (G03). The notification switch is the only gate:
// a recipient with `notifyComments === false` gets no row at all. Comments and
// replies are one event stream, so a mention is just a comment whose body
// names the recipient.

import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export type CommentNotificationKind = 'thread' | 'reply';

export interface CommentNotificationInput {
  documentId: string;
  authorId: string;
  body: string;
  kind: CommentNotificationKind;
}

/** The handles an `@` in a comment may use. */
export function mentionHandles(user: { name?: unknown; email?: unknown }): string[] {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  const local = email.includes('@') ? email.slice(0, email.indexOf('@')) : '';
  return [name, local].filter((value) => value.length > 0);
}

export function mentionsUser(body: string, user: { name?: unknown; email?: unknown }): boolean {
  const lower = body.toLowerCase();
  return mentionHandles(user).some((handle) => lower.includes(`@${handle.toLowerCase()}`));
}

/**
 * The author and the document name are the two runs the official build styles, so they are
 * interpolated inside the collected tag vocabulary (`<username>` / `<highlight>`, G76) and the
 * bell renders them through `RichText`. Angle brackets are removed from the values first: the
 * parser reads `<` as a tag opener, so a document titled `<b>x` would otherwise lose its text.
 */
function noAngleBrackets(value: string): string {
  return value.replace(/<[^<>]*>/g, '').replace(/[<>]/g, '');
}

/** The author run — `<username>` is the collected tag for a person's name (G76). */
export function usernameRun(name: string): string {
  return `<username>${noAngleBrackets(name)}</username>`;
}

/** The document run — `<highlight>` is the collected tag for the emphasised subject (G76). */
export function documentRun(title: string): string {
  return `<highlight>「${noAngleBrackets(title)}」</highlight>`;
}

/**
 * Notification copy is local composition: the official push/notification
 * strings for comments were not collected. The visible fact (who, which
 * document, mention vs reply) is carried by the title.
 *
 * The title is stored **with** its style tags (G76): every reader goes through
 * `RichText`/`stripEmbeddedTags`, so the tags are the styling channel, not markup
 * that leaks into the UI.
 */
export function commentNotificationTitle(input: {
  authorName: string;
  documentTitle: string;
  kind: CommentNotificationKind;
  mentioned: boolean;
}): string {
  const documentTitle = input.documentTitle || '无标题';
  const author = usernameRun(input.authorName);
  const document = documentRun(documentTitle);
  if (input.mentioned) return `${author} 在${document}中提到了你`;
  if (input.kind === 'reply') return `${author} 回复了${document}中的评论`;
  return `${author} 评论了${document}`;
}

/**
 * Deliver one notification to every document reader except the author.
 * Failures are per-recipient: one bad row must not suppress the rest.
 */
export async function notifyCommentRecipients(
  db: any,
  input: CommentNotificationInput,
): Promise<number> {
  const document = await db.orm.public.Document.first({ id: input.documentId });
  if (!document || document.isDeleted === true) return 0;

  const members: Record<string, unknown>[] = await db.orm.public.DocumentMember
    .where({ documentId: input.documentId })
    .all();

  const recipientIds = new Set<string>();
  recipientIds.add(String(document.userId));
  for (const member of members) recipientIds.add(String(member.userId));
  recipientIds.delete(input.authorId);

  const author = await db.orm.public.User.first({ id: input.authorId });
  const authorName = typeof author?.name === 'string' && author.name.trim()
    ? author.name.trim()
    : '有人';

  let created = 0;
  for (const userId of recipientIds) {
    try {
      const user = await db.orm.public.User.first({ id: userId });
      if (!user || user.notifyComments !== true) continue;

      const id = crypto.randomUUID();
      const mentioned = mentionsUser(input.body, user);
      await db.orm.public.Notification.create({
        id,
        userId,
        // G95: @-mention and plain comment are two different notification kinds.
        kind: mentioned ? 'comment_mention' : 'comment',
        documentId: input.documentId,
        title: commentNotificationTitle({
          authorName,
          documentTitle: String(document.title ?? ''),
          kind: input.kind,
          mentioned,
        }),
        remindAt: new Date().toISOString(),
      });
      await emitSyncEventSafe(db, userId, ['notification'], id);
      created += 1;
    } catch (error) {
      console.error('[comment] notification delivery failed', error);
    }
  }
  return created;
}

/**
 * G95: resolving a thread is its own notification kind (`comment_resolved`), not a comment event.
 */
export async function notifyThreadResolved(
  db: any,
  input: { documentId: string; resolverId: string },
): Promise<number> {
  const document = await db.orm.public.Document.first({ id: input.documentId });
  if (!document || document.isDeleted === true) return 0;

  const members: Record<string, unknown>[] = await db.orm.public.DocumentMember
    .where({ documentId: input.documentId })
    .all();

  const recipientIds = new Set<string>();
  recipientIds.add(String(document.userId));
  for (const member of members) recipientIds.add(String(member.userId));
  recipientIds.delete(input.resolverId);

  const resolver = await db.orm.public.User.first({ id: input.resolverId });
  const resolverName = typeof resolver?.name === 'string' && resolver.name.trim()
    ? resolver.name.trim()
    : '有人';

  let created = 0;
  for (const userId of recipientIds) {
    try {
      const user = await db.orm.public.User.first({ id: userId });
      if (!user || user.notifyComments !== true) continue;
      const id = crypto.randomUUID();
      await db.orm.public.Notification.create({
        id,
        userId,
        kind: 'comment_resolved',
        documentId: input.documentId,
        title: `${usernameRun(resolverName)} 解决了${documentRun(String(document.title ?? '无标题'))}中的评论`,
        remindAt: new Date().toISOString(),
      });
      await emitSyncEventSafe(db, userId, ['notification'], id);
      created += 1;
    } catch (error) {
      console.error('[comment] resolve notification failed', error);
    }
  }
  return created;
}
