export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** G49: turn DuckDuckGo's HTML result page into a small, testable list. */
export function parseDuckDuckGoResults(html: string, limit = 5): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const resultPattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = resultPattern.exec(html)) && results.length < limit) {
    results.push({
      url: decodeHtml(match[1]),
      title: stripTags(match[2]).replace(/\s+/g, ' ').trim(),
      snippet: stripTags(match[3]).replace(/\s+/g, ' ').trim(),
    });
  }
  return results.filter((result) => result.url && result.title);
}

/** G49: plain text from a crawled page, without scripts/styles/markup. */
export function extractReadableText(html: string, limit = 8000): string {
  const withoutHead = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = decodeHtml(stripTags(withoutHead)).replace(/\s+/g, ' ').trim();
  return text.slice(0, limit);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
