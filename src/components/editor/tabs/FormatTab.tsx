'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  CheckSquare, ChevronRight, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent, ListX, Eraser, FoldVertical, UnfoldVertical,
  ArrowLeftRight, ArrowUpDown,
} from 'lucide-react';
import { useEffect, useReducer } from 'react';
import { cn } from 'cn';
import {
  ALIGNMENT_CONTROLS,
  DECORATION_KEYS,
  DECORATION_SWATCHES,
  DIRECTION_CONTROLS,
  FONT_CONTROLS,
  FONT_TITLE,
  GROUPING_CONTROLS,
  GROUPING_TITLE,
  GROUP_KEYS,
  INDENT_CONTROLS,
  INLINE_MARK_CONTROLS,
  LIST_CONTROLS,
  alignMixed,
  alignState,
  applyDecoration,
  decorationAt,
  directionMixed,
  directionState,
  groupingAt,
  listMixed,
  listState,
  markState,
  type FormatControl,
  type FormatHost,
} from '@/lib/editor/format-commands';
import { MIXED_LABEL, type TriState } from '@/lib/editor/format-presence';
import { PANEL_HEADING_SHORT_LABEL, TEXT_STYLE_LABELS, headingLabel } from '@/lib/editor/semantic-levels';
import { GRADIENT_PRESETS, presetValue } from '@/lib/editor/gradient-highlight';
import { getFontStack } from '../themes/page-style';

interface FormatTabProps {
  editor: Editor;
}

const textStyles = [
  { label: headingLabel(1), action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(), check: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { label: headingLabel(2), action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(), check: (e: Editor) => e.isActive('heading', { level: 2 }) },
  // G1432: the official panel's third entry uses `style.text.heading.short` — also 「标题」,
  // duplicating the first entry on purpose. Do not "fix" the duplicate.
  { label: PANEL_HEADING_SHORT_LABEL, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(), check: (e: Editor) => e.isActive('heading', { level: 3 }) },
  { label: headingLabel(4), action: (e: Editor) => e.chain().focus().toggleHeading({ level: 4 }).run(), check: (e: Editor) => e.isActive('heading', { level: 4 }) },
  // G51: 「页面」 is the sixth official name. Locally a page is a document, so the entry turns the
  // block into the page-title style the editor already renders (H1 + page semantics).
  { label: TEXT_STYLE_LABELS.page, action: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run(), check: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { label: TEXT_STYLE_LABELS.body, action: (e: Editor) => e.chain().focus().setParagraph().run(), check: (e: Editor) => e.isActive('paragraph') },
  { label: TEXT_STYLE_LABELS.caption, action: (e: Editor) => e.chain().focus().toggleBlockquote().run(), check: (e: Editor) => e.isActive('blockquote') },
];

const toggleGroupButtons = [
  { icon: UnfoldVertical, action: (e: Editor) => e.chain().focus().expandAllToggleBlocks().run(), label: '全部展开' },
  { icon: FoldVertical, action: (e: Editor) => e.chain().focus().collapseAllToggleBlocks().run(), label: '全部收起' },
];

const formatColors = [
  '#0300f5', '#2962f6', '#53b7e0', '#5bc78b', '#f09737',
  '#db3035', '#b425f6', '#7e5019', '#687485', '#9fa4a9',
];

/** 图标留在组件侧：`format-commands` 那张表要能在没有编辑器时单测，所以不带 JSX。 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'style.inline.bold': Bold,
  'style.inline.italic': Italic,
  'style.inline.strike': Strikethrough,
  'style.inline.code': Code,
  'style.list.todo': CheckSquare,
  'style.list.toggle': ChevronRight,
  'style.list.bullet': List,
  'style.list.numbered': ListOrdered,
  'style.list.none': ListX,
  'style.indent.out': Outdent,
  'style.indent.in': Indent,
  'style.text.align.left': AlignLeft,
  'style.text.align.center': AlignCenter,
  'style.text.align.right': AlignRight,
  'style.text.align.justify': AlignJustify,
  'style.left.to.right': ArrowLeftRight,
  'style.top.to.bottom': ArrowUpDown,
  default: Eraser,
};

function iconFor(control: FormatControl) {
  return ICONS[control.key ?? 'default'] ?? ICONS.default;
}

function FormatButton({ icon: Icon, state, onClick, label }: {
  icon: React.ComponentType<{ className?: string }>;
  /** `mixed` 只属于行内格式：这一枚自己既不是开也不是关（G154）。 */
  state: TriState;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={state === 'mixed' ? `${label}（${MIXED_LABEL}）` : label}
      // ARIA 本来就有 pressed 的第三态，官方的「混合」正好落在它上面。
      aria-pressed={state === 'on' ? true : state === 'mixed' ? 'mixed' : false}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md border transition-colors duration-150 ease-craft',
        state === 'on' && 'border-foreground/8 bg-foreground/8 text-foreground',
        state === 'off' && 'border-foreground/8 bg-card text-foreground/55 hover:bg-foreground/4 hover:text-foreground/85',
        state === 'mixed' && 'border-dashed border-foreground/30 bg-card text-foreground/75 hover:bg-foreground/4',
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/**
 * 组标题带「混合」：官方在选区跨档时让控件显示「混合」而不是第一个值（G154），
 * 于是这一组里没有任何一档点亮。
 */
function GroupHeader({ label, mixed }: { label: string; mixed: boolean }) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
      {label}
      {mixed && (
        <span
          className="rounded border border-dashed border-foreground/30 px-1 text-[10px] normal-case tracking-normal text-foreground/60"
          data-mixed-indicator=""
        >
          {MIXED_LABEL}
        </span>
      )}
    </h4>
  );
}

function SegmentButton({ icon: Icon, active, mixedGroup, onClick, label }: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  mixedGroup: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={mixedGroup ? `${label}（${MIXED_LABEL}）` : label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md border border-foreground/8 transition-colors duration-150 ease-craft',
        active ? 'bg-foreground/8 text-foreground' : 'bg-card text-foreground/55 hover:bg-foreground/4 hover:text-foreground/85',
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function FormatTab({ editor }: FormatTabProps) {
  // 三态判的是选区，选区自己会变而正文一个字没动：tiptap 的 selectionUpdate 是唯一能让本面板
  // 跟着重画的信号，不订阅就会拿着旧选区算新档位。
  const [, redraw] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const onSelection = () => redraw();
    editor.on('selectionUpdate', onSelection);
    return () => {
      editor.off('selectionUpdate', onSelection);
    };
  }, [editor]);

  const state = editor.state;
  // 控件表只认 FormatHost（chain / state / dispatch），真编辑器的 dispatch 在 view 上；
  // 在这一层接上，lib 里那张表才能不带编辑器实例被单测。
  const host: FormatHost = {
    chain: () => editor.chain(),
    state,
    dispatch: (tr) => editor.view.dispatch(tr),
  };
  const marks = INLINE_MARK_CONTROLS.map((control) => ({ control, state: markState(state, control.mark) }));
  const alignGroupMixed = alignMixed(state);
  const listGroupMixed = listMixed(state);
  const directionGroupMixed = directionMixed(state);
  const decorations = decorationAt(state);
  const grouping = groupingAt(state);

  const imageAttrs = editor.getAttributes('imageBlock') as {
    imageSize?: string;
    imageFit?: string;
  };

  return (
    <div className="space-y-4 p-3">
      {/* G156：图片样式两根轴——尺寸 auto|large × 填充 fill|fit。 */}
      {editor.isActive('imageBlock') && (
        <section data-testid="image-style">
          <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">图片</h4>
          <div className="mb-1 text-meta text-foreground/45">尺寸</div>
          <div className="grid grid-cols-2 gap-1">
            {([['auto', '自动'], ['large', '大图']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={(imageAttrs.imageSize ?? 'auto') === value}
                onClick={() => editor.chain().focus().updateAttributes('imageBlock', { imageSize: value }).run()}
                className={cn(
                  'rounded-md border border-foreground/8 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4',
                  (imageAttrs.imageSize ?? 'auto') === value
                    ? 'border-craft-accent bg-craft-accent/10 text-foreground ring-1 ring-craft-accent'
                    : 'bg-card text-foreground/55'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 mb-1 text-meta text-foreground/45">填充</div>
          <div className="grid grid-cols-2 gap-1">
            {([['fill', '填充'], ['fit', '适应']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={(imageAttrs.imageFit ?? 'fill') === value}
                onClick={() => editor.chain().focus().updateAttributes('imageBlock', { imageFit: value }).run()}
                className={cn(
                  'rounded-md border border-foreground/8 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4',
                  (imageAttrs.imageFit ?? 'fill') === value
                    ? 'border-craft-accent bg-craft-accent/10 text-foreground ring-1 ring-craft-accent'
                    : 'bg-card text-foreground/55'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Text styles */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">文本</h4>
        <div className="grid grid-cols-3 gap-1">
          {textStyles.map((style) => (
            <button
              key={style.label}
              type="button"
              onClick={() => style.action(editor)}
              className={cn(
                'rounded-md border border-foreground/8 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4',
                style.check(editor)
                  ? 'border-craft-accent bg-craft-accent/10 text-foreground ring-1 ring-craft-accent'
                  : 'bg-card text-foreground/55'
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </section>

      {/* G208: 分组（页面 / 卡片） */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">{GROUPING_TITLE.label}</h4>
        <div className="grid grid-cols-2 gap-1">
          {GROUPING_CONTROLS.map((control) => (
            <button
              key={control.label}
              type="button"
              aria-pressed={grouping === (control.key === 'style.text.card' ? 'card' : 'page')}
              onClick={() => control.apply(host)}
              className={cn(
                'rounded-md border border-foreground/8 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4',
                grouping === (control.key === 'style.text.card' ? 'card' : 'page')
                  ? 'border-craft-accent bg-craft-accent/10 text-foreground ring-1 ring-craft-accent'
                  : 'bg-card text-foreground/55'
              )}
            >
              {control.label}
            </button>
          ))}
        </div>
      </section>

      {/* Block font size */}
      <section>
        <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">字号</h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="减小字号"
            onClick={() => editor.chain().focus().stepFontSize(-1).run()}
            className="flex-1 rounded-md border border-border py-1.5 text-[13px] transition-colors hover:bg-muted"
          >
            A−
          </button>
          <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">
            {(editor.getAttributes('paragraph').fontSize as number | null)
              ?? (editor.getAttributes('heading').fontSize as number | null)
              ?? (editor.getAttributes('blockquote').fontSize as number | null)
              ?? 16}
            px
          </span>
          <button
            type="button"
            aria-label="增大字号"
            onClick={() => editor.chain().focus().stepFontSize(1).run()}
            className="flex-1 rounded-md border border-border py-1.5 text-[13px] transition-colors hover:bg-muted"
          >
            A＋
          </button>
        </div>
      </section>

      {/* Inline marks. Tri-state: a partly-bold selection shows 混合 rather than picking a side. */}
      <section>
        <div className="grid grid-cols-4 gap-1">
          {marks.map(({ control, state: mark }) => (
            <FormatButton
              key={control.label}
              icon={iconFor(control)}
              state={mark}
              onClick={() => control.apply(host)}
              label={control.label}
            />
          ))}
        </div>
      </section>

      {/* The five official list档位, 取消列表格式 included (G155). */}
      <section>
        <GroupHeader label={GROUP_KEYS.listLabel} mixed={listGroupMixed} />
        <div className="grid grid-cols-5 gap-1">
          {LIST_CONTROLS.map((control) => (
            <SegmentButton
              key={control.label}
              icon={iconFor(control)}
              active={listState(state, control.kind)}
              mixedGroup={listGroupMixed}
              onClick={() => control.apply(host)}
              label={control.label}
            />
          ))}
        </div>
      </section>

      {/* Alignment is its own control, indentation its own (G153). */}
      <section>
        <GroupHeader label={GROUP_KEYS.alignLabel} mixed={alignGroupMixed} />
        <div className="grid grid-cols-5 gap-1">
          {ALIGNMENT_CONTROLS.map((control) => (
            <SegmentButton
              key={control.label}
              icon={iconFor(control)}
              active={alignState(state, control.value)}
              mixedGroup={alignGroupMixed}
              onClick={() => control.apply(host)}
              label={control.label}
            />
          ))}
        </div>
      </section>

      <section>
        <GroupHeader label={GROUP_KEYS.indentLabel} mixed={false} />
        <div className="grid grid-cols-2 gap-1">
          {INDENT_CONTROLS.map((control) => (
            <SegmentButton
              key={control.label}
              icon={iconFor(control)}
              active={false}
              mixedGroup={false}
              onClick={() => control.apply(host)}
              label={control.label}
            />
          ))}
        </div>
      </section>

      {/* 方向是第三根轴（G1484）：官方语言包里只有这两枚，「从左到右」就是缺省态。 */}
      <section>
        <GroupHeader label={GROUP_KEYS.directionLabel} mixed={directionGroupMixed} />
        <div className="grid grid-cols-2 gap-1">
          {DIRECTION_CONTROLS.map((control) => (
            <SegmentButton
              key={control.label}
              icon={iconFor(control)}
              active={directionState(state, control.mode)}
              mixedGroup={directionGroupMixed}
              onClick={() => control.apply(host)}
              label={control.label}
            />
          ))}
        </div>
      </section>

      {/* Toggle blocks. Document-wide, so they get their own row rather than a
          slot in the per-selection list group. */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">折叠</h4>
        <div className="grid grid-cols-2 gap-1">
          {toggleGroupButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => btn.action(editor)}
              className="flex items-center justify-center gap-1.5 rounded-md border border-foreground/8 bg-card px-2 py-1.5 text-meta text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground"
            >
              <btn.icon className="size-4" />
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* Color */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">颜色</h4>
        <div className="grid grid-cols-5 gap-2">
          {formatColors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className={cn(
                'size-7 rounded-full border-2 border-transparent transition-transform hover:scale-110',
                editor.isActive('textStyle', { color }) && 'ring-2 ring-craft-accent ring-offset-2'
              )}
              style={{ backgroundColor: color }}
              onClick={() => editor.chain().focus().setColor(color).run()}
            />
          ))}
        </div>
      </section>
      {/* G532：高亮是 90° 线性渐变（官方线格式 `色1;色2;…;g`）。四档预设；单色档仍走工具条那枚开关。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">渐变高亮</h4>
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map((preset) => {
            const value = presetValue(preset.colors);
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                aria-label={`渐变高亮 ${preset.label}`}
                aria-pressed={editor.isActive('gradientHighlight', { value })}
                onClick={() => editor.chain().focus().setHighlightGradient([...preset.colors]).run()}
                className={cn(
                  'h-7 rounded-md border border-foreground/10 transition-transform hover:scale-105',
                  editor.isActive('gradientHighlight', { value }) && 'ring-2 ring-craft-accent ring-offset-1',
                )}
                style={{
                  backgroundImage: `linear-gradient(90deg, ${preset.colors
                    .map((name) => `var(--editor-${name})`)
                    .join(', ')})`,
                }}
              />
            );
          })}
        </div>
      </section>
      {/* G208: 装饰（焦点 / 块）——两族各七色，另有一枚清除。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">{DECORATION_KEYS.title.label}</h4>
        <div className="space-y-2">
          {(['focus', 'block'] as const).map((kind) => {
            const active = decorations[kind];
            return (
              <div key={kind} className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-meta text-foreground/55">{DECORATION_KEYS[kind].label}</span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {DECORATION_SWATCHES.filter((swatch) => swatch.kind === kind).map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      title={swatch.label}
                      aria-label={`${DECORATION_KEYS[kind].label} ${swatch.label}`}
                      aria-pressed={active === swatch.color}
                      onClick={() => applyDecoration(host, kind, swatch.color)}
                      className={cn(
                        'size-5 rounded-full border border-foreground/10 transition-transform hover:scale-110',
                        active === swatch.color && 'ring-2 ring-craft-accent ring-offset-1'
                      )}
                      style={{
                        backgroundColor: `var(--${kind === 'focus' ? 'focus' : 'highlight'}-${swatch.color})`,
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    title={`清除${DECORATION_KEYS[kind].label}`}
                    aria-label={`清除${DECORATION_KEYS[kind].label}`}
                    aria-pressed={active === null}
                    onClick={() => applyDecoration(host, kind, null)}
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border border-dashed border-foreground/30 text-[10px] text-foreground/55',
                      active === null && 'border-solid border-craft-accent text-craft-accent'
                    )}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* G208: 字体段——四档具名字体与默认字体。 */}
      <section>
        <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">{FONT_TITLE.label}</h4>
        <div className="grid grid-cols-5 gap-1">
          {FONT_CONTROLS.map((control) => (
            <button
              key={control.label}
              type="button"
              aria-pressed={decorations.font === control.id}
              onClick={() => control.apply(host)}
              style={{ fontFamily: control.id ? getFontStack(control.id) : undefined }}
              className={cn(
                'rounded-md border px-1 py-1.5 text-[11px] transition-colors duration-150 ease-craft hover:bg-foreground/4',
                decorations.font === control.id
                  ? 'border-craft-accent bg-craft-accent/10 text-foreground ring-1 ring-craft-accent'
                  : 'border-foreground/8 bg-card text-foreground/55'
              )}
            >
              {control.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
