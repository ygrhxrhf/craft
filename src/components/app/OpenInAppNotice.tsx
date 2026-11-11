'use client';

import { useEffect, useRef, useState } from 'react';

import {
  OPEN_IN_APP,
  OPEN_IN_DESKTOP_APP_QUESTION,
  REMEMBER_MY_CHOICE,
  craftDocLink,
  isChoiceRemembered,
  rememberChoice,
  shouldOfferDesktopApp,
} from '@/lib/browse/open-in-app';
import { isDesktop, openExternal } from '@/lib/platform';

/**
 * G717：web 端进文档就出现的**非模态**交接提示（`在桌面应用中打开？`）。
 *
 * 官方三个动作一个不少：Close（只收起本次，不写偏好）、`记住我的选择`（默认未选，
 * 勾选才持久化并收起）、`在应用中打开`（走 `openExternal` 的 `craft://doc/{id}`）。
 * 刻意不做两件事：不挂 `Escape` 键盘监听（官方按下去它不消失），不画 backdrop
 * （浮层必须不挡页内点击，见 G721）。
 */
export function OpenInAppNotice({ documentId }: { documentId: string }) {
  const [visible, setVisible] = useState(false);
  const noticeRef = useRef<HTMLDivElement | null>(null);

  // web 端才有这层；桌面壳里 `isDesktop()` 为真，直接不出现。
  useEffect(() => {
    if (shouldOfferDesktopApp(isDesktop(), isChoiceRemembered(window.localStorage))) {
      setVisible(true);
    }
  }, []);

  // 官方行为：它不是模态框，点页内任何别的控件后整组消失（被其它交互挤掉）。
  // 用 pointerdown 而不是 click，和官方「按下去的瞬间就退场」一致。
  useEffect(() => {
    if (!visible) return;
    const away = (event: PointerEvent) => {
      if (noticeRef.current?.contains(event.target as Node | null)) return;
      setVisible(false);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={noticeRef}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="open-in-app-title"
      data-testid="open-in-app-notice"
      className="fixed bottom-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <p id="open-in-app-title" className="text-sm font-semibold">
        {OPEN_IN_DESKTOP_APP_QUESTION}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setVisible(false)}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          Close
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-3.5 accent-[var(--craft-accent)]"
            onChange={(event) => {
              if (!event.target.checked) return;
              rememberChoice(window.localStorage);
              setVisible(false);
            }}
          />
          {REMEMBER_MY_CHOICE}
        </label>
        <button
          type="button"
          onClick={() => {
            openExternal(craftDocLink(documentId));
            setVisible(false);
          }}
          className="h-7 rounded-md border border-input px-3 text-xs transition-colors hover:bg-muted"
        >
          {OPEN_IN_APP}
        </button>
      </div>
    </div>
  );
}
