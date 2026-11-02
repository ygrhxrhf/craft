/**
 * G501 —— 官方线格式里的布尔有三种形状且都是**三态**：`"1"/"0"`、`"true"/"false"`、
 * 以及待办勾选的数字 `0/1`；缺字段一律是 `null`（"从没设过"），不能塌成 `false`。
 *
 * 本地把三态保留在属性本身：解析不出就是 `null`，序列化时 `null` **不写该属性**。
 */

export type TriStateFlag = boolean | null;

/** 解析任意一种线编码；不认识或缺省返回 `null`。 */
export function parseWireFlag(value: unknown): TriStateFlag {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === 'string') {
    if (value === '1' || value === 'true') return true;
    if (value === '0' || value === 'false') return false;
  }
  return null;
}

/** 按指定编码写回；`null` 不写（返回 `undefined`，调用点据此省略属性）。 */
export function serializeWireFlag(
  value: TriStateFlag,
  encoding: 'numeric' | 'boolean' | 'todo' = 'boolean',
): string | undefined {
  if (value === null) return undefined;
  if (encoding === 'numeric' || encoding === 'todo') return value ? '1' : '0';
  return value ? 'true' : 'false';
}
