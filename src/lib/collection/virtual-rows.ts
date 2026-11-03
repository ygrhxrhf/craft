/**
 * G484 / G273 —— 集合表格的虚拟化窗口。官方在**行数 × 可见列数 > 600** 时切到虚拟化渲染
 * （隐藏列不计），滚动更新走 **rAF + 150ms 防抖** 双路，窗口外多留 `overscan: 2` 行。
 *
 * 这一层只算"该渲染哪几行、上下各留多高"，没有 DOM，便于单测；行高是本地常量
 * （官方另有分组标题行的独立常数，这里是 36px 与 40px 两枚）。
 */

export const ROW_HEIGHT = 36;
export const GROUP_HEADER_HEIGHT = 40;
export const OVERSCAN = 2;
export const SCROLL_DEBOUNCE_MS = 150;

export interface RowWindow {
  /** 第一个要渲染的行下标（含）。 */
  start: number;
  /** 最后一个要渲染的行下标（不含）。 */
  end: number;
  /** 顶部占位高度（未渲染的行）。 */
  topPad: number;
  /** 底部占位高度。 */
  bottomPad: number;
}

/** 计算要渲染的行窗口：按滚动位置与视口高度取交集，再各向外扩 `overscan` 行。 */
export function visibleRowWindow(args: {
  scrollTop: number;
  viewportHeight: number;
  rowCount: number;
  rowHeight?: number;
  overscan?: number;
}): RowWindow {
  const rowHeight = args.rowHeight ?? ROW_HEIGHT;
  const overscan = args.overscan ?? OVERSCAN;
  const rowCount = Math.max(0, Math.floor(args.rowCount));
  if (rowCount === 0) return { start: 0, end: 0, topPad: 0, bottomPad: 0 };

  const scrollTop = Math.max(0, args.scrollTop);
  const first = Math.floor(scrollTop / rowHeight);
  const visible = Math.max(1, Math.ceil(args.viewportHeight / rowHeight));
  const start = Math.max(0, first - overscan);
  const end = Math.min(rowCount, first + visible + overscan);
  return {
    start,
    end,
    topPad: start * rowHeight,
    bottomPad: Math.max(0, (rowCount - end) * rowHeight),
  };
}

/**
 * 滚动更新的一条通路：**rAF 立刻画一帧**，再加一枚 150ms 的尾随防抖兜底长时间连续滚动。
 * 返回 `cancel` 以便组件卸载时清掉两条挂起任务。
 */
export function scheduleScrollUpdate(update: () => void): () => void {
  let frame: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    frame = null;
    update();
  };
  if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(run);
  timer = setTimeout(run, SCROLL_DEBOUNCE_MS);
  return () => {
    if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    if (timer !== null) clearTimeout(timer);
  };
}
