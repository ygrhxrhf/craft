/**
 * How a reaction reads (G74). The catalog gives three shapes and the same Chinese for the last two,
 * so the many case follows the English, which names the first person, the count of the rest, and the
 * glyph: "[0], and [1] reacted with [2]".
 */
export interface ReactionGroup {
  glyph: string;
  names: string[];
}

export function reactionSentence(group: ReactionGroup): string {
  const [first, second, ...rest] = group.names;
  if (!first) return '';
  if (!second) return `${first} 添加了 ${group.glyph} 表情`;
  if (rest.length === 0) return `${first} 和 ${second} 添加了 ${group.glyph} 表情`;
  return `${first} 及其他 ${rest.length + 1} 人添加了 ${group.glyph} 表情`;
}

/** One sentence per glyph, in the order the glyphs first appear. */
export function groupReactions(reactions: readonly { glyph: string; name: string }[]): ReactionGroup[] {
  const groups: ReactionGroup[] = [];
  for (const reaction of reactions) {
    const found = groups.find((group) => group.glyph === reaction.glyph);
    if (found) found.names.push(reaction.name);
    else groups.push({ glyph: reaction.glyph, names: [reaction.name] });
  }
  return groups;
}
