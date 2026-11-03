import { describe, expect, it } from 'vitest';

import {
  addContextItem,
  contextFromDocument,
  MAX_CONTEXT_TEXT,
  parseAiContext,
  renderContextPrompt,
  type AiContextItem,
} from './context';

const doc = (id: string, text = '正文'): AiContextItem => ({
  type: 'document',
  documentId: id,
  hasChildren: 'false',
  textContent: text,
});

describe('the structured AI context (G116)', () => {
  it('keeps the first item per document id', () => {
    const once = addContextItem([], doc('a'));
    expect(addContextItem(once, doc('a', '重复'))).toBe(once);
    expect(addContextItem(once, doc('b'))).toHaveLength(2);
  });

  it('parses the wire shape and dedupes by document id', () => {
    const parsed = parseAiContext([
      { type: 'document', documentId: 'a', hasChildren: 'true', subtitle: '副标题', textContent: '甲' },
      { type: 'page', documentId: 'b', hasChildren: false },
      { type: 'document', documentId: 'a', hasChildren: 'false', textContent: '重复' },
    ]);
    expect(parsed).toEqual([
      { type: 'document', documentId: 'a', hasChildren: 'true', subtitle: '副标题', textContent: '甲' },
      { type: 'page', documentId: 'b', hasChildren: 'false', subtitle: undefined, textContent: undefined },
    ]);
  });

  it('drops malformed entries instead of guessing', () => {
    expect(
      parseAiContext([
        null,
        { type: 'block', documentId: 'a' },
        { type: 'document', documentId: '' },
        { type: 'document' },
        'document',
      ]),
    ).toEqual([]);
    expect(parseAiContext('document')).toEqual([]);
  });

  it('normalises hasChildren to the string the protocol uses', () => {
    const parsed = parseAiContext([
      { type: 'document', documentId: 'a', hasChildren: true },
      { type: 'document', documentId: 'b' },
    ]);
    expect(parsed.map((item) => item.hasChildren)).toEqual(['true', 'false']);
  });

  it('caps a document body at the collected context size', () => {
    const long = '字'.repeat(MAX_CONTEXT_TEXT + 50);
    const built = contextFromDocument({ documentId: 'a', textContent: long });
    expect(built.textContent).toHaveLength(MAX_CONTEXT_TEXT);
    expect(parseAiContext([{ ...built, textContent: long }])[0].textContent).toHaveLength(
      MAX_CONTEXT_TEXT,
    );
  });

  it('renders one addressed context block per document', () => {
    const prompt = renderContextPrompt([doc('a', '甲'), doc('b', '乙')]);
    expect(prompt).toContain('<context type="document" documentId="a" hasChildren="false">');
    expect(prompt).toContain('甲');
    expect(prompt.split('</context>')).toHaveLength(3);
  });
});
