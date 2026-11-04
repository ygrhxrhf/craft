'use client';

import { buildRelationValue, relationItems, relationTargetId } from '@/lib/collection/relation-value';
import { normalizeDateValue } from '@/lib/collection/date-value';
import { rawValueOf } from '@/lib/collection/cell-value';
import { DEFAULT_NUMBER_FORMAT, formatNumber as formatNumberFor, isNumberFormat, type NumberFormat } from '@/lib/collection/property-types';
import { cellKeyAction } from '@/lib/collection/cell-key';
import { draftTextFor, normalizeTextCommit, parseNumberInput } from '@/lib/collection/cell-edit';
import { useCellEditorEscape } from './cell-editor-escape';
import {
  hitLabel,
  parseLinkToBlock,
  serializeLinkToBlock,
} from '@/lib/collection/link-to-block';
import { anchorHref } from '@/lib/editor/block-anchor';
import { searchBlockAnchors, type BlockAnchorHit } from '@/actions/document/anchors';
import { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown, Calendar as CalendarIcon, Link2, Paperclip } from 'lucide-react';
import { cn } from 'cn';
import { evaluateFormula } from '@/lib/collection/formula';
import { getCollection } from '@/actions/collection/collection';
import { uploadFile } from '@/lib/upload-client';
import {
  CHARACTER_LIMIT_SUBTITLE,
  CHARACTER_LIMIT_TITLE,
  clampToCharacterLimit,
  exceedsCharacterLimit,
} from '@/lib/collection/character-limit';

interface Property {
  id: string;
  name: string;
  type: string;
  config: string | null;
  order: number;
  isVisible: boolean;
}

interface PropertyCellProps {
  property: Property;
  value: any;
  onChange: (value: any) => void;
  /** The row this cell belongs to; carries the timestamps formula and date columns read. */
  item?: { createdAt?: string; updatedAt?: string; values?: { propertyId: string; value: unknown }[] };
  /** Needed to turn `{属性名}` references into values. */
  properties?: Property[];
}

function parseValue(raw: any): any {
  if (raw == null || raw === '') return null;
  // G451: a typed cell value `{type, theme, value}` reads back as its bare `value`; a legacy bare
  // value passes through unchanged.
  if (typeof raw === 'object') return rawValueOf(raw);
  if (typeof raw !== 'string') return raw;
  try {
    return rawValueOf(JSON.parse(raw));
  } catch {
    return raw;
  }
}

export function PropertyCell({ property, value, onChange, item, properties }: PropertyCellProps) {
  const parsed = parseValue(value);

  switch (property.type) {
    case 'number':
      // G396：数字字段的三档显示子格式（数字／百分比／货币）从字段 config 读。
      return <NumberCell value={parsed} onChange={onChange} format={readNumberFormat(property.config)} />;
    case 'checkbox':
      return <CheckboxCell value={parsed} onChange={onChange} />;
    case 'date':
      return <DateCell value={parsed} onChange={onChange} />;
    case 'select':
      return <SelectCell property={property} value={parsed} onChange={onChange} />;
    case 'multi_select':
    case 'multiSelect':
      return <MultiSelectCell property={property} value={parsed} onChange={onChange} />;
    case 'url':
      return <URLCell value={parsed} onChange={onChange} />;
    case 'email':
      return <EmailCell value={parsed} onChange={onChange} />;
    case 'phone':
    case 'person':
      return <TextCell value={parsed} onChange={onChange} />;
    case 'formula':
      return <FormulaCell property={property} item={item} properties={properties} />;
    case 'created_at':
      return <TimestampCell value={item?.createdAt} />;
    case 'updated_at':
      return <TimestampCell value={item?.updatedAt} />;
    case 'file':
      return <FileCell value={parsed} onChange={onChange} />;
    // G393: `media` is the official name for the local `file` column.
    case 'media':
      return <FileCell value={parsed} onChange={onChange} />;
    // G453: `linkToBlock` 落库是 `{name,url}` 快照（不是活引用），编辑器带搜索框。
    case 'linkToBlock':
      return <LinkToBlockCell value={parsed} onChange={onChange} />;
    case 'relation':
      return <RelationCell property={property} value={parsed} onChange={onChange} />;
    default:
      return <TextCell value={parsed} onChange={onChange} />;
  }
}

export function CellDisplay({ value }: { value: any }) {
  const parsed = parseValue(value);
  if (parsed == null || parsed === '') return <span className="text-muted-foreground/50">-</span>;
  if (typeof parsed === 'boolean') {
    return <span>{parsed ? '✓' : ''}</span>;
  }
  if (Array.isArray(parsed)) {
    return <span>{parsed.join(', ')}</span>;
  }
  // G453：`linkToBlock` 的 `{name,url}` 快照在只读展示面只印快照名，别落成 [object Object]。
  const snapshot = parseLinkToBlock(parsed);
  if (snapshot) return <span>{snapshot.name}</span>;
  return <span>{String(parsed)}</span>;
}

// ─── Text ────────────────────────────────────────────
function TextCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const [limitHit, setLimitHit] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="min-h-8 cursor-pointer px-2 py-1 transition-colors duration-150 hover:bg-foreground/[0.03]" onClick={() => { setText(value ?? ''); setEditing(true); }}>
        <span className="typography-ui-sm-500">{value || <span className="text-muted-foreground/50">-</span>}</span>
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type="text"
      value={text}
      title={limitHit ? `${CHARACTER_LIMIT_TITLE}：${CHARACTER_LIMIT_SUBTITLE}` : undefined}
      aria-invalid={limitHit || undefined}
      onChange={e => {
        // G89/G1532：单字段 10000 字符上限（官方两句逐字）。触到上限就截住并给提示，
        // 不静默吞掉用户的输入。
        const next = e.target.value;
        if (exceedsCharacterLimit(next)) {
          setText(clampToCharacterLimit(next));
          setLimitHit(true);
          return;
        }
        setLimitHit(false);
        setText(next);
      }}
      onBlur={() => { setEditing(false); onChange(normalizeTextCommit(text)); }}
      onKeyDown={e => {
        // G466: Enter commits and the event is stopped — otherwise it bubbles into the block-level
        // Enter (split/new block) when the cell is rendered inside the editor. Shift-Enter is left
        // alone (it keeps its own meaning). IME composition is ignored entirely.
        const action = cellKeyAction(e);
        if (action === 'none') return;
        e.preventDefault();
        e.stopPropagation();
        if (action === 'commit') { setEditing(false); onChange(normalizeTextCommit(text)); }
        else { setText(value ?? ''); setEditing(false); }
      }}
      className="w-full rounded-md border border-craft-accent bg-background px-1 py-0.5 text-ui outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

// ─── Number ──────────────────────────────────────────
function NumberCell({ value, onChange, format }: { value: any; onChange: (v: any) => void; format: NumberFormat }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => draftTextFor(value, format));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="min-h-8 cursor-pointer px-2 py-1 transition-colors duration-150 hover:bg-foreground/[0.03]" onClick={() => { setText(draftTextFor(value, format)); setEditing(true); }}>
        <span className="text-ui tabular-nums">{value != null ? formatNumberFor(value, format) : <span className="text-muted-foreground/50">-</span>}</span>
      </div>
    );
  }

  return (
    <input
      ref={ref}
      // G468: 官方输入框恒为 text + inputMode，不用 type=number——否则 `1,234`／`12%`／`$12`
      // 会被浏览器直接判非法而读成空串。
      type="text"
      inputMode="decimal"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => { setEditing(false); onChange(parseNumberInput(text, format)); }}
      onKeyDown={e => {
        const action = cellKeyAction(e);
        if (action === 'none') return;
        e.preventDefault();
        e.stopPropagation();
        if (action === 'commit') { onChange(parseNumberInput(text, format)); setEditing(false); }
        else { setText(draftTextFor(value, format)); setEditing(false); }
      }}
      className="w-full rounded-md border border-craft-accent bg-background px-1 py-0.5 text-ui tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

// ─── Checkbox ────────────────────────────────────────
function CheckboxCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="flex min-h-8 items-center px-2 py-1">
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'flex size-4 items-center justify-center rounded-md border transition-colors duration-150',
          value
            ? 'border-craft-accent bg-craft-accent text-white'
            : 'border-foreground/25 hover:border-craft-accent'
        )}
      >
        {value && <Check className="size-3" />}
      </button>
    </div>
  );
}

// ─── Date ────────────────────────────────────────────
function DateCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="min-h-8 cursor-pointer px-2 py-1 transition-colors duration-150 hover:bg-foreground/[0.03]" onClick={() => { setText(value ?? ''); setEditing(true); }}>
        <span className="typography-ui-sm-500">{value || <span className="text-muted-foreground/50">-</span>}</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-8 px-2 py-1">
      <div className="flex items-center gap-1">
        <input
          ref={ref}
          type="date"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => { setEditing(false); onChange(normalizeDateValue(text)); }}
          onKeyDown={e => {
            const action = cellKeyAction(e);
            if (action === 'none') return;
            e.preventDefault();
            e.stopPropagation();
            // G394: the date column stores a validated instant, never a half-typed string.
            if (action === 'commit') { setEditing(false); onChange(normalizeDateValue(text)); }
            else setEditing(false);
          }}
          className="w-full min-w-0 flex-1 rounded-md border border-craft-accent bg-background px-1 py-0.5 text-ui outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {/* G367：日期框的"有值态"副面孔——有值时出现 `×` 清除按钮（空态没有它）。 */}
        {text && (
          <button
            type="button"
            aria-label="清除日期"
            onMouseDown={(e) => {
              e.preventDefault();
              setText('');
              setEditing(false);
              onChange(null);
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
        {/* G642：集合日期格是"当场合成的假属性"，官方给它一枚显式**「应用」**按钮——
            选好的日子先在层里暂存，点「应用」才落库。本地此前只有 blur/Enter 直接提交。 */}
        <button
          type="button"
          data-testid="cell-date-apply"
          aria-label="应用"
          onMouseDown={(e) => {
            e.preventDefault();
            setEditing(false);
            onChange(normalizeDateValue(text));
          }}
          className="shrink-0 rounded border border-border px-1.5 py-0.5 text-meta text-foreground/70 transition-colors hover:bg-foreground/4"
        >
          应用
        </button>
      </div>
    </div>
  );
}

// ─── Select ──────────────────────────────────────────
function SelectCell({ property, value, onChange }: { property: Property; value: any; onChange: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  // G456：弹层开时按名字进全局焦点栈，Esc 由栈按名字路由关掉它。
  useCellEditorEscape(open, 'collection-v2-select-editor', () => setOpen(false));
  const options = getSelectOptions(property.config);

  const selected = options.find(o => o.id === value);

  return (
    <div className="relative min-h-8 px-2 py-1">
      <button
        className="flex w-full items-center gap-1 text-left text-ui transition-colors duration-150 hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span
            className="rounded-md px-2 py-0.5 text-ui font-medium"
            style={{ backgroundColor: selected.color + '20', color: selected.color }}
          >
            {selected.label}
          </span>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
            {options.map(option => (
              <button
                key={option.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-ui transition-colors duration-150 hover:bg-foreground/4"
                onClick={() => { onChange(option.id); setOpen(false); }}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span>{option.label}</span>
                {value === option.id && <Check className="ml-auto size-3" />}
              </button>
            ))}
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-ui text-foreground/40 transition-colors duration-150 hover:bg-foreground/4 hover:text-foreground"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              清除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Multi Select ────────────────────────────────────
function MultiSelectCell({ property, value, onChange }: { property: Property; value: any; onChange: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  useCellEditorEscape(open, 'collection-v2-multiselect-editor', () => setOpen(false));
  const options = getSelectOptions(property.config);
  const selected: string[] = Array.isArray(value) ? value : [];

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    onChange(next.length > 0 ? next : null);
  };

  return (
    <div className="relative min-h-8 px-2 py-1">
      <button
        className="flex w-full flex-wrap items-center gap-1 text-left text-ui transition-colors duration-150 hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        onClick={() => setOpen(!open)}
      >
        {selected.length > 0 ? (
          selected.map(id => {
            const opt = options.find(o => o.id === id);
            if (!opt) return null;
            return (
              <span
                key={id}
                className="rounded-md px-2 py-0.5 text-ui font-medium"
                style={{ backgroundColor: opt.color + '20', color: opt.color }}
              >
                {opt.label}
              </span>
            );
          })
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
            {options.map(option => (
              <button
                key={option.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-ui transition-colors duration-150 hover:bg-foreground/4"
                onClick={() => toggle(option.id)}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span>{option.label}</span>
                {selected.includes(option.id) && <Check className="ml-auto size-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── URL ─────────────────────────────────────────────
function URLCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="min-h-8 cursor-pointer px-2 py-1 transition-colors duration-150 hover:bg-foreground/[0.03]" onClick={() => { setText(value ?? ''); setEditing(true); }}>
        {value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ui text-craft-accent underline-offset-4 hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {String(value).replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type="url"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => { setEditing(false); onChange(normalizeTextCommit(text)); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { setEditing(false); onChange(normalizeTextCommit(text)); }
        if (e.key === 'Escape') { setText(value ?? ''); setEditing(false); }
      }}
      className="w-full rounded-md border border-craft-accent bg-background px-1 py-0.5 text-ui outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

// ─── Email ───────────────────────────────────────────
function EmailCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div className="min-h-8 cursor-pointer px-2 py-1 transition-colors duration-150 hover:bg-foreground/[0.03]" onClick={() => { setText(value ?? ''); setEditing(true); }}>
        {value ? (
          <a
            href={`mailto:${String(value)}`}
            className="text-ui text-craft-accent underline-offset-4 hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {String(value)}
          </a>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type="email"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => { setEditing(false); onChange(normalizeTextCommit(text)); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { setEditing(false); onChange(normalizeTextCommit(text)); }
        if (e.key === 'Escape') { setText(value ?? ''); setEditing(false); }
      }}
      className="w-full rounded-md border border-craft-accent bg-background px-1 py-0.5 text-ui outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

// ─── Formula ─────────────────────────────────────────
function FormulaCell({
  property,
  item,
  properties,
}: {
  property: Property;
  item?: PropertyCellProps['item'];
  properties?: Property[];
}) {
  const expression = readConfig(property.config)?.expression ?? '';
  const row: Record<string, unknown> = {};
  for (const value of item?.values ?? []) {
    const named = properties?.find((candidate) => candidate.id === value.propertyId);
    if (named) row[named.name] = parseValue(value.value);
  }

  const result = expression ? evaluateFormula(expression, row) : { ok: false as const, error: '未设置公式' };

  return (
    <div className="min-h-[32px] px-2 py-1 text-sm tabular-nums">
      {result.ok ? (
        <span>{formatNumber(result.value)}</span>
      ) : (
        <span className="text-muted-foreground/60">{result.error}</span>
      )}
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
}

// ─── Created / Updated ───────────────────────────────
function TimestampCell({ value }: { value?: string }) {
  const date = value ? new Date(value) : null;
  return (
    <div className="min-h-[32px] px-2 py-1 text-sm">
      {date && !Number.isNaN(date.getTime()) ? (
        <span className="text-muted-foreground">{date.toLocaleDateString('zh-CN')}</span>
      ) : (
        <span className="text-muted-foreground/50">-</span>
      )}
    </div>
  );
}

// ─── File ────────────────────────────────────────────
interface FileValue {
  name: string;
  url: string;
  size?: number;
}

function FileCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const file: FileValue | null =
    value && typeof value === 'object' ? (value as FileValue) : null;

  return (
    <div className="flex min-h-[32px] items-center gap-1 px-2 py-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={async (event) => {
          const picked = event.target.files?.[0];
          if (!picked) return;
          setBusy(true);
          try {
            const { url } = await uploadFile(picked);
            onChange({ name: picked.name, url, size: picked.size });
          } finally {
            setBusy(false);
            event.target.value = '';
          }
        }}
      />
      {file ? (
        <>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            <Paperclip className="size-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
          </a>
          <button
            className="ml-auto text-muted-foreground hover:text-destructive"
            aria-label="移除附件"
            onClick={() => onChange(null)}
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <button
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? '上传中…' : '添加文件'}
        </button>
      )}
    </div>
  );
}

// ─── Relation ────────────────────────────────────────
function RelationCell({
  property,
  value,
  onChange,
}: {
  property: Property;
  value: any;
  onChange: (v: any) => void;
}) {
  // G470: the target lives in `config.objectListId` (legacy `collectionId` still read).
  const targetId = relationTargetId(property.config);
  const selected: string[] = relationItems(value);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  useCellEditorEscape(open, 'collection-v2-relation-editor', () => setOpen(false));

  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    getCollection(targetId)
      .then((collection) => {
        if (!alive || !collection) return;
        const properties = collection.properties as any[];
        const items = collection.items as any[];
        const primary = properties.find((candidate) => candidate.type === 'text') ?? properties[0];
        setOptions(
          items.map((item) => ({
            id: item.id,
            label:
              String(
                parseValue(item.values?.find((entry: any) => entry.propertyId === primary?.id)?.value) ?? ''
              ) || '未命名',
          }))
        );
      })
      .catch(() => setOptions([]));
    return () => {
      alive = false;
    };
  }, [targetId]);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id];
    // G470: store the official discriminated shape; an emptied cell clears to null.
    onChange(buildRelationValue(targetId, next));
  };

  return (
    <div className="relative min-h-[32px] px-2 py-1">
      <button
        className="flex w-full flex-wrap items-center gap-1 text-left text-sm"
        disabled={!targetId}
        onClick={() => setOpen(!open)}
      >
        {selected.length ? (
          selected.map((id) => (
            <span key={id} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {options.find((option) => option.id === id)?.label ?? '已链接项'}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground/50">{targetId ? '-' : '未配置关联集合'}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 max-h-60 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
            {options.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">目标集合还没有条目</p>
            )}
            {options.map((option) => (
              <button
                key={option.id}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => toggle(option.id)}
              >
                <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected.includes(option.id) && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Link to block ──────────────────────────────────
/**
 * G453：官方这一列落库是 **`{name, url}` 快照**（不是 blockId）——改名/移动之后不跟随；
 * 选择器是带搜索框的弹层，数据源是全部块（`blocksRef = docStore.blocks`）。
 * 本地用 `searchBlockAnchors` 拿同形命中、`anchorHref` 拼地址，写回快照 JSON。
 */
function LinkToBlockCell({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const snapshot = parseLinkToBlock(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<BlockAnchorHit[]>([]);
  useCellEditorEscape(open, 'collection-v2-linktoblock-editor', () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchBlockAnchors(query, { all: true })
        .then((rows) => alive && setHits(rows))
        .catch(() => alive && setHits([]));
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const pick = (hit: BlockAnchorHit) => {
    onChange(
      serializeLinkToBlock({
        name: hitLabel(hit.text),
        url: anchorHref({
          documentId: hit.documentId,
          blockId: hit.blockId,
          blockIndex: hit.blockIndex,
        }),
      }),
    );
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative min-h-8 px-2 py-1">
      <button
        type="button"
        className="flex w-full items-center gap-1 text-left text-ui transition-colors duration-150 hover:text-foreground/70"
        onClick={() => setOpen(!open)}
      >
        {snapshot ? (
          <a
            href={snapshot.url}
            className="min-w-0 flex-1 truncate text-(--craft-accent) hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {snapshot.name}
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground/50">-</span>
        )}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 max-h-60 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索区块…"
            aria-label="搜索区块"
            className="mb-1 w-full rounded-sm border border-border bg-background px-2 py-1 text-sm outline-none"
          />
          {hits.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">没有匹配的区块</p>
          )}
          {hits.map((hit) => (
            <button
              key={`${hit.documentId}-${hit.blockId ?? hit.blockIndex}`}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => pick(hit)}
            >
              <span className="min-w-0 max-w-full truncate">{hitLabel(hit.text)}</span>
              <span className="text-[11px] text-muted-foreground">{hit.documentTitle}</span>
            </button>
          ))}
          {snapshot && (
            <button
              type="button"
              className="mt-1 w-full rounded-sm px-2 py-1.5 text-left text-[12px] text-destructive hover:bg-muted"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              清除
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────
interface SelectOption {
  id: string;
  label: string;
  color: string;
}

function readConfig(config: string | null): Record<string, any> | null {
  if (!config) return null;
  try {
    const parsed = typeof config === 'string' ? JSON.parse(config) : config;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** G396：从字段 config 读数字子格式；读不到给默认档（数字）。 */
function readNumberFormat(config: string | null): NumberFormat {
  const raw = readConfig(config)?.numberFormat;
  return isNumberFormat(raw) ? raw : DEFAULT_NUMBER_FORMAT;
}

function getSelectOptions(config: string | null): SelectOption[] {
  return readConfig(config)?.options ?? [];
}
