'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { ClipboardBoundary } from '@/components/clipboard/ClipboardBoundary';

export interface SearchableOption {
  value: string;
  label: string;
}

/**
 * The code block's language and theme pickers (G1474). Both are a single group under a search box
 * whose placeholder is the collected string, and the current value carries a check. The list is
 * filtered by the caller, so the theme picker can keep its keyword rule and the language picker its
 * label rule without this component knowing either.
 */
export function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  onFilter,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: readonly SearchableOption[];
  onFilter: (query: string) => SearchableOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const current = options.find((option) => option.value === value);
  const shown = onFilter(query);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          setQuery('');
          setOpen((was) => !was);
        }}
        className="rounded bg-transparent px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {current?.label ?? value}
      </button>
      {open && (
        <ClipboardBoundary className="contents">
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
            <input
              autoFocus
              value={query}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(event) => setQuery(event.target.value)}
              className="mb-1 w-full rounded bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
            />
            <div className="max-h-44 overflow-y-auto">
              {shown.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-foreground/[0.06]"
                >
                  <Check className={option.value === value ? 'size-3' : 'size-3 opacity-0'} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </ClipboardBoundary>
      )}
    </div>
  );
}
