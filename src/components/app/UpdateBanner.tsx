'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  UPDATE_RELOAD_ACTION,
  UPDATE_RELOAD_MESSAGE,
  shouldShowUpdateBanner,
} from '@/lib/app/update-banner';

/**
 * `gap.md` G73 —— 网页版的更新横幅。`sw.js` 装好新版本后会停在 `waiting`，这里据此提示用户
 * 刷新（官方那句逐字）；点击时把新 SW 交出去并重载。桌面那套"提醒我 10/30/60 分钟"在本仓无宿主。
 */
export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | null = null;
    let alive = true;

    const evaluate = () => {
      if (!alive || !registration) return;
      setShow(shouldShowUpdateBanner({
        waiting: Boolean(registration.waiting),
        hasController: Boolean(navigator.serviceWorker.controller),
      }));
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!alive || !reg) return;
      registration = reg;
      evaluate();
      reg.addEventListener('updatefound', evaluate);
      reg.installing?.addEventListener('statechange', evaluate);
      reg.waiting?.addEventListener('statechange', evaluate);
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', evaluate);

    return () => {
      alive = false;
      registration?.removeEventListener('updatefound', evaluate);
      navigator.serviceWorker.removeEventListener('controllerchange', evaluate);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-popover px-4 py-2.5 text-sm shadow-lg"
    >
      <span>{UPDATE_RELOAD_MESSAGE}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >
        <RefreshCw className="size-3.5" />
        {UPDATE_RELOAD_ACTION}
      </button>
    </div>
  );
}
