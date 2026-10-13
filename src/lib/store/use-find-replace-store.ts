import { create } from 'zustand';

import type { FindMatch, FindMode } from '@/lib/find/matcher';

/** `find.*` / `panels.md §六`: two modes and two scopes, held as options rather than one enum each. */
export type FindScope = 'doc' | 'page';

interface FindReplaceState {
  open: boolean;
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
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setReplacement: (replacement: string) => void;
  setMode: (mode: FindMode) => void;
  setScope: (scope: FindScope) => void;
  setCaseSensitive: (caseSensitive: boolean) => void;
  setResults: (result: { matches: FindMatch[]; current: number; invalid: boolean }) => void;
  clear: () => void;
}

export const useFindReplaceStore = create<FindReplaceState>((set) => ({
  open: false,
  query: '',
  replacement: '',
  mode: 'text',
  scope: 'page',
  matches: [],
  current: -1,
  invalid: false,
  caseSensitive: false,
  setOpen: (open) => set({ open, ...(open ? {} : { matches: [], current: -1 }) }),
  setQuery: (query) => set({ query }),
  setReplacement: (replacement) => set({ replacement }),
  setMode: (mode) => set({ mode }),
  setScope: (scope) => set({ scope }),
  setCaseSensitive: (caseSensitive) => set({ caseSensitive }),
  setResults: ({ matches, current, invalid }) => set({ matches, current, invalid }),
  clear: () => set({ matches: [], current: -1, invalid: false, query: '' }),
}));
