import { describe, expect, it } from 'vitest';

import { acceptEmoji, emojiQueryAt, enterAcceptsEmoji } from './emoji-query';

describe('the colon query', () => {
  it('reads the word after the colon at the caret', () => {
    expect(emojiQueryAt('看这个 :smi', 9)).toEqual({ start: 4, query: 'smi' });
  });

  it('offers nothing for a bare colon or once a space follows', () => {
    expect(emojiQueryAt('看这个 :', 5)).toBeNull();
    expect(emojiQueryAt('看这个 :smi ', 10)).toBeNull();
  });

  it('ignores a colon the caret has moved away from', () => {
    expect(emojiQueryAt(':smi 然后', 6)).toBeNull();
  });

  it('uses the latest colon', () => {
    expect(emojiQueryAt('a:b :cat', 8)).toEqual({ start: 4, query: 'cat' });
  });
});

describe('enter while suggesting', () => {
  it('accepts when a query is open and something matched', () => {
    expect(enterAcceptsEmoji({ start: 0, query: 'smi' }, 3)).toBe(true);
  });

  it('sends instead when nothing is being completed', () => {
    expect(enterAcceptsEmoji(null, 3)).toBe(false);
    expect(enterAcceptsEmoji({ start: 0, query: 'smi' }, 0)).toBe(false);
  });
});

describe('accepting a suggestion', () => {
  it('replaces the colon and the query with the glyph', () => {
    const draft = '看 :smi!';
    expect(acceptEmoji(draft, { start: 2, query: 'smi' }, 6, '😀')).toEqual({
      draft: '看 😀!',
      caret: 4,
    });
  });
});
