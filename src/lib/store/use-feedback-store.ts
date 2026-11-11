import { create } from 'zustand';

/**
 * G1414：反馈弹窗的开关。`view` 是弹窗内的两屏：`form`（13 键那屏）与 `thanks`（提交屏）。
 * 评分引导另开一屏 `rate`，且只在有桌面宿主时可达（见 `src/lib/app/feedback.ts`）。
 */
export type FeedbackView = 'form' | 'thanks' | 'rate';

interface FeedbackState {
  open: boolean;
  view: FeedbackView;
  openFeedback: () => void;
  openRating: () => void;
  close: () => void;
  setView: (view: FeedbackView) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  open: false,
  view: 'form',
  openFeedback: () => set({ open: true, view: 'form' }),
  openRating: () => set({ open: true, view: 'rate' }),
  close: () => set({ open: false, view: 'form' }),
  setView: (view) => set({ view }),
}));
