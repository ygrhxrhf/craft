import { create } from 'zustand';

interface RemindRequestState {
  /** A nonce, so asking twice still reopens the chooser. */
  request: number;
  ask: () => void;
  close: () => void;
}

/** G1596: the slash command 「提醒我…」 hands off to one chooser host. */
export const useRemindRequestStore = create<RemindRequestState>((set) => ({
  request: 0,
  ask: () => set((state) => ({ request: state.request + 1 })),
  close: () => set({ request: 0 }),
}));
