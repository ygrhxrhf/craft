/**
 * The Mermaid surface's decision layer (G1177). Mermaid is not a block type: it is a code-block
 * language whose preview is rendered by its own path, and the theme reaches it as two props
 * (`themeId` and `isDark`) rather than only as colours.
 *
 * Three behaviours are pure and worth pinning:
 * - Empty content renders nothing at all — not an error, not an empty frame.
 * - A parse failure falls back to the source as escaped plain text, prefixed with a fixed sentence.
 * - The language menu deliberately excludes `mermaid`, because it has its own preview surface.
 */
import { languageFor } from './code-languages';

/** The sentence the failure fallback prefixes, verbatim. */
export const MERMAID_INVALID = 'Invalid Mermaid syntax: ';

/** The wrapper the failure fallback uses. */
export const MERMAID_FALLBACK_PRE = '<pre white-space: pre-wrap;">';

/** The HTML escape table, verbatim four characters. */
export function escapeMermaidSource(source: string): string {
  return source.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export type MermaidRender =
  | { kind: 'none' }
  | { kind: 'diagram'; source: string }
  | { kind: 'error'; html: string };

/**
 * What the surface should show for a piece of source. Empty content is `none`; anything else is a
 * `diagram` for the renderer to try, and the caller reports a throw back as `error`.
 */
export function planMermaidRender(source: string): MermaidRender {
  if (source.trim() === '') return { kind: 'none' };
  return { kind: 'diagram', source };
}

/** The HTML the failure fallback produces for a source that would not parse. */
export function mermaidErrorHtml(source: string): string {
  return `${MERMAID_FALLBACK_PRE}${MERMAID_INVALID}${escapeMermaidSource(source)}</pre>`;
}

/**
 * Whether a roster entry appears in the language menu. `mermaid` is excluded because it has its
 * own preview surface.
 */
export function appearsInLanguageMenu(storedLangCode: string): boolean {
  return languageFor(storedLangCode)?.langCode !== 'mermaid';
}
