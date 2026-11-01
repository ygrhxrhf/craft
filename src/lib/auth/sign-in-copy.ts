/**
 * G227 —— **Sign in with Craft**：Craft 作为外部站点的身份提供方，弹窗式 OAuth 的完成态。
 *
 * 官方那三句（`_harvest/i18n-zh.tsv:2127-2130`）：
 *   - `login.auth.success.close`「你现在可以关闭此窗口了。」（授权完成后，弹窗里就这一句）；
 *   - `login.auth.greeting.welcome`「欢迎，[0]」/ `login.auth.greeting.sorry`「很抱歉，[0]」
 *     ——**两种问候**：授权成功打招呼，失败则致歉。
 *
 * 本地只有 NextAuth Credentials，无第三方 IdP，也没有这个完成态弹窗。本模块把三句与"两种问候"
 * 的分支写出来，供将来的授权页消费。
 */

export const SIGN_IN_SUCCESS_CLOSE_KEY = 'login.auth.success.close';
export const SIGN_IN_SUCCESS_CLOSE = '你现在可以关闭此窗口了。';

export const SIGN_IN_WELCOME_KEY = 'login.auth.greeting.welcome';
export const SIGN_IN_SORRY_KEY = 'login.auth.greeting.sorry';

/** 授权完成态：成功后那句固定的"可以关闭窗口了"。 */
export function signInCompletionMessage(): string {
  return SIGN_IN_SUCCESS_CLOSE;
}

/**
 * 两种问候：成功 ⇒ 欢迎，失败 ⇒ 很抱歉。`[0]` 填用户名。
 * 空名（没拿到用户名）时返回 `null`——不发明一个"欢迎，"这种半句。
 */
export function signInGreeting(outcome: 'success' | 'failure', name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return outcome === 'success' ? `欢迎，${trimmed}` : `很抱歉，${trimmed}`;
}

/** 问候句的官方键（成功与失败各一枚）。 */
export function greetingKey(outcome: 'success' | 'failure'): string {
  return outcome === 'success' ? SIGN_IN_WELCOME_KEY : SIGN_IN_SORRY_KEY;
}
