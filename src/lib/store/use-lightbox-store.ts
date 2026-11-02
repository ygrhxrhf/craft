import { create } from 'zustand';

/**
 * G347 —— 图片灯箱是**全局 store 字段驱动**（`interactions.md` §22.4：官方 `t.craftLightboxData`）：
 * 谁都能把一张图丢进这个字段，灯箱自己从字段渲染——不是某个图片组件的局部态。
 *
 * 官方那支还有一个特征：**命中即预取 chunk**（`useEffect` 里 `preload()`）。本地用 `loader`
 * 回调表达同一件事——第一次 `open` 时把灯箱组件拉起来，之后复用。
 */
export interface LightboxState {
  /** 当前要看的图片地址；`null` ＝ 灯箱关着。 */
  src: string | null;
  /** 同组图片（多图时给 ←/→ 翻页）；单图时是只含一项的数组。 */
  gallery: string[];
  index: number;
  /** 第一次打开时被调用一次（对应官方的 chunk 预取）。 */
  loader?: () => void;
}

interface LightboxStore extends LightboxState {
  open: (src: string, gallery?: string[], loader?: () => void) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useLightboxStore = create<LightboxStore>((set) => ({
  src: null,
  gallery: [],
  index: 0,
  loader: undefined,
  open: (src, gallery, loader) =>
    set(() => {
      const list = gallery && gallery.length > 0 ? gallery : [src];
      const at = Math.max(0, list.indexOf(src));
      loader?.();
      return { src: list[at] ?? src, gallery: list, index: at, loader };
    }),
  close: () => set({ src: null, gallery: [], index: 0 }),
  next: () =>
    set((state) => {
      if (state.gallery.length === 0) return state;
      const index = (state.index + 1) % state.gallery.length;
      return { index, src: state.gallery[index] };
    }),
  prev: () =>
    set((state) => {
      if (state.gallery.length === 0) return state;
      const index = (state.index - 1 + state.gallery.length) % state.gallery.length;
      return { index, src: state.gallery[index] };
    }),
}));
