/**
 * G106：复制文档时任务**强制回到 Unchecked**——副本不是"复刻完成度"，而是一份可重新做的清单。
 * 取消态同样回到未取消（否则副本里会留一行既没勾也永远做不了的任务）。
 */
type Json = unknown;

function resetNode(node: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...node };
  if (next.type === 'taskItem' && next.attrs && typeof next.attrs === 'object') {
    const attrs = { ...(next.attrs as Record<string, unknown>) };
    attrs.checked = false;
    if ('cancelled' in attrs) attrs.cancelled = false;
    if ('cancelledAt' in attrs) attrs.cancelledAt = null;
    next.attrs = attrs;
  }
  if (Array.isArray(next.content)) {
    next.content = (next.content as Record<string, unknown>[]).map((child) => resetNode(child));
  }
  return next;
}

/** 深拷贝并重置副本里的任务状态；入参不被修改。 */
export function resetTaskState<T extends Json>(content: T): T {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
  return resetNode(content as Record<string, unknown>) as T;
}
