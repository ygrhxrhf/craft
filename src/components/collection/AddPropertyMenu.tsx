'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getCollections } from '@/actions/collection/collection';
import { getSyncManager } from '@/lib/sync-core';
import { readLocalRecords } from '@/components/sync/local-records';
import { evaluateFormula, type FormulaResult } from '@/lib/collection/formula';

import {
  DEFAULT_NUMBER_FORMAT,
  NUMBER_FORMATS,
  PROPERTY_TYPES,
  type NumberFormat,
} from '@/lib/collection/property-types';
import { TWO_WAY_COPY } from '@/lib/collection/two-way-relation';
import { COLLECTION_COLUMN_LIMIT_MESSAGE, canAddColumn, isReservedColumnName } from '@/lib/collection/limits';
import { FieldIcon, FieldTypeIcon } from './FieldIcon';

/** Local extras that exist next to the official vocabulary (G393). */
const LOCAL_ONLY_TYPES: { value: string; label: string }[] = [
  { value: 'created_at', label: '创建时间' },
  { value: 'updated_at', label: '更新时间' },
];

const PROPERTY_TYPE_OPTIONS = [...PROPERTY_TYPES, ...LOCAL_ONLY_TYPES];

export function AddPropertyMenu({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [numberFormat, setNumberFormat] = useState<NumberFormat>(DEFAULT_NUMBER_FORMAT);
  const [expression, setExpression] = useState('');
  const [targetId, setTargetId] = useState('');
  // G285: whether the relation column points both ways.
  const [twoWay, setTwoWay] = useState(false);
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || type !== 'relation') return;
    getCollections().then((list) =>
      setOthers((list as any[]).filter((item) => item.id !== collectionId).map((item) => ({ id: item.id, name: item.name })))
    ).catch(() => setOthers([]));
  }, [open, type, collectionId]);

  const preview = type === 'formula' && expression ? evaluateFormula(expression, {}) : null;

  const submit = async () => {
    if (!name.trim()) return;
    // G676: reserved names cannot be new column names. The official failure sentence was never
    // collected, so this copy is local.
    if (isReservedColumnName(name)) {
      setError(`不能使用保留名「${name.trim()}」作为列名`);
      return;
    }
    setBusy(true);
    try {
      const config =
        type === 'formula'
          ? { expression }
          : type === 'relation'
            ? { objectListId: targetId || null, twoWay }
            : type === 'number'
              ? { numberFormat }
              : undefined;
      // 新属性 → 本地 id + applyLocal（order = 本地镜像内该集合存活属性数，与
      // 服务端 addProperty 的算法一致）；flushNow 后 refresh 才能读到新行
      const rows = await readLocalRecords('collection_property');
      const order = rows.filter((r) =>
        r.op !== 'delete' &&
        !r.data?.deletedAt &&
        r.data?.collectionId === collectionId
      ).length;
      // G690：20 列上限在界面这一层先拦一次，错误句与校验层逐字一致。
      if (!canAddColumn(order)) {
        setError(COLLECTION_COLUMN_LIMIT_MESSAGE);
        return;
      }
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'collection_property',
        id: crypto.randomUUID(),
        patch: {
          collectionId,
          name: name.trim(),
          type,
          config: config ? JSON.stringify(config) : null,
          order,
          isVisible: true,
        },
      });
      await manager.flushNow();
      setOpen(false);
      setName('');
      setError(null);
      setNumberFormat(DEFAULT_NUMBER_FORMAT);
      setExpression('');
      setTargetId('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        属性
      </Button>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新属性</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="属性名称"
              aria-label="属性名称"
            />
            {/* G396: 每个类型都有自己的图标——官方名册里点过名的照抄，其余给一个可画的兜底。 */}
            <div
              role="radiogroup"
              aria-label="属性类型"
              className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-1"
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => {
                const active = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(option.value)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      active ? 'bg-foreground/10 font-medium' : 'hover:bg-foreground/5'
                    }`}
                  >
                    <FieldTypeIcon type={option.value} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {type === 'number' && (
              <div role="radiogroup" aria-label="数字格式" className="flex gap-1">
                {NUMBER_FORMATS.map((format) => {
                  const active = numberFormat === format.value;
                  return (
                    <button
                      key={format.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setNumberFormat(format.value)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        active
                          ? 'border-foreground/30 bg-foreground/10 font-medium'
                          : 'border-border hover:bg-foreground/5'
                      }`}
                    >
                      <FieldIcon name={format.icon} className="size-3.5" />
                      {format.label}
                    </button>
                  );
                })}
              </div>
            )}

            {type === 'formula' && (
              <div className="flex flex-col gap-1">
                <Input
                  value={expression}
                  onChange={(event) => setExpression(event.target.value)}
                  placeholder="{价格} * {数量}"
                  aria-label="公式表达式"
                />
                <p className="text-xs text-muted-foreground">
                  {expression
                    ? preview?.ok
                      ? `示例结果：${preview.value}`
                      : (preview as Extract<FormulaResult, { ok: false }>).error
                    : '用 {属性名} 引用同一行的其它属性'}
                </p>
              </div>
            )}

            {type === 'relation' && (
              <div className="space-y-2">
                <select
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  aria-label="关联集合"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">选择目标集合…</option>
                  {others.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {/* G285: the official relation can be two-way — the target collection then gets a
                    column pointing back here. The checkbox records the choice in the column config. */}
                <label className="flex items-center gap-2 text-sm text-foreground/75">
                  <input
                    type="checkbox"
                    checked={twoWay}
                    onChange={(event) => setTwoWay(event.target.checked)}
                    aria-label={TWO_WAY_COPY.twoWay.label}
                  />
                  {TWO_WAY_COPY.twoWay.label}
                </label>
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button disabled={busy || !name.trim()} onClick={() => void submit()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
