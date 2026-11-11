import { describe, expect, it } from 'vitest';

import { isStyleDirty, stylePatchOf } from './custom-style-patch';

describe('自定义样式补丁与脏态（G151）', () => {
  it('captures only the observable appearance keys, in a fixed order', () => {
    const patch = stylePatchOf({
      theme: 'fire-horse',
      themeColor: '#f7c98f',
      textColor: '#400000',
      backgroundColor: '#FFF8F0 #1A1208',
      fontPack: 'system-serif',
      washi: 'sunset',
      separatorStyleRaw: 'washi(pattern, "grid", "#3B82F6")',
      backdrop: '#FDE68A',
      showTitle: false,
      spelling: true,
    });
    expect(patch).toEqual({
      theme: 'fire-horse',
      themeColor: '#f7c98f',
      textColor: '#400000',
      backgroundColor: '#FFF8F0 #1A1208',
      fontPack: 'system-serif',
      washi: 'sunset',
      separatorStyleRaw: 'washi(pattern, "grid", "#3B82F6")',
      backdrop: '#FDE68A',
    });
    expect(Object.keys(patch)).toEqual([
      'theme',
      'themeColor',
      'textColor',
      'backgroundColor',
      'fontPack',
      'washi',
      'separatorStyleRaw',
      'backdrop',
    ]);
  });

  it('ignores non-string and empty values', () => {
    expect(stylePatchOf({ theme: '', textColor: undefined } as never)).toEqual({});
    expect(stylePatchOf(null)).toEqual({});
  });

  it('is clean right after applying the saved style', () => {
    const saved = { theme: 'mint', themeColor: '#ecfaf5', fontPack: 'system' };
    expect(isStyleDirty(saved, { theme: 'mint', themeColor: '#ecfaf5', fontPack: 'system', showTitle: false })).toBe(false);
  });

  it('turns dirty once any captured key changes', () => {
    const saved = { theme: 'mint', themeColor: '#ecfaf5' };
    expect(isStyleDirty(saved, { theme: 'sky', themeColor: '#ecfaf5' })).toBe(true);
    expect(isStyleDirty(saved, { theme: 'mint', themeColor: '#000000' })).toBe(true);
    expect(isStyleDirty(saved, { theme: 'mint' })).toBe(true);
  });

  it('has no dirty state before any style was applied', () => {
    expect(isStyleDirty(null, { theme: 'sky' })).toBe(false);
    expect(isStyleDirty(undefined, { theme: 'sky' })).toBe(false);
  });
});