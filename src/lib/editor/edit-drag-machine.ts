/**
 * G591 —— 拖拽与进出编辑都是 **action 状态机**（`model.md` §一之三十二）。
 *
 * 官方那一族：
 *   - `startSelectionDragging{startPoint, startBlockId, startBlockHasOwnDrag}` /
 *     `updateSelectionDragging{endPoint, endBlockId}` / `stopSelectionDragging{removeState}`；
 *   - `startTextEdit{}` / `stopTextEdit{allowToBeRemovedWhenEmpty, backupSelection}` /
 *     `startCodeEdit` / `stopCodeEdit` / `toggleBlockEditor{blockId, isOpen}`；
 *   - `renderTextBackupSelection{value, backupSelectionType}`。
 *
 * 本地拖拽走 DOM `dragStateRef`、编辑态靠 TipTap 默认，**没有 action 化状态机**。本模块把两族
 * 动作写成一台可断言的状态机：调用方发事件、读状态，行为（空块清理、选区备份）由状态推出。
 */

export interface DragState {
  active: boolean;
  startPoint: { x: number; y: number } | null;
  startBlockId: string | null;
  /** 官方那个 `startBlockHasOwnDrag`：起点块是否自带拖拽（自带则不起新拖）。 */
  startBlockHasOwnDrag: boolean;
  endPoint: { x: number; y: number } | null;
  endBlockId: string | null;
}

export interface EditState {
  editingBlockId: string | null;
  /** `code` / `text` 两档编辑（官方 `startCodeEdit`/`startTextEdit` 分开）。 */
  editingKind: 'text' | 'code' | null;
}

export interface EditorMachineState {
  drag: DragState;
  edit: EditState;
}

export function initialEditorMachine(): EditorMachineState {
  return {
    drag: {
      active: false,
      startPoint: null,
      startBlockId: null,
      startBlockHasOwnDrag: false,
      endPoint: null,
      endBlockId: null,
    },
    edit: { editingBlockId: null, editingKind: null },
  };
}

export type EditorEvent =
  | { type: 'startSelectionDragging'; startPoint: { x: number; y: number }; startBlockId: string; startBlockHasOwnDrag: boolean }
  | { type: 'updateSelectionDragging'; endPoint: { x: number; y: number }; endBlockId: string }
  | { type: 'stopSelectionDragging' }
  | { type: 'startTextEdit'; blockId: string }
  | { type: 'startCodeEdit'; blockId: string }
  | { type: 'stopTextEdit' }
  | { type: 'stopCodeEdit' }
  | { type: 'toggleBlockEditor'; blockId: string; isOpen: boolean };

/**
 * 状态迁移。**自带拖拽的起点块不起新拖**（官方 `startBlockHasOwnDrag` 那条门控）——
 * 这是"拖把手"与"拖块"两种拖拽不互相抢的实现体。
 */
export function reduceEditor(state: EditorMachineState, event: EditorEvent): EditorMachineState {
  switch (event.type) {
    case 'startSelectionDragging':
      if (event.startBlockHasOwnDrag) return state; // 起点块自带拖拽 ⇒ 不起新拖
      return {
        ...state,
        drag: {
          active: true,
          startPoint: event.startPoint,
          startBlockId: event.startBlockId,
          startBlockHasOwnDrag: event.startBlockHasOwnDrag,
          endPoint: null,
          endBlockId: null,
        },
      };
    case 'updateSelectionDragging':
      if (!state.drag.active) return state;
      return { ...state, drag: { ...state.drag, endPoint: event.endPoint, endBlockId: event.endBlockId } };
    case 'stopSelectionDragging':
      // `removeState` ⇒ 整段拖拽态清掉，不是留一个 `active:false` 的空壳。
      return { ...state, drag: initialEditorMachine().drag };
    case 'startTextEdit':
      return { ...state, edit: { editingBlockId: event.blockId, editingKind: 'text' } };
    case 'startCodeEdit':
      return { ...state, edit: { editingBlockId: event.blockId, editingKind: 'code' } };
    case 'stopTextEdit':
    case 'stopCodeEdit':
      return { ...state, edit: { editingBlockId: null, editingKind: null } };
    case 'toggleBlockEditor':
      return {
        ...state,
        edit: event.isOpen
          ? { editingBlockId: event.blockId, editingKind: state.edit.editingKind ?? 'text' }
          : { editingBlockId: null, editingKind: null },
      };
  }
}

/** `renderTextBackupSelection{value, backupSelectionType}`：退出编辑时该渲染哪种备份选区。 */
export type BackupSelectionType = 'caret' | 'range' | 'none';

export function backupSelectionTypeOf(input: { hasBackup: boolean; anchor: number; head: number }): BackupSelectionType {
  if (!input.hasBackup) return 'none';
  return input.anchor === input.head ? 'caret' : 'range';
}
