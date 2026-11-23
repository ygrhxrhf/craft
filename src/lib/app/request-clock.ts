/**
 * 服务端渲染的「请求时钟」。
 *
 * 卡片副行的「已更新 N 分钟前」必须整页共用同一个时刻：各组件自己取一次 `Date.now()`，
 * SSR 与 hydration 会算出不同的分钟数，直接撞 Hydration failed。所以服务端组件在渲染体里
 * 取一次，再作为 `now` 往下传。
 *
 * 读取收敛到这一个显式调用，React Compiler 的 purity 规则（面向会重渲染的客户端组件）
 * 就不会把服务端组件的取时当成渲染期副作用——组件体里不再直接出现不纯的全局调用。
 */
export function requestNow(): number {
  return Date.now();
}
