import { create } from 'zustand';

import type { FindMatch, FindMode } from '@/lib/find/matcher';
import {
  DEFAULT_FIND_OPTIONS,
  readFindOptions,
  writeFindOptions,
  type FindOptions,
  type FindScope,
} from '@/lib/find/options';

interface FindReplaceState {
  open: boolean;
  /**
   * G1570 —— 查找面板分两档：`⌘F` 只开查找框，`⌘⇧F` 才补出「替换为……」与替换按钮。
   * 官方 `Ctrl-F` 之后 `findInput:1 / replaceInput:0`，`Ctrl-Shift-F` 才两框齐 ⇒ 这一枚就是那两档的开关。
   */
  showReplace: boolean;
  query: string;
  replacement: string;
  mode: FindMode;
  scope: FindScope;
  matches: FindMatch[];
  /** -1 when there is no current match — the index is 0-based, the panel shows 1-based. */
  current: number;
  invalid: boolean;
  /**
   * Official `match.case` (feature-catalog:4458 =「区分大小写」). On by default the build
   * shows both cases; flipping it pins the RegExp to no `i` flag and that is the panel's toggle.
   * `find.replace.match.case` itself is not in the catalog, so the switch carries the parent
   * `match.case` label — declared local wording, not a copy of a collected child key.
   */
  caseSensitive: boolean;
  /**
   * G1418 「忽略变音符号（例如 ä = a）」 — the fourth official option, selected by default in the
   * captured panel. Its own bit, so it composes with mode, scope and case instead of replacing one.
   */
  ignoreDiacritics: boolean;
  setOpen: (open: boolean) => void;
  /** G1570: which tier the panel opens in (`false` = find only, `true` = find + replace). */
  openWith: (showReplace: boolean) => void;
  setQuery: (query: string) => void;
  setReplacement: (replacement: string) => void;
  setMode: (mode: FindMode) => void;
  setScope: (scope: FindScope) => void;
  setCaseSensitive: (caseSensitive: boolean) => void;
  setIgnoreDiacritics: (ignoreDiacritics: boolean) => void;
  setResults: (result: { matches: FindMatch[]; current: number; invalid: boolean }) => void;
  clear: () => void;
}

/**
 * Read once at store creation: this module is evaluated on the server too, where storage does not
 * exist, so the guard also keeps the SSR render on the defaults. The panel itself only renders
 * after an open event, so nothing serialized depends on these four fields — no hydration mismatch.
 */
function initialOptions(): FindOptions {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_FIND_OPTIONS };
  return readFindOptions(localStorage);
}

const start = initialOptions();

export const useFindReplaceStore = create<FindReplaceState>((set, get) => {
  /** Writes the whole option row, not the one field that moved — the record is one JSON blob. */
  const persistOptions = () => {
    if (typeof localStorage === 'undefined') return;
    const { mode, scope, caseSensitive, ignoreDiacritics } = get();
    writeFindOptions(localStorage, { mode, scope, caseSensitive, ignoreDiacritics });
  };

  return {
    open: false,
    showReplace: false,
    query: '',
    replacement: '',
    mode: start.mode,
    scope: start.scope,
    matches: [],
    current: -1,
    invalid: false,
    caseSensitive: start.caseSensitive,
    ignoreDiacritics: start.ignoreDiacritics,
    setOpen: (open) => set({ open, ...(open ? {} : { matches: [], current: -1 }) }),
    // G1570: opening via `⌘⇧F` also unrolls the replacement field; opening via `⌘F` does not.
    openWith: (showReplace) =>
      set({ open: true, showReplace, ...(showReplace ? {} : {}) }),
    setQuery: (query) => set({ query }),
    setReplacement: (replacement) => set({ replacement }),
    setMode: (mode) => {
      set({ mode });
      persistOptions();
    },
    setScope: (scope) => {
      set({ scope });
      persistOptions();
    },
    setCaseSensitive: (caseSensitive) => {
      set({ caseSensitive });
      persistOptions();
    },
    setIgnoreDiacritics: (ignoreDiacritics) => {
      set({ ignoreDiacritics });
      persistOptions();
    },
    setResults: ({ matches, current, invalid }) => set({ matches, current, invalid }),
    clear: () => set({ matches: [], current: -1, invalid: false, query: '' }),
  };
});
