'use client';

/**
 * 读首屏 HTML 里服务端下发的存储开关（见 src/app/layout.tsx）。
 *
 * 读不到就当直传关闭 —— 保守方向是「退回旧通道」，而旧通道在 local 驱动下一直可用。
 * 反过来（读不到就当直传开启）会在 local 开发里直接炸掉，违反「本地开发零影响」。
 */
declare global {
  interface Window {
    __STORAGE_CONFIG__?: { directUpload?: boolean };
  }
}

export function directUploadEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__STORAGE_CONFIG__?.directUpload === true;
}
