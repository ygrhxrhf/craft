import { describe, expect, it } from 'vitest';

import {
  MERMAID_FALLBACK_PRE,
  MERMAID_INVALID,
  appearsInLanguageMenu,
  escapeMermaidSource,
  mermaidErrorHtml,
  planMermaidRender,
} from './mermaid-surface';

/**
 * The Mermaid surface's decision layer (G1177): empty renders nothing, a failure falls back to
 * escaped source, and the language menu excludes mermaid.
 */
describe('planning a render', () => {
  it('renders nothing for empty or whitespace-only content', () => {
    expect(planMermaidRender('')).toEqual({ kind: 'none' });
    expect(planMermaidRender('   \n ')).toEqual({ kind: 'none' });
  });

  it('hands non-empty content to the renderer', () => {
    expect(planMermaidRender('graph TD; A-->B')).toEqual({ kind: 'diagram', source: 'graph TD; A-->B' });
  });
});

describe('the failure fallback', () => {
  it('prefixes the fixed sentence and wraps in the fallback pre', () => {
    const html = mermaidErrorHtml('a < b');
    expect(html.startsWith(MERMAID_FALLBACK_PRE)).toBe(true);
    expect(html).toContain(MERMAID_INVALID);
    expect(html.endsWith('</pre>')).toBe(true);
  });

  it('escapes exactly the four characters', () => {
    expect(escapeMermaidSource('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    // Anything else is left alone.
    expect(escapeMermaidSource('a=b;c')).toBe('a=b;c');
  });

  it('keeps the official wrapper string verbatim, malformed attribute and all', () => {
    // The attribute name contains a colon and a space and is unquoted, so a browser drops it;
    // the string is kept as collected rather than tidied.
    expect(MERMAID_FALLBACK_PRE).toBe('<pre white-space: pre-wrap;">');
  });
});

describe('the language menu', () => {
  it('excludes mermaid, which has its own surface', () => {
    expect(appearsInLanguageMenu('mermaid')).toBe(false);
  });

  it('keeps the other languages', () => {
    expect(appearsInLanguageMenu('javascript')).toBe(true);
    expect(appearsInLanguageMenu('python')).toBe(true);
    expect(appearsInLanguageMenu('plaintext')).toBe(true);
  });
});
