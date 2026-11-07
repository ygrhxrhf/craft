import { normalizeSeparatorStyle, type SeparatorStyle } from '@/lib/editor/themes/washi-catalog';

export interface PageStyle {
  fontPack?: FontPackId;
  theme?: PageThemeId;
  /** G682：远端主题清单里的背景色（明档）——内置六档之外的主题靠它落地。 */
  themeColor?: string;
  /** G210：页面分隔符三档（线／和纸胶带／涂鸦）；缺省按 `washi` 字段回推。 */
  separatorStyle?: SeparatorStyle;
  washi?: WashiId;
  /** Page-level "显示文档标题" (G65). Absent means shown, which is how every existing page reads. */
  showTitle?: boolean;
  /** Page-level "拼写检查" (G65). Absent means off, matching the browser default we ship today. */
  spelling?: boolean;
  /** The language the spell checker uses. Only meaningful while `spelling` is on. */
  spellingLang?: string;
  /** G1436: the page text colour; absent means the theme default. */
  textColor?: string;
  /**
   * G673/G686: the page background channel. Same shape as `textColor` — `#RRGGBB`, or the
   * official light/dark pair `"#light #dark"` stored as **one string** (the CLI writes
   * `--bg-color "#222222"` and reads it back verbatim, so the pair is never split into fields).
   * Absent means the theme's own background wins.
   */
  backgroundColor?: string;
  /**
   * G282: `setPageParagraphSpacingType` — the paragraph spacing preset. `null`/absent means
   * "not set, follow the document", which is **not** the same as a zero-spacing preset.
   */
  paragraphSpacing?: ParagraphSpacingType | null;
  /**
   * G282: `setPageStylePreset` — a named page-style preset. Applying one fills the individual
   * fields; `null`/absent means no preset has been applied.
   */
  stylePreset?: PageStylePresetId | null;
  /** G236: which template this document was created from (「来自模板」的来源标记). */
  fromTemplate?: string;
}

/** G282: the paragraph spacing presets. */
export type ParagraphSpacingType = 'compact' | 'normal' | 'relaxed';

export const PARAGRAPH_SPACING_TYPES: readonly ParagraphSpacingType[] = ['compact', 'normal', 'relaxed'];

/** G282: the page style presets. */
export type PageStylePresetId = 'default' | 'serif' | 'mono' | 'paper';

export const PAGE_STYLE_PRESETS: readonly PageStylePresetId[] = ['default', 'serif', 'mono', 'paper'];

/** Applying a preset produces the page-style patch it stands for (fills the individual fields). */
export function pageStyleForPreset(preset: PageStylePresetId): Partial<PageStyle> {
  switch (preset) {
    case 'serif':
      return { fontPack: 'system-serif', theme: 'default', washi: 'none', stylePreset: 'serif' };
    case 'mono':
      return { fontPack: 'system-mono', theme: 'default', washi: 'none', stylePreset: 'mono' };
    case 'paper':
      return { fontPack: 'system', theme: 'default', washi: 'sunset', stylePreset: 'paper' };
    case 'default':
    default:
      return { fontPack: 'system', theme: 'default', washi: 'none', stylePreset: 'default' };
  }
}

/**
 * G685: the official names are `system` / `system-serif` / `system-rounded` / `system-mono`, and
 * the legacy aliases map **irregularly** — `sans-serif` points at `system`, not `system-serif`.
 * Both spellings are accepted on read; the canonical name is what gets written.
 */
export type FontPackId = 'system' | 'system-serif' | 'system-mono' | 'system-rounded';

const FONT_ALIASES: Record<string, FontPackId> = {
  system: 'system',
  'sans-serif': 'system',
  inter: 'system',
  'system-serif': 'system-serif',
  serif: 'system-serif',
  'system-rounded': 'system-rounded',
  rounded: 'system-rounded',
  'system-mono': 'system-mono',
  mono: 'system-mono',
};

export function canonicalFontId(value: unknown): FontPackId {
  return typeof value === 'string' && value in FONT_ALIASES ? FONT_ALIASES[value] : 'system';
}

export const fontPacks: { id: FontPackId; label: string; stack: string }[] = [
  { id: 'system', label: '默认', stack: 'var(--font-sans), var(--cjk-sans), system-ui, sans-serif' },
  { id: 'system-serif', label: '衬线', stack: 'Georgia, "Times New Roman", "Songti SC", var(--cjk-serif), serif' },
  { id: 'system-mono', label: '等宽', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, var(--cjk-mono), monospace' },
  { id: 'system-rounded', label: '圆体', stack: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, var(--cjk-rounded), sans-serif' },
];

export type WashiId = string;

/** G682：远端清单里任意具名主题都可选，内置六档只是离线兜底。 */
export type PageThemeId = string;

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

export function getThemeColor(id: PageThemeId | undefined, storedColor?: string | null): string {
  // G682：远端主题清单里任意一条都可能被选中——应用时把解析出的背景色存进 `themeColor`，
  // 内置六档没有存档值时再查静态表。
  if (storedColor) return storedColor;
  return pageThemes.find((t) => t.id === id)?.color ?? 'transparent';
}

export function getWashiGradient(id: WashiId | undefined): string {
  return washiTapes.find((w) => w.id === id)?.gradient ?? '';
}

/** G210：页面分隔符三档；老文档只有 `washi` 字段，缺省按它回推。 */
export function separatorStyleOf(pageStyle: PageStyle | null | undefined): SeparatorStyle {
  if (pageStyle?.separatorStyle) return pageStyle.separatorStyle;
  return pageStyle?.washi && pageStyle.washi !== 'none' ? 'washi' : 'line';
}

/**
 * G673/G686 —— 三通道色（`--text-color`／`--bg-color`／`--theme-color`）的值有两种写法：
 * 单值 `#RRGGBB`，或**明暗双值** `"#light #dark"`。双值在库里就是**一个字符串**（官方
 * 写 `--bg-color "#111111 #eeeeee"`，读回 `backgroundColor:"#111111 #eeeeee"`），所以
 * 模型层既不拆成两个字段，也不丢空格位置——只做合法性归一。
 */
const HEX = /^#[0-9a-f]{6}$/i;

export interface DualColor {
  light: string;
  /** 只有写了双值才有；单值色在暗色下仍用它自己。 */
  dark?: string;
}

/** 解析一档色通道值；两半任一不合法就返回 `null`（宁可丢值，不猜）。 */
export function parseDualColor(value: unknown): DualColor | null {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1 && HEX.test(parts[0])) return { light: parts[0] };
  if (parts.length === 2 && HEX.test(parts[0]) && HEX.test(parts[1])) {
    return { light: parts[0], dark: parts[1] };
  }
  return null;
}

/** 存回去的形状：单值就是它自己，双值用一枚空格连起来。 */
export function normalizeColorChannel(value: unknown): string | undefined {
  const parsed = parseDualColor(value);
  if (!parsed) return undefined;
  return parsed.dark ? `${parsed.light} ${parsed.dark}` : parsed.light;
}

/** 按当前明暗取那一半；单值色两档同值。 */
export function resolveColorChannel(value: unknown, isDark: boolean): string | undefined {
  const parsed = parseDualColor(value);
  if (!parsed) return undefined;
  return isDark ? parsed.dark ?? parsed.light : parsed.light;
}

export function normalizePageStyle(value: unknown): PageStyle {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  return {
    fontPack: v.fontPack === undefined ? undefined : canonicalFontId(v.fontPack),
    theme: typeof v.theme === 'string' ? (v.theme as PageThemeId) : undefined,
    themeColor: typeof v.themeColor === 'string' ? v.themeColor : undefined,
    separatorStyle: normalizeSeparatorStyle(v.separatorStyle),
    washi: typeof v.washi === 'string' ? (v.washi as WashiId) : undefined,
    showTitle: typeof v.showTitle === 'boolean' ? v.showTitle : undefined,
    spelling: typeof v.spelling === 'boolean' ? v.spelling : undefined,
    spellingLang: typeof v.spellingLang === 'string' ? v.spellingLang : undefined,
    textColor: typeof v.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.textColor) ? v.textColor : undefined,
    backgroundColor: normalizeColorChannel(v.backgroundColor),
    // G282: `null` means "not set, follow the document" — kept distinct from a real preset value.
    paragraphSpacing: isParagraphSpacingType(v.paragraphSpacing) ? v.paragraphSpacing : undefined,
    stylePreset: isPageStylePreset(v.stylePreset) ? v.stylePreset : undefined,
    fromTemplate: typeof v.fromTemplate === 'string' ? v.fromTemplate : undefined,
  };
}

function isParagraphSpacingType(value: unknown): value is ParagraphSpacingType {
  return typeof value === 'string' && (PARAGRAPH_SPACING_TYPES as readonly string[]).includes(value);
}

function isPageStylePreset(value: unknown): value is PageStylePresetId {
  return typeof value === 'string' && (PAGE_STYLE_PRESETS as readonly string[]).includes(value);
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
