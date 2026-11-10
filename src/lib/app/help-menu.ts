/**
 * The help menu (G754). The entry set is **not fixed**: it depends on the viewport tier and on
 * whether the document editor is open (G877 / G883 / G891 / G950 — three readings that only looked
 * contradictory):
 *
 *   - desktop (>= 748 px) + document page  → 8 entries, including `Sync Status` and `报告同步`;
 *   - desktop + space page                 → 6 entries (the two sync rows are gone);
 *   - compact (< 748 px)                   → 5 entries (also loses 「快捷键」).
 *
 * The two that matter for the model: 「快捷键」 opens the in-app shortcuts panel, while
 * 「Markdown 快捷方式」 navigates to the external help centre rather than rendering a panel in the
 * app — it is a second entry beside the shortcuts panel, not a section inside it.
 */

export type HelpEntryKind = 'inAppPanel' | 'externalLink' | 'dialog' | 'status';

export interface HelpEntry {
  id: string;
  label: string;
  kind: HelpEntryKind;
  /** For an external entry, the help-centre path. */
  href?: string;
}

/** Which context an entry needs to be listed at all. */
interface HelpEntryGate {
  /** Only when the document editor is open (the official sync rows). */
  documentPage?: boolean;
  /** Only above the 747 px compact breakpoint (everything except the five shared rows). */
  desktop?: boolean;
}

export interface HelpMenuContext {
  /** `(max-width: 747px)` — official `zo`, G1476. */
  compact: boolean;
  /** A document is open in the editor, so the sync rows apply. */
  documentPage: boolean;
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

/**
 * G950：`Sync Status` 在中文界面里**没被翻译**（同菜单其余项全中文）。这里是那一行的可访问名，
 * 照官方逐字保留英文；行内文字显示当前同步态（G891 读到的 `All changes synced` 就是它）。
 */
export const SYNC_STATUS_LABEL = 'Sync Status';

const ENTRIES: readonly (HelpEntry & { gate?: HelpEntryGate })[] = [
  {
    id: 'syncStatus',
    label: SYNC_STATUS_LABEL,
    kind: 'status',
    gate: { documentPage: true, desktop: true },
  },
  {
    // 落点未采（官方没点它，只记到"点它会走外链通路"）⇒ 本地按帮助站根落地，不自己发明路径。
    id: 'reportSync',
    label: '报告同步',
    kind: 'externalLink',
    href: HELP_LINK_FAQ,
    gate: { documentPage: true, desktop: true },
  },
  { id: 'feedback', label: '意见反馈', kind: 'dialog' },
  { id: 'whatsNew', label: '最新特性', kind: 'externalLink', href: HELP_LINK_WHATS_NEW },
  { id: 'whatsNewWebWindows', label: 'Web 和 Windows 版最新特性', kind: 'externalLink', href: HELP_LINK_WHATS_NEW_WEB_WINDOWS },
  { id: 'faq', label: '常见问题', kind: 'externalLink', href: HELP_LINK_FAQ },
  { id: 'shortcuts', label: '快捷键', kind: 'inAppPanel', gate: { desktop: true } },
  { id: 'markdownShortcuts', label: 'Markdown 快捷方式', kind: 'externalLink', href: `https://${HELP_CENTER_MARKDOWN_PATH}` },
];

/** The full roster, ungered — eight rows in the official order. */
export const HELP_ENTRIES: readonly HelpEntry[] = ENTRIES;

const BY_ID = new Map(ENTRIES.map((entry) => [entry.id, entry]));

/** The entries the menu lists in a given viewport / page state. */
export function helpEntriesFor(ctx: HelpMenuContext): readonly HelpEntry[] {
  return ENTRIES.filter((entry) => {
    const gate = entry.gate;
    if (!gate) return true;
    if (gate.desktop && ctx.compact) return false;
    if (gate.documentPage && !ctx.documentPage) return false;
    return true;
  });
}

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

/**
 * The text of the `Sync Status` row. G891 read `All changes synced` with the menu open — English
 * inside the Chinese UI, the untranslated string G950 flagged. The local runtime keeps five states,
 * so the other four are the same vocabulary the bottom-right indicator uses.
 */
export function syncStatusText(status: 'synced' | 'syncing' | 'offline' | 'degraded' | 'error'): string {
  switch (status) {
    case 'synced':
      return 'All changes synced';
    case 'syncing':
      return '同步中…';
    case 'offline':
      return '离线';
    case 'degraded':
      return '实时连接断开';
    case 'error':
      return '同步失败';
  }
}
