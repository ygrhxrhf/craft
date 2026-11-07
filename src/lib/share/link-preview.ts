/**
 * G1567 —— 链接卡的摘要口径。官方**抓「标题＋页面摘要」**：有 OG/meta 就用它，没有就从正文抽
 * 一段（`example.com` 上官方卡片带正文首段，本地此前 `description:null`）。本模块只做"从
 * HTML 里抽正文"这一步，纯函数、无网络，路由把 meta 读不到的洞补上。
 */

const DROP_BLOCKS = /<(script|style|noscript|template|svg|header|footer|nav)\b[\s\S]*?<\/\1>/gi;
const PARAGRAPH = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

/** HTML → 可读文本：丢掉整块的非正文元素，去标签，解码常用实体，压平空白。 */
export function htmlToText(html: string): string {
  return html
    .replace(DROP_BLOCKS, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从正文里抽第一段有内容的段落。官方拿的是"页面摘要"，不是整页文本：
 * 优先第一个够长的 `<p>`（`example.com` 的正文就是这一形），没有再退回整页文本。
 */
export function extractBodyExcerpt(html: string, maxLength = 300): string | null {
  const withoutNoise = html.replace(DROP_BLOCKS, ' ');
  for (const match of withoutNoise.matchAll(PARAGRAPH)) {
    const text = htmlToText(match[1] ?? '');
    if (text.length >= 40) return text.slice(0, maxLength);
  }
  const whole = htmlToText(withoutNoise);
  if (whole.length >= 40) return whole.slice(0, maxLength);
  return null;
}