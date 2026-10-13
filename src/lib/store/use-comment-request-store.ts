import { create } from 'zustand';

interface CommentRequestState {
  /** A nonce, so asking twice in a row still re-opens the composer. */
  request: number;
  /** The text of the block the comment is about, when one was named. */
  blockText: string;
  ask: (blockText?: string) => void;
  clear: () => void;
}

/**
 * How the block menu reaches the comment composer (G1470's 添加评论). The composer lives in the
 * info panel, which the menu cannot see, so the request travels through here.
 */
export const useCommentRequestStore = create<CommentRequestState>((set) => ({
  request: 0,
  blockText: '',
  ask: (blockText = '') => set((state) => ({ request: state.request + 1, blockText })),
  clear: () => set({ blockText: '' }),
}));
