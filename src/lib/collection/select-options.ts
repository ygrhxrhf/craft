/**
 * G454 —— 单选／多选的**选项对象是 `{id, value, themeString}`**（`model.md` §一之十三 4）：
 * 选项文本是 `value`，配色是 `themeString`（与主题同一编码通路）。
 *
 * 本地老行里存的是 `{id, label, color}`，读侧两种都认（写法统一到官方那三个键）。
 */

export const OPTION_THEMES = [
  'default',
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'pink',
] as const;

export type OptionTheme = (typeof OPTION_THEMES)[number];

export interface SelectOption {
  id: string;
  value: string;
  themeString: OptionTheme;
}

const THEME_SET = new Set<string>(OPTION_THEMES);

/** `themeString` → 渲染用的颜色（与 `use-settings-store` 的主题轴同一族取值）。 */
export const OPTION_THEME_COLORS: Record<OptionTheme, string> = {
  default: 'var(--foreground)',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
};

export function optionColor(theme: OptionTheme | string | null | undefined): string {
  return OPTION_THEME_COLORS[normalizeTheme(theme)];
}

/** 老行里 `color` 存的是色值：能对上主题色的就还原成那一档，其余落 `default`。 */
const COLOR_TO_THEME = new Map<string, OptionTheme>(
  (Object.entries(OPTION_THEME_COLORS) as Array<[OptionTheme, string]>)
    .filter(([theme]) => theme !== 'default')
    .map(([theme, color]) => [color.toLowerCase(), theme]),
);

function themeFromLegacyColor(raw: unknown): OptionTheme | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (THEME_SET.has(key)) return key as OptionTheme;
  return COLOR_TO_THEME.get(key) ?? null;
}

function normalizeTheme(raw: unknown): OptionTheme {
  return typeof raw === 'string' && THEME_SET.has(raw) ? (raw as OptionTheme) : 'default';
}

/** 读 `config.options`：认官方 `{id,value,themeString}`，也认本地老的 `{id,label,color}`。 */
export function readSelectOptions(options: unknown): SelectOption[] {
  if (!Array.isArray(options)) return [];
  const out: SelectOption[] = [];
  for (const entry of options) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const value =
      typeof record.value === 'string'
        ? record.value
        : typeof record.label === 'string'
          ? record.label
          : '';
    if (!id || !value) continue;
    out.push({
      id,
      value,
      themeString:
        themeFromLegacyColor(record.themeString) ??
        themeFromLegacyColor(record.color) ??
        normalizeTheme(undefined),
    });
  }
  return out;
}

/** 新增一项：文本去空白；空文本不给加（官方也没有"空选项"这一档）。 */
export function addOption(options: SelectOption[], value: string, theme: OptionTheme): SelectOption[] {
  const text = value.trim();
  if (!text) return options;
  return [...options, { id: crypto.randomUUID(), value: text, themeString: theme }];
}

export function updateOption(
  options: SelectOption[],
  id: string,
  patch: Partial<Pick<SelectOption, 'value' | 'themeString'>>,
): SelectOption[] {
  return options.map((option) => {
    if (option.id !== id) return option;
    const value = patch.value === undefined ? option.value : patch.value;
    return {
      ...option,
      value: value.trim() ? value.trim() : option.value,
      themeString: patch.themeString ?? option.themeString,
    };
  });
}

export function removeOption(options: SelectOption[], id: string): SelectOption[] {
  return options.filter((option) => option.id !== id);
}

/** 写回 `config.options`（只写官方三个键；其余 config 键由调用方保留）。 */
export function serializeOptions(options: SelectOption[]): Array<{
  id: string;
  value: string;
  themeString: OptionTheme;
}> {
  return options.map(({ id, value, themeString }) => ({ id, value, themeString }));
}
