import { Extension, ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import type { SuggestionProps } from '@tiptap/suggestion';

import { childRows, filterRows, stage1Rows, type SlashRow } from '@/lib/editor/slash-roster';
import { SlashCommandMenu } from './SlashCommandMenu';
import { extraSlashCommands, sizeShortcutCommand, slashCommands, type SlashCommand as SlashCommandSpec } from './slash-commands';

type Props = SuggestionProps<SlashRow, SlashRow>;

/**
 * G1544 / G1613：两段式斜杠菜单的分派层。
 * - 空查询：第一段 20 个官方入口（＋本地「更多」桶）；Enter/点击分组入口钻入第二段；
 * - 非空查询：官方过滤机制＝按第二段子项/叶子名字做子串匹配（分组入口本身不参赛）；
 * - 第二段里 Backspace（查询为空时）回第一段，Escape 关菜单。
 * `12x3` 这类非方形尺寸仍由输入解析补一条动态候选（G336）。
 */
function rowsFor(query: string, activeGroup: string | null, dynamicSize: SlashCommandSpec | null): SlashRow[] {
  const extras = extraSlashCommands();
  if (query.trim()) {
    const rows = filterRows(query, extras);
    if (dynamicSize) {
      rows.unshift({ id: 'size-shortcut', label: dynamicSize.name, kind: 'extra', command: dynamicSize.name });
    }
    return rows;
  }
  return activeGroup
    ? [
        { id: 'back', label: '返回', kind: 'back' as const, command: null },
        ...childRows(activeGroup, extras.map((command) => command.name)),
      ]
    : stage1Rows(extras.map((command) => command.name));
}

interface RendererProps {
  rows: SlashRow[];
  selectedIndex: number;
  onRun: (row: SlashRow) => void;
  onDrill: (label: string) => void;
  onBack: () => void;
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashRow, SlashRow>({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommand'),
        char: '/',
        allowSpaces: false,
        allowedPrefixes: null,
        items: ({ query }) => {
          const size = query.trim() ? sizeShortcutCommand(query) : null;
          return rowsFor(query, null, size);
        },
        // The command has to run through the plugin, not a window listener: Enter
        // reaches ProseMirror's split-block first, so a handler that runs later
        // would insert into a document the caret has already left.
        command: ({ editor, range, props }) => {
          const resolved = props.id === 'size-shortcut'
            ? sizeShortcutCommand(props.label)
            : slashCommands.find((command) => command.name === props.command);
          resolved?.command(editor, range);
        },
        render: () => {
          let renderer: ReactRenderer<RendererProps> | null = null;
          let unmount: (() => void) | null = null;
          let latest: Props | null = null;
          let selectedIndex = 0;
          let activeGroup: string | null = null;
          let latestQuery = '';
          let latestSize: SlashCommandSpec | null = null;

          const cleanup = () => {
            renderer?.destroy();
            unmount?.();
            renderer = null;
            unmount = null;
            latest = null;
            activeGroup = null;
          };

          const runRow = (row: SlashRow) => {
            if (!latest || !row.command) return;
            const resolved = row.id === 'size-shortcut'
              ? sizeShortcutCommand(row.label)
              : slashCommands.find((command) => command.name === row.command);
            resolved?.command(latest.editor, latest.range);
          };

          const show = (group: string | null) => {
            if (!latest) return;
            activeGroup = group;
            selectedIndex = 0;
            latest = { ...latest, items: rowsFor(latestQuery, activeGroup, latestSize) } as Props;
            paint();
          };

          const paint = () => {
            if (!latest) return;
            renderer?.updateProps({
              rows: latest.items,
              selectedIndex,
              onRun: runRow,
              onDrill: (label: string) => show(label),
              onBack: () => show(null),
            });
          };

          return {
            onStart: (props) => {
              latest = props as Props;
              latestQuery = props.query ?? '';
              latestSize = latestQuery.trim() ? sizeShortcutCommand(latestQuery) : null;
              selectedIndex = 0;
              activeGroup = null;
              renderer = new ReactRenderer(SlashCommandMenu, {
                editor: props.editor,
                props: {
                  rows: latest.items,
                  selectedIndex,
                  onRun: runRow,
                  onDrill: (label: string) => show(label),
                  onBack: () => show(null),
                },
              });
              unmount = props.mount ? props.mount(renderer.element) : null;
            },
            onUpdate: (props) => {
              latest = props as Props;
              latestQuery = props.query ?? '';
              latestSize = latestQuery.trim() ? sizeShortcutCommand(latestQuery) : null;
              // 输入了新词就退出第二段按全局过滤；查询清空后回到原段位。
              if (latestQuery.trim()) {
                activeGroup = null;
              } else if (activeGroup) {
                latest = { ...latest, items: rowsFor('', activeGroup, null) } as Props;
              }
              selectedIndex = Math.min(selectedIndex, Math.max(latest.items.length - 1, 0));
              paint();
            },
            onExit: cleanup,
            onKeyDown: ({ event }) => {
              if (event.key === 'Escape') {
                cleanup();
                return true;
              }
              const items = latest?.items ?? [];
              if (!latest || items.length === 0) return false;

              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                selectedIndex = (selectedIndex + delta + items.length) % items.length;
                paint();
                return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                const row = items[Math.min(selectedIndex, items.length - 1)];
                if (!row) return false;
                if (row.drill) {
                  show(row.label);
                  return true;
                }
                // 置灰行「已消费、不执行」——同快捷键面板「未接入」的口径。
                if (!row.command) return true;
                runRow(row);
                return true;
              }
              if (event.key === 'Backspace' && latestQuery.trim() === '' && activeGroup) {
                show(null);
                return true;
              }
              return false;
            },
          };
        },
      }),
    ];
  },
});