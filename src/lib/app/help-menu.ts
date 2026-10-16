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

/**
 * G765：六项的落点由官方闭包逐字读出（`window.open(<url>,"_blank","noopener=true")`）。本地把
 * 三枚外链的目标记全，菜单才不必自己猜 URL。`意见反馈` 在官方**不调 `window.open`**（落点未确认），
 * 本地按"站内反馈"处理、归 `dialog`。
 */
export const HELP_LINK_WHATS_NEW = 'https://www.craft.do/whats-new';
export const HELP_LINK_WHATS_NEW_WEB_WINDOWS = 'https://www.craft.do/whats-new-web-windows';
export const HELP_LINK_FAQ = 'https://support.craft.do';

export const HELP_ENTRIES: readonly HelpEntry[] = [
  { id: 'feedback', label: '意见反馈', kind: 'dialog' },
  { id: 'whatsNew', label: '最新特性', kind: 'externalLink', href: HELP_LINK_WHATS_NEW },
  { id: 'whatsNewWebWindows', label: 'Web 和 Windows 版最新特性', kind: 'externalLink', href: HELP_LINK_WHATS_NEW_WEB_WINDOWS },
  { id: 'faq', label: '常见问题', kind: 'externalLink', href: HELP_LINK_FAQ },
  { id: 'shortcuts', label: '快捷键', kind: 'inAppPanel' },
  { id: 'markdownShortcuts', label: 'Markdown 快捷方式', kind: 'externalLink', href: `https://${HELP_CENTER_MARKDOWN_PATH}` },
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

/**
 * The absolute URL a link entry opens, or null when the entry is not an external link. Entries
 * that carry a bare help-centre path are completed with `https://`; the ones already carrying a
 * scheme pass through, so the model can hold either spelling.
 */
export function helpEntryUrl(id: string): string | null {
  const entry = helpEntry(id);
  if (!entry || entry.kind !== 'externalLink' || !entry.href) return null;
  return /^https?:\/\//.test(entry.href) ? entry.href : `https://${entry.href}`;
}
