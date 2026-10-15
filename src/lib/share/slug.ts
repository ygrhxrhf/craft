/**
 * `gap.md` G89 —— 自定义分享路径的官方规则（`dialogs.md:10`）：
 *   ≥2 字符、<500 字符、**不含空格**。逐字取自 `_harvest/i18n-zh.tsv:128-132`：
 *   `alert.error.custom.paths.empty`「路径不能为空。」／`...no.spaces`「路径不能包含空格」
 *   ／`...too.long`「路径长度必须少于 500 个字符。」／`...too.short`「路径长度必须至少为 2 个字符」。
 *
 * ☆ 两处**有意偏差**（登记在案）：① 官方"不含空格"是**报错**，本仓此前把空格静默转成 `-`——
 *   现在改成报错（对齐官方）；② 本仓的路径是**路由段**，故额外禁 `/`、`?` 等会改路由形状的字符
 *   并把字符集收到「字母/数字/`-`」——这条官方没有（它跑在自定义域名下），属本地必要约束。
 * ☆ 上限：官方 500，本仓取 **64**（更严）。**为什么仍取 64**＝本仓 `slug` 是 `@unique` 的短地址段，
 *   而官方那条 500 是给自定义域名的整条路径；改到 500 会让 URL 长得离谱且无收益，故**有意保留更严的上限**，
 *   但**错误文案用官方那句**（把 500 换成实际上限，避免文案与行为不符）。
 */
const RESERVED = new Set([
  'login',
  'register',
  'logout',
  'documents',
  'collections',
  'whiteboards',
  'settings',
  'tasks',
  'calendar',
  'favorites',
  'recent',
  'templates',
  'tags',
  'trash',
  'daily-notes',
  'search',
  'api',
  'p',
  's',
  'w',
]);

const MAX_LENGTH = 64;
const MIN_LENGTH = 2;

/** 官方四句逐字（`too.long` 里的 500 换成实际上限）。 */
export const PATH_EMPTY = '路径不能为空。';
export const PATH_NO_SPACES = '路径不能包含空格';
export const PATH_TOO_SHORT = '路径长度必须至少为 2 个字符';
export function pathTooLong(max: number = MAX_LENGTH): string {
  return `路径长度必须少于 ${max} 个字符。`;
}

export type SlugResult = { ok: true; slug: string } | { ok: false; error: string };

/** A readable default derived from the title, or '' when the title has nothing writable. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates the address a user types. Deliberately stricter than `slugifyTitle`:
 * a hand-written slug is kept as entered, so anything that would change the route
 * shape is refused rather than silently rewritten.
 */
export function normalizeShareSlug(raw: string): SlugResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: PATH_EMPTY };
  // 官方那句"不能包含空格"管的是**中间的空格**（首尾空白是用户的键入噪音，已 trim 掉）。
  if (/\s/.test(trimmed)) return { ok: false, error: PATH_NO_SPACES };

  const slug = trimmed.toLowerCase();
  if (slug.length < MIN_LENGTH) return { ok: false, error: PATH_TOO_SHORT };
  if (slug.length > MAX_LENGTH) return { ok: false, error: pathTooLong() };
  if (!/^[\p{L}\p{N}-]+$/u.test(slug)) return { ok: false, error: '只能包含字母、数字和 -' };
  if (slug.startsWith('-') || slug.endsWith('-')) return { ok: false, error: '不能以 - 开头或结尾' };
  if (RESERVED.has(slug)) return { ok: false, error: '该地址已被系统占用' };

  return { ok: true, slug };
}
