/**
 * The two code-block default preferences (G1166). Official Craft keeps them in a client-side store
 * (`Lo`) rather than a server column, and their validators differ in strictness:
 *
 * - `codeEditorDefaultTheme` defaults to `auto` and only checks that the value *is a string* — an
 *   unknown name is allowed in and folded to `auto` later by the resolver.
 * - `codeEditorDefaultLanguage` defaults to `javascript` and explicitly excludes the three
 *   pseudo-languages `mermaid` / `math_formula` / `stex`, so the default can never be one of them.
 */
import { isCodeThemeId, DEFAULT_CODE_THEME } from './code-themes';
import { languageFor } from './code-languages';

export const DEFAULT_THEME_PREFERENCE_KEY = 'codeEditorDefaultTheme';
export const DEFAULT_LANGUAGE_PREFERENCE_KEY = 'codeEditorDefaultLanguage';

export const DEFAULT_CODE_LANGUAGE = 'javascript';

/** The three languages a default may not be: they are rendered by their own surfaces. */
export const PSEUDO_LANGUAGES = ['mermaid', 'math_formula', 'stex'] as const;

/** The theme validator: any string passes, exactly as the official one does. */
export function isValidDefaultTheme(value: unknown): value is string {
  return typeof value === 'string';
}

/** The language validator: a string that is not one of the three pseudo-languages. */
export function isValidDefaultLanguage(value: unknown): value is string {
  return (
    typeof value === 'string' && !(PSEUDO_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Read a stored theme, folding anything unrecognised onto `auto` — the resolver's job in the
 * official build, kept here so a caller never has to know the validator was lenient.
 */
export function resolveDefaultTheme(value: unknown): string {
  return isCodeThemeId(value) ? value : DEFAULT_CODE_THEME;
}

/** Read a stored language, folding anything unusable onto the `javascript` default. */
export function resolveDefaultLanguage(value: unknown): string {
  return isValidDefaultLanguage(value) && languageFor(value) ? value : DEFAULT_CODE_LANGUAGE;
}
