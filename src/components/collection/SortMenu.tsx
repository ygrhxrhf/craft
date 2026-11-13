'use client';

import { Button } from '@/components/ui/button';
import { ArrowUpDown, X, Plus } from 'lucide-react';
import { useState } from 'react';
import type { getCollection } from '@/actions/collection/collection';
import { parseCellValue } from '@/lib/collection/cell-value';
import { compareForSort } from '@/lib/collection/sort-compare';

type Collection = Awaited<ReturnType<typeof getCollection>>;

interface SortRule {
  id: string;
  propertyId: string;
  direction: 'asc' | 'desc';
}

interface SortMenuProps {
  collection: NonNullable<Collection>;
  sorts: SortRule[];
  onSortsChange: (sorts: SortRule[]) => void;
}

export function SortMenu({ collection, sorts, onSortsChange }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const properties = collection.properties.filter((p: any) => p.isVisible);

  const handleAddSort = () => {
    if (properties.length === 0) return;

    const newSort: SortRule = {
      id: crypto.randomUUID(),
      propertyId: properties[0].id,
      direction: 'asc',
    };

    onSortsChange([...sorts, newSort]);
  };

  const handleRemoveSort = (sortId: string) => {
    onSortsChange(sorts.filter(s => s.id !== sortId));
  };

  const handleUpdateSort = (sortId: string, updates: Partial<SortRule>) => {
    onSortsChange(
      sorts.map(s => (s.id === sortId ? { ...s, ...updates } : s))
    );
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 rounded-md border border-border px-2 text-ui font-medium text-foreground/55 hover:bg-foreground/4 hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <ArrowUpDown className="mr-1.5 size-3.5" />
        排序
      </Button>
    );
  }

  return (
    <div className="space-y-2 border-b border-border bg-muted/30 px-4 py-3 text-ui">
      <div className="flex items-center justify-between">
        <span className="text-ui font-medium">排序规则</span>
        <Button variant="ghost" size="sm" className="h-7 rounded-md hover:bg-foreground/4" onClick={() => setIsOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {sorts.map(sort => (
          <div key={sort.id} className="flex items-center gap-2">
            <select
              value={sort.propertyId}
              onChange={(e) => handleUpdateSort(sort.id, { propertyId: e.target.value })}
              className="h-7 rounded-md border border-border bg-background px-2 text-ui transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={sort.direction}
              onChange={(e) => handleUpdateSort(sort.id, { direction: e.target.value as 'asc' | 'desc' })}
              className="h-7 rounded-md border border-border bg-background px-2 text-ui transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-md hover:bg-foreground/4"
              onClick={() => handleRemoveSort(sort.id)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="h-7 rounded-md text-ui hover:bg-foreground/4" onClick={handleAddSort}>
        <Plus className="mr-1.5 size-3.5" />
        添加排序
      </Button>
    </div>
  );
}

export function applySorts(items: any[], sorts: SortRule[], properties: any[]): any[] {
  if (sorts.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const property = properties.find((p: any) => p.id === sort.propertyId);
      if (!property) continue;

      const aValue = parseCellValue(a.values?.find((v: any) => v.propertyId === sort.propertyId)?.value);
      const bValue = parseCellValue(b.values?.find((v: any) => v.propertyId === sort.propertyId)?.value);

      // One Collator for every column type, blanks first in both directions — protocol §9's
      // single sort rule, replacing the three-way number/date/string branch this used to take.
      const comparison = compareForSort(aValue, bValue, sort.direction);
      if (comparison !== 0) return comparison;
    }

    return 0;
  });
}
