import { describe, expect, it } from 'vitest';

import { extractBlocks, pmNodeText } from './extract';

function doc(...content: unknown[]) {
  return { type: 'doc', content };
}

describe('the block text projection', () => {
  it('joins plain text nodes', () => {
    expect(pmNodeText({ type: 'paragraph', content: [{ type: 'text', text: 'Alpha' }] })).toBe('Alpha');
  });

  // G1345: a rich link keeps its summary in `description`; search must reach it.
  it('includes both the title and the summary of a rich link', () => {
    const link = {
      type: 'linkPreview',
      attrs: { title: 'MDN', description: 'The MDN Web Docs site' },
    };
    expect(pmNodeText(link)).toBe('MDN The MDN Web Docs site');
  });

  it('lets a page be found by a card summary alone', () => {
    const blocks = extractBlocks(
      doc({ type: 'paragraph', content: [{ type: 'text', text: 'notes' }] }, {
        type: 'linkPreview',
        attrs: { title: '', description: 'A summary only card' },
      }),
    );
    expect(blocks.map((block) => block.text)).toEqual(['notes', 'A summary only card']);
  });

  it('still uses the shown label for other atom nodes', () => {
    expect(pmNodeText({ type: 'mention', attrs: { name: 'Ada' } })).toBe('Ada');
  });
});
