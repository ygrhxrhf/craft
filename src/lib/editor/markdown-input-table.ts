/**
 * The official markdown input table `uF` (keyboard.md §20.14.6). Every entry triggers on a space,
 * and the pattern allows leading whitespace. Four facts are easy to get wrong:
 *
 * - `####` maps to `Strong`, not to a fourth heading level — the style vocabulary is
 *   Title / Subtitle / Heading / Strong, not H1–H4.
 * - `+` opens a toggle list.
 * - A numbered entry carries its number as the starting ordinal, so `7. ` starts at 7.
 * - The trigger for a numbered item is the digits and the dot, and the number is parsed.
 */
export type MarkdownShortcutKind =
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'strong'
  | 'todo'
  | 'todoChecked'
  | 'bullet'
  | 'toggle'
  | 'focusBlock'
  | 'numbered';

export interface MarkdownShortcut {
  /** The literal the user types, before the space. */
  trigger: string;
  kind: MarkdownShortcutKind;
  /** Whether the number in the trigger becomes the starting ordinal. */
  startsAtNumber?: boolean;
}

export const MARKDOWN_SHORTCUTS: readonly MarkdownShortcut[] = [
  { trigger: '#', kind: 'title' },
  { trigger: '##', kind: 'subtitle' },
  { trigger: '###', kind: 'heading' },
  // Not a fourth heading level — the official table maps four hashes to Strong.
  { trigger: '####', kind: 'strong' },
  { trigger: '[ ]', kind: 'todo' },
  { trigger: '-[]', kind: 'todo' },
  { trigger: '[x]', kind: 'todoChecked' },
  { trigger: '-', kind: 'bullet' },
  { trigger: '*', kind: 'bullet' },
  { trigger: '•', kind: 'bullet' },
  { trigger: '+', kind: 'toggle' },
  { trigger: '>', kind: 'focusBlock' },
  { trigger: '|', kind: 'focusBlock' },
  { trigger: '1.', kind: 'numbered', startsAtNumber: true },
] as const;

/** The trigger characters a numbered entry can start with; the number is parsed out. */
export const NUMBERED_PATTERN = /^\s*(\d+)\.$/;

/**
 * The kind a typed line selects, or null when nothing matches. A numbered line matches by pattern
 * rather than by literal, and its number is the starting ordinal.
 */
export function shortcutFor(line: string): MarkdownShortcut | null {
  const trimmed = line.replace(/^\s*/, '');
  if (NUMBERED_PATTERN.test(trimmed)) return { trigger: trimmed, kind: 'numbered', startsAtNumber: true };
  return MARKDOWN_SHORTCUTS.find((entry) => entry.trigger === trimmed) ?? null;
}

/** The starting ordinal a numbered trigger carries, or null for anything else. */
export function startingNumber(line: string): number | null {
  const match = NUMBERED_PATTERN.exec(line.replace(/^\s*/, ''));
  return match ? parseInt(match[1], 10) : null;
}
