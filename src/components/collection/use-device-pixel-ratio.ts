'use client';

import { useEffect, useState } from 'react';

/**
 * G498 —— 当前显示器的 `devicePixelRatio`，给行高吸附用（官方复用 §十三 7 的 DPR hook）。
 *
 * 首帧按 1 算（SSR 时没有 `window`，且 1x 下吸附是恒等变换 ⇒ 不产生水合差异），挂载后立刻
 * 读一次真实值；缩放或换屏会触发 `resize`，一并重读。
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    const read = () => setDpr(window.devicePixelRatio > 0 ? window.devicePixelRatio : 1);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  return dpr;
}