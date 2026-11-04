/**
 * G75 —— 「想要查看」请求的两句文案。收到请求那一侧用的是官方模板
 * `web.collab.someone.want.to.read.the.document`（`<username>[0]</username>想要查看文档“[1]”`，
 * 屏上是富文本，本地取纯文本形）。批准/拒绝两枚语言包没有专键，沿用编辑请求那两句的本地措辞。
 */

export const VIEW_REQUEST_TITLE_KEY = 'web.collab.someone.want.to.read.the.document';

export function viewRequestTitle(name: string, documentTitle: string): string {
  return `${name} 想要查看文档“${documentTitle}”`;
}

export function viewRequestApprovedTitle(documentTitle: string): string {
  return `「${documentTitle}」的查看请求已批准`;
}

export function viewRequestDeclinedTitle(documentTitle: string): string {
  return `「${documentTitle}」的查看请求被拒绝`;
}

/** 待处理列表里区分两种请求的短标签。 */
export const VIEW_REQUEST_LABEL = '想要查看';
export const EDIT_REQUEST_LABEL = '想要编辑';

/** G138：请求发出后的那句（官方 `collab.shared.document.request.sent`「请求已发送」）。 */
export const REQUEST_SENT = '请求已发送';
export const REQUEST_SENT_KEY = 'collab.shared.document.request.sent';

/** 访问门禁页与按钮：官方 `collab.request.access.to.document(.subtitle)` 与失败句。 */
export const REQUEST_ACCESS_TITLE = '请求访问此文档';
export const REQUEST_ACCESS_TITLE_KEY = 'collab.request.access.to.document';
export const REQUEST_ACCESS_SUBTITLE = '你的请求获得批准后，你可以查看此文档。';
export const REQUEST_ACCESS_SUBTITLE_KEY = 'collab.request.access.to.document.subtitle';
export const REQUEST_ACCESS_FAILED = '请求访问失败';
export const REQUEST_ACCESS_FAILED_KEY = 'alert.error.request.access.title';

/** 所有者那一侧待处理队列的组标题：语言包没有对应键，本地词（与「编辑请求」同档）。 */
export const ACCESS_REQUESTS_HEADING = '访问请求';
