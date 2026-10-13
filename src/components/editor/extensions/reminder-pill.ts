import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { reminderPillLabel } from '@/lib/task/reminder-pill';

export const REMINDER_PILL_KEY = new PluginKey('reminderPill');

/**
 * The reminder pill on a task item (G1468). It is a widget at the end of any task item that carries
 * a remindAt, so it repaints itself whenever the attribute changes and never has to be kept in
 * step by the menu that set it.
 */
export const ReminderPill = Extension.create({
  name: 'reminderPill',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: REMINDER_PILL_KEY,
        props: {
          decorations(state) {
            const widgets: Decoration[] = [];
            const now = new Date();
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'taskItem') return;
              const remindAt = node.attrs.remindAt;
              if (typeof remindAt !== 'string' || !remindAt) return;
              const at = new Date(remindAt);
              if (Number.isNaN(at.getTime())) return;
              const label = reminderPillLabel(at, now);
              if (!label) return;
              const pill = document.createElement('button');
              pill.type = 'button';
              pill.className = 'reminder-pill';
              pill.textContent = label;
              widgets.push(Decoration.widget(pos + node.nodeSize - 1, pill, { side: 1 }));
            });
            return DecorationSet.create(state.doc, widgets);
          },
        },
      }),
    ];
  },
});
