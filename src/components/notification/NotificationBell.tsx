'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  resolveNotification,
  setNotificationRead,
} from '@/actions/notification/notification';
import { confirmDialog } from '@/lib/dialog/show';
import { cn } from 'cn';
import type { InboxRow } from '@/lib/notification/inbox';
import { createReadPerRevision } from '@/lib/read-per-revision';
import { reminderInstant } from '@/lib/notification/task-reminders';
import { getSyncManager } from '@/lib/sync-core';

// Module scope, deliberately: the generation it has to survive is the effect's, not the
// component's, so a hook-local ref would be rebuilt on the very remount being coalesced.
const inboxRead = createReadPerRevision<InboxRow[]>();

function formatReminder(remindAt: string | null): string {
  if (remindAt === null) return '';
  const at = reminderInstant(remindAt);
  if (Number.isNaN(at)) return '';
  return new Date(at).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  // Rows stay server-generated (materialize + resolve), but they now ride the
  // sync stream: another device's reminder lands as a 'notification' store
  // change and this re-pulls the inbox instead of waiting for tab focus.
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<InboxRow[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'notification') setRevision((n) => n + 1);
  }), []);

  // G42: the dedicated notification channel. The shared events stream already
  // wakes the sync manager; this one refreshes the bell even when the poller's
  // batch only carries notification rows.
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const stream = new EventSource('/api/v1/notifications/stream');
    stream.onmessage = () => setRevision((n) => n + 1);
    return () => stream.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    inboxRead
      .read(revision, () => listNotifications())
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setDismissed((current) => current.filter((id) => !rows.some((row) => row.id === id)));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  const visible = items.filter((item) => !dismissed.includes(item.id));

  const resolve = (id: string) => {
    setDismissed((current) => [...current, id]);
    setError(null);
    startTransition(async () => {
      try {
        await resolveNotification(id);
      } catch {
        setDismissed((current) => current.filter((value) => value !== id));
        setError('没有标记已解决，请重试');
      }
    });
  };

  const remove = async (id: string) => {
    const ok = await confirmDialog({
      title: '删除通知',
      message: '删除后无法恢复。',
      confirmLabel: '删除',
    });
    if (ok) resolve(id);
  };

  // G137: read state flips both ways and survives the next pull.
  const toggleRead = (id: string, read: boolean) => {
    const stamp = read ? new Date().toISOString() : null;
    setItems((current) => current.map((row) => (row.id === id ? { ...row, readAt: stamp } : row)));
    setError(null);
    startTransition(async () => {
      try {
        await setNotificationRead(id, read);
      } catch {
        setItems((current) =>
          current.map((row) => (row.id === id ? { ...row, readAt: read ? null : stamp } : row)),
        );
        setError('没有更新已读状态，请重试');
      }
    });
  };

  const markAllRead = () => {
    const stamp = new Date().toISOString();
    setItems((current) => current.map((row) => (row.readAt ? row : { ...row, readAt: stamp })));
    setError(null);
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
      } catch {
        setError('没有全部标为已读，请重试');
        setRevision((n) => n + 1);
      }
    });
  };

  const unreadCount = visible.filter((item) => item.readAt === null).length;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="通知"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-(--craft-accent) px-1 text-center text-[10px] font-medium leading-4 text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-background p-2 shadow-lg"
          aria-label="通知列表"
        >
          {visible.length > 0 && unreadCount > 0 && (
            <div className="flex justify-end px-2 pb-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={isPending}
                className="text-[12px] text-(--craft-accent) disabled:opacity-50"
              >
                全部标为已读
              </button>
            </div>
          )}
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">暂无通知。</p>
          ) : (
            <ul className="space-y-1">
              {visible.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2 px-2 py-1.5">
                  <div className="flex min-w-0 items-start gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        item.readAt ? 'bg-transparent' : 'bg-(--craft-accent)',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{formatReminder(item.remindAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRead(item.id, item.readAt === null)}
                      disabled={isPending}
                      className="text-[12px] text-muted-foreground disabled:opacity-50"
                    >
                      {item.readAt ? '标为未读' : '标为已读'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      disabled={isPending}
                      className="text-[12px] text-(--craft-accent) disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="status" className="px-2 pt-1 text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
