/**
 * `gap.md` G143 —— 访客侧的**口令闸**文案。
 *
 * 官方语言包里与口令闸直接对应的只有两枚（`_harvest/i18n-zh.tsv:3685,3705`）：
 *   `toolbar.enter.password`「输入密码」（输入框占位/标题）
 *   `toolbar.password`「密码」
 * ☆ 其余几句（"此文档受口令保护…"／"口令错误，请重试"／"解锁"）**官方没有对应键**，
 *   是本仓的自造文案（`feature-catalog.md` 里 grep 不到）——照本仓规矩登记为**本地措辞**，
 *   不冒充官方逐字。
 */

export const ENTER_PASSWORD = '输入密码';
export const ENTER_PASSWORD_KEY = 'toolbar.enter.password';

export const PASSWORD_LABEL = '密码';
export const PASSWORD_LABEL_KEY = 'toolbar.password';

/** 输入框占位：官方那枚 `输入密码`。 */
export const PASSCODE_PLACEHOLDER = ENTER_PASSWORD;

/** 输入框的可及名（无障碍层）：同一枚官方词。 */
export const PASSCODE_ARIA_LABEL = ENTER_PASSWORD;

/** 下面三句**官方没有**，是本仓措辞（登记备查）。 */
export const PASSCODE_GATE_HINT = '此文档受口令保护，请输入口令查看';
export const PASSCODE_ERROR = '口令错误，请重试';
export const PASSCODE_SUBMIT = '解锁';
