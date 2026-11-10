'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  listNotifications,
  listResolvedNotifications,
  markAllNotificationsRead,
  resolveNotification,
  setNotificationRead,
} from '@/actions/notification/notification';
import { confirmDialog } from '@/lib/dialog/show';
import { RichText } from '@/components/ui/rich-text';
import { cn } from 'cn';
import type { InboxRow } from '@/lib/notification/inbox';
import { createReadPerRevision } from '@/lib/read-per-revision';
import { reminderInstant } from '@/lib/notification/task-reminders';
import { getSyncManager } from '@/lib/sync-core';

// Module scope, deliberately: the generation it has to survive is the effect's, not the
// component's, so a hook-local ref would be rebuilt on the very remount being coalesced.
const inboxRead = createReadPerRevision<InboxRow[]>();

/** G602: the notification list remembers its scroll position across opens. */
const NOTIFICATION_SCROLL_KEY = 'craft.notifications.scroll-top';

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
  const router = useRouter();
  const listRef = useRef<HTMLUListElement | null>(null);
  // Rows stay server-generated (materialize + resolve), but they now ride the
  // sync stream: another device's reminder lands as a 'notification' store
  // change and this re-pulls the inbox instead of waiting for tab focus.
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<InboxRow[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // G254: reminder has a resolved state with its own view.
  const [view, setView] = useState<'open' | 'resolved'>('open');
  const [resolvedItems, setResolvedItems] = useState<InboxRow[]>([]);
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

  // G254: the 「已解决」 view pulls resolved rows on demand and refreshes with the inbox revision.
  useEffect(() => {
    if (!open || view !== 'resolved') return;
    let cancelled = false;
    listResolvedNotifications()
      .then((rows) => {
        if (!cancelled) setResolvedItems(rows);
      })
      .catch(() => {
        if (!cancelled) setResolvedItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, view, revision]);

  const listed = view === 'resolved' ? resolvedItems : visible;

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

  // G252: a block reminder carries the block it hangs off, so opening the row lands on that
  // document with the block addressed (`#b-<blockId>`), which the editor already scrolls to.
  const openTarget = (item: InboxRow) => {
    if (!item.documentId) return;
    setOpen(false);
    router.push(
      item.blockId ? `/documents/${item.documentId}#b-${item.blockId}` : `/documents/${item.documentId}`,
    );
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

  // G602: restore the remembered offset whenever the panel opens.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const saved = Number(window.localStorage.getItem(NOTIFICATION_SCROLL_KEY) ?? '0');
    listRef.current.scrollTop = Number.isFinite(saved) ? saved : 0;
  }, [open]);

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
          <div className="mb-1 flex gap-1 border-b border-border/60 px-1 pb-1">
            <button
              type="button"
              aria-pressed={view === 'open'}
              onClick={() => setView('open')}
              className={cn(
                'rounded px-2 py-0.5 text-[12px]',
                view === 'open' ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground',
              )}
            >
              进行中
            </button>
            <button
              type="button"
              aria-pressed={view === 'resolved'}
              onClick={() => setView('resolved')}
              className={cn(
                'rounded px-2 py-0.5 text-[12px]',
                view === 'resolved' ? 'bg-foreground/8 text-foreground' : 'text-muted-foreground',
              )}
            >
              已解决
            </button>
          </div>
          {view === 'open' && visible.length > 0 && unreadCount > 0 && (
            <div className="flex justify-end px-2 pb-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={isPending}
                className="text-[12px] text-(--craft-accent)"
              >
                全部标为已读
              </button>
            </div>
          )}
          {listed.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {view === 'resolved' ? '暂无已解决的通知。' : '暂无通知。'}
            </p>
          ) : (
            <ul
              ref={listRef}
              className="max-h-80 space-y-1 overflow-y-auto"
              onScroll={(event) => {
                try {
                  window.localStorage.setItem(
                    NOTIFICATION_SCROLL_KEY,
                    String(event.currentTarget.scrollTop),
                  );
                } catch {
                  // Storage may be unavailable; the list still scrolls within the session.
                }
              }}
            >
              {listed.map((item) => (
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
                      <button
                        type="button"
                        onClick={() => openTarget(item)}
                        disabled={!item.documentId}
                        className="block max-w-full truncate text-left text-[13px] disabled:cursor-default"
                      >
                        {/* G76: a title is not plain text — the author and document runs carry
                            `<username>`/`<highlight>` tags, so it goes through the same embedded-tag
                            renderer the i18n copy uses instead of leaking the tags as raw text. */}
                        <RichText value={item.title} />
                      </button>
                      <p className="text-[11px] text-muted-foreground">{formatReminder(item.remindAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {view === 'open' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleRead(item.id, item.readAt === null)}
                          disabled={isPending}
                          className="text-[12px] text-muted-foreground"
                        >
                          {item.readAt ? '标为未读' : '标为已读'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(item.id)}
                          disabled={isPending}
                          className="text-[12px] text-(--craft-accent)"
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">已解决</span>
                    )}
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
