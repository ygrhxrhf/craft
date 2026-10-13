'use client';

import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import type { getCollection } from '@/actions/collection/collection';
import { OPERATORS, applyFilter, operatorsFor, resolveOperator } from '@/lib/collection/filter-operators';

type Collection = Awaited<ReturnType<typeof getCollection>>;

interface Filter {
  id: string;
  propertyId: string;
  operator: string;
  value: any;
}

interface FilterBarProps {
  collection: NonNullable<Collection>;
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
}

export function FilterBar({ collection, filters, onFiltersChange }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const properties = collection.properties.filter((p: any) => p.isVisible);

  const handleAddFilter = () => {
    // A column type with no permitted operator cannot be filtered at all — official `TKe` has no
    // default branch, so start from the first column that actually has one instead of silently
    // doing nothing when the title column happens to be an unfilterable type.
    const first = properties.find((p: any) => operatorsFor(p.type).length > 0);
    if (!first) return;
    const allowed = operatorsFor(first.type);

    const newFilter: Filter = {
      id: crypto.randomUUID(),
      propertyId: first.id,
      operator: allowed[0],
      value: '',
    };

    onFiltersChange([...filters, newFilter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    onFiltersChange(filters.filter(f => f.id !== filterId));
  };

  const handleUpdateFilter = (filterId: string, updates: Partial<Filter>) => {
    onFiltersChange(
      filters.map(f => (f.id === filterId ? { ...f, ...updates } : f))
    );
  };

  const getProperty = (propertyId: string) => {
    return properties.find((p: any) => p.id === propertyId);
  };

  /**
   * Switching the column re-checks the stored line value against the new type's permitted set:
   * an operator that belonged to the old column would otherwise survive the switch and answer
   * `true` for everything.
   */
  const handlePropertyChange = (filter: Filter, propertyId: string) => {
    const property = getProperty(propertyId);
    const allowed = property ? operatorsFor(property.type) : [];
    const resolved = property ? resolveOperator(filter.operator, property.type) : null;
    const nextOperator = resolved && allowed.includes(resolved) ? resolved : allowed[0] ?? '';
    handleUpdateFilter(filter.id, { propertyId, operator: nextOperator });
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 rounded-md border border-border px-2 text-ui font-medium text-foreground/55 hover:bg-foreground/4 hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="mr-1.5 size-3.5" />
        添加筛选器
      </Button>
    );
  }

  return (
    <div className="space-y-2 border-b border-border bg-muted/30 px-4 py-3 text-ui">
      <div className="flex items-center justify-between">
        <span className="text-ui font-medium">筛选条件</span>
        <Button variant="ghost" size="sm" className="h-7 rounded-md hover:bg-foreground/4" onClick={() => setIsOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {filters.map(filter => {
          const property = getProperty(filter.propertyId);
          const allowed = property ? operatorsFor(property.type) : [];
          // Legacy stored line values (`contains`, `gt`, …) are mapped here rather than rewritten
          // in the database: the mapping is local, and re-writing would lose the original row.
          const resolved = property ? resolveOperator(filter.operator, property.type) : null;
          const definition = resolved ? OPERATORS[resolved as keyof typeof OPERATORS] : null;

          return (
            <div key={filter.id} data-testid="filter-row" className="flex items-center gap-2">
              <select
                value={filter.propertyId}
                onChange={(e) => handlePropertyChange(filter, e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-ui transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {properties.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                data-testid="filter-operator"
                value={resolved ?? ''}
                onChange={(e) => handleUpdateFilter(filter.id, { operator: e.target.value })}
                className="h-7 rounded-md border border-border bg-background px-2 text-ui transition-colors duration-150 hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {resolved === null && <option value="">{filter.operator}</option>}
                {allowed.map((id) => (
                  <option key={id} value={id}>
                    {OPERATORS[id as keyof typeof OPERATORS].label}
                  </option>
                ))}
              </select>

              {(definition?.takesValue ?? true) && (
                <input
                  data-testid="filter-value"
                  type={property?.type === 'number' ? 'number' : property?.type === 'date' ? 'date' : 'text'}
                  value={filter.value ?? ''}
                  onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                  placeholder="值"
                  className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-ui focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md hover:bg-foreground/4"
                onClick={() => handleRemoveFilter(filter.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" className="h-7 rounded-md text-ui hover:bg-foreground/4" onClick={handleAddFilter}>
        <Plus className="mr-1.5 size-3.5" />
        添加条件
      </Button>
    </div>
  );
}

export function applyFilters(items: any[], filters: Filter[], properties: any[]): any[] {
  if (filters.length === 0) return items;

  return items.filter(item => {
    return filters.every(filter => {
      const property = properties.find((p: any) => p.id === filter.propertyId);
      // No property, or a line value this column type may not ask: the filter is inert, which is
      // the official `xw` rule — dropped, not answered.
      if (!property) return true;

      const value = item.values?.find((v: any) => v.propertyId === filter.propertyId)?.value;
      return applyFilter(filter, parseValue(value), property.type);
    });
  });
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
