/**
 * G1663 —— 页头动作簇的挂点。
 *
 * 官方的「网格 / 列表 / 瀑布 + ⋯」画在**顶栏右侧**，不在卡片网格上方单独占一行；本地要跟它
 * 对齐就得让页面里的控件渲染进页头。两条 React 树之间没有父子关系（页头由布局渲染，控件由
 * 页面组件渲染），所以这里用一枚模块级的**外部系统**做交接：页头把自己的挂点节点登记进来，
 * 页面组件通过 `useSyncExternalStore` 订阅这个节点。
 *
 * 刻意不放进 effect 里 setState：那会在渲染后连锁触发一轮额外渲染（ESLint
 * `react-hooks/set-state-in-effect`）。订阅外部系统正是 `useSyncExternalStore` 的用途。
 */
let node: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setHeaderActionsNode(next: HTMLElement | null) {
  if (node === next) return;
  node = next;
  for (const listener of listeners) listener();
}

export function getHeaderActionsNode(): HTMLElement | null {
  return node;
}

export function subscribeHeaderActions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
