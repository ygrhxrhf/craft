/**
 * Grammar coverage (G1179). Official Craft loads a language extension only when the roster's
 * `langCode` is a key in its grammar table — the gate does no alias normalisation, so a name that
 * is not there simply does not load. Locally the highlighter is lowlight (highlight.js grammars),
 * whose key set is different from the official table's, so the two "selectable but not highlighted"
 * sets do not coincide.
 *
 * This module records the local fact: for each roster entry, whether lowlight has a grammar for its
 * `langCode`. `plaintext` needs no grammar (highlighting off), and a few entries map onto a
 * differently-named local grammar.
 */
import { common } from 'lowlight';

import { CODE_LANGUAGES } from './code-languages';

/** The grammar names lowlight registers. */
export const LOCAL_GRAMMARS: readonly string[] = Object.keys(common);

const GRAMMAR_SET = new Set(LOCAL_GRAMMARS);

/**
 * Entries whose `langCode` is not a lowlight key, but which map onto one under a different name.
 * These highlight locally; the official gate has no equivalent step, which is why the two sets
 * differ.
 */
export const LOCAL_GRAMMAR_ALIASES: Record<string, string> = {
  objectiveC: 'objectivec',
};

/** The lowlight grammar a `langCode` uses, or null when this build cannot highlight it. */
export function localGrammarFor(langCode: string | null): string | null {
  if (langCode === null) return null; // plaintext: highlighting off by design
  if (GRAMMAR_SET.has(langCode)) return langCode;
  return LOCAL_GRAMMAR_ALIASES[langCode] ?? null;
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
