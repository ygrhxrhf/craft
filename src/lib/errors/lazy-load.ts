/**
 * `gap.md` G90 —— 懒加载 chunk 失败要有**专门**的屏上文案，不能落进通用兜底。
 *
 * 官方两句话（第 96 个功能模块按需 code-split，chunk 拉不下来时出现）：
 *   `alert.lazy.load.title`「某些功能无法加载」／`alert.lazy.load.desc`「请检查你的网络连接或重新加载页面。」
 * 判据要能把"chunk 拉不下来"从别的运行时错误里分出来——否则那条专门文案就会被通用兜底吃掉。
 *
 * 纯函数：入参是任意 error（Next 的错误边界给的是 `Error` 或别的抛出物），出参是布尔。
 * ☆ 认的是**浏览器与打包器实际抛出的那几种 message**，不认堆栈（不同浏览器措辞不同）。
 */
const LAZY_LOAD_PATTERNS = [
  /Loading chunk \S+ failed/i, // webpack / Next 客户端
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i, // Vite/浏览器原生 ESM
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
];

export function isLazyLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : typeof (error as { message?: unknown })?.message === 'string'
          ? String((error as { message: string }).message)
          : '';
  if (!message) return false;
  return LAZY_LOAD_PATTERNS.some((re) => re.test(message));
}

/** 官方文案逐字（`feature-catalog.md:422-423`／`i18n-zh.tsv:173-174`）。 */
export const LAZY_LOAD_TITLE = '某些功能无法加载';
export const LAZY_LOAD_DESC = '请检查你的网络连接或重新加载页面。';
