import { create } from 'zustand';

export interface ThreadAnchor {
  top: number;
  bottom: number;
  left: number;
}

interface ThreadWindowState {
  threadId: string | null;
  anchor: ThreadAnchor | null;
  open: (threadId: string, anchor: ThreadAnchor) => void;
  close: () => void;
}

/**
 * G58：点正文里的评论高亮会弹一个**浮动线程窗口**（与右侧信息栏里的评论列表是两种形态）。
 * 高亮与窗口不在同一棵子树里，所以开窗请求走 store。
 */
export const useThreadWindowStore = create<ThreadWindowState>((set) => ({
  threadId: null,
  anchor: null,
  open: (threadId, anchor) => set({ threadId, anchor }),
  close: () => set({ threadId: null, anchor: null }),
}));
