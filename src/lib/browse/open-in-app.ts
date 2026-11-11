/**
 * G717 —— web 端进文档就弹的「在桌面应用中打开？」交接提示。
 *
 * 官方屏幕事实（`interactions.md:1185`）：三个动作＝Close、`记住我的选择` 复选框（默认未选）、
 * `在应用中打开`；`Escape` 按下去它不消失，点页内其它控件后它整组消失 ⇒ 非模态浮层，
 * 不抓键盘、不挡点击。`记住我的选择` 是账户级显示偏好，复刻落到本地持久位，但不能默认勾。
 */

export const OPEN_IN_DESKTOP_APP_QUESTION = '在桌面应用中打开？';
export const OPEN_IN_APP = '在应用中打开';
export const REMEMBER_MY_CHOICE = '记住我的选择';

/** `记住我的选择` 的持久位。 */
export const OPEN_IN_APP_REMEMBERED_KEY = 'craft.open-in-app.remembered';

/**
 * 只在 web 端、且用户没记过选择时出现。桌面壳里这层没有意义（已经在应用内），
 * 记过选择就不再打扰。
 */
export function shouldOfferDesktopApp(isDesktop: boolean, remembered: boolean): boolean {
  return !isDesktop && !remembered;
}

export function isChoiceRemembered(storage?: Pick<Storage, 'getItem'>): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(OPEN_IN_APP_REMEMBERED_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberChoice(storage?: Pick<Storage, 'setItem'>): void {
  if (!storage) return;
  try {
    storage.setItem(OPEN_IN_APP_REMEMBERED_KEY, '1');
  } catch {
    // 存不下（隐私模式/配额）就当本次会话记住，不抛。
  }
}

/** `在应用中打开` 走的是仓库自己的内部 scheme（`craft://doc/{id}`），见 `internal-scheme.ts`。 */
export function craftDocLink(documentId: string): string {
  return `craft://doc/${documentId}`;
}
