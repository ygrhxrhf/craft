/**
 * The help menu (G754). Six entries, verbatim, and where each one goes. The two that matter:
 * 「快捷键」 opens the in-app shortcuts panel, while 「Markdown 快捷方式」 navigates to the
 * external help centre rather than rendering a panel in the app — it is a second entry beside the
 * shortcuts panel, not a section inside it.
 */

export type HelpEntryKind = 'inAppPanel' | 'externalLink' | 'dialog';

export interface HelpEntry {
  id: string;
  label: string;
  kind: HelpEntryKind;
  /** For an external entry, the help-centre path. */
  href?: string;
}

/** The help centre root the Markdown entry points at, verbatim. */
export const HELP_CENTER_MARKDOWN_PATH =
  'support.craft.do/zh-Hans/write-and-edit/formatting/markdown-shortcuts';

export const HELP_ENTRIES: readonly HelpEntry[] = [
  { id: 'feedback', label: '意见反馈', kind: 'dialog' },
  { id: 'whatsNew', label: '最新特性', kind: 'dialog' },
  { id: 'whatsNewWebWindows', label: 'Web 和 Windows 版最新特性', kind: 'dialog' },
  { id: 'faq', label: '常见问题', kind: 'externalLink' },
  { id: 'shortcuts', label: '快捷键', kind: 'inAppPanel' },
  { id: 'markdownShortcuts', label: 'Markdown 快捷方式', kind: 'externalLink', href: HELP_CENTER_MARKDOWN_PATH },
] as const;

const BY_ID = new Map(HELP_ENTRIES.map((entry) => [entry.id, entry]));

export function helpEntry(id: string): HelpEntry | null {
  return BY_ID.get(id) ?? null;
}

/** Whether an entry opens something inside the app rather than leaving it. */
export function opensInApp(id: string): boolean {
  const entry = helpEntry(id);
  return entry?.kind === 'inAppPanel' || entry?.kind === 'dialog';
}
