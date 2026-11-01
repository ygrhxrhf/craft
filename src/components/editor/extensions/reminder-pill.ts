import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

import { REMINDER_ACTIONS, reminderPillLabel } from '@/lib/task/reminder-pill';
import { REMIND_PRESETS, isInstantPreset } from '@/lib/task/remind-presets';
import {
  RESCHEDULE_CONFIRM_LABEL,
  RESCHEDULE_REMINDER_DESC,
  RESCHEDULE_REMINDER_TITLE,
  needsRescheduleConfirm,
} from '@/lib/task/reminder-reschedule';
import { confirmDialog } from '@/lib/dialog/show';
import { clearTaskReminder, setTaskDateField, setTaskReminder, taskItemTarget } from '@/components/editor/drag-handle/block-actions';
import { iconSentence } from '@/lib/task/time-icons';

export const REMINDER_PILL_KEY = new PluginKey('reminderPill');

/** The index of the top-level block a position falls in. */
function blockIndexAt(view: EditorView, pos: number): number {
  let offset = 0;
  const doc = view.state.doc;
  for (let index = 0; index < doc.childCount; index += 1) {
    const size = doc.child(index).nodeSize;
    if (pos < offset + size) return index;
    offset += size;
  }
  return -1;
}

function closeReminderMenu() {
  document.querySelectorAll('[data-reminder-menu]').forEach((node) => node.remove());
}

function placeMenu(anchor: HTMLElement, menu: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left}px`;
  document.body.appendChild(menu);
}

/** G357: the calendar (schedule) and flag (deadline) icons shown beside the reminder pill. */
function timeIcon(kind: 'schedule' | 'deadline', iso: string, view: EditorView, pos: number): HTMLElement {
  const at = new Date(iso);
  const dateText = Number.isNaN(at.getTime()) ? '' : `${at.getMonth() + 1}/${at.getDate()}`;
  const label = dateText ? iconSentence(kind, dateText) : '';
  const span = document.createElement('button');
  span.type = 'button';
  span.className = `task-time-icon task-time-icon-${kind}`;
  span.dataset.timeIcon = kind;
  span.textContent = kind === 'schedule' ? '📅' : '🚩';
  if (label) span.title = label;
  // Clicking opens the same day-menu the other entry points use; picking a day writes the field.
  span.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDayMenu(span, view, pos, kind === 'schedule' ? 'scheduleDate' : 'dueDate');
  });
  return span;
}

/** A tiny day menu: 今天 / 明天 / 清除. Enough to set and clear the two date fields. */
function openDayMenu(
  anchor: HTMLElement,
  view: EditorView,
  pos: number,
  field: 'scheduleDate' | 'dueDate',
) {
  closeReminderMenu();
  const menu = document.createElement('div');
  menu.className = 'reminder-menu';
  menu.dataset.reminderMenu = '';

  const pick = (iso: string | null) => {
    const index = blockIndexAt(view, pos);
    if (index >= 0) setTaskDateField(view.state, view.dispatch, index, field, iso);
    closeReminderMenu();
  };
  const startOfDay = (offset: number) => {
    const at = new Date();
    at.setDate(at.getDate() + offset);
    at.setHours(0, 0, 0, 0);
    return at.toISOString();
  };

  menu.appendChild(menuItem('今天', () => pick(startOfDay(0))));
  menu.appendChild(menuItem('明天', () => pick(startOfDay(1))));
  menu.appendChild(menuItem('清除', () => pick(null)));
  placeMenu(anchor, menu);
}

function menuItem(label: string, onPick: () => void): HTMLButtonElement {  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'reminder-menu-item';
  item.textContent = label;
  item.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPick();
  });
  return item;
}

/**
 * The pill's own menu (G1468): 标记为已解决, 改期, 移除提醒. The first and the last both end with
 * the reminder gone; 改期 reopens the seven presets, since that is the only reschedule surface.
 * ☆ G87：块上已有**即将到期**的提醒时，改期要先确认（官方那对逐字句），过了就照旧直接开七档。
 */
function openReminderMenu(anchor: HTMLElement, view: EditorView, pos: number) {
  closeReminderMenu();
  const menu = document.createElement('div');
  menu.className = 'reminder-menu';
  menu.dataset.reminderMenu = '';

  const run = (action: () => void) => {
    const index = blockIndexAt(view, pos);
    if (index >= 0) action();
    closeReminderMenu();
  };

  for (const action of REMINDER_ACTIONS) {
    menu.appendChild(
      menuItem(action.label, () => {
        if (action.id === 'reschedule') {
          closeReminderMenu();
          const current = taskItemTarget(view.state, blockIndexAt(view, pos))?.node.attrs.remindAt;
          if (needsRescheduleConfirm(current)) {
            void confirmDialog({
              title: RESCHEDULE_REMINDER_TITLE,
              message: RESCHEDULE_REMINDER_DESC,
              confirmLabel: RESCHEDULE_CONFIRM_LABEL,
            }).then((confirmed) => {
              if (confirmed) openPresetMenu(anchor, view, pos);
            });
            return;
          }
          openPresetMenu(anchor, view, pos);
          return;
        }
        run(() => clearTaskReminder(view.state, view.dispatch, blockIndexAt(view, pos)));
      }),
    );
  }
  placeMenu(anchor, menu);
}

function openPresetMenu(anchor: HTMLElement, view: EditorView, pos: number) {
  const menu = document.createElement('div');
  menu.className = 'reminder-menu';
  menu.dataset.reminderMenu = '';
  for (const preset of REMIND_PRESETS) {
    const item = menuItem(preset.label, () => {
      const index = blockIndexAt(view, pos);
      if (index >= 0) setTaskReminder(view.state, view.dispatch, index, preset.id, new Date());
      closeReminderMenu();
    });
    // 与块菜单同一口径：没有承载面的两档灰掉，不装作能用（`setTaskReminder` 也已拒发事务）。
    if (!isInstantPreset(preset.id)) {
      item.disabled = true;
      item.style.opacity = '0.5';
      item.style.cursor = 'default';
    }
    menu.appendChild(item);
  }
  placeMenu(anchor, menu);
}

/**
 * The reminder pill on a task item (G1468). It is a widget at the end of any task item that carries
 * a remindAt, so it repaints itself whenever the attribute changes. Clicking it opens the
 * management menu, which is the only place those three actions live.
 */
export const ReminderPill = Extension.create({
  name: 'reminderPill',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: REMINDER_PILL_KEY,
        view() {
          const onPointer = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.closest('[data-reminder-menu], .reminder-pill')) closeReminderMenu();
          };
          document.addEventListener('pointerdown', onPointer);
          return { destroy: () => document.removeEventListener('pointerdown', onPointer) };
        },
        props: {
          decorations(state) {
            const widgets: Decoration[] = [];
            const now = new Date();
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'taskItem') return;
              // G357: the schedule (calendar) and deadline (flag) icons ride the row beside the
              // reminder pill, so the three time semantics each have their own in-document entry
              // rather than one shared date box.
              const schedule = node.attrs.scheduleDate;
              if (typeof schedule === 'string' && schedule) {
                widgets.push(
                  Decoration.widget(
                    pos + node.nodeSize - 1,
                    (widgetView) => timeIcon('schedule', schedule, widgetView, pos),
                    { side: -1 },
                  ),
                );
              }
              const due = node.attrs.dueDate;
              if (typeof due === 'string' && due) {
                widgets.push(
                  Decoration.widget(
                    pos + node.nodeSize - 1,
                    (widgetView) => timeIcon('deadline', due, widgetView, pos),
                    { side: -1 },
                  ),
                );
              }
              const remindAt = node.attrs.remindAt;
              if (typeof remindAt !== 'string' || !remindAt) return;
              const at = new Date(remindAt);
              if (Number.isNaN(at.getTime())) return;
              const label = reminderPillLabel(at, now);
              if (!label) return;
              widgets.push(
                Decoration.widget(
                  pos + node.nodeSize - 1,
                  (view) => {
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'reminder-pill';
                    pill.textContent = label;
                    pill.addEventListener('mousedown', (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openReminderMenu(pill, view, pos);
                    });
                    return pill;
                  },
                  { side: 1 },
                ),
              );
            });
            return DecorationSet.create(state.doc, widgets);
          },
        },
      }),
    ];
  },
});
