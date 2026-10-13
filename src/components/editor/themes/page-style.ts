export interface PageStyle {
  fontPack?: FontPackId;
  theme?: PageThemeId;
  washi?: WashiId;
  /** Page-level "显示文档标题" (G65). Absent means shown, which is how every existing page reads. */
  showTitle?: boolean;
  /** Page-level "拼写检查" (G65). Absent means off, matching the browser default we ship today. */
  spelling?: boolean;
  /** The language the spell checker uses. Only meaningful while `spelling` is on. */
  spellingLang?: string;
}

export type FontPackId = 'inter' | 'serif' | 'mono' | 'rounded';

export type PageThemeId = 'default' | 'cream' | 'mint' | 'sky' | 'lavender' | 'peach';

export type WashiId = 'none' | 'sunset' | 'ocean' | 'forest' | 'candy' | 'aurora';

export const fontPacks: { id: FontPackId; label: string; stack: string }[] = [
  { id: 'inter', label: '默认', stack: 'var(--font-sans), system-ui, sans-serif' },
  { id: 'serif', label: '衬线', stack: 'Georgia, "Times New Roman", "Songti SC", serif' },
  { id: 'mono', label: '等宽', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  { id: 'rounded', label: '圆体', stack: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, sans-serif' },
];

export const pageThemes: { id: PageThemeId; label: string; color: string }[] = [
  { id: 'default', label: '默认', color: 'transparent' },
  { id: 'cream', label: '奶油', color: '#faf6ec' },
  { id: 'mint', label: '薄荷', color: '#ecfaf5' },
  { id: 'sky', label: '晴空', color: '#ecf5fd' },
  { id: 'lavender', label: '薰衣草', color: '#f2effc' },
  { id: 'peach', label: '蜜桃', color: '#fdf0ec' },
];

export const washiTapes: { id: WashiId; label: string; gradient: string }[] = [
  { id: 'none', label: '无', gradient: '' },
  {
    id: 'sunset',
    label: '日落',
    gradient: 'var(--editor-gradient-orange)',
  },
  {
    id: 'ocean',
    label: '海洋',
    gradient: 'var(--editor-gradient-blue)',
  },
  {
    id: 'forest',
    label: '森林',
    gradient: 'var(--editor-gradient-gold)',
  },
  {
    id: 'candy',
    label: '糖果',
    gradient: 'var(--editor-gradient-pink)',
  },
  {
    id: 'aurora',
    label: '极光',
    gradient: 'var(--editor-gradient-purple)',
  },
];

export function getFontStack(id: FontPackId | undefined): string {
  return fontPacks.find((f) => f.id === id)?.stack ?? fontPacks[0].stack;
}

export function getThemeColor(id: PageThemeId | undefined): string {
  return pageThemes.find((t) => t.id === id)?.color ?? 'transparent';
}

export function getWashiGradient(id: WashiId | undefined): string {
  return washiTapes.find((w) => w.id === id)?.gradient ?? '';
}

export function normalizePageStyle(value: unknown): PageStyle {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  return {
    fontPack: typeof v.fontPack === 'string' ? (v.fontPack as FontPackId) : undefined,
    theme: typeof v.theme === 'string' ? (v.theme as PageThemeId) : undefined,
    washi: typeof v.washi === 'string' ? (v.washi as WashiId) : undefined,
    showTitle: typeof v.showTitle === 'boolean' ? v.showTitle : undefined,
    spelling: typeof v.spelling === 'boolean' ? v.spelling : undefined,
    spellingLang: typeof v.spellingLang === 'string' ? v.spellingLang : undefined,
  };
}

/** The title shows unless the page explicitly hides it. */
export function showsDocumentTitle(style: PageStyle): boolean {
  return style.showTitle !== false;
}

/**
 * Spell-check languages (G65's "搜索语言"). Labels are the collected catalog strings; the value is the
 * BCP-47 tag the browser's spell checker actually consumes.
 */
export const SPELLING_LANGUAGES: readonly { value: string; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁体中文' },
  { value: 'en-US', label: '英语（美国）' },
  { value: 'en-GB', label: '英语（英国）' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'pt', label: '葡萄牙语' },
  { value: 'ru', label: '俄语' },
];

export const DEFAULT_SPELLING_LANG = 'zh-CN';

/** Label substring match, same rule as the code block's language picker. */
export function filterSpellingLanguages(query: string): { value: string; label: string }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...SPELLING_LANGUAGES];
  return SPELLING_LANGUAGES.filter((lang) => lang.label.toLowerCase().includes(needle));
}
