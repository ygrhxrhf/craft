/**
 * The interpolation conventions the product's strings use (G229 / G321). The ledger first recorded
 * three, then four, and G321 settles on **six**; mixing them shows a parameter name — or a literal
 * word — to the user, so each is told apart.
 *
 * 1. `[0]` — positional, user-visible interpolation. The current form.
 * 2. `{{plan}}` — mustache-style named interpolation, the legacy form.
 * 3. `{0}` — a prompt-template slot, AI-only. Never shown to a user as text.
 * 4. `<tag>…</tag>` — a wrapping tag, rendered by the component that owns the string.
 * 5. `<0></0>` — numeric-index children in the React `Trans` style.
 * 6. literal text — e.g. `[team]` inside `<b>[team]</b>` is a hard-coded word, not a parameter.
 *    `[N]` is positional only when `N` is a number, which is what separates 1 from 6.
 *
 * `{{deletedCount}}` (G229) is the i18next-named instance of form 2.
 */

export type InterpolationKind =
  | 'positional'
  | 'namedLegacy'
  | 'promptSlot'
  | 'wrappingTag'
  | 'indexedChildren';

/** Which conventions a string uses, in the order they appear. */
export function interpolationKinds(text: string): InterpolationKind[] {
  const found: { at: number; kind: InterpolationKind }[] = [];

  // 5. `<0></0>` — a numeric tag name is a child index, not a tag name.
  for (const match of text.matchAll(/<(\d+)>\s*<\/\1>/g)) {
    found.push({ at: match.index ?? 0, kind: 'indexedChildren' });
  }
  // 4. `<tag>…</tag>` — a named wrapping tag. Skipped for numeric tags, which are form 5.
  for (const match of text.matchAll(/<([a-zA-Z][\w-]*)>[^<]*<\/\1>/g)) {
    found.push({ at: match.index ?? 0, kind: 'wrappingTag' });
  }
  // 2. `{{name}}` — mustache. `[N]` is form 1 only when N is numeric, which is the split from 6.
  for (const match of text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g)) {
    found.push({ at: match.index ?? 0, kind: 'namedLegacy' });
  }
  // 1. `[0]` — positional, numeric only.
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    found.push({ at: match.index ?? 0, kind: 'positional' });
  }
  // 3. `{0}` — AI prompt slot.
  for (const match of text.matchAll(/\{(\d+)\}/g)) {
    found.push({ at: match.index ?? 0, kind: 'promptSlot' });
  }

  return found.sort((a, b) => a.at - b.at).map((entry) => entry.kind);
}

/** Fill a positional string's `[N]` slots, left to right. */
export function fillPositional(template: string, values: readonly string[]): string {
  return template.replace(/\[(\d+)\]/g, (_match, index: string) => values[Number(index)] ?? '');
}

/**
 * G321 form 2: `{{plan}}` is the legacy named form. Unfilled names are left as written —
 * unlike a positional slot, a name still says which value the string wanted.
 */
export function fillNamed(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * The two forms a plain string can carry: positional `[N]` and named `{{name}}`. The other four
 * are not text substitutions — `{0}` is an AI prompt slot, `<tag>…</tag>` and `<0></0>` are
 * rendered by the component that owns the string, and a literal word carries no slot at all.
 */
export function interpolate(
  template: string,
  values: { positional?: readonly string[]; named?: Record<string, string | number> },
): string {
  let out = values.positional ? fillPositional(template, values.positional) : template;
  if (values.named) out = fillNamed(out, values.named);
  return out;
}

/**
 * Whether a string mixes syntaxes. Mixing is the failure the ledger warns about: a named slot left
 * unfilled prints its parameter name to the user.
 */
export function mixesSyntaxes(text: string): boolean {
  const kinds = new Set(interpolationKinds(text));
  return kinds.size > 1;
}
