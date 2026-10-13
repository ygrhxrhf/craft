/**
 * A reaction stored on a comment (G74). The column holds the whole list, so toggling recomputes it:
 * the same person and glyph twice removes it, and a different glyph adds alongside.
 */
export interface Reaction {
  glyph: string;
  userId: string;
  name: string;
}

export function readReactions(value: unknown): Reaction[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Reaction =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as Reaction).glyph === 'string' &&
      typeof (item as Reaction).userId === 'string' &&
      typeof (item as Reaction).name === 'string',
  );
}

export function toggleReaction(reactions: readonly Reaction[], next: Reaction): Reaction[] {
  const exists = reactions.some(
    (reaction) => reaction.userId === next.userId && reaction.glyph === next.glyph,
  );
  if (exists) {
    return reactions.filter(
      (reaction) => !(reaction.userId === next.userId && reaction.glyph === next.glyph),
    );
  }
  return [...reactions, next];
}
