/**
 * G632 —— `Delete`（⌦）是 Backspace 的**残缺镜像**（`keyboard.md`，官方 `jsn` @3647994）。
 *
 * 官方那支的闸门与档位，逐条读出来是：
 *   - **闸门**：折叠光标 **且** 在**块末尾**（`parentOffset === parent.content.size`）；
 *   - **只有两档**：① 本块是空的 ⇒ 删掉自己并把选区落到下一块；② 下一块是文本块 ⇒ **向后合并**
 *     （`joinForward`）；
 *   - **完全没有**列表／缩进／装饰的退档链——那三段是 Backspace 独有的（G578 的六步链）。
 *
 * 本地此前既不绑 `Delete`（`grep` 只命中文档删除确认 UI），也不区分这两档。本模块把闸门与档位
 * 写成纯核，键位层只做"该不该吃掉这枚键 + 走哪一档"。
 *
 * ☆ 官方自身两把键在"撤销后选区如何恢复"上不对称（`Ece` 不挂 undo/redo side effect，`Dsn` 两个都挂），
 *   那是官方实现细节；本地撤销交给 ProseMirror history，不在本模块复刻该不对称。
 */

export type DeleteStep = 'delete-self' | 'join-forward' | 'none';

export interface DeleteContext {
  /** 光标折叠（无选区）。 */
  collapsed: boolean;
  /** 光标在所在文本块的**末尾**（`parentOffset === parent.content.size`）。 */
  atBlockEnd: boolean;
  /** 光标所在块是不是空的。 */
  blockEmpty: boolean;
  /** 下一块是不是文本块（段落／标题）——只有文本块才吃"向后合并"。 */
  nextIsText: boolean;
  /** 有没有下一块（末块没有）。 */
  hasNext: boolean;
}

/**
 * `Delete` 在块末尾该走哪一档：
 *   - 不在折叠态／不在块末尾 ⇒ `none`（把键交回默认，让 ProseMirror 处理块内删除）；
 *   - 块是空的且**有下一块** ⇒ `delete-self`（删自己、选区落下一块）；
 *   - 下一块是文本块 ⇒ `join-forward`（向后合并）；
 *   - 其余（末块、或下一块不是文本）⇒ `none`。
 * ★ 与 Backspace 不同：这里**没有** list／indent／decoration 三档——官方那三段是 Backspace 专属。
 */
export function deleteStepFor(ctx: DeleteContext): DeleteStep {
  if (!ctx.collapsed || !ctx.atBlockEnd) return 'none';
  if (ctx.blockEmpty && ctx.hasNext) return 'delete-self';
  if (ctx.hasNext && ctx.nextIsText) return 'join-forward';
  return 'none';
}
