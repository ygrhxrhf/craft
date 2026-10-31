'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  adoptDateExpression,
  isPastLocalDay,
  parseDateExpression,
  startOfLocalDay,
} from '@/lib/task/date-parse';

interface TaskDatePopoverProps {
  kind: 'schedule' | 'deadline';
  value: string | null;
  onChange: (value: string | null) => void;
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * G332–G369: the date box lives in a popover above the field, not inline in the row.
 * Typing previews by jumping the calendar and marking the day; adopting is silent in both
 * failure directions — unparsed text and past days change nothing.
 */
export function TaskDatePopover({ kind, value, onChange }: TaskDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [month, setMonth] = useState<Date>(() => (value ? new Date(value) : new Date()));
  const [preview, setPreview] = useState<Date | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setText(value ? formatDay(value) : '');
    setMonth(value ? new Date(value) : new Date());
    setPreview(null);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, value]);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
      });
    }
    setOpen((current) => !current);
  };

  const commit = (date: Date) => {
    onChange(startOfLocalDay(date).toISOString());
    setPreview(null);
  };

  const handleText = (raw: string) => {
    setText(raw);
    const parsed = parseDateExpression(raw);
    if (parsed.ok && !isPastLocalDay(parsed.date)) {
      setPreview(parsed.date);
      setMonth(parsed.date);
    } else {
      setPreview(null);
    }
  };

  // Enter adopts with the same guard as the box's official behaviour: empty clears,
  // unparsed or past is dropped without feedback, an unchanged day is not rewritten.
  const commitText = () => {
    const adopted = adoptDateExpression(text, value);
    if (adopted.action === 'clear') onChange(null);
    if (adopted.action === 'commit') onChange(adopted.value);
    setPreview(null);
  };

  const Icon = kind === 'schedule' ? CalendarDays : Flag;
  const label = kind === 'schedule' ? '计划' : '截止';
  const display = value ? formatDay(value) : null;

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`设置${label}日期`}
        className={
          display
            ? 'flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'
            : 'flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100'
        }
      >
        <Icon className="size-3.5" />
        {display ? `${label} ${display}` : label}
      </button>

      {open && position && (
        <div
          ref={panelRef}
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-72 rounded-xl border border-border bg-background p-2 shadow-lg"
          aria-label={`${label}日期`}
        >
          <Input
            autoFocus
            value={text}
            placeholder="日期"
            aria-label="日期"
            onChange={(event) => handleText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitText();
              }
            }}
            className="mb-1 h-8"
          />
          <Calendar
            mode="single"
            selected={preview ?? (value ? new Date(value) : undefined)}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              if (date) commit(date);
            }}
            disabled={{ before: startOfLocalDay(new Date()) }}
            className="p-0"
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                onChange(null);
                setText('');
                setPreview(null);
              }}
            >
              清除
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => commit(new Date())}
            >
              今天
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
