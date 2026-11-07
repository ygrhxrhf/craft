import { describe, expect, it } from 'vitest';

import { extractBodyExcerpt, htmlToText } from './link-preview';

/**
 * G1567: the official link card carries a page summary even when the page has no
 * `og:description` (measured on `https://example.com`). The local route only read meta tags.
 */
const EXAMPLE_DOMAIN = `<!doctype html>
<html>
  <head><title>Example Domain</title><style>body { background: #fff; }</style></head>
  <body>
    <div>
      <h1>Example Domain</h1>
      <p>This domain is for use in documentation examples without needing permission. Avoid use in operations.</p>
      <p><a href="https://iana.org/domains/example">Learn more</a></p>
    </div>
  </body>
</html>`;

describe('link preview body excerpt (G1567)', () => {
  it('decodes and flattens html into readable text', () => {
    expect(htmlToText('<p>a &amp; b&nbsp;&mdash; c</p>')).toBe('a & b — c');
    expect(htmlToText('<script>alert(1)</script><p>visible</p>')).toBe('visible');
  });

  it('takes the first substantial paragraph, not the heading', () => {
    expect(extractBodyExcerpt(EXAMPLE_DOMAIN)).toBe(
      'This domain is for use in documentation examples without needing permission. Avoid use in operations.'
    );
  });

  it('falls back to the whole body when there is no paragraph', () => {
    const html = '<html><body><div>' + 'x'.repeat(60) + '</div></body></html>';
    expect(extractBodyExcerpt(html)).toBe('x'.repeat(60));
  });

  it('returns null when the page carries no usable text', () => {
    expect(extractBodyExcerpt('<html><body><h1>T</h1></body></html>')).toBeNull();
  });

  it('caps the excerpt at the requested length', () => {
    const html = `<p>${'y'.repeat(500)}</p>`;
    expect(extractBodyExcerpt(html, 120)).toHaveLength(120);
  });
});