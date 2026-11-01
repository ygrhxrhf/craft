/**
 * G320：带内嵌标签的官方文案。`blockdetails.you.are.logged.in.as.strong` 逐字取自
 * `_harvest/i18n-zh.tsv:667`，`<strong>` 是标签不是文本——渲染走 `RichText`，不能原样打印。
 */
export const LOGGED_IN_AS_KEY = 'blockdetails.you.are.logged.in.as.strong';
/** 官方形态＝「你已以<strong>[0]</strong>的身份登录」；`[0]` 由本地填成邮箱。 */
export const LOGGED_IN_AS_TEMPLATE = '你已以<strong>[0]</strong>的身份登录';

/** 把邮箱填进模板（只替换 `[0]`，标签留给 `RichText`）。 */
export function loggedInAsText(email: string): string {
  return LOGGED_IN_AS_TEMPLATE.replace('[0]', email);
}
