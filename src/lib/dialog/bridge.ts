/**
 * 命令式弹层 ↔ Promise 桥：官方 `RenderOptionsPanel.utils`（799 B chunk）的形状，
 * 见 `docs/craft-ref/features/internals.md` §十二 3。
 *
 * 三条不能省的细节：
 * 1. 解析前先把 `callback` 置回 noop ⇒ 一个 `show()` 只解析一次（幂等）；
 * 2. 任何终止路径都补发一次 `closed` ⇒ 关闭是"结局之后"的独立事件，UI 侧只认它；
 * 3. `cancelled` 与"提交了什么"是两种终态 ⇒ 这正是 `window.prompt` 分不出来的那一档。
 */
export type OpenEvent<C> = { type: 'open'; config: C };
export type ClosedEvent = { type: 'closed' };
export type DialogEvent<C> = OpenEvent<C> | ClosedEvent;

export type Submitted<S> = { type: 'submitted'; config: S };
/** G482: how the dialog was dismissed, so form panels can tell the terminal states apart. */
export type CloseReason = 'escape' | 'overlay' | 'dismiss';
export type Cancelled = { type: 'cancelled'; reason?: CloseReason };
export type DialogResult<S> = Submitted<S> | Cancelled;

type Noop = () => void;

const noop: Noop = () => {};

export function createPromiseBridge<C, S>(dispatch: (event: DialogEvent<C>) => void) {
  let callback: (result: DialogResult<S>) => void = noop;

  return {
    show(config: C): Promise<DialogResult<S>> {
      return new Promise<DialogResult<S>>((resolve) => {
        callback = (result) => {
          callback = noop;
          dispatch({ type: 'closed' });
          resolve(result);
        };
        dispatch({ type: 'open', config });
      });
    },
    cancel(reason: CloseReason = 'dismiss'): void {
      callback({ type: 'cancelled', reason });
    },
    submitResult(config: S): void {
      callback({ type: 'submitted', config });
    },
  };
}
