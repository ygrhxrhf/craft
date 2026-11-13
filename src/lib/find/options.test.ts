import { describe, expect, it } from 'vitest';

import { DEFAULT_FIND_OPTIONS, readFindOptions, writeFindOptions, type FindOptions } from './options';

/** A localStorage stand-in: the reader and writer only ever touch these two methods. */
function box(seed?: Record<string, string>) {
  const map = new Map(Object.entries(seed ?? {}));
  return {
    map,
    storage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    },
  };
}

const stored = (value: unknown): Record<string, string> => ({
  'craft.find.options': JSON.stringify(value),
});

describe('G1418 find options — the persisted row', () => {
  it('defaults to 这一页 + 文本 + 区分大小写关 + 变音开', () => {
    expect(DEFAULT_FIND_OPTIONS).toEqual({
      mode: 'text',
      scope: 'page',
      caseSensitive: false,
      ignoreDiacritics: true,
    });
    expect(readFindOptions(box().storage)).toEqual(DEFAULT_FIND_OPTIONS);
  });

  it('round-trips a full record', () => {
    const { storage } = box();
    const options: FindOptions = {
      mode: 'regex',
      scope: 'doc',
      caseSensitive: true,
      ignoreDiacritics: false,
    };
    writeFindOptions(storage, options);
    expect(readFindOptions(storage)).toEqual(options);
  });

  it('narrows a partial record field by field instead of dropping the whole row', () => {
    // Only `mode` survived: the other three fall back to their defaults, not to "absent".
    const { storage } = box(stored({ mode: 'regex' }));
    expect(readFindOptions(storage)).toEqual({ ...DEFAULT_FIND_OPTIONS, mode: 'regex' });
  });

  it('rejects values outside each field’s own domain', () => {
    const { storage } = box(stored({ mode: 'wildcard', scope: 'selection', caseSensitive: 'yes', ignoreDiacritics: 0 }));
    expect(readFindOptions(storage)).toEqual(DEFAULT_FIND_OPTIONS);
  });

  it('falls back to the defaults on unparseable JSON', () => {
    const { storage } = box({ 'craft.find.options': '{not json' });
    expect(readFindOptions(storage)).toEqual(DEFAULT_FIND_OPTIONS);
    const nullish = box({ 'craft.find.options': 'null' });
    expect(readFindOptions(nullish.storage)).toEqual(DEFAULT_FIND_OPTIONS);
  });

  it('swallows a blocked storage on write', () => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => writeFindOptions(blocked, DEFAULT_FIND_OPTIONS)).not.toThrow();
  });
});
