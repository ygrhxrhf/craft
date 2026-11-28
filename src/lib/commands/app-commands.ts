/**
 * 命令面板里**已接入**的官方命令（G33 的第二层）。
 *
 * 官方名册 189 条由 `official-catalog.ts` 提供，未接的以灰行占位；这里每一条都对应一个真正
 * 有承载面的动作，`aliases` 认领官方给同一件事起的多个名字（面板据此吞掉灰行）。上下文相关
 * 的命令带 `available`：没有打开的文档时整条灰掉，而不是点了没反应。
 */
import { useActiveEditorStore } from '@/lib/store/use-active-editor-store';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import { useFocusStore } from '@/lib/store/use-focus-store';
import { useRightPanelStore } from '@/lib/store/use-right-panel-store';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import {
  nextOpenForAllToggles,
  setOpenOnAllToggles,
} from '@/components/editor/extensions/toggle-all';
import type { PaletteCommand } from './registry';

function activeEditor() {
  return useActiveEditorStore.getState().editor;
}

/**
 * G16：全部展开／收起的**翻转**语义来自官方那条命令（有折叠就展开，全开则收起，没有折叠块
 * 时整条不可用）——纯核在 `toggle-all.ts`，这里只负责"取当前文档、一次事务"。
 */
function flipAllToggles(): void {
  const editor = activeEditor();
  if (!editor) return;
  const open = nextOpenForAllToggles(editor.state);
  if (open === null) return;
  const tr = editor.state.tr;
  if (setOpenOnAllToggles(editor.state, tr, open) === 0) return;
  editor.view.dispatch(tr);
}

/** 选中的文字（没有选区就是空串）：评论与查找都按它起手。 */
function selectedText(): string {
  const editor = activeEditor();
  if (!editor) return '';
  const { from, to } = editor.state.selection;
  return from === to ? '' : editor.state.doc.textBetween(from, to, ' ');
}

export const APP_COMMANDS: readonly PaletteCommand[] = [
  {
    id: 'commands.toggle.focus.mode',
    title: '切换专注模式',
    group: '视图',
    keywords: ['focus', '专注', 'zen'],
    aliases: ['commands.focus.mode', 'commands.enable.focus.mode'],
    run: () => useFocusStore.getState().toggle(),
  },
  {
    id: 'commands.toggle.left.sidebar',
    title: '切换左侧边栏',
    group: '视图',
    keywords: ['sidebar', '侧栏', '边栏'],
    aliases: ['commands.toggle.sidebar', 'commands.toggle.sidebar.visibility'],
    run: () => useSidebarStore.getState().toggle(),
  },
  {
    id: 'commands.toggle.all.toggles',
    title: '展开或收起全部折叠块',
    group: '编辑',
    keywords: ['toggle', '折叠', '展开', '收起', 'collapse', 'expand'],
    run: flipAllToggles,
    available: () => {
      const editor = activeEditor();
      return Boolean(editor && nextOpenForAllToggles(editor.state) !== null);
    },
  },
  {
    id: 'commands.comment.add',
    title: '添加评论',
    group: '编辑',
    keywords: ['comment', '评论', '批注'],
    run: () => {
      // 与 `⌘⇧M` 同一通路（G1578）：控制台之外的组件各自订阅这两个 store。
      useCommentRequestStore.getState().ask(selectedText());
      useRightPanelStore.getState().open('info');
    },
    available: () => Boolean(activeEditor()),
  },
  {
    id: 'commands.search.inpage',
    title: '在页面中查找',
    group: '编辑',
    keywords: ['find', 'search', '查找', '搜索'],
    run: () => useFindReplaceStore.getState().openWith(false),
    available: () => Boolean(activeEditor()),
  },
  {
    id: 'commands.open.shortcuts',
    title: '打开键盘快捷键',
    group: '设置',
    keywords: ['shortcut', 'keyboard', '快捷键'],
    aliases: ['commands.show.key.shortcuts'],
    run: () => useSettingsStore.getState().openSettings('shortcuts'),
  },
];
