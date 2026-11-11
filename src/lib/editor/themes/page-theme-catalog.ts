/**
 * G682：官方页面主题是一张**具名清单**、且「Themes loaded dynamically from S3」——
 * 第 3d 批把 `https://res.craft.do/themes/presets.json` 原文抓到盘上（131 条，
 * 每条 `{themeId, title, pageStyleProps}`），本地照同一形制**运行时加载**：
 * `public/themes-presets.json` 就是这份原文，面板启动后 `loadPageThemes()` 拉取。
 *
 * 本地承载的属性按官方 `--theme-id` 的**一次五字段**落地：主题 id、字体族（`system*` 家族）、
 * 文字色（明暗对）、背景色（明暗对以空格连接）、分隔线表达式（原样）；官方还有 `card-assets`
 * 素材面本地无对应承载（G157/G210 的素材批），解析时原样保留、不丢弃。
 */
import {
  canonicalFontId,
  normalizeBackdrop,
  normalizeColorChannel,
  normalizeSeparatorStyleRaw,
  type PageStyle,
} from '@/components/editor/themes/page-style';

export interface ThemePreset {
  themeId: string;
  title: string;
  props: Record<string, string>;
}

const PAIR_SPLIT = /\s+(?=#)/;

/** `"#1F2225 #F4F4F4"`＝明/暗成对；单值＝两档同色。 */
export function colorPair(value: string | undefined): { light: string; dark: string } {
  const raw = (value ?? '').trim();
  if (!raw) return { light: 'transparent', dark: 'transparent' };
  const parts = raw.split(PAIR_SPLIT).map((part) => part.trim()).filter(Boolean);
  return { light: parts[0] ?? 'transparent', dark: parts[1] ?? parts[0] ?? 'transparent' };
}

/** 解析 `themes/presets.json` 原文；坏条目直接跳过，不让一张脏表拖垮面板。 */
export function parseThemePresets(json: unknown): ThemePreset[] {
  const themes = (json as { themes?: unknown })?.themes;
  if (!Array.isArray(themes)) return [];
  const presets: ThemePreset[] = [];
  for (const entry of themes) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { themeId?: unknown; title?: unknown; pageStyleProps?: unknown };
    if (typeof record.themeId !== 'string' || !record.themeId) continue;
    const props: Record<string, string> = {};
    if (record.pageStyleProps && typeof record.pageStyleProps === 'object') {
      for (const [key, value] of Object.entries(record.pageStyleProps as Record<string, unknown>)) {
        if (typeof value === 'string') props[key] = value;
      }
    }
    presets.push({ themeId: record.themeId, title: typeof record.title === 'string' ? record.title : record.themeId, props });
  }
  return presets;
}

/** 一条官方主题 → 本地页样式补丁（官方 `--theme-id` 一次写下的就是这五个字段）。 */
export function pageStylePatchForTheme(preset: ThemePreset): Partial<PageStyle> {
  const background = colorPair(preset.props['background-color']);
  const text = colorPair(preset.props.color);
  // 官方 `--theme-id` 把 backgroundColor 存成空格连接的明暗对——两半同值也保留对形（G708）。
  const patch: Partial<PageStyle> = {
    theme: preset.themeId,
    themeColor: background.light,
    backgroundColor: normalizeColorChannel(
      preset.props['background-color'],
    ),
    separatorStyleRaw: normalizeSeparatorStyleRaw(preset.props['separator-style']),
    backdrop: normalizeBackdrop(preset.props.backdrop),
  };
  // 官方文字色同为明暗对：两半相同就收敛成单值（fire-horse 落库正是单值 `#400000`），
  // 不同才保留对形。
  if (text.light !== 'transparent') {
    patch.textColor = normalizeColorChannel(text.light === text.dark ? text.light : `${text.light} ${text.dark}`);
  }
  const font = preset.props['font-family'];
  if (font) patch.fontPack = canonicalFontId(font);
  return patch;
}

let cache: Promise<ThemePreset[]> | null = null;

/** 运行时拉取主题清单（一进程只拉一次）；失败回空表，面板退回内置六档。 */
export function loadPageThemes(fetcher: typeof fetch = fetch): Promise<ThemePreset[]> {
  cache ??= fetcher('/themes-presets.json')
    .then((response) => (response.ok ? response.json() : null))
    .then((json) => parseThemePresets(json))
    .catch(() => []);
  return cache;
}

/** 测试用：清掉模块级缓存。 */
export function resetPageThemesCache(): void {
  cache = null;
}