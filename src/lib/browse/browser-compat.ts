/**
 * G346 —— 浏览器不兼容是**可绕过警告**（`features.md` §22.2）。官方三件事：
 *
 * 1. 一句判定 `browser.not.compatible`（「你的浏览器似乎不兼容」）；
 * 2. 一句建议 `browse.best.experience.browsers`（带一个「支持的浏览器」外链）；
 * 3. 两个出口 —— `use.craft.anyways`（「仍然使用 Craft」，本次会话放行）与
 *    `not.show.this.again`（「不再显示此内容」，**持久化**关闭）。
 *
 * 判据与文案都是纯函数/常量，组件只负责读 UA 与 localStorage（`BrowserCompatNotice`）。
 */

export const BROWSER_NOT_COMPATIBLE_KEY = 'browser.not.compatible';
export const BROWSER_NOT_COMPATIBLE = '你的浏览器似乎不兼容';

export const BEST_EXPERIENCE_KEY = 'browse.best.experience.browsers';
/** 官方这句里 `supported browsers` 是链接段；这里拆成前后两截，链接文字单独渲染。 */
export const BEST_EXPERIENCE_PREFIX = '为了获得最佳体验，我们建议你使用';
export const BEST_EXPERIENCE_LINK = '支持的浏览器之一';
export const BEST_EXPERIENCE_SUFFIX = '。';
export const BEST_EXPERIENCE = `${BEST_EXPERIENCE_PREFIX}${BEST_EXPERIENCE_LINK}${BEST_EXPERIENCE_SUFFIX}`;

export const USE_ANYWAYS_KEY = 'use.craft.anyways';
export const USE_ANYWAYS = '仍然使用 Craft';

export const DONT_SHOW_AGAIN_KEY = 'not.show.this.again';
export const DONT_SHOW_AGAIN = '不再显示此内容';

/** 官方外链指向 Craft 的支持浏览器说明页。 */
export const SUPPORTED_BROWSERS_URL = 'https://www.craft.do/supported-browsers';

/** `not.show.this.again` 的持久化位。 */
export const BROWSER_COMPAT_DISMISS_KEY = 'craft.browser.compat.dismissed';

/**
 * 判定只看 UA：本地没有特性探测的预算，而官方这一步也确实是 UA 门。
 * 支持 = Chromium 系（Chrome/Edge/Opera）、Firefox、Safari 的现代版本；
 * 明确不支持 = IE（`MSIE`/`Trident`）、旧 Edge（`Edge/` 无 `Edg/`）、空 UA。
 */
export function isSupportedBrowser(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (!ua) return false;
  if (/MSIE|Trident/i.test(ua)) return false;
  // 旧 EdgeHTML 的 token 是 `Edge/`；Chromium Edge 是 `Edg/`。
  if (/\bEdge\//.test(ua)) return false;
  if (/Edg\/|OPR\/|Chrome\/|CriOS\//.test(ua)) return true;
  if (/Firefox\/|FxiOS\//.test(ua)) return true;
  if (/Safari\//.test(ua)) return true;
  return false;
}

/**
 * G746 —— 官方「快速开启」在 Safari（含 iOS Safari）上主键换成 ⌘⇧O（`Hd` 分支）。
 * 判据：带 `Safari/` 与 `Version/`，且不含任何 Chromium/Firefox 系 token
 * （Chrome 的 UA 同样带 `Safari/`，必须先排除）。
 */
export function isSafariBrowser(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (!ua) return false;
  if (/Chrome\/|Chromium\/|CriOS\/|Edg\/|OPR\/|Firefox\/|FxiOS\//.test(ua)) return false;
  return /Safari\//.test(ua) && /Version\//.test(ua);
}

/** 警告是否该出现：UA 不支持 **且** 用户没有选过「不再显示此内容」。 */
export function shouldShowCompatNotice(
  userAgent: string | null | undefined,
  dismissed: boolean,
): boolean {
  return !dismissed && !isSupportedBrowser(userAgent);
}

export function isCompatDismissed(storage?: Pick<Storage, 'getItem'>): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(BROWSER_COMPAT_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissCompat(storage?: Pick<Storage, 'setItem'>): void {
  if (!storage) return;
  try {
    storage.setItem(BROWSER_COMPAT_DISMISS_KEY, '1');
  } catch {
    // 存不下（隐私模式/配额）就当本次会话放行，不抛。
  }
}