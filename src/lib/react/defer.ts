/**
 * 把一次写入推到当前微任务之后执行。
 *
 * 用在「effect 里读一次浏览器状态 / 起一次取数」这类场景：React Compiler 的
 * `set-state-in-effect` 不允许 effect 在提交那一帧同步 setState（会级联渲染），
 * 而这类读取本来就发生在提交之后——推到微任务语义不变，只是不再和 effect 同帧。
 */
export function defer(task: () => void): void {
  void Promise.resolve().then(task);
}
