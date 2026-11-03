import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { normalizeCoverImages, pickCoverImage } from './cover-rotation';

describe('cover rotation (G156)', () => {
  it('normalizes and de-duplicates the image list', () => {
    expect(normalizeCoverImages(['a', 'a', ' ', 'b'])).toEqual(['a', 'b']);
    expect(normalizeCoverImages('["a","b"]')).toEqual(['a', 'b']);
    expect(normalizeCoverImages(null)).toEqual([]);
  });

  it('picks randomly only when shuffle is on', () => {
    expect(pickCoverImage('first', ['a', 'b'], true, () => 0.99)).toBe('b');
    expect(pickCoverImage('first', ['a', 'b'], true, () => 0)).toBe('a');
    expect(pickCoverImage('first', ['a', 'b'], false, () => 0.99)).toBe('first');
  });

  it('falls back to the list when no single cover is set', () => {
    expect(pickCoverImage(null, ['a', 'b'], false)).toBe('a');
    expect(pickCoverImage(null, [], false)).toBeNull();
  });

  it('is wired into the editor, the style tab and the image block controls', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const editor = read('../../components/editor/DocumentEditor.tsx');
    const style = read('../../components/editor/tabs/StyleTab.tsx');
    const format = read('../../components/editor/tabs/FormatTab.tsx');
    const imageBlock = read('../../components/editor/extensions/image-block.tsx');
    expect(editor).toContain('pickCoverImage(coverImage, coverImages, coverShuffle)');
    expect(style).toContain('data-testid="cover-rotation"');
    expect(style).toContain('随机轮换');
    expect(format).toContain('data-testid="image-style"');
    expect(format).toContain("updateAttributes('imageBlock', { imageSize: value })");
    expect(format).toContain("updateAttributes('imageBlock', { imageFit: value })");
    expect(imageBlock).toContain('imageSize');
    expect(imageBlock).toContain('imageFit');
  });
});
