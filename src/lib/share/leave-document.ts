/**
 * G298 —— **离开共享文档是独立确认、且明写后果**（`dialogs.md` §8.3）。
 *
 * 官方四键逐字（`_harvest`／`feature-catalog.md:230,434`）：
 *   - `alert.leave.document`「你确定要离开该文档吗？**你可能无法再访问它。**」（单数）；
 *   - `alert.confirm.leave.documents`「你确定要离开 [0] 个文档吗？你可能无法再访问它们。」（复数）；
 *   - 失败态 `alert.leave.shared.document.desc`「无法离开文档。请稍后重试。」；
 *   - 失败标题 `alert.error.leave.doc.title`「无法离开文档」。
 *
 * 要点：**"离开后可访问性不保证"是官方明写的后果句**——离开不是"取消订阅"这种可逆动作，
 * 而是可能永久失去访问权。所以本地这条也必须是**带后果句的确认框**，不是直接执行。
 */

export const LEAVE_DOCUMENT_KEY = 'alert.leave.document';
export const LEAVE_DOCUMENT_SINGULAR = '你确定要离开该文档吗？你可能无法再访问它。';

export const LEAVE_DOCUMENTS_KEY = 'alert.confirm.leave.documents';
/** 复数那句的 `[0]`＝文档数。 */
export const LEAVE_DOCUMENTS_TEMPLATE = '你确定要离开 [0] 个文档吗？你可能无法再访问它们。';

export const LEAVE_FAILED_DESC_KEY = 'alert.leave.shared.document.desc';
export const LEAVE_FAILED_DESC = '无法离开文档。请稍后重试。';
export const LEAVE_FAILED_TITLE_KEY = 'alert.error.leave.doc.title';
export const LEAVE_FAILED_TITLE = '无法离开文档';

/** 确认框的动作按钮（官方那支的肯定句）。 */
export const LEAVE_CONFIRM = '离开';

/**
 * 离开一句文档时的确认文案：**单数用单数键、复数用复数键并把 `[0]` 填成数量**。
 * `count <= 0` 不该出现（没有可离开的文档），返回单数句（调用方应先挡掉 0）。
 */
export function leaveConfirmMessage(count: number): string {
  if (count <= 1) return LEAVE_DOCUMENT_SINGULAR;
  return LEAVE_DOCUMENTS_TEMPLATE.replace('[0]', String(count));
}

/** 这次离开用哪个键（单/复两键，供 i18n 侧取词）。 */
export function leaveConfirmKey(count: number): string {
  return count <= 1 ? LEAVE_DOCUMENT_KEY : LEAVE_DOCUMENTS_KEY;
}
