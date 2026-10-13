import { describe, expect, it } from 'vitest';

import { composerKey } from './composer-keys';

const enter = { key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, altKey: false };

describe('the comment composer keys', () => {
  it('sends on Enter when there is something to send', () => {
    expect(composerKey({ ...enter, draft: '你好' })).toBe('send');
  });

  it('does not send an empty draft', () => {
    expect(composerKey({ ...enter, draft: '   ' })).toBe('ignore');
  });

  it('inserts a newline on Shift+Enter', () => {
    expect(composerKey({ ...enter, shiftKey: true, draft: '你好' })).toBe('newline');
  });

  it('leaves a modified Enter alone', () => {
    expect(composerKey({ ...enter, metaKey: true, draft: '你好' })).toBe('ignore');
    expect(composerKey({ ...enter, key: 'a', draft: '你好' })).toBe('ignore');
  });
});
