import { describe, expect, it } from 'vitest';
import { serializeDocument } from './index';

const doc = (block: unknown) => ({ type: 'doc', content: [block] });

describe('media block export (G40)', () => {
  it('keeps audio as a markdown link and an HTML audio element', () => {
    const content = doc({ type: 'audioBlock', attrs: { src: 'https://x/a.mp3' } });
    expect(serializeDocument(content, 'markdown')).toBe('[音频](https://x/a.mp3)');
    expect(serializeDocument(content, 'html')).toContain('<audio controls src="https://x/a.mp3">');
  });

  it('exports HTML blocks as a fenced source and a sandboxed iframe', () => {
    const content = doc({ type: 'htmlBlock', attrs: { html: '<b>hi</b>' } });
    expect(serializeDocument(content, 'markdown')).toContain('```html');
    expect(serializeDocument(content, 'html')).toContain('sandbox');
    expect(serializeDocument(content, 'html')).toContain('&lt;b&gt;hi&lt;/b&gt;');
  });
});
