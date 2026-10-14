/**
 * 剪贴板边界的纯判据（官方 `ClipboardBoundary`＝617 B 一个组件的全部，
 * 见 `docs/craft-ref/features/internals.md` §十二 1）。
 *
 * 官方形状里最要紧的一条是**三种事件共用同一个 handler 引用**：边界不区分
 * cut/copy/paste，一律"到此为止"，作用域由 DOM 表达，不由事件类型表达。
 *
 * ☆ 官方的 `stop` 函数体从未采到（该节"仍未采到"明写着 preventDefault 还是
 *   stopPropagation 未证）⇒ 本地取 `stopPropagation`：内层表面（公式 textarea、
 *   代码块语言搜索框、图片 alt 输入）要把事件留给自己，靠的是"外层编辑器看不见"；
 *   `preventDefault` 会把剪贴板本身打死，内层反而不能粘贴了。
 */
export const CLIPBOARD_EVENTS = ['cut', 'copy', 'paste'] as const;

export type ClipboardIntent = (typeof CLIPBOARD_EVENTS)[number];

/** 只声明用到的两个字段，便于纯测（真事件是 ClipboardEvent）。 */
export interface ClipboardLikeEvent {
  type: string;
  stopPropagation(): void;
}

export function createClipboardStop(
  onIntent?: (intent: ClipboardIntent, event: ClipboardLikeEvent) => void,
): (event: ClipboardLikeEvent) => void {
  return (event) => {
    event.stopPropagation();
    const intent = event.type as ClipboardIntent;
    if (CLIPBOARD_EVENTS.includes(intent)) onIntent?.(intent, event);
  };
}
