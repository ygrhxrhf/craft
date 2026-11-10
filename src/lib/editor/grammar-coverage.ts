/**
 * Grammar coverage (G1179). Official Craft loads a language extension only when the roster's
 * `langCode` is a key in its grammar table — the gate does no alias normalisation, so a name that
 * is not there simply does not load. Locally the highlighter is lowlight (highlight.js grammars).
 *
 * This module records the local fact: for each roster entry, whether the highlighter accepts its
 * `langCode`. The check goes through `registered()` rather than the raw grammar map, because
 * highlight.js's built-in aliases (`html` for `xml`, `tsx` for `typescript`) never appear in
 * `Object.keys`.
 */
import { codeLowlight, LOCAL_GRAMMAR_ALIASES, LOCAL_GRAMMARS } from './code-grammars';
import { CODE_LANGUAGES } from './code-languages';

export { codeLowlight, LOCAL_GRAMMARS, LOCAL_GRAMMAR_ALIASES };

/** The grammar a `langCode` resolves to, or null when this build cannot highlight it. */
export function localGrammarFor(langCode: string | null): string | null {
  if (langCode === null) return null; // plaintext: highlighting off by design
  if (!codeLowlight.registered(langCode)) return null;
  return LOCAL_GRAMMAR_ALIASES[langCode] ?? langCode;
}

/** Whether a roster entry highlights in this build. */
export function highlightsLocally(langCode: string | null): boolean {
  return localGrammarFor(langCode) !== null;
}

/**
 * The roster entries this build cannot highlight. Not a defect list — it is the local coverage
 * gap, kept explicit so "selected but plain" is a known state rather than a silent one.
 */
export function unhighlightedLanguages(): string[] {
  return CODE_LANGUAGES.filter((entry) => !highlightsLocally(entry.langCode)).map(
    (entry) => entry.storedLangCode,
  );
}
