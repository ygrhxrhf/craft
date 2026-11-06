'use client';

import { useCallback, useRef, useLayoutEffect } from 'react';
import { ArrowLeft, Ban, ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import type { SlashRow } from '@/lib/editor/slash-roster';
import { slashCommands, sizeShortcutCommand } from './slash-commands';

interface SlashCommandMenuProps {
  rows: SlashRow[];
  selectedIndex: number;
  onRun: (row: SlashRow) => void;
  onDrill: (label: string) => void;
  onBack: () => void;
}

/**
 * G1544 / G1613：官方斜杠菜单是**两段、逐行平铺**——第一段 20 个入口（分组入口带 ›，
 * 叶子直接执行），进组后第二段是子项集；两种态都**没有分类标题、没有副标题**（那是本地
 * 旧长列表的形态）。本机未接的子项照列、置灰标「未接入」；「更多」桶收本地独有命令。
 *
 * Arrow/Enter/Escape/Backspace 由 suggestion 插件处理（要抢在 ProseMirror 自己的键位之前），
 * 这里只负责渲染与点击。
 */
export function SlashCommandMenu({ rows, selectedIndex, onRun, onDrill, onBack }: SlashCommandMenuProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const activeIndex = Math.min(selectedIndex, Math.max(rows.length - 1, 0));

  const iconOf = useCallback((row: SlashRow) => {
    if (row.kind === 'back') return ArrowLeft;
    if (!row.command) return Ban;
    const dynamic = row.id === 'size-shortcut' ? sizeShortcutCommand(row.label) : null;
    return dynamic?.icon ?? slashCommands.find((command) => command.name === row.command)?.icon;
  }, []);

  const activate = useCallback(
    (row: SlashRow) => {
      if (row.kind === 'back') {
        onBack();
        return;
      }
      if (row.drill) {
        onDrill(row.label);
        return;
      }
      if (row.command) onRun(row);
    },
    [onBack, onDrill, onRun],
  );

  if (rows.length === 0) {
    return (
      <div
        ref={containerRef}
        role="listbox"
        aria-label="插入命令"
        className="rounded-lg bg-popover p-3 shadow-lg transition-opacity duration-150"
      >
        <p className="text-sm text-muted-foreground">无匹配命令</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="插入命令"
      className="max-h-80 w-72 overflow-y-auto rounded-lg bg-popover p-1.5 shadow-lg transition-opacity duration-150"
    >
      {/* G1568: the entrance animation lives on this inner div (100ms); the container only
          carries the 150ms opacity transition, as the official build does. */}
      <div className="animate-in fade-in-0 duration-100" data-testid="slash-menu-inner">
        {rows.map((row, index) => {
          const Icon = iconOf(row);
          const disabled = !row.command && !row.drill && row.kind !== 'back';
          return (
            <button
              key={row.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              data-testid={`slash-row-${row.kind}-${index}`}
              onClick={() => activate(row)}
              className={cn(
                'flex h-8 w-full items-center gap-3 rounded-md px-2 text-left text-ui transition-colors duration-150 ease-craft',
                index === activeIndex && !disabled
                  ? 'bg-foreground/4 text-foreground/85'
                  : 'text-foreground/85 hover:bg-foreground/4',
                disabled && 'cursor-default opacity-45 hover:bg-transparent',
              )}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-foreground/8 bg-background">
                {Icon ? <Icon className="size-3.5 text-foreground/55" /> : null}
              </div>
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {row.drill && <ChevronRight className="size-3.5 shrink-0 text-foreground/35" />}
              {disabled && <span className="shrink-0 text-[10px] text-foreground/40">未接入</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}