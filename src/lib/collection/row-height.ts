/**
 * G498 —— 行高做**设备像素对齐**。
 *
 * 官方 `g8n() = Math.round(ROW_HEIGHT × devicePixelRatio) / devicePixelRatio`：把 35 CSS px
 * 乘成设备像素、取整、再除回去。目的是让每一行的角都落在整设备像素上——在 1.25x / 1.5x
 * 这类非整数 DPR 的屏上，35px 会算出 43.75 / 52.5 个设备像素，相邻行的边界各落半个像素，
 * 累积出可见的缝隙或忽粗忽细的分隔线。
 *
 * 这一层是纯函数：DPR 由调用方给，不读 `window`，单测里能逐档枚举。
 */
import { ROW_HEIGHT } from './virtual-rows';

/** 基准行高（官方 `ROW_HEIGHT: 35`），从虚拟化窗口那层共用同一个数。 */
export const ROW_HEIGHT_PX = ROW_HEIGHT;

/**
 * 把 CSS px 吸附到当前 DPR 下的整数设备像素。
 * 非有限值或非法 DPR（0／负数／NaN）原样退回输入——宁可不对齐，也不把行高算成 NaN。
 */
export function snapToDevicePixels(px: number, dpr: number): number {
  if (!Number.isFinite(px) || !Number.isFinite(dpr) || dpr <= 0) return px;
  return Math.round(px * dpr) / dpr;
}

/** 行高按 DPR 吸附后的值（1x 下恒为 35，1.25x 下 35.2，1.5x 下 35.33…）。 */
export function snappedRowHeight(dpr: number): number {
  return snapToDevicePixels(ROW_HEIGHT_PX, dpr);
}

/** 直接给 `style` 用的字符串形式。 */
export function snappedRowHeightCss(dpr: number): string {
  return `${snappedRowHeight(dpr)}px`;
}

/** 行间的水平内边距同样吸附（官方 `CELL_H_PADDING: 10`）。 */
export function snappedCellPadding(dpr: number): string {
  return `${snapToDevicePixels(10, dpr)}px`;
}