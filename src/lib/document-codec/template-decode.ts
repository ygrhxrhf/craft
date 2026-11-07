/**
 * The block-template decoder (G1172). Official Craft's `formatBlock` expands a stored template
 * through three tokens, and the order matters:
 *
 *   1. `\dl` → a blank line (two newlines)
 *   2. `\sl` → the soft-line break, which depends on the context: a space when rendering inline
 *      (that is where the "code collapses to one line" behaviour comes from), `<br>` otherwise
 *   3. `\i__craft` → one level of the flavour's indentation
 *
 * Before any of that, the template's own newlines and indentation are stripped — the stored
 * template is written flush-left and its line breaks are decoration, not output.
 */
import { DEFAULT_FLAVOUR, type MarkdownFlavour } from './flavour';

export const TOKEN_DOUBLE_LINE = '\\dl';
export const TOKEN_SOFT_LINE = '\\sl';
export const TOKEN_INDENT = '\\i__craft';

/** Drop the template's own line structure: every line is joined with no separator, trimmed. */
export function stripTemplateLayout(template: string): string {
  return template
    .split('\n')
    .filter((line) => line.trim().length !== 0)
    .join('');
}

/**
 * Expand the three tokens. `inline` selects the soft-line break: a space inline, `<br>` in a block
 * context.
 */
export function decodeTemplate(
  template: string,
  inline: boolean,
  flavour: MarkdownFlavour = DEFAULT_FLAVOUR,
): string {
  // G1172: inline, the soft break is a space only when the template itself carries a backtick;
  // without one the official decoder still emits `<br>`.
  const softLine = inline && template.includes('`') ? ' ' : '<br>';
  return stripTemplateLayout(template)
    .replace(/\\dl/g, '\n\n')
    .replace(/\\sl/g, softLine)
    .replace(/\\i__craft/g, flavour.indentationCharacters);
}
