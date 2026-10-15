/**
 * `gap.md` G73 —— **网页版专属**的更新横幅（`longtail.md:48`）：
 *   网页版没有"检查→下载→立即更新／提醒我"那套桌面生命周期，只有一句
 *   `update.please.reload.to.get.latest.version`「请刷新页面以获取最新版本的应用。」
 *   （逐字取自 `_harvest/i18n-zh.tsv:3879`）。桌面那几档（`update.update.now`／`update.reminder.*`
 *   ／`update.force*`）在本仓没有宿主，**不落**。
 *
 * ☆ 触发源＝**Service Worker 有 waiting 的新版本**：`sw.js` 现在静默缓存、无提示（本行原判据），
 *   而 `registration.waiting` 一旦非空就说明新 SW 已装好、只等接管 ⇒ 这正是官方那句说的时机。
 */

export const UPDATE_RELOAD_MESSAGE = '请刷新页面以获取最新版本的应用。';
export const UPDATE_RELOAD_KEY = 'update.please.reload.to.get.latest.version';

/** 横幅上那枚动作按钮。 */
export const UPDATE_RELOAD_ACTION = '刷新页面';

/**
 * 该不该显示横幅。`waiting` 为真＝已有一个装好的新 SW 在等接管；**已有控制器**才提示——
 * 首次安装时 `waiting` 也可能非空，但那只是首装、不是"有更新"。
 */
export function shouldShowUpdateBanner(opts: {
  waiting: boolean;
  hasController: boolean;
}): boolean {
  return opts.waiting && opts.hasController;
}
