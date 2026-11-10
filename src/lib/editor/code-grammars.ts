/**
 * The grammars this build can highlight (G1179). `lowlight`'s `common` set covers 37 names, which
 * misses ten roster entries — so a language a user can pick would render flat. Official Craft has
 * the same failure mode (seven of its 38 `langCode`s are absent from its 119-key table, five of
 * them real languages), but that is a defect to mirror, not to keep: register the highlight.js
 * grammars that exist so every selectable language has one.
 *
 * `mermaid` and `other` stay unregistered on purpose: the first is drawn by its own surface, the
 * second is the roster's "unknown language" catch-all with no grammar to load.
 */
import { common, createLowlight } from 'lowlight';
import ada from 'highlight.js/lib/languages/ada';
import dart from 'highlight.js/lib/languages/dart';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import groovy from 'highlight.js/lib/languages/groovy';
import haskell from 'highlight.js/lib/languages/haskell';
import julia from 'highlight.js/lib/languages/julia';
import latex from 'highlight.js/lib/languages/latex';
import matlab from 'highlight.js/lib/languages/matlab';
import prolog from 'highlight.js/lib/languages/prolog';
import scala from 'highlight.js/lib/languages/scala';

export const CODE_GRAMMARS = {
  ...common,
  ada,
  dart,
  dockerfile,
  groovy,
  haskell,
  julia,
  latex,
  matlab,
  prolog,
  scala,
};

/** The grammar names this build registers, read off the map above so the two cannot drift. */
export const LOCAL_GRAMMARS: readonly string[] = Object.keys(CODE_GRAMMARS);

/**
 * Roster `langCode`s that are not grammar keys but map onto one under another name.
 *
 * - `objectiveC` → `objectivec`: different casing, same grammar.
 * - `stex` → `latex`: the formula language's grammar is highlight.js's TeX one; `stex` is the
 *   stored spelling, not a registered name.
 */
export const LOCAL_GRAMMAR_ALIASES: Record<string, string> = {
  objectiveC: 'objectivec',
  stex: 'latex',
};

/**
 * The highlighter instance the editor uses. highlight.js registers aliases (`html` for `xml`,
 * `tsx` for `typescript`) that never show up in `Object.keys`, so coverage checks must go through
 * `registered()` rather than the raw map.
 */
export const codeLowlight = (() => {
  const instance = createLowlight(CODE_GRAMMARS);
  for (const [langCode, grammar] of Object.entries(LOCAL_GRAMMAR_ALIASES)) {
    // `registerAlias` takes the grammar first and the name to accept second.
    instance.registerAlias(grammar, langCode);
  }
  return instance;
})();
