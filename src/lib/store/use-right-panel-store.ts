import { create } from 'zustand';

/**
 * G1578: a shell shortcut (e.g. Ctrl-Shift-M) lives above the editor, while the comments UI lives
 * inside the right panel. This tiny request channel lets the shortcut open that panel on the info
 * tab without reaching into the editor's local state.
 */
interface RightPanelRequestState {
  request: number;
  tab: 'insert' | 'format' | 'style' | 'info';
  open: (tab: RightPanelRequestState['tab']) => void;
}

export const useRightPanelStore = create<RightPanelRequestState>((set) => ({
  request: 0,
  tab: 'info',
  open: (tab) => set((state) => ({ request: state.request + 1, tab })),
}));
