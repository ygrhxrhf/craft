'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

import { useCardConfigStore } from '@/lib/store/use-card-config-store';
import {
  CARD_BACKGROUND_PRESETS,
  CARD_CONFIG,
  cardPresetColor,
} from '@/lib/editor/style-keys';
import { applyCardBackground } from '@/lib/editor/card-config';

/**
 * G1584：`Ctrl-Shift-L` 的「配置卡片」面板。官方采集到的五段文案原样落在这里；
 * 「套用样式」给底色档，写完立即改块属性，预览同步跟着变。
 */
export function CardConfigHost({ editor }: { editor: Editor }) {
  const index = useCardConfigStore((state) => state.index);
  const request = useCardConfigStore((state) => state.request);
  const [custom, setCustom] = useState('#ffffff');

  // 每次新的 `Ctrl-Shift-L` 请求都把自选色复位；渲染期跟随即可，不必等 effect。
  const [seenRequest, setSeenRequest] = useState(request);
  if (seenRequest !== request) {
    setSeenRequest(request);
    setCustom('#ffffff');
  }

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useCardConfigStore.getState().close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  if (index === null) return null;

  const node = index < editor.state.doc.childCount ? editor.state.doc.child(index) : null;
  const preview = node?.textContent?.trim() || '卡片内容';
  const currentColor =
    node?.type.name === 'cardBlock' ? ((node.attrs.bgColor as string) || '#ffffff') : '#ffffff';

  const paint = (color: string) => {
    applyCardBackground(editor.state, editor.view.dispatch, index, color);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/10"
        onClick={() => useCardConfigStore.getState().close()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={CARD_CONFIG.title}
        data-testid="card-config"
        className="relative w-80 rounded-xl bg-background p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-body font-medium">{CARD_CONFIG.title}</h2>
          <button
            type="button"
            onClick={() => useCardConfigStore.getState().close()}
            className="rounded-md px-2 py-1 text-meta text-foreground/55 hover:bg-foreground/4"
          >
            关闭
          </button>
        </div>

        <h3 className="mb-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
          {CARD_CONFIG.style}
        </h3>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CARD_BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`${CARD_CONFIG.style} ${preset.label}`}
              aria-pressed={currentColor === preset.color}
              onClick={() => paint(preset.color)}
              className="rounded-md border border-foreground/10 px-2 py-1 text-meta hover:bg-foreground/4 aria-pressed:border-foreground/40"
              style={{ backgroundColor: cardPresetColor(preset.id) ?? undefined }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <h3 className="mb-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
          {CARD_CONFIG.preview}
        </h3>
        <div
          data-testid="card-config-preview"
          className="mb-4 rounded-lg border border-foreground/8 p-3 text-body"
          style={{ backgroundColor: currentColor }}
        >
          {preview}
        </div>

        <h3 className="mb-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
          {CARD_CONFIG.customBackground}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={custom}
            aria-label={CARD_CONFIG.customBackground}
            onChange={(event) => {
              setCustom(event.target.value);
              paint(event.target.value);
            }}
            className="h-8 w-10 rounded border border-foreground/10 bg-transparent"
          />
          <span className="text-meta text-foreground/55">{CARD_CONFIG.custom}</span>
        </div>
      </div>
    </div>
  );
}
