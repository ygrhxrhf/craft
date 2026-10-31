import { describe, expect, it } from 'vitest';
import { extractReadableText, parseDuckDuckGoResults } from './tools';

describe('AI web tools (G49)', () => {
  it('parses DuckDuckGo result links and snippets', () => {
    const html = `
      <a class="result__a" href="https://example.com/a">Example <b>A</b></a>
      <a class="result__snippet">First snippet</a>
      <a class="result__a" href="https://example.com/b">Example B</a>
      <a class="result__snippet">Second snippet</a>`;
    expect(parseDuckDuckGoResults(html)).toEqual([
      { url: 'https://example.com/a', title: 'Example A', snippet: 'First snippet' },
      { url: 'https://example.com/b', title: 'Example B', snippet: 'Second snippet' },
    ]);
  });

  it('extracts readable text without scripts, styles or tags', () => {
    const html = '<html><head><style>.x{}</style></head><body><h1>标题</h1><script>bad()</script><p>正文 &amp; 更多</p></body></html>';
    expect(extractReadableText(html)).toBe('标题 正文 & 更多');
  });
});
