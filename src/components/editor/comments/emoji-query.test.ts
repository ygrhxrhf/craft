import { describe, expect, it } from 'vitest';

import { acceptEmoji, emojiQueryAt, enterAcceptsEmoji, mentionQueryAt } from './emoji-query';

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

describe('the @ query', () => {
  it('lists everyone on a bare @', () => {
    expect(mentionQueryAt('请看 @', 4)).toEqual({ start: 3, query: '' });
  });

  it('reads the name being typed', () => {
    expect(mentionQueryAt('@张', 2)).toEqual({ start: 0, query: '张' });
  });

  it('closes once a space follows', () => {
    expect(mentionQueryAt('@张 ', 3)).toBeNull();
  });

  it('yields to whichever trigger sits closer to the caret', () => {
    expect(mentionQueryAt(':smile @zhang', 13)?.query).toBe('zhang');
    expect(emojiQueryAt(':smile @zhang', 13)).toBeNull();
    expect(emojiQueryAt('@zhang :smi', 12)?.query).toBe('smi');
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
