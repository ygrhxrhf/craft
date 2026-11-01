/**
 * G601 —— `stopTextEdit` 与 `restoreTextEdit` **成对** ⇒「退出编辑」是**可恢复的**
 * （`model.md` §一之三十二 5 的 `backupSelection` 消费方在此）。
 *
 * 官方那支 `stopTextEdit{allowToBeRemovedWhenEmpty, backupSelection}`：离开编辑态时决定
 * ① **空块是否删除**（`allowToBeRemovedWhenEmpty`）② **是否带上备份选区**（`backupSelection`），
 * 于是"点出去空块消失、再点回来选区还在"这件事有实现体。本地靠 TipTap 默认（无这对动作）。
 *
 * 本模块把这对动作的状态机写成纯核：进编辑态记备份、出编辑态按两个开关决定删不删块、
 * 恢复时把备份选区还回去。
 */

export interface EditBackup {
  /** 备份的选区端点（本地用文档坐标）。 */
  anchor: number;
  head: number;
  /** 备份属于哪个块。 */
  blockId: string;
}

export interface TextEditState {
  /** 当前正在编辑的块；`null`＝不在编辑态。 */
  editingBlockId: string | null;
  /** 上一次退出时留下的备份选区；`null`＝没有可恢复的。 */
  backup: EditBackup | null;
}

export function initialTextEditState(): TextEditState {
  return { editingBlockId: null, backup: null };
}

/** `startTextEdit`：进编辑态并记下进入时的选区（备份只在**进入**时生成，退出时用它）。 */
export function startTextEdit(
  state: TextEditState,
  input: { blockId: string; anchor: number; head: number },
): TextEditState {
  return {
    editingBlockId: input.blockId,
    backup: { blockId: input.blockId, anchor: input.anchor, head: input.head },
  };
}

export interface StopTextEditInput {
  /** 官方 `allowToBeRemovedWhenEmpty`：空块是否允许被删掉。 */
  allowToBeRemovedWhenEmpty: boolean;
  /** 官方 `backupSelection`：这次退出要不要留下可恢复的备份。 */
  backupSelection: boolean;
  /** 当前块是否完全为空（见 `format-downgrade.ts` 的 `isEmptyBlock`）。 */
  blockEmpty: boolean;
}

export interface StopTextEditResult {
  state: TextEditState;
  /** 是否该把这个空块删掉（`allowToBeRemovedWhenEmpty && blockEmpty`）。 */
  removeBlock: boolean;
}

/**
 * `stopTextEdit`：出编辑态。**空块删除**只在 `allowToBeRemovedWhenEmpty` 为真且块为空时发生；
 * **备份选区**只在 `backupSelection` 为真时留下——两者是独立开关，不是同一个决定的两种说法。
 */
export function stopTextEdit(state: TextEditState, input: StopTextEditInput): StopTextEditResult {
  const removeBlock = input.allowToBeRemovedWhenEmpty && input.blockEmpty;
  return {
    state: {
      editingBlockId: null,
      backup: input.backupSelection ? state.backup : null,
    },
    removeBlock,
  };
}

/**
 * `restoreTextEdit`：回到编辑态并**把备份选区还回去**。备份不在（或被清）⇒ 只进编辑态、
 * 选区交给调用方（不发明一个位置）。
 */
export function restoreTextEdit(
  state: TextEditState,
): { state: TextEditState; selection: EditBackup | null } {
  if (!state.backup) return { state, selection: null };
  return {
    state: { editingBlockId: state.backup.blockId, backup: state.backup },
    selection: state.backup,
  };
}
