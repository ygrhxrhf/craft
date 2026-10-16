/**
 * The Markdown shortcut cheat-sheet (G67). The official insert panel carries a second sub-view
 * beside 「插入」: 「快捷方式」 (`blockdetails.sidebar.insert.shortcuts`), whose body is
 * `blockdetails.shortcuts.markdown`「Markdown 快捷方式」.
 *
 * The rows are the **rules this build actually answers to**, not a copied marketing list — the
 * same call the shortcuts panel made: printing a rule the editor does not implement would be a
 * lie the moment a user types it. Each entry names the syntax the editor's input rules fire on
 * (`extensions/markdown-shortcuts.ts`), so the sheet and the behaviour share one source.
 */

export const INSERT_SUBVIEW_IDS = ['insert', 'shortcuts'] as const;
export type InsertSubView = (typeof INSERT_SUBVIEW_IDS)[number];

export const INSERT_SUBVIEW_LABELS: Record<InsertSubView, string> = {
  insert: '插入',
  shortcuts: '快捷方式',
};

/** The panel heading over the cheat-sheet, verbatim. */
export const MARKDOWN_SHORTCUTS_TITLE = 'Markdown 快捷方式';
export const MARKDOWN_SHORTCUTS_KEY = 'blockdetails.shortcuts.markdown';

export interface MarkdownShortcut {
  /** What the user types. */
  syntax: string;
  /** What it produces, in the panel's own words. */
  label: string;
}

/**
 * The rules `markdown-shortcuts.ts` installs, in the order it installs them. Kept here as data so
 * the panel and the test can both read one list.
 */
export const MARKDOWN_SHORTCUTS: readonly MarkdownShortcut[] = [
  { syntax: '~~文本~~', label: '删除线' },
  { syntax: '==文本==', label: '高亮' },
  { syntax: '[文本](链接)', label: '链接' },
  { syntax: '$$公式$$', label: '块级公式' },
  { syntax: '$公式$', label: '行内公式' },
  { syntax: '[] 或 [x]', label: '待办事项' },
] as const;

/** The subtitle the official panel prints (`sidebar.insert.subtitle`). */
export const INSERT_PANEL_SUBTITLE = '将任何项目拖放到文档中';
