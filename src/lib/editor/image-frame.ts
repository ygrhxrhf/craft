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

/**
 * G1417: Image editor aspect ratio roster and nearest-match logic.
 * Official bundle extracts (ImageEditorPopup):
 * 6 tiers: default, freeform, 16:9, 2:1, 3:1, 4:3
 * Iterates ["default", "16:9", "2:1", "3:1", "4:3"], strict Math.abs(t - value) < 0.1, fallback "freeform".
 */
export type AspectTier = 'default' | 'freeform' | '16:9' | '2:1' | '3:1' | '4:3';

export interface AspectDefinition {
  type: 'fixed' | 'free';
  value?: number;
}

export const ASPECT_TIER_ORDER: AspectTier[] = [
  'default',
  'freeform',
  '16:9',
  '2:1',
  '3:1',
  '4:3',
];

export const ASPECT_MATCH_CANDIDATES: AspectTier[] = [
  'default',
  '16:9',
  '2:1',
  '3:1',
  '4:3',
];

export const ASPECT_TOLERANCE = 0.1;

export function buildAspectTable(defaultValue: number = 1.5): Map<AspectTier, AspectDefinition> {
  return new Map<AspectTier, AspectDefinition>([
    ['default', { type: 'fixed', value: Number(defaultValue.toFixed(4)) }],
    ['freeform', { type: 'free' }],
    ['16:9', { type: 'fixed', value: Number((16 / 9).toFixed(4)) }],
    ['2:1', { type: 'fixed', value: 2 }],
    ['3:1', { type: 'fixed', value: 3 }],
    ['4:3', { type: 'fixed', value: Number((4 / 3).toFixed(4)) }],
  ]);
}

/**
 * Match a numeric aspect ratio (width / height) to the nearest fixed tier within 0.1 tolerance.
 * Falls back to 'freeform' when no tier matches.
 */
export function matchAspectTier(
  ratio: number,
  defaultValue: number = 1.5,
  table: Map<AspectTier, AspectDefinition> = buildAspectTable(defaultValue),
): AspectTier {
  for (const tier of ASPECT_MATCH_CANDIDATES) {
    const def = table.get(tier);
    if (def?.type === 'fixed' && typeof def.value === 'number') {
      if (Math.abs(ratio - def.value) < ASPECT_TOLERANCE) {
        return tier;
      }
    }
  }
  return 'freeform';
}

/** The ratio a picked tier stands for. Freeform and default fall back to the given ratio. */
export function aspectValueFor(tier: AspectTier, defaultRatio: number = 1.5): number {
  if (tier === 'freeform' || tier === 'default') return defaultRatio;
  const def = buildAspectTable(defaultRatio).get(tier);
  return def?.type === 'fixed' && typeof def.value === 'number' ? def.value : defaultRatio;
}

