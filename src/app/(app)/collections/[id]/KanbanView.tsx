'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { addItem, deleteItem, setItemValue } from '@/actions/collection/items';
import { useRouter } from 'next/navigation';
import { cn } from 'cn';
import { KANBAN_NO_GROUP_PROPERTY } from '@/lib/collection/kanban-copy';
import { BOARD_LONG_PRESS_MS, boardHoldCancelled, dropColumnAt } from '@/lib/collection/kanban-drag';
import type { getCollection } from '@/actions/collection/collection';

type Collection = Awaited<ReturnType<typeof getCollection>>;
type View = NonNullable<Collection>['views'][number];

interface KanbanViewProps {
  collection: NonNullable<Collection>;
  view: View;
}

interface SelectOption {
  id: string;
  label: string;
  color: string;
}

function getSelectOptions(config: string | null): SelectOption[] {
  if (!config) return [];
  try {
    const parsed = typeof config === 'string' ? JSON.parse(config) : config;
    return parsed.options ?? [];
  } catch {
    return [];
  }
}

function parseValue(raw: any): any {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function KanbanView({ collection }: KanbanViewProps) {
  const router = useRouter();
  // G268：看板卡片长按 150ms 才起拖，落点按列 id 改分组值。
  const [armedId, setArmedId] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const clearHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    pressPoint.current = null;
  };
  useEffect(() => clearHold, []);

  const beginHold = (itemId: string, x: number, y: number) => {
    clearHold();
    pressPoint.current = { x, y };
    holdTimer.current = window.setTimeout(() => setArmedId(itemId), BOARD_LONG_PRESS_MS);
  };
  const trackHold = (x: number, y: number) => {
    const start = pressPoint.current;
    if (start && boardHoldCancelled(x - start.x, y - start.y)) clearHold();
  };
  const endHold = () => {
    clearHold();
    if (!dragging.current) setArmedId(null);
  };
  const beginDrag = () => {
    dragging.current = true;
  };
  const endDrag = () => {
    dragging.current = false;
    setArmedId(null);
    clearHold();
  };
  const dropInto = (optionId: string | null) => {
    if (!armedId) return;
    const itemId = armedId;
    setArmedId(null);
    clearHold();
    void handleMoveItem(itemId, optionId);
  };

  // Find the first Select property to group by
  const groupProperty = collection.properties.find((p: any) => p.type === 'select');
  const options = groupProperty ? getSelectOptions(groupProperty.config) : [];

  // Group items by the Select property value
  const groupedItems = new Map<string, any[]>();
  const ungroupedItems: any[] = [];

  for (const option of options) {
    groupedItems.set(option.id, []);
  }

  for (const item of collection.items) {
    if (!groupProperty) {
      ungroupedItems.push(item);
      continue;
    }

    const value = item.values?.find((v: any) => v.propertyId === groupProperty.id);
    const parsed = parseValue(value?.value);

    if (parsed && groupedItems.has(parsed)) {
      groupedItems.get(parsed)!.push(item);
    } else {
      ungroupedItems.push(item);
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
    router.refresh();
  };

  const handleAddItem = async (optionId?: string) => {
    const item = await addItem(collection.id);

    if (groupProperty && optionId) {
      await setItemValue(item.id, groupProperty.id, optionId);
    }

    router.refresh();
  };

  const handleMoveItem = async (itemId: string, optionId: string | null) => {
    if (!groupProperty) return;

    if (optionId) {
      await setItemValue(itemId, groupProperty.id, optionId);
    } else {
      await setItemValue(itemId, groupProperty.id, null);
    }

    router.refresh();
  };

  if (!groupProperty) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          {/* Verbatim `kanban_no_group_property` (G232): the guard points at the action rather
              than leaving a blank view. */}
          <p className="text-sm text-muted-foreground">{KANBAN_NO_GROUP_PROPERTY}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto p-4 max-md:flex-col max-md:overflow-x-hidden max-md:overflow-y-auto">
      {options.map(option => {
        const items = groupedItems.get(option.id) ?? [];
        return (
          <KanbanColumn
            key={option.id}
            option={option}
            items={items}
            onAddItem={() => handleAddItem(option.id)}
            onDeleteItem={handleDeleteItem}
            onMoveItem={handleMoveItem}
            options={options}
            armedId={armedId}
            onBeginHold={beginHold}
            onTrackHold={trackHold}
            onEndHold={endHold}
            onBeginDrag={beginDrag}
            onEndDrag={endDrag}
            onDropInto={dropInto}
          />
        );
      })}

      {ungroupedItems.length > 0 && (
        <KanbanColumn
          option={{ id: '__ungrouped__', label: '未分组', color: '#6b7280' }}
          items={ungroupedItems}
          onAddItem={() => handleAddItem()}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          options={options}
          armedId={armedId}
          onBeginHold={beginHold}
          onTrackHold={trackHold}
          onEndHold={endHold}
          onBeginDrag={beginDrag}
          onEndDrag={endDrag}
          onDropInto={dropInto}
        />
      )}
    </div>
  );
}

interface KanbanColumnProps {
  option: SelectOption;
  items: any[];
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, optionId: string | null) => void;
  options: SelectOption[];
  armedId: string | null;
  onBeginHold: (itemId: string, x: number, y: number) => void;
  onTrackHold: (x: number, y: number) => void;
  onEndHold: () => void;
  onBeginDrag: () => void;
  onEndDrag: () => void;
  onDropInto: (optionId: string | null) => void;
}

function KanbanColumn({ option, items, onAddItem, onDeleteItem, onMoveItem, options, armedId, onBeginHold, onTrackHold, onEndHold, onBeginDrag, onEndDrag, onDropInto }: KanbanColumnProps) {
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  return (
    <div
      data-kanban-column={option.id}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropInto(option.id === '__ungrouped__' ? null : option.id);
      }}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/30 max-md:w-full"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: option.color }}
        />
        <span className="flex-1 text-sm font-medium">{option.label}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {items.map(item => (
          <KanbanCard
            key={item.id}
            item={item}
            onDelete={() => onDeleteItem(item.id)}
            onMove={(optionId) => { onMoveItem(item.id, optionId); setMovingItemId(null); }}
            options={options}
            isMoving={movingItemId === item.id}
            onStartMove={() => setMovingItemId(item.id)}
            onCancelMove={() => setMovingItemId(null)}
            armed={armedId === item.id}
            onBeginHold={(x, y) => onBeginHold(item.id, x, y)}
            onTrackHold={onTrackHold}
            onEndHold={onEndHold}
            onBeginDrag={onBeginDrag}
            onEndDrag={onEndDrag}
          />
        ))}
      </div>

      <div className="border-t border-border p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onAddItem}>
          <Plus className="mr-2 size-4" />
          新建
        </Button>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  item: any;
  onDelete: () => void;
  onMove: (optionId: string | null) => void;
  options: SelectOption[];
  isMoving: boolean;
  onStartMove: () => void;
  onCancelMove: () => void;
  armed: boolean;
  onBeginHold: (x: number, y: number) => void;
  onTrackHold: (x: number, y: number) => void;
  onEndHold: () => void;
  onBeginDrag: () => void;
  onEndDrag: () => void;
}

function KanbanCard({ item, onDelete, onMove, options, isMoving, onStartMove, onCancelMove, armed, onBeginHold, onTrackHold, onEndHold, onBeginDrag, onEndDrag }: KanbanCardProps) {
  if (isMoving) {
    return (
      <div className="rounded-md border border-border bg-background p-3">
        <p className="mb-2 text-xs text-muted-foreground">移动到：</p>
        <div className="flex flex-wrap gap-1">
          {options.map(opt => (
            <button
              key={opt.id}
              className="rounded-full px-2 py-0.5 text-xs hover:bg-muted"
              style={{ backgroundColor: opt.color + '20', color: opt.color }}
              onClick={() => onMove(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <button
            className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => onMove(null)}
          >
            未分组
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={onCancelMove}
        >
          取消
        </Button>
      </div>
    );
  }

  return (
    <div
      draggable={armed}
      data-armed={armed || undefined}
      onPointerDown={(event) => onBeginHold(event.clientX, event.clientY)}
      onPointerMove={(event) => onTrackHold(event.clientX, event.clientY)}
      onPointerUp={onEndHold}
      onPointerLeave={onEndHold}
      onDragStart={(event) => {
        onBeginDrag();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
      }}
      onDragEnd={onEndDrag}
      className={cn(
        'group relative rounded-md border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md',
        armed && 'ring-2 ring-craft-accent/60'
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-medium">
          {item.id.slice(0, 8)}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <button
            className="rounded p-1 hover:bg-muted"
            onClick={onStartMove}
            title="移动"
          >
            <GripVertical className="size-3 text-muted-foreground" />
          </button>
          <button
            className="rounded p-1 hover:bg-destructive/10"
            onClick={onDelete}
            title="删除"
          >
            <Trash2 className="size-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
