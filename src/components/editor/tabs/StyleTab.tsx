'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from 'cn';
import { readImageFrame, zoomFrame, DEFAULT_FRAME } from '@/lib/editor/image-frame';
import { cropMaskForFrame } from '@/lib/editor/image-crop';
import { Plus, Minus, RotateCcw, Star, MoreHorizontal } from 'lucide-react';
import {
  createCustomStyle,
  deleteCustomStyle,
  listCustomStyles,
  renameCustomStyle,
  setDefaultCustomStyle,
  type CustomStyleRow,
} from '@/actions/style/custom-styles';
import { isStyleDirty, stylePatchOf } from '@/lib/editor/themes/custom-style-patch';
import { WASHI_TAPE_PRESETS, type SeparatorStyle } from '@/lib/editor/themes/washi-catalog';
import { promptDialog } from '@/lib/dialog/show';
import { toast } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  colorPair,
  loadPageThemes,
  pageStylePatchForTheme,
  type ThemePreset,
} from '@/lib/editor/themes/page-theme-catalog';
import {
  DEFAULT_SPELLING_LANG,
  PAGE_STYLE_PRESETS,
  SPELLING_LANGUAGES,
  filterSpellingLanguages,
  fontPacks,
  pageStyleForPreset,
  separatorStyleOf,
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
  coverFrame: { x: number; y: number; scale: number };
  width: string | null;
  pageStyle: PageStyle;
  onUpdate: (data: {
    title?: string;
    icon?: string | null;
    coverImage?: string | null;
    coverType?: string | null;
    coverImages?: string[];
    coverShuffle?: boolean;
    coverFrame?: { x: number; y: number; scale: number };
    coverCropMask?: string | null;
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
  coverFrame,
  width,
  pageStyle,
  onUpdate,
}: StyleTabProps) {
  // G682：主题清单运行时加载（预设 JSON 在 public/ 下）；未取到前用内置六档兜底。
  const [themePresets, setThemePresets] = useState<ThemePreset[]>(() =>
    pageThemes.map((theme) => ({ themeId: theme.id, title: theme.label, props: { 'background-color': theme.color } })),
  );
  useEffect(() => {
    let alive = true;
    void loadPageThemes().then((list) => {
      if (alive && list.length) setThemePresets(list);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  // G151：自定义样式（一等实体）——列表 + 最近一次套用的样式（脏态判定用）。
  const [customStyles, setCustomStyles] = useState<CustomStyleRow[]>([]);
  const [appliedStyle, setAppliedStyle] = useState<{ id: string; patch: Record<string, unknown> } | null>(null);
  const reloadCustomStyles = async () => {
    try {
      setCustomStyles(await listCustomStyles());
    } catch {
      // 未登录/离线时面板照用，只是没有样式列表。
    }
  };
  useEffect(() => {
    void reloadCustomStyles();
  }, []);
  const saveCurrentStyle = async () => {
    const name = await promptDialog({ title: '保存当前样式', placeholder: '样式名称', confirmLabel: '保存' });
    if (!name?.trim()) return;
    try {
      await createCustomStyle({ name: name.trim(), style: stylePatchOf(pageStyle) });
      await reloadCustomStyles();
      toast.add({ id: 'style-saved', type: 'success', title: '已保存样式' });
    } catch (error) {
      toast.add({ id: 'style-save-failed', type: 'error', title: error instanceof Error ? error.message : '保存样式失败' });
    }
  };
  const applyCustomStyle = (row: CustomStyleRow) => {
    setPageStyle(row.style as Partial<PageStyle>);
    setAppliedStyle({ id: row.id, patch: row.style });
  };
  const renameStyle = async (row: CustomStyleRow) => {
    const name = await promptDialog({ title: '重命名样式', defaultValue: row.name, confirmLabel: '保存' });
    if (!name?.trim()) return;
    try {
      await renameCustomStyle(row.id, name.trim());
      await reloadCustomStyles();
    } catch (error) {
      toast.add({ id: 'style-rename-failed', type: 'error', title: error instanceof Error ? error.message : '重命名失败' });
    }
  };
  const removeStyle = async (row: CustomStyleRow) => {
    try {
      await deleteCustomStyle(row.id);
      if (appliedStyle?.id === row.id) setAppliedStyle(null);
      await reloadCustomStyles();
    } catch (error) {
      toast.add({ id: 'style-delete-failed', type: 'error', title: error instanceof Error ? error.message : '删除失败' });
    }
  };
  const makeDefaultStyle = async (row: CustomStyleRow) => {
    try {
      await setDefaultCustomStyle(row.isDefault ? null : row.id);
      await reloadCustomStyles();
    } catch (error) {
      toast.add({ id: 'style-default-failed', type: 'error', title: error instanceof Error ? error.message : '设置默认失败' });
    }
  };
  const swatchOf = (style: Record<string, unknown>) => (typeof style.themeColor === 'string' ? style.themeColor : undefined);
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
  // G210：页面分隔符三档的当前值（老文档按 washi 字段回推）。
  const currentSeparatorStyle = separatorStyleOf(pageStyle);

  return (
    <div className="space-y-5 p-3">
      {/* G151：自定义样式（一等实体）——「保存/重命名/套用/脏态/设为文档默认」，
          按作者分两栏：Craft 的样式（内置预设）vs 你的样式（已保存）。 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-caption font-medium uppercase tracking-wider text-foreground/40">自定义样式</h4>
          <button
            type="button"
            data-testid="save-custom-style"
            onClick={() => void saveCurrentStyle()}
            className="rounded-md border border-foreground/10 px-2 py-0.5 text-meta text-foreground/70 transition-colors hover:bg-foreground/4 hover:text-foreground"
          >
            保存当前样式
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-meta text-foreground/40">你的样式</p>
            {customStyles.length === 0 ? (
              <p className="text-meta text-foreground/35">还没有保存的样式</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customStyles.map((row) => {
                  const active = appliedStyle?.id === row.id;
                  const dirty = active && isStyleDirty(row.style, pageStyle);
                  return (
                    <div key={row.id} className="flex w-14 flex-col items-center gap-0.5">
                      <button
                        type="button"
                        title={row.name}
                        data-testid={`custom-style-${row.id}`}
                        onClick={() => applyCustomStyle(row)}
                        className={cn(
                          'relative flex size-7 items-center justify-center rounded-md border border-foreground/10 transition-transform hover:scale-110',
                          active && 'ring-2 ring-craft-accent',
                        )}
                        style={{
                          backgroundColor: swatchOf(row.style),
                          backgroundImage: swatchOf(row.style)
                            ? undefined
                            : 'repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%)',
                          backgroundSize: swatchOf(row.style) ? undefined : '6px 6px',
                        }}
                      >
                        {row.isDefault && <Star className="size-3 fill-current text-foreground/60" />}
                        {dirty && (
                          <span
                            data-testid="style-dirty-dot"
                            className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-craft-accent"
                          />
                        )}
                      </button>
                      <div className="flex items-center gap-0.5">
                        <span className="w-9 truncate text-[10px] text-foreground/60" title={row.name}>
                          {row.name}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                aria-label={`${row.name} 样式操作`}
                                className="rounded p-0.5 text-foreground/40 transition-colors hover:text-foreground"
                              />
                            }
                          >
                            <MoreHorizontal className="size-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => void renameStyle(row)}>重命名</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void makeDefaultStyle(row)}>
                              {row.isDefault ? '取消文档默认' : '设为文档默认'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void removeStyle(row)}>删除</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-meta text-foreground/40">Craft 的样式</p>
            <div className="flex flex-wrap gap-2">
              {PAGE_STYLE_PRESETS.map((preset) => (
                <div key={preset} className="flex w-14 flex-col items-center gap-0.5">
                  <button
                    type="button"
                    title={preset}
                    onClick={() => setPageStyle(pageStyleForPreset(preset))}
                    className="flex size-7 items-center justify-center rounded-md border border-foreground/10 text-[9px] text-foreground/60 transition-transform hover:scale-110"
                  >
                    {preset.slice(0, 2)}
                  </button>
                  <span className="w-9 truncate text-center text-[10px] text-foreground/60">{preset}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* G1457：官方样式页 20 项里的「所有样式」一栏——四个具名整页样式预设。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">所有样式</h4>
                <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border border-foreground/10 px-2 py-1.5 text-ui text-foreground/70 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground"
        onClick={() => onUpdate({ pageStylePatch: { fontPack: 'system', theme: 'default', washi: 'none', stylePreset: 'default' } })}
        >
        <span>Original</span>
        <RotateCcw className="size-3.5" />
        </button>
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
                backgroundColor: themePresets.find((preset) => preset.themeId === pageStyle.theme)?.props['background-color']?.split(/\s+/)[0] || pageStyle.themeColor || '#fff',
              }}
              title="文档颜色"
              onClick={() => {
                const current = pageStyle.theme ?? 'default';
                const index = themePresets.findIndex((preset) => preset.themeId === current);
                const next = themePresets[(index + 1) % themePresets.length];
                setPageStyle(pageStylePatchForTheme(next));
              }}
            />
          </div>
        </div>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">页面色调</h4>
        {/* G682：官方清单约 131 条、运行时加载 ⇒ 这里给可滚动网格。 */}
        <div className="max-h-40 overflow-y-auto pr-1" data-testid="page-theme-catalog">
          <div className="grid grid-cols-6 gap-1.5">
            {themePresets.map((preset) => {
              const swatch = colorPair(preset.props['background-color']).light;
              return (
                <button
                  key={preset.themeId}
                  title={preset.title}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md border border-foreground/10 transition-transform hover:scale-110',
                    (pageStyle.theme ?? 'default') === preset.themeId && 'ring-2 ring-craft-accent'
                  )}
                  style={{
                    backgroundColor: swatch === 'transparent' ? undefined : swatch,
                    backgroundImage:
                      swatch === 'transparent'
                        ? 'repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%)'
                        : undefined,
                    backgroundSize: swatch === 'transparent' ? '6px 6px' : undefined,
                  }}
                  onClick={() => setPageStyle(pageStylePatchForTheme(preset))}
                />
              );
            })}
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
        {coverImage && (
          // G503：封面裁剪——拖拽在封面本体上，这里给放大/缩小/复位三枚。
          <div className="mt-2 flex items-center gap-1.5" data-testid="cover-crop">
            {([
              ['放大', 1],
              ['缩小', -1],
            ] as const).map(([label, direction]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const next = zoomFrame(readImageFrame((coverFrame ?? DEFAULT_FRAME) as any), direction);
                  onUpdate({ coverFrame: next, coverCropMask: cropMaskForFrame(next) });
                }}
                className="rounded-md border border-foreground/10 px-2 py-1 text-meta text-foreground/70 transition-colors hover:bg-foreground/4"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUpdate({ coverFrame: DEFAULT_FRAME, coverCropMask: cropMaskForFrame(DEFAULT_FRAME) })}
              className="rounded-md border border-foreground/10 px-2 py-1 text-meta text-foreground/70 transition-colors hover:bg-foreground/4"
            >
              复位
            </button>
          </div>
        )}
      </section>

      {/* G210：分隔符样式三档（线／和纸胶带／涂鸦）＋和纸图库浏览（官方 96 档胶带）。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">分隔符样式</h4>
        <div className="mb-2 flex gap-1.5">
          {([
            ['line', '线'],
            ['washi', '和纸胶带'],
            ['doodle', '涂鸦'],
          ] as Array<[SeparatorStyle, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`separator-style-${id}`}
              className={cn(
                'flex-1 rounded-lg border px-2 py-1 text-meta transition-colors duration-150 ease-craft',
                currentSeparatorStyle === id
                  ? 'border-craft-accent bg-craft-accent/12 text-craft-accent'
                  : 'border-foreground/10 text-foreground/60 hover:bg-foreground/4',
              )}
              onClick={() => setPageStyle(id === 'washi' ? { separatorStyle: 'washi' } : { separatorStyle: id, washi: 'none' })}
            >
              {label}
            </button>
          ))}
        </div>
        {currentSeparatorStyle === 'washi' && (
          <div className="max-h-36 overflow-y-auto pr-1" data-testid="washi-gallery">
            <div className="grid grid-cols-4 gap-1.5">
              {WASHI_TAPE_PRESETS.map((tape) => (
                <button
                  key={tape.key}
                  type="button"
                  title={tape.label}
                  data-testid={`washi-tape-${tape.key}`}
                  className={cn(
                    'h-6 rounded-sm border border-foreground/10 bg-cover bg-center transition-transform hover:scale-105',
                    pageStyle.washi === tape.key && 'ring-2 ring-craft-accent',
                  )}
                  style={{ backgroundImage: `url(/washi/${tape.key}.jpg)` }}
                  onClick={() => setPageStyle({ separatorStyle: 'washi', washi: tape.key })}
                />
              ))}
              {/* 向后兼容：老文档的六档内置渐变仍留在图库尾部。 */}
              {washiTapes
                .filter((tape) => tape.id !== 'none')
                .map((tape) => (
                  <button
                    key={tape.id}
                    type="button"
                    title={tape.label}
                    className={cn(
                      'h-6 rounded-sm border border-foreground/10 transition-transform hover:scale-105',
                      pageStyle.washi === tape.id && 'ring-2 ring-craft-accent',
                    )}
                    style={{ background: tape.gradient }}
                    onClick={() => setPageStyle({ separatorStyle: 'washi', washi: tape.id })}
                  />
                ))}
            </div>
          </div>
        )}
      </section>

{/* Font */}
      {/* Font: official splits the family list into 默认 / 高级 tiers (G209). */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">字体</h4>
        <p className="mb-1 text-meta text-foreground/40">默认</p>
        <div className="flex gap-1.5">
          {fontPacks
            .filter((font) => font.id === 'system')
            .map((font) => (
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
        <p className="mb-1 mt-2 text-meta text-foreground/40">高级</p>
        <div className="flex gap-1.5">
          {fontPacks
            .filter((font) => font.id !== 'system')
            .map((font) => (
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

{/* Width toggle */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">宽页</h4>
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

    </div>
  );
}
