import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cropMaskForFrame, cropMaskFromFrame, parseCropMask, serializeCropMask } from './image-crop';

describe('the crop mask wire shape (G503)', () => {
  it('reads the pipe string only when all four components are valid', () => {
    expect(parseCropMask('0.1|0.2|0.5|0.5')).toEqual({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 });
    // All-or-nothing: one bad component nukes the whole mask.
    expect(parseCropMask('0.1|oops|0.5|0.5')).toBeNull();
    expect(parseCropMask('0.1|0.2|0.5')).toBeNull();
    expect(parseCropMask('0.1|0.2|0|0.5')).toBeNull();
    expect(parseCropMask('')).toBeNull();
    expect(parseCropMask(null)).toBeNull();
  });

  it('serializes back to the same four-part string', () => {
    expect(serializeCropMask({ x: 0, y: 0, w: 1, h: 1 })).toBe('0|0|1|1');
    expect(serializeCropMask({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 })).toBe('0.1|0.2|0.5|0.5');
    expect(serializeCropMask(null)).toBeNull();
    expect(serializeCropMask({ x: 0, y: 0, w: 0, h: 1 })).toBeNull();
  });

  it('derives the visible rect from the position/scale frame', () => {
    expect(cropMaskFromFrame({ x: 50, y: 50, scale: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(cropMaskFromFrame({ x: 100, y: 0, scale: 2 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
    expect(cropMaskForFrame({ x: 50, y: 50, scale: 2 })).toBe('0.25|0.25|0.5|0.5');
  });

  it('is wired into the image block and its cropper', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const block = read('../../components/editor/extensions/image-block.tsx');
    const view = read('../../components/editor/extensions/image-block-view.tsx');
    expect(block).toContain('cropMask');
    expect(block).toContain('rawImageWidth');
    expect(view).toContain('cropMask: cropMaskForFrame(next)');
    expect(view).toContain('rawAspectRatio');
  });
});
