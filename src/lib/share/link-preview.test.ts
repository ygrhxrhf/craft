import { describe, expect, it } from 'vitest';

import {
  extractBodyExcerpt,
  htmlToText,
  linkSearchText,
  summarizeDescription,
} from './link-preview';

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

describe('link card summary (G1370/G1397)', () => {
  it('keeps a short summary verbatim rather than padding to a fixed length', () => {
    const short = 'Craft - Create amazing documents';
    expect(summarizeDescription(short, 'https://www.craft.do/s/abc')).toBe(short);
  });

  it('hard-cuts long text at 160 characters and appends the official trailing dots', () => {
    const long = 'z'.repeat(400);
    const out = summarizeDescription(long, 'https://example.com');
    expect(out).toBe(`${'z'.repeat(160)}...`);
    expect(out).toHaveLength(163);
  });

  it('does not add dots when the text is exactly the cap', () => {
    const exact = 'q'.repeat(160);
    expect(summarizeDescription(exact, 'https://example.com')).toBe(exact);
  });

  it('falls back to the url when the page carries no summary at all', () => {
    expect(summarizeDescription(null, 'https://example.com/a')).toBe('https://example.com/a');
    expect(summarizeDescription('   ', 'https://example.com/a')).toBe('https://example.com/a');
  });

  it('collapses whitespace before measuring the cap', () => {
    expect(summarizeDescription('a\n\n  b', 'https://example.com')).toBe('a b');
  });
});

describe('link card search text (G1370)', () => {
  it('indexes title and summary together', () => {
    expect(linkSearchText('Handbook', 'Everything about Craft')).toBe(
      'Handbook Everything about Craft'
    );
  });

  it('drops the missing half instead of emitting separators', () => {
    expect(linkSearchText('Handbook', null)).toBe('Handbook');
    expect(linkSearchText(null, 'Only summary')).toBe('Only summary');
    expect(linkSearchText(null, null)).toBe('');
  });
});