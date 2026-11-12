'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import type { CodeRosterOption } from './block-actions';

/**
 * G1440/G1474 —— 代码块 `⋯` 菜单的 `语言`／`主题` 两枚子菜单。官方那一格是「一个搜索框 ＋
 * 单组清单 ＋ 当前值打勾」，与块头选择器同形；这里照抄那三件，不另造一套。
 */
export function CodeRosterSubmenu({
  icon,
  label,
  placeholder,
  value,
  options,
  filter,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  options: readonly CodeRosterOption[];
  filter: (query: string) => CodeRosterOption[];
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = filter(query);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger aria-label={label}>
        {icon}
        {label}
      </DropdownMenuSubTrigger>
      {/* 官方 G1474 量到 256×176；行高仍用全站菜单的 28px（官方 ≈32.8px/行是它自己的样式）*/}
      <DropdownMenuSubContent className="w-64">
        <div className="p-1">
          <input
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            // 输入框里的按键不能交给菜单的 typeahead／方向键处理，否则一个字都打不进去。
            onKeyDown={(event) => event.stopPropagation()}
            className="mb-1 w-full rounded bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
          />
          <div className="max-h-44 overflow-y-auto">
            {shown.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onPick(option.value)}
              >
                <Check
                  className={option.value === value ? 'mr-2 size-3' : 'mr-2 size-3 opacity-0'}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
