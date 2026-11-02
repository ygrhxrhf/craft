/**
 * G303 的三条兜底句：链接复制失败、粘贴失败、带原因插值的通用失败。
 * 懒加载那一族（`alert.lazy.load.*`）在 `lib/errors/lazy-load.ts`，与此同源不同用。
 */

/** `alert.copy.link.error` */
export const COPY_LINK_FAILED = '无法将链接复制到剪贴板';
export const COPY_LINK_FAILED_KEY = 'alert.copy.link.error';

/** `alert.failed.to.paste` */
export const PASTE_FAILED = '粘贴失败';
export const PASTE_FAILED_KEY = 'alert.failed.to.paste';

/** `alert.operation.failed` —— 「操作失败 [0]」，`[0]` 是人可读的原因。 */
export const OPERATION_FAILED_TEMPLATE = '操作失败 [0]';
export const OPERATION_FAILED_KEY = 'alert.operation.failed';

export function operationFailed(reason: string | null | undefined): string {
  return OPERATION_FAILED_TEMPLATE.replace('[0]', reason?.trim() ?? '').trim();
}
