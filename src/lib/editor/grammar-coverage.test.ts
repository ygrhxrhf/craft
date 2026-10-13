import { describe, expect, it } from 'vitest';

import { CODE_LANGUAGES } from './code-languages';
import {
  LOCAL_GRAMMARS,
  highlightsLocally,
  localGrammarFor,
  unhighlightedLanguages,
} from './grammar-coverage';

/**
 * Grammar coverage (G1179). The official gate loads a language only when its `langCode` is a key
 * in the grammar table, with no alias step; locally the highlighter is lowlight, so the coverage
 * sets differ and the gap is recorded rather than left silent.
 */
describe('resolving a langCode to a local grammar', () => {
  it('finds the grammar when lowlight registers the name', () => {
    expect(localGrammarFor('javascript')).toBe('javascript');
    expect(localGrammarFor('python')).toBe('python');
  });

  it('treats plaintext as no grammar, since highlighting is off by design', () => {
    expect(localGrammarFor(null)).toBeNull();
    expect(highlightsLocally(null)).toBe(false);
  });

  it('maps a differently-named grammar onto its local key', () => {
    expect(localGrammarFor('objectiveC')).toBe('objectivec');
    expect(highlightsLocally('objectiveC')).toBe(true);
  });

  it('returns null for a language this build cannot highlight', () => {
    expect(localGrammarFor('mermaid')).toBeNull();
    expect(highlightsLocally('mermaid')).toBe(false);
  });
});

describe('the local coverage gap', () => {
  it('registers a non-empty grammar set', () => {
    expect(LOCAL_GRAMMARS.length).toBeGreaterThan(20);
  });

  it('lists the roster entries this build cannot highlight', () => {
    const missing = unhighlightedLanguages();
    // Every listed entry really has no local grammar.
    for (const stored of missing) {
      const entry = CODE_LANGUAGES.find((l) => l.storedLangCode === stored);
      expect(entry, stored).toBeDefined();
      expect(highlightsLocally(entry!.langCode), stored).toBe(false);
    }
    // And every entry not listed does highlight.
    for (const entry of CODE_LANGUAGES) {
      if (missing.includes(entry.storedLangCode)) continue;
      expect(highlightsLocally(entry.langCode), entry.storedLangCode).toBe(true);
    }
  });

  it('keeps mermaid and other in the gap, as the official gate does', () => {
    // Both are selectable but highlight nowhere; mermaid is rendered by its own surface.
    const missing = unhighlightedLanguages();
    expect(missing).toContain('mermaid');
    expect(missing).toContain('other');
  });
});
