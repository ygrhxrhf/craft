/**
 * 「重新定位或裁剪」(G66). Two numbers describe the frame: where the image sits inside it
 * (`position`, 0–100 on each axis, the CSS `object-position`) and how far it is zoomed (`scale`,
 * 1–3). Past the edges the drag clamps rather than wrapping, and a stored value that is not a
 * number reads as the centered, uncropped default.
 */

export interface ImageFrame {
  x: number;
  y: number;
  scale: number;
}

export const DEFAULT_FRAME: ImageFrame = { x: 50, y: 50, scale: 1 };

const MIN_SCALE = 1;
const MAX_SCALE = 3;

function axis(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readImageFrame(attrs: {
  posX?: unknown;
  posY?: unknown;
  scale?: unknown;
}): ImageFrame {
  return {
    x: clamp(axis(attrs.posX, DEFAULT_FRAME.x), 0, 100),
    y: clamp(axis(attrs.posY, DEFAULT_FRAME.y), 0, 100),
    scale: clamp(axis(attrs.scale, DEFAULT_FRAME.scale), MIN_SCALE, MAX_SCALE),
  };
}

/** A drag moves the image; the pointer travels in the frame's own pixels. */
export function moveFrame(frame: ImageFrame, dx: number, dy: number, width: number, height: number): ImageFrame {
  if (width <= 0 || height <= 0) return frame;
  return {
    ...frame,
    x: clamp(frame.x - (dx / width) * 100, 0, 100),
    y: clamp(frame.y - (dy / height) * 100, 0, 100),
  };
}

/** Each step zooms by a fixed fraction, and stops at the two ends. */
export const SCALE_STEP = 0.25;

export function zoomFrame(frame: ImageFrame, direction: 1 | -1): ImageFrame {
  return { ...frame, scale: clamp(frame.scale + direction * SCALE_STEP, MIN_SCALE, MAX_SCALE) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The CSS for a frame. At the default it is exactly `object-cover` with no transform. */
export function frameStyle(frame: ImageFrame): { objectPosition: string; transform: string } {
  return {
    objectPosition: `${frame.x}% ${frame.y}%`,
    transform: frame.scale === 1 ? 'none' : `scale(${frame.scale})`,
  };
}
