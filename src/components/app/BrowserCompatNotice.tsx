'use client';

import { useEffect, useState } from 'react';

import {
  BEST_EXPERIENCE_LINK,
  BEST_EXPERIENCE_PREFIX,
  BEST_EXPERIENCE_SUFFIX,
  BROWSER_NOT_COMPATIBLE,
  DONT_SHOW_AGAIN,
  SUPPORTED_BROWSERS_URL,
  USE_ANYWAYS,
  dismissCompat,
  isCompatDismissed,
  shouldShowCompatNotice,
} from '@/lib/browse/browser-compat';

/**
 * G346：浏览器的**可绕过**不兼容警告。四条官方文案全部在这里出现：
 * 判定句、带外链的建议句、`仍然使用 Craft`、`不再显示此内容`。
 *
 * 两个出口语义不同 —— 「仍然使用 Craft」只放行本次会话（组件卸载即清零），
 * 「不再显示此内容」写 localStorage 的 `craft.browser.compat.dismissed`，下次不再弹。
 */
export function BrowserCompatNotice() {
  const [visible, setVisible] = useState(false);

  // UA 与 localStorage 只有客户端才有；服务端渲染这一屏不能先生成它，否则水合会闪。
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const storage = typeof window === 'undefined' ? undefined : window.localStorage;
    setVisible(shouldShowCompatNotice(navigator.userAgent, isCompatDismissed(storage)));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="browser-compat-title"
      data-testid="browser-compat-notice"
      className="fixed bottom-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <p id="browser-compat-title" className="text-sm font-semibold">
        {BROWSER_NOT_COMPATIBLE}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {BEST_EXPERIENCE_PREFIX}
        <a
          href={SUPPORTED_BROWSERS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {BEST_EXPERIENCE_LINK}
        </a>
        {BEST_EXPERIENCE_SUFFIX}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-3.5 accent-[var(--craft-accent)]"
            onChange={(event) => {
              if (!event.target.checked) return;
              dismissCompat(typeof window === 'undefined' ? undefined : window.localStorage);
              setVisible(false);
            }}
          />
          {DONT_SHOW_AGAIN}
        </label>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="h-7 rounded-md border border-input px-3 text-xs transition-colors hover:bg-muted"
        >
          {USE_ANYWAYS}
        </button>
      </div>
    </div>
  );
}