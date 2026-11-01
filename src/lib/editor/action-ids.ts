/**
 * G282 —— `undo`/`redo` 是**协议级 action**，与 `setTextStyle` 同列在官方那张 26 项分派表里
 * （`model.md` §一之六 9）。
 *
 * 本地 undo 是纯客户端栈（ProseMirror history / Yjs UndoManager），不是可分派的 action；
 * 表内另有 6 个此前完全未记录的 action：`setLineType`（分隔符三档）、
 * `setPageParagraphSpacingType`、`setPageStylePreset`、`duplicateSubtree`、
 * `insertNewBlocksToObjectList`、`toggleCoverImageEnabled`。
 *
 * 本模块把这张表的 id 与"本地有没有对应"集中一处——它是一枚**名册**：`undo`/`redo` 标成
 * "协议级但本地走客户端栈"，其余六个标出哪些本地已有等价能力、哪些没有。
 */

export type ActionStatus =
  /** 本地有等价能力（可能是另一条路径，如客户端栈）。 */
  | 'equivalent'
  /** 本地无对应实现。 */
  | 'missing';

export interface ProtocolAction {
  id: string;
  status: ActionStatus;
  /** 本地对应物的一句话说明（`missing` 时为缺口描述）。 */
  local: string;
}

/**
 * 官方那张 26 项分派表里，本地此前**未记录**的那几项，加上 undo/redo 的协议地位。
 * 已落的本地能力也标出来，好让"本地有没有"这一格可查。
 */
export const PROTOCOL_ACTIONS: readonly ProtocolAction[] = [
  // 协议级撤销：官方是 action，本地走客户端栈（G586 的补丁栈是它的形状）。
  { id: 'undo', status: 'equivalent', local: 'ProseMirror history / Yjs UndoManager（客户端栈，非协议 action）' },
  { id: 'redo', status: 'equivalent', local: '同上' },
  // 分隔符三档：本地分隔线已有五档形态（G1560），setLineType 是它的协议名。
  { id: 'setLineType', status: 'equivalent', local: '分隔线五档（divider-styles）' },
  // 封面开关：本地有 coverImage/coverType。
  { id: 'toggleCoverImageEnabled', status: 'equivalent', local: 'coverImage/coverType 两列' },
  // 顶层块复制：本地有 cloneWithFreshBlockIds（G573）。
  { id: 'duplicateSubtree', status: 'equivalent', local: 'clone-block 的 cloneWithFreshBlockIds' },
  // 以下三项本地无对应。
  { id: 'setPageParagraphSpacingType', status: 'missing', local: '无段落间距档位' },
  { id: 'setPageStylePreset', status: 'missing', local: '无页面样式预设（只有逐项样式）' },
  { id: 'insertNewBlocksToObjectList', status: 'missing', local: '无对象列表插入' },
];

export function protocolAction(id: string): ProtocolAction | null {
  return PROTOCOL_ACTIONS.find((action) => action.id === id) ?? null;
}

export function missingProtocolActions(): ProtocolAction[] {
  return PROTOCOL_ACTIONS.filter((action) => action.status === 'missing');
}

/** `undo`/`redo` 在协议表里是一等 action（不是"编辑器内部机制"）。 */
export function isProtocolUndo(id: string): boolean {
  return id === 'undo' || id === 'redo';
}
