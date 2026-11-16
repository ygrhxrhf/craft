/**
 * 一条评论上的表情（G74）。G1640 起它是**每人一行**（`comment_reaction` 表），不再是一枚
 * 挂在该评论上的 JSON 数组：`id` 是那一行的主键，取消表情就是对这一行写墓碑。
 * 同一个人的同一枚表情永远只有一行（唯一键 `(commentId,userId,glyph)`）。
 */
export interface Reaction {
  /** `comment_reaction` 行的主键——取消表情时按它定位。 */
  id: string;
  glyph: string;
  userId: string;
  name: string;
}

/** 服务端读面／本地镜像里的形状（坏行一律丢掉，不让画面出半截条目）。 */
export function readReactions(value: unknown): Reaction[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Reaction =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as Reaction).id === 'string' &&
      typeof (item as Reaction).glyph === 'string' &&
      typeof (item as Reaction).userId === 'string' &&
      typeof (item as Reaction).name === 'string',
  );
}

/** 这个人对这一枚表情的**行 id**（没有就是 null）。点一下＝有则墓碑、无则新建一行。 */
export function reactionRowId(
  reactions: readonly Reaction[],
  userId: string,
  glyph: string,
): string | null {
  return reactions.find((row) => row.userId === userId && row.glyph === glyph)?.id ?? null;
}
