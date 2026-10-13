import { describe, expect, it } from 'vitest';

import { collectTocEntries } from './toc-view';

interface Fake {
  type: { name: string };
  attrs: Record<string, unknown>;
  textContent: string;
  content: Fake[];
}

function node(name: string, text: string, children: Fake[] = [], attrs: Record<string, unknown> = {}): Fake {
  return { type: { name }, attrs, textContent: text, content: children };
}

function doc(children: Fake[]) {
  return {
    descendants(walk: (node: Fake) => boolean | void) {
      const visit = (items: Fake[]) => {
        for (const item of items) {
          const descend = walk(item);
          if (descend !== false) visit(item.content);
        }
      };
      visit(children);
    },
  };
}

/**
 * The table of contents lists headings and cards (the two of the three sources the official
 * placeholder names that the local document has). A card is one entry, so a heading inside it is
 * not listed again.
 */
describe('collectTocEntries', () => {
  it('lists headings and cards, in document order', () => {
    const entries = collectTocEntries(
      doc([
        node('heading', '引言', [], { level: 1 }),
        node('paragraph', '正文'),
        node('cardBlock', '一张卡片', [node('heading', '卡片里的标题', [], { level: 2 })]),
        node('heading', '结尾', [], { level: 2 }),
      ]),
    );
    expect(entries.map((entry) => entry.text)).toEqual(['引言', '一张卡片', '结尾']);
  });

  it('names an empty card 卡片', () => {
    const entries = collectTocEntries(doc([node('cardBlock', '   ')]));
    expect(entries.map((entry) => entry.text)).toEqual(['卡片']);
  });
});
