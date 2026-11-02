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
import { describeRecurrence, parseRecurrence, recurrencePresetsFor } from '@/lib/task/recurrence';
import { slotIndexForTime, timeSlots } from '@/lib/task/time-menu';
import { cn } from 'cn';

interface TaskDatePopoverProps {
  kind: 'schedule' | 'deadline';
  value: string | null;
  onChange: (value: string | null) => void;
  /** G362/G373: reminder and repeat hang off the date, as two sub-rows. */
  reminder?: { value: string | null; onChange: (value: string | null) => void };
  recurrence?: { value: string | null; onChange: (value: string | null) => void };
}

/** Merge one field into the stored rule without dropping the others; false removes the key. */
function patchRule(raw: string | null, patch: Record<string, unknown>): string {
  let rule: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') rule = parsed as Record<string, unknown>;
  } catch {
    rule = {};
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === false) delete rule[key];
    else rule[key] = value;
  }
  return JSON.stringify(rule);
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
  // G411: the 96-slot list opens scrolled to the current slot.
  const slotListRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'none' | 'repeat'>('none');
  // G374: the custom knobs open under the repeat list, so they need their own flag — inside the
  // repeat branch the submenu value is narrowed to 'repeat'.
  const [customOpen, setCustomOpen] = useState(false);
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
    // G411: scroll the 96-slot list to the current slot once it has rendered.
    window.requestAnimationFrame(() => {
      const list = slotListRef.current;
      if (!list) return;
      const index = slotIndexForTime(existing ?? base);
      const row = list.children[index] as HTMLElement | undefined;
      if (row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2);
    });
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
              {/* G411: the official moment menu is a 96-slot, 15-minute-step day list that opens
                  scrolled to the current slot. Slots are the only way to pick a time here. */}
              <div
                ref={slotListRef}
                className="max-h-[200px] overflow-y-auto rounded-md border border-border/60"
                data-testid="time-slots"
                style={{ minWidth: 236 }}
              >
                {timeSlots().map((slot) => {
                  const selected = slot.minutes === hour * 60 + minute;
                  return (
                    <button
                      key={slot.index}
                      type="button"
                      onClick={() => {
                        setHour(Math.floor(slot.minutes / 60));
                        setMinute(slot.minutes % 60);
                      }}
                      className={cn(
                        'block w-full px-2 py-1 text-left text-xs tabular-nums transition-colors',
                        selected ? 'bg-foreground/8 font-medium' : 'hover:bg-muted',
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
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
                      {/* G374: the sixth official entry. Locally it reveals the two custom knobs
                          (every-N interval and the anchor) rather than opening a separate screen. */}
                      <button
                        type="button"
                        data-testid="repeat-custom"
                        onClick={() => setCustomOpen((current) => !current)}
                        className="flex w-full items-center justify-between rounded px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <span>自定义…</span>
                        <span aria-hidden="true">›</span>
                      </button>
                      {customOpen && (
                        <div className="mt-1 space-y-1 rounded-md border border-border/60 p-1">
                          <label className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                            每 N 个单位
                            <input
                              type="number"
                              min={1}
                              aria-label="重复间隔"
                              className="h-6 w-14 rounded border border-border bg-background px-1 text-xs"
                              defaultValue={1}
                              onChange={(event) => {
                                const interval = Math.max(1, Number(event.target.value) || 1);
                                recurrence.onChange(patchRule(recurrence.value, { interval }));
                              }}
                            />
                          </label>
                          <label className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                            重复依据
                            <select
                              aria-label="重复依据"
                              className="h-6 rounded border border-border bg-background px-1 text-xs"
                              defaultValue="fixed"
                              onChange={(event) =>
                                recurrence.onChange(patchRule(recurrence.value, { type: event.target.value }))
                              }
                            >
                              <option value="fixed">按计划日</option>
                              <option value="flexible">相对于完成</option>
                            </select>
                          </label>
                          {/* G547: 「跳过周末」只属于 daily／monthly 两档（官方字段集如此）。 */}
                          {(() => {
                            const rule = parseRecurrence(recurrence.value);
                            if (!rule || (rule.freq !== 'daily' && rule.freq !== 'monthly')) return null;
                            return (
                              <label className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                                跳过周末
                                <input
                                  type="checkbox"
                                  aria-label="跳过周末"
                                  checked={rule.skipWeekends === true}
                                  onChange={(event) =>
                                    recurrence.onChange(patchRule(recurrence.value, { skipWeekends: event.target.checked }))
                                  }
                                />
                              </label>
                            );
                          })()}
                        </div>
                      )}
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
