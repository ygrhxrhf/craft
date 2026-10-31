import { create } from 'zustand';

interface TitleRequestState {
  /** A nonce, so pressing rename twice still re-focuses the title. */
  request: number;
  ask: () => void;
}

/**
 * How a shell/editor shortcut reaches the document title input. The keymap
 * lives below the editor header, so the request travels through here instead
 * of reaching into the DOM from the key handler.
 */
export const useTitleRequestStore = create<TitleRequestState>((set) => ({
  request: 0,
  ask: () => set((state) => ({ request: state.request + 1 })),
}));
