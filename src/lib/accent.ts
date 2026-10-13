/**
 * The accent axis (G167 "强调色是可选项" ／ G1015 "强调色主题恰好 6 档" ／ G1089-G1090 的 19 条别名).
 *
 * Picking a colour points the whole document at a channel instead of writing a colour into a
 * consumer: `data-accent` makes the `[data-accent=…]` block re-aim the 19 `--accent-<步>`
 * aliases, and the two local vars read those aliases — the two-hop structure the ledger
 * prescribes, so no consumer ever holds a colour literal.
 */
export const ACCENTS = ['blue', 'pink', 'green', 'purple', 'yellow', 'gray'] as const;

export type Accent = (typeof ACCENTS)[number];

/** Local stand-in for `appearance.accent.color`: the build's preferences table has no column. */
const STORAGE_KEY = 'craft.accent';

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value);
}

/** Reads the channel the document should be on, defaulting to blue. */
export function readAccent(): Accent | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return isAccent(stored) ? stored : null;
}

export function applyAccent(key: Accent): void {
  const root = document.documentElement;
  root.dataset.accent = key;
  // The local vars read the *channel* steps, so `data-accent` alone re-aims them — the second
  // hop of the two-hop structure. (`--accent` itself is not forwarded: locally that name is
  // shadcn's neutral accent, which is the collision G1090 warns about.)
  root.style.setProperty('--craft-accent', 'var(--accent-500)');
  root.style.setProperty('--craft-accent-hover', 'var(--accent-600)');
}

/** Applies and remembers. Blue is left alone rather than re-applied: the default already reads
 *  through the channel, and skipping it keeps a fresh session identical to what the visual
 *  baselines were recorded against. */
export function pickAccent(key: Accent): void {
  applyAccent(key);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, key);
}
