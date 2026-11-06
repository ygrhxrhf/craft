import { create } from 'zustand';

interface CardConfigState {
  /** 触发键时命中的顶层块；`null`＝面板关闭。 */
  index: number | null;
  /** A nonce, so pressing the key twice still reopens the panel. */
  request: number;
  ask: (index: number) => void;
  close: () => void;
}

/** G1584：`Ctrl-Shift-L` 打开「配置卡片」面板，宿主只认这一个入口。 */
export const useCardConfigStore = create<CardConfigState>((set, get) => ({
  index: null,
  request: 0,
  ask: (index) => set({ index, request: get().request + 1 }),
  close: () => set({ index: null }),
}));
