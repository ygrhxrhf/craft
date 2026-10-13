import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';

import { buildBlockMove, topLevelIndexOf, topLevelStart, type MoveTarget } from '@/lib/editor/block-move';
import { KEY_BINDINGS, detectPlatform, matches } from '@/lib/editor/keymap';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';

export const CRAFT_KEYMAP_KEY = new PluginKey('craftKeymap');

/**
 * Why this is a keydown handler and not `addKeyboardShortcuts`: the collected bindings do not
 * survive one `Mod-...` string. `⌘⌥1` on Mac is `Ctrl-Shift-1` on Windows, and `NO_LIST` moves
 * all the way to the backtick — `bae(d)` is the rule that picks which side to read.
 *
 * Styles are *set*, lists are *toggled*: the style slots correspond one to one with the official
 * hierarchy (`title/subtitle/heading/strong/body`), so landing on the same slot twice should stay
 * put, while the list slots have no "set" command in the editor and the local slash menu already
 * toggles them.
 */
const STYLE_SLOTS: Record<string, (editor: Editor) => boolean> = {
  // The official hierarchy has no 1–4 ladder, but the export table fixes title→h1,
  // subtitle→h2, heading→h3, and the local format panel's fourth slot is 小标题 (h4).
  TITLE: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  SUBTITLE: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  HEADING: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  STRONG: (editor) => editor.chain().focus().setHeading({ level: 4 }).run(),
  BODY: (editor) => editor.chain().focus().setParagraph().run(),
  TODO_LIST: (editor) => editor.chain().focus().toggleTaskList().run(),
  TOGGLE_LIST: (editor) => editor.chain().focus().setToggleBlock().run(),
  BULLET_LIST: (editor) => editor.chain().focus().toggleBulletList().run(),
  NUMBERED_LIST: (editor) => editor.chain().focus().toggleOrderedList().run(),
  NO_LIST: (editor) => unsetList(editor),
};

const MOVE_TARGETS: Record<string, MoveTarget> = {
  MOVE_BLOCK_UP: 'up',
  MOVE_BLOCK_DOWN: 'down',
  MOVE_BLOCK_TOP: 'top',
  MOVE_BLOCK_BOTTOM: 'bottom',
  MOVE_BLOCK_TOP_MAC: 'top',
  MOVE_BLOCK_BOTTOM_MAC: 'bottom',
};

function unsetList(editor: Editor): boolean {
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return editor.chain().focus().liftListItem('listItem').run();
  }
  if (editor.isActive('taskList')) return editor.chain().focus().liftListItem('taskItem').run();
  if (editor.isActive('toggleBlock')) return editor.chain().focus().unsetToggleBlock().run();
  return editor.chain().focus().setParagraph().run();
}

/** `⌘D` — copies the top-level block holding the selection, straight below itself. */
function duplicateTopBlock(editor: Editor): boolean {
  const { state, view } = editor;
  const index = topLevelIndexOf(state.doc, state.selection.from);
  if (index < 0) return false;
  const start = topLevelStart(state.doc, index);
  const child = state.doc.child(index);
  view.dispatch(state.tr.insert(start + child.nodeSize, child));
  return true;
}

export function applyKeymapAction(editor: Editor, id: string): boolean {
  const style = STYLE_SLOTS[id];
  if (style) return style(editor);

  const target = MOVE_TARGETS[id];
  if (target) {
    const tr = buildBlockMove(editor.state, target);
    if (!tr) return false;
    editor.view.dispatch(tr);
    return true;
  }

  if (id === 'DUPLICATE') return duplicateTopBlock(editor);

  // The four find chords: `⌘F` / `⌘⇧F` open the one panel (the local panel always carries both
  // fields, so the two chords land in the same place — the official split between "find" and
  // "find and replace" is not reproduced here), while `⌘G` / `⌘⇧G` walk the matches. They are
  // consumed even when nothing matched: leaving the key to the browser would raise the browser's
  // own find bar, which is not what the key means in this app.
  if (id === 'FIND_IN_PAGE' || id === 'REPLACE_IN_PAGE') {
    useFindReplaceStore.getState().setOpen(true);
    return true;
  }
  if (id === 'FIND_NEXT') {
    editor.commands.findRefresh();
    editor.commands.findNext();
    return true;
  }
  if (id === 'FIND_PREVIOUS') {
    editor.commands.findRefresh();
    editor.commands.findPrevious();
    return true;
  }

  // Anything else in the table belongs to the shell (sidebar, daily note) or to a gap that is
  // still open (focus mode, the shortcuts panel, the comment panel): returning false here keeps
  // the event unclaimed so those layers can take it, and never fakes a binding that does nothing.
  return false;
}

export const CraftKeymap = Extension.create({
  name: 'craftKeymap',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: CRAFT_KEYMAP_KEY,
        // `handleKeyDown` is a *prop*: written at the top level of the Plugin spec it is not an
        // error, it is simply never consulted — the plugin stays registered, the editor stays
        // focused, and no key ever reaches the handler.
        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            // Enter adds a row only while cells are selected and no text is being edited (G1478).
            // A caret inside a cell is editing, so Enter there keeps its normal meaning.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection instanceof CellSelection
            ) {
              editor.chain().focus().addRowAfter().run();
              return true;
            }
            const binding = KEY_BINDINGS.find((candidate) =>
              matches(
                {
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                  altKey: event.altKey,
                  shiftKey: event.shiftKey,
                  key: event.key,
                  code: event.code,
                },
                candidate,
                detectPlatform(),
              ),
            );
            if (!binding) return false;
            return applyKeymapAction(editor, binding.id);
          },
        },
      }),
    ];
  },
});
