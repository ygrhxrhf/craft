'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from 'cn';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import {
  DEFAULT_SPELLING_LANG,
  PAGE_STYLE_PRESETS,
  SPELLING_LANGUAGES,
  filterSpellingLanguages,
  fontPacks,
  pageStyleForPreset,
  pageThemes,
  showsDocumentTitle,
  washiTapes,
} from '../themes/page-style';
import type { PageStyle } from '../themes/page-style';
import { SearchableSelect } from '../extensions/searchable-select';

interface StyleTabProps {
  editor: Editor;
  documentId: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
  coverType: string | null;
  coverImages: string[];
  coverShuffle: boolean;
  width: string | null;
  pageStyle: PageStyle;
  onUpdate: (data: {
    title?: string;
    icon?: string | null;
    coverImage?: string | null;
    coverType?: string | null;
    coverImages?: string[];
    coverShuffle?: boolean;
    width?: string | null;
    pageStylePatch?: Partial<PageStyle>;
  }) => void;
}

const bgColors = [
  '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#ef4444', '#6b7280', '#1a1a1a',
];

export function StyleTab({
  editor,
  documentId,
  title,
  icon,
  coverImage,
  coverType,
  coverImages,
  coverShuffle,
  width,
  pageStyle,
  onUpdate,
}: StyleTabProps) {
  const [coverUrlInput, setCoverUrlInput] = useState('');
  // G156：封面图集（逗号分隔）与随机轮换开关。
  const [coverSetInput, setCoverSetInput] = useState(() => coverImages.join(', '));
  // G1436: the text-colour row.
  const textColor = pageStyle.textColor ?? null;
  const setTextColor = (next: string | null) => onUpdate({ pageStylePatch: { textColor: next ?? undefined } });
  const textColors = ['#111827', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed'];
  const [coverInputOpen, setCoverInputOpen] = useState(false);

  const setPageStyle = (patch: Partial<PageStyle>) => {
    onUpdate({ pageStylePatch: patch });
  };

  return (
    <div className="space-y-5 p-3">
      {/* G1436: 「Original」 — one click back to the untouched page style. */}
      <section>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-foreground/10 px-2 py-1.5 text-ui text-foreground/70 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground"
          onClick={() => onUpdate({ pageStylePatch: { fontPack: 'system', theme: 'default', washi: 'none', stylePreset: 'default' } })}
        >
          <span>Original</span>
          <RotateCcw className="size-3.5" />
        </button>
      </section>

      {/* G1457：官方样式页 20 项里的「所有样式」一栏——四个具名整页样式预设。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">所有样式</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {PAGE_STYLE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              data-testid={`page-style-preset-${preset}`}
              className={cn(
                'rounded-lg border border-foreground/10 px-2 py-1.5 text-meta capitalize transition-colors duration-150 ease-craft hover:bg-foreground/4',
                pageStyle.stylePreset === preset && 'border-craft-accent bg-craft-accent/12 text-craft-accent',
              )}
              onClick={() => setPageStyle(pageStyleForPreset(preset))}
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      {/* Color section */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">颜色</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-ui">背景</span>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-md border border-foreground/10 text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
              title="添加背景色"
              onClick={() => onUpdate({ coverImage: coverImage ? null : bgColors[0], coverType: coverImage ? 'none' : 'color' })}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {bgColors.map((color) => (
              <button
                key={color}
                className={cn(
                  'size-6 rounded-md border border-foreground/10 transition-transform hover:scale-110',
                  coverType === 'color' && coverImage === color && 'ring-2 ring-craft-accent'
                )}
                style={{ backgroundColor: color }}
                onClick={() => onUpdate({ coverImage: color, coverType: 'color' })}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ui">文本颜色</span>
            <div className="flex items-center gap-1">
              {textColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`文本颜色 ${color}`}
                  className={cn(
                    'size-5 rounded-md border border-foreground/10 transition-transform hover:scale-110',
                    textColor === color && 'ring-2 ring-craft-accent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setTextColor(textColor === color ? null : color)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ui">文档颜色</span>
            <button
              type="button"
              className={cn(
                'size-6 rounded-md border border-foreground/10',
                (pageStyle.theme ?? 'default') !== 'default' && 'ring-2 ring-craft-accent'
              )}
              style={{
                backgroundColor: pageThemes.find(t => t.id === pageStyle.theme)?.color || '#fff',
              }}
              title="文档颜色"
              onClick={() => {
                const current = pageStyle.theme ?? 'default';
                const index = pageThemes.findIndex((theme) => theme.id === current);
                setPageStyle({ theme: pageThemes[(index + 1) % pageThemes.length].id });
              }}
            />
          </div>
        </div>
      </section>

      {/* Cover section */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">封面</h4>
        <div className="flex items-center justify-between">
          <span className="text-ui">封面图片</span>
          <button
            type="button"
            onClick={() => setCoverInputOpen((open) => !open)}
            className="flex size-6 items-center justify-center rounded-md border border-foreground/10 text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        {coverInputOpen && (
          <div className="mt-2 flex gap-1.5">
            <input
              value={coverUrlInput}
              onChange={(event) => setCoverUrlInput(event.target.value)}
              placeholder="粘贴封面图片地址"
              className="min-w-0 flex-1 rounded-md border border-foreground/10 bg-background px-2 py-1 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={() => {
                if (!coverUrlInput.trim()) return;
                onUpdate({ coverImage: coverUrlInput.trim(), coverType: 'image' });
                setCoverUrlInput('');
                setCoverInputOpen(false);
              }}
              className="rounded-lg bg-craft-accent px-2.5 py-1 text-ui text-white transition-colors duration-150 ease-craft hover:bg-craft-accent-hover"
            >添加</button>
          </div>
        )}
        {coverImage && (
          <button
            type="button"
            onClick={() => onUpdate({ coverImage: null, coverType: 'none' })}
            className="mt-1 flex items-center gap-1 text-meta text-destructive transition-colors hover:underline"
          >
            <Minus className="size-3" /> 移除封面
          </button>
        )}
        {coverImage && (
          <div className="mt-2 space-y-1.5" data-testid="cover-rotation">
            <div className="flex gap-1.5">
              <input
                value={coverSetInput}
                onChange={(event) => setCoverSetInput(event.target.value)}
                placeholder="封面图集（逗号分隔）"
                aria-label="封面图集"
                className="min-w-0 flex-1 rounded-md border border-foreground/10 bg-background px-2 py-1 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    coverImages: coverSetInput
                      .split(',')
                      .map((url) => url.trim())
                      .filter(Boolean),
                  })
                }
                className="rounded-lg bg-craft-accent px-2.5 py-1 text-ui text-white transition-colors duration-150 ease-craft hover:bg-craft-accent-hover"
              >
                保存图集
              </button>
            </div>
            <label className="flex items-center gap-2 text-ui text-foreground/70">
              <input
                type="checkbox"
                checked={coverShuffle}
                onChange={(event) => onUpdate({ coverShuffle: event.target.checked })}
                className="size-4 accent-(--craft-accent)"
              />
              随机轮换
            </label>
          </div>
        )}
      </section>

      {/* Page theme colors */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">页面色调</h4>
        <div className="grid grid-cols-6 gap-1.5">
          {pageThemes.map((theme) => (
            <button
              key={theme.id}
              title={theme.label}
              className={cn(
                'flex size-7 items-center justify-center rounded-md border border-foreground/10 transition-transform hover:scale-110',
                (pageStyle.theme ?? 'default') === theme.id && 'ring-2 ring-craft-accent'
              )}
              style={{
                backgroundColor: theme.color === 'transparent' ? undefined : theme.color,
                backgroundImage:
                  theme.color === 'transparent'
                    ? 'repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%)'
                    : undefined,
                backgroundSize: theme.color === 'transparent' ? '6px 6px' : undefined,
              }}
              onClick={() => setPageStyle({ theme: theme.id })}
            />
          ))}
        </div>
      </section>

      {/* Font */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">字体</h4>
        <div className="flex gap-1.5">
          {fontPacks.map((font) => (
            <button
              key={font.id}
              type="button"
              className={cn(
                'flex-1 rounded-lg border border-foreground/10 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4',
                (pageStyle.fontPack ?? 'system') === font.id && 'border-craft-accent bg-craft-accent/12 text-craft-accent'
              )}
              style={{ fontFamily: font.stack }}
              onClick={() => setPageStyle({ fontPack: font.id })}
            >
              {font.label}
            </button>
          ))}
        </div>
      </section>

      {/* Washi */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">Washi 胶带</h4>
        <div className="grid grid-cols-5 gap-1.5">
          {washiTapes.map((tape) => (
            <button
              key={tape.id}
              title={tape.label}
              className={cn(
                'h-5 rounded-sm border border-foreground/10 transition-transform hover:scale-110',
                (pageStyle.washi ?? 'none') === tape.id && 'ring-2 ring-craft-accent'
              )}
              style={{
                background:
                  tape.gradient || 'repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%) 6px',
              }}
              onClick={() => setPageStyle({ washi: tape.id })}
            />
          ))}
        </div>
      </section>

      {/* Page settings (G65): the title switch and the spell checker with its searchable language. */}
      <section className="space-y-2">
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">页面</h4>
        <div className="flex items-center justify-between">
          <span className="text-ui">显示文档标题</span>
          <button
            type="button"
            role="switch"
            aria-checked={showsDocumentTitle(pageStyle)}
            aria-label="显示文档标题"
            onClick={() => setPageStyle({ showTitle: !showsDocumentTitle(pageStyle) })}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              showsDocumentTitle(pageStyle) ? 'bg-craft-accent' : 'bg-foreground/15'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform',
                showsDocumentTitle(pageStyle) && 'translate-x-4'
              )}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ui">拼写检查</span>
          <button
            type="button"
            role="switch"
            aria-checked={pageStyle.spelling === true}
            aria-label="拼写检查"
            onClick={() => setPageStyle({ spelling: pageStyle.spelling !== true })}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              pageStyle.spelling === true ? 'bg-craft-accent' : 'bg-foreground/15'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform',
                pageStyle.spelling === true && 'translate-x-4'
              )}
            />
          </button>
        </div>
        {pageStyle.spelling === true && (
          <div className="flex items-center justify-between">
            <span className="text-ui">语言</span>
            <SearchableSelect
              label="拼写语言"
              placeholder="搜索语言"
              value={pageStyle.spellingLang ?? DEFAULT_SPELLING_LANG}
              options={SPELLING_LANGUAGES}
              onFilter={filterSpellingLanguages}
              onChange={(spellingLang) => setPageStyle({ spellingLang })}
            />
          </div>
        )}
      </section>

      {/* Advanced: width toggle */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">高级</h4>
        <div className="flex items-center justify-between">
          <span className="text-ui">宽页</span>
          <button
            type="button"
            onClick={() => onUpdate({ width: width === 'wide' ? 'default' : 'wide' })}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              width === 'wide' ? 'bg-craft-accent' : 'bg-foreground/15'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform',
                width === 'wide' && 'translate-x-4'
              )}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
