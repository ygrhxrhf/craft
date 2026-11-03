/**
 * G503: the crop frame serializes as a pipe string `"x|y|w|h"`. Parsing is all-or-nothing:
 * one bad component makes the whole mask null instead of accepting a partial rect. The image
 * also keeps processed and raw sizes side by side (`aspectRatio/imageWidth` vs
 * `rawAspectRatio/rawImageWidth`).
 */
import { DEFAULT_FRAME, type ImageFrame } from './image-frame';

export interface CropMask {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isComponent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseCropMask(raw: unknown): CropMask | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parts = raw.split('|');
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => (part.trim() === '' ? Number.NaN : Number(part)));
  if (!numbers.every(isComponent)) return null;
  const [x, y, w, h] = numbers;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

export function serializeCropMask(mask: CropMask | null): string | null {
  if (!mask) return null;
  if (![mask.x, mask.y, mask.w, mask.h].every(isComponent) || mask.w <= 0 || mask.h <= 0) return null;
  return `${mask.x}|${mask.y}|${mask.w}|${mask.h}`;
}

/** The rect a `{position, scale}` frame shows, in normalized image coordinates. */
export function cropMaskFromFrame(frame: ImageFrame): CropMask {
  if (frame.scale <= 1) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const w = 1 / frame.scale;
  const h = 1 / frame.scale;
  return {
    x: (frame.x / 100) * (1 - w),
    y: (frame.y / 100) * (1 - h),
    w,
    h,
  };
}

export function cropMaskForFrame(frame: ImageFrame): string | null {
  return serializeCropMask(cropMaskFromFrame(frame ?? DEFAULT_FRAME));
}
