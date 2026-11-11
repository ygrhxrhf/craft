/**
 * G727 —— 「在任务视图中」的 `Ctrl-Z`／`Ctrl-Shift-Z`。视图只记**自己做过的写**：
 * 每条 entry 自带反向/重做两个闭包，栈本身只管顺序，不猜任何业务语义。
 * `future` 在压入新动作时清空（做了新事，就没有可重做的分支了），与编辑器历史的惯例一致。
 */
export interface UndoEntry {
  label: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

export interface UndoState {
  past: UndoEntry[];
  future: UndoEntry[];
}

export const EMPTY_UNDO: UndoState = { past: [], future: [] };

/** 只保留最近这些步；一页任务屏的历史不该无限长。 */
export const UNDO_DEPTH = 50;

export function pushUndo(state: UndoState, entry: UndoEntry): UndoState {
  const past = [...state.past, entry];
  return {
    past: past.length > UNDO_DEPTH ? past.slice(past.length - UNDO_DEPTH) : past,
    future: [],
  };
}

/** 取最近一步并从 `past` 移进 `future`；没有可撤销的就原样返回。 */
export function takeUndo(state: UndoState): { state: UndoState; entry: UndoEntry | null } {
  const entry = state.past[state.past.length - 1] ?? null;
  if (!entry) return { state, entry: null };
  return {
    state: { past: state.past.slice(0, -1), future: [entry, ...state.future] },
    entry,
  };
}

export function takeRedo(state: UndoState): { state: UndoState; entry: UndoEntry | null } {
  const entry = state.future[0] ?? null;
  if (!entry) return { state, entry: null };
  return {
    state: { past: [...state.past, entry], future: state.future.slice(1) },
    entry,
  };
}
