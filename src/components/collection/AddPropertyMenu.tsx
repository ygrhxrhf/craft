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

import { PROPERTY_TYPES } from '@/lib/collection/property-types';

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
  const [expression, setExpression] = useState('');
  const [targetId, setTargetId] = useState('');
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || type !== 'relation') return;
    getCollections().then((list) =>
      setOthers((list as any[]).filter((item) => item.id !== collectionId).map((item) => ({ id: item.id, name: item.name })))
    ).catch(() => setOthers([]));
  }, [open, type, collectionId]);

  const preview = type === 'formula' && expression ? evaluateFormula(expression, {}) : null;

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const config =
        type === 'formula' ? { expression } : type === 'relation' ? { collectionId: targetId || null } : undefined;
      // 新属性 → 本地 id + applyLocal（order = 本地镜像内该集合存活属性数，与
      // 服务端 addProperty 的算法一致）；flushNow 后 refresh 才能读到新行
      const rows = await readLocalRecords('collection_property');
      const order = rows.filter((r) =>
        r.op !== 'delete' &&
        !r.data?.deletedAt &&
        r.data?.collectionId === collectionId
      ).length;
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

      <Dialog open={open} onOpenChange={setOpen}>
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
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-label="属性类型"
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

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
              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                aria-label="关联集合"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">选择目标集合…</option>
                {others.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </div>
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
