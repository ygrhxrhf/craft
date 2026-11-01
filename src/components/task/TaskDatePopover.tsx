'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  adoptDateExpression,
  isPastLocalDay,
  parseDateIn,
  startOfLocalDay,
} from '@/lib/task/date-parse';
import { describeRecurrence, recurrencePresetsFor } from '@/lib/task/recurrence';

interface TaskDatePopoverProps {
  kind: 'schedule' | 'deadline';
  value: string | null;
  onChange: (value: string | null) => void;
  /** G362/G373: reminder and repeat hang off the date, as two sub-rows. */
  reminder?: { value: string | null; onChange: (value: string | null) => void };
  recurrence?: { value: string | null; onChange: (value: string | null) => void };
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatMoment(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * G332–G373: the date box lives in a popover above the field, not inline in the row.
 * Typing previews by jumping the calendar and marking the day; adopting is silent in both
 * failure directions. 「提醒我…」opens a time state (date box and 今天 row disappear) and
 * 「重复…」opens the date-aware preset list, matching the official two sub-rows.
 */
export function TaskDatePopover({
  kind,
  value,
  onChange,
  reminder,
  recurrence,
}: TaskDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [submenu, setSubmenu] = useState<'none' | 'repeat'>('none');
  const [text, setText] = useState('');
  const [hour, setHour] = useState(17);
  const [minute, setMinute] = useState(0);
  const [month, setMonth] = useState<Date>(() => (value ? new Date(value) : new Date()));
  const [preview, setPreview] = useState<Date | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('date');
    setSubmenu('none');
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
    // G332: route on the document language; GB is not selected locally (no region switch yet).
    const parsed = parseDateIn(raw, new Date(), { locale: document.documentElement.lang || 'zh-Hans' });
    if (parsed.ok && !isPastLocalDay(parsed.date)) {
      setPreview(parsed.date);
      setMonth(parsed.date);
    } else {
      setPreview(null);
    }
  };

  const commitText = () => {
    const adopted = adoptDateExpression(text, value);
    if (adopted.action === 'clear') onChange(null);
    if (adopted.action === 'commit') onChange(adopted.value);
    setPreview(null);
  };

  const openTimeState = () => {
    const existing = reminder?.value ? new Date(reminder.value) : null;
    const base = existing ?? new Date();
    setHour(existing ? base.getHours() : 17);
    setMinute(existing ? base.getMinutes() : 0);
    setMode('time');
  };

  const applyTime = () => {
    if (!reminder) return;
    const day = value ? new Date(value) : startOfLocalDay(new Date());
    const at = new Date(day);
    at.setHours(hour, minute, 0, 0);
    reminder.onChange(at.toISOString());
    setMode('date');
  };

  const Icon = kind === 'schedule' ? CalendarDays : Flag;
  const label = kind === 'schedule' ? '计划' : '截止';
  const display = value ? formatDay(value) : null;
  const hasExtras = kind === 'schedule' && Boolean(reminder && recurrence);

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
          data-testid="task-date-popover"
          className="fixed z-50 w-72 rounded-xl border border-border bg-background p-2 shadow-lg"
          aria-label={`${label}日期`}
        >
          {mode === 'time' ? (
            <div className="space-y-2 p-1">
              <p className="text-xs font-medium text-muted-foreground">时间</p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  aria-label="小时"
                  value={hour}
                  onChange={(event) => setHour(Math.min(23, Math.max(0, Number(event.target.value))))}
                  className="h-8 w-16"
                />
                <span className="text-sm text-muted-foreground">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  aria-label="分钟"
                  value={minute}
                  onChange={(event) => setMinute(Math.min(59, Math.max(0, Number(event.target.value))))}
                  className="h-8 w-16"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setMode('date')}>
                  取消
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={applyTime}>
                  应用
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => commit(new Date())}>
                  今天
                </Button>
              </div>

              {hasExtras && reminder && recurrence && (
                <div className="mt-1 border-t border-border/60 pt-1">
                  <button
                    type="button"
                    onClick={openTimeState}
                    className="flex w-full items-center justify-between rounded px-1 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span>提醒我…</span>
                    <span className="flex items-center gap-1">
                      {reminder.value ? formatMoment(reminder.value) : null}
                      <span aria-hidden="true">+</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmenu((current) => (current === 'repeat' ? 'none' : 'repeat'))}
                    className="flex w-full items-center justify-between rounded px-1 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span>{recurrence.value ? describeRecurrence(recurrence.value) : '重复…'}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                  {submenu === 'repeat' && (
                    <div className="mt-1 rounded-md border border-border/60 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          recurrence.onChange(null);
                          setSubmenu('none');
                        }}
                        className="flex w-full rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        不重复
                      </button>
                      {recurrencePresetsFor(value ? new Date(value) : null).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            recurrence.onChange(preset.value);
                            setSubmenu('none');
                          }}
                          className="flex w-full rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
