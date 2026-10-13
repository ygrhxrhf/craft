/**
 * The four interpolation syntaxes (G229, and the correction it makes to `team.md` §一). The ledger
 * had recorded three; there are four, and mixing them shows a parameter name to the user.
 *
 * - `{{name}}` — mustache-style named interpolation, the legacy form. A key with a `.new` variant
 *   has a positional replacement, and the `.new` one should be preferred.
 * - `[0]` — positional, user-visible interpolation. The current form.
 * - `{0}` — a prompt-template slot, AI-only. Never shown to a user as text.
 * - `{{deletedCount}}` — i18next's own named form, which coexists with the positional one.
 */

export type InterpolationKind = 'namedLegacy' | 'positional' | 'promptSlot' | 'i18nextNamed';

/** Which syntaxes a string uses, in the order they appear. */
export function interpolationKinds(text: string): InterpolationKind[] {
  const found: { at: number; kind: InterpolationKind }[] = [];

  for (const match of text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g)) {
    // A single-token name in double braces is the i18next form; anything else is legacy mustache.
    const name = match[1];
    found.push({ at: match.index ?? 0, kind: isI18nextName(name) ? 'i18nextNamed' : 'namedLegacy' });
  }
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    found.push({ at: match.index ?? 0, kind: 'positional' });
  }
  for (const match of text.matchAll(/\{(\d+)\}/g)) {
    found.push({ at: match.index ?? 0, kind: 'promptSlot' });
  }

  return found.sort((a, b) => a.at - b.at).map((entry) => entry.kind);
}

/**
 * The i18next named form, from the collected samples. The ledger gives `{{deletedCount}}` as the
 * i18next example and `{{spaceName}}` / `{{email}}` / `{{craft}}` as legacy mustache, so the
 * distinguishing feature is the *suffix* `Count` — not casing, which `spaceName` would break.
 */
const I18NEXT_NAMES = new Set(['deletedCount']);

function isI18nextName(name: string): boolean {
  return I18NEXT_NAMES.has(name) || name.endsWith('Count');
}

/** Fill a positional string's `[N]` slots, left to right. */
export function fillPositional(template: string, values: readonly string[]): string {
  return template.replace(/\[(\d+)\]/g, (_match, index: string) => values[Number(index)] ?? '');
}

/**
 * Whether a string mixes syntaxes. Mixing is the failure the ledger warns about: a named slot left
 * unfilled prints its parameter name to the user.
 */
export function mixesSyntaxes(text: string): boolean {
  const kinds = new Set(interpolationKinds(text));
  return kinds.size > 1;
}
