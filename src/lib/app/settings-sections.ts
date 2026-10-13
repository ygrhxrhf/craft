/**
 * Settings sections and whether each one is wired (G24). The ledger's rule is that a section is
 * either backed by real state or its entry is removed — a section that looks real but is not is
 * the one thing not allowed. This module records the current truth so a section cannot quietly
 * stay a shell.
 *
 * `wired` means the section reads and writes real state (preferences or the database). `static`
 * means it renders fixed content and is a known gap.
 */

export type SettingsSectionId =
  | 'space'
  | 'published'
  | 'tags'
  | 'appearance'
  | 'language'
  | 'advanced'
  | 'account'
  | 'subscription'
  | 'team'
  | 'integrations'
  | 'assistant'
  | 'notifications'
  | 'shortcuts'
  | 'about';

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  wired: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'space', label: '空间', wired: true },
  // Published content renders fixed sample rows.
  { id: 'published', label: '已发布内容', wired: false },
  // The tag switch is a local default with no backing column.
  { id: 'tags', label: '标签', wired: false },
  { id: 'appearance', label: '外观', wired: true },
  // One language exists, and the row says so instead of pretending to offer a choice.
  { id: 'language', label: '语言', wired: true },
  { id: 'advanced', label: '高级', wired: true },
  { id: 'account', label: '账户', wired: true },
  { id: 'subscription', label: '订阅', wired: false },
  { id: 'team', label: '团队', wired: false },
  { id: 'integrations', label: '集成', wired: false },
  { id: 'assistant', label: '助手', wired: false },
  { id: 'notifications', label: '通知', wired: true },
  { id: 'shortcuts', label: '键盘快捷键', wired: true },
  { id: 'about', label: '关于', wired: true },
] as const;

/** The sections that are still shells — the ones the ledger says must be wired or removed. */
export function unwiredSections(): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => !section.wired);
}

export function settingsSection(id: SettingsSectionId): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => section.id === id) ?? null;
}
