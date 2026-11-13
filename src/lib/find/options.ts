import type { FindMode } from './matcher';

/**
 * G1418 — the four options the official panel keeps as bits: two mutually exclusive pairs
 * (`scope` 这一页／完整文档, `regexp` 文本／正则表达式) and two independent switches
 * (`match.case`, 「忽略变音符号」). The captured panel defaults to 这一页 + 文本 + 变音开.
 */
export type FindScope = 'doc' | 'page';

export interface FindOptions {
  mode: FindMode;
  scope: FindScope;
  caseSensitive: boolean;
  ignoreDiacritics: boolean;
}

export const DEFAULT_FIND_OPTIONS: FindOptions = {
  mode: 'text',
  scope: 'page',
  caseSensitive: false,
  ignoreDiacritics: true,
};

/**
 * The official regex option carries a persistence bit (`isRegexp` in the captured bundle). Local
 * keeps the whole option row in one record — the extra three fields are a local choice, the
 * persisted regex bit itself is the official fact.
 */
const STORAGE_KEY = 'craft.find.options';

export function readFindOptions(storage: { getItem(key: string): string | null }): FindOptions {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_FIND_OPTIONS };
  try {
    const parsed = JSON.parse(raw) as Partial<FindOptions> | null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_FIND_OPTIONS };
    return {
      mode: parsed.mode === 'regex' ? 'regex' : 'text',
      scope: parsed.scope === 'doc' ? 'doc' : 'page',
      caseSensitive: parsed.caseSensitive === true,
      ignoreDiacritics: parsed.ignoreDiacritics !== false,
    };
  } catch {
    return { ...DEFAULT_FIND_OPTIONS };
  }
}

export function writeFindOptions(
  storage: { setItem(key: string, value: string): void },
  options: FindOptions,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // A blocked storage still keeps the options for this session; nothing else to do.
  }
}
