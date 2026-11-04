/**
 * `gap.md` G532 —— 高亮是**90° 线性渐变**，线格式 **`"<色1>;<色2>;<色3>g"`**（分号分隔、末尾 `g`
 * 标记渐变）。官方 `kc(t, degree=90)` 返回：
 *
 *   { type: "linear", degree: 90, colorStops: [{ color: { light, dark }, percent100 }, …] }
 *
 * 三条规则逐字取自 `styles.md` §一之二十：
 * - 色标百分比**按索引均分**：第 i 个 = `i × 100 / (n − 1)`
 * - 每个色标自己**又是明暗对**（一个存储值同时带亮档与暗档两套颜色）
 * - 单色标**退化成普通色**；全部脏 ⇒ 整个渐变 `null`（部分脏只降级那一枚）
 *
 * 本地 `gradientHighlight` 此前存的是六个具名 token（purple/red/…），线格式与明暗对都没落。
 */

/** 一枚色标：亮/暗两档 + 百分比位置。 */
export interface GradientStop {
  light: string;
  dark: string;
  percent100: number;
}

export interface LinearHighlight {
  type: 'linear';
  degree: number;
  colorStops: GradientStop[];
}

/** 官方默认角度（`kc` 的 degree 缺省值）。 */
export const DEFAULT_HIGHLIGHT_DEGREE = 90;

/** 渐变的线格式尾巴：末尾这枚 `g` 标记"这是渐变，不是单色"。 */
export const GRADIENT_MARKER = 'g';

/** 一枚色标在存储串里的写法：`light/dark`；两档相同时只写一次。 */
function serializeStop(stop: GradientStop): string {
  if (stop.light === stop.dark) return stop.light;
  return `${stop.light}/${stop.dark}`;
}

function parseStop(raw: string): GradientStop | null {
  const value = raw.trim();
  if (!value) return null;
  const [light, dark = light] = value.split('/');
  if (!light) return null;
  return { light, dark, percent100: 0 };
}

/** 存成线格式：各色标 `light/dark` 用 `;` 分隔，末段是 `g`。 */
export function serializeGradient(stops: readonly Omit<GradientStop, 'percent100'>[]): string {
  const parts = stops
    .filter((stop) => Boolean(stop.light))
    .map((stop) => serializeStop({ ...stop, percent100: 0 }));
  return [...parts, GRADIENT_MARKER].join(';');
}

/**
 * 从线格式解出渐变。规则按官方：
 * - 段数 0（或只剩 `g`）⇒ `null`
 * - 只有**一个**色标 ⇒ 退化成普通色（返回 `null`，由调用方用单色高亮表示）
 * - 部分脏：坏段丢弃，剩下的照用（一个都不剩才 `null`）
 * - 百分比按索引均分（`i×100/(n−1)`；单色标不会走到这里）
 */
export function parseGradient(raw: unknown): LinearHighlight | null {
  if (typeof raw !== 'string' || !raw.includes(GRADIENT_MARKER)) return null;
  const segments = raw.split(';');
  // 末尾那枚 `g` 不是色标（官方以它标记渐变）；不在末尾就不是渐变标记。
  if (segments.pop() !== GRADIENT_MARKER) return null;
  const stops = segments.map(parseStop).filter((stop): stop is GradientStop => stop !== null);
  if (stops.length < 2) return null;
  const step = 100 / (stops.length - 1);
  return {
    type: 'linear',
    degree: DEFAULT_HIGHLIGHT_DEGREE,
    colorStops: stops.map((stop, index) => ({ ...stop, percent100: index * step })),
  };
}

/**
 * 渐变 → CSS。色标先按百分比均分，再用 `--gradient-stop-N-light/dark` 两套变量交叉引用，
 * 于是 `.dark` 块里只要换掉那两套变量就能一次换掉所有渐变的明/暗两档（无需重写每一条规则）。
 */
export function gradientCss(gradient: LinearHighlight): string {
  const stops = gradient.colorStops
    .map((stop) => `var(--gradient-stop-${stop.light}-light, ${stop.light}) ${stop.percent100}%`)
    .join(', ');
  return `linear-gradient(${gradient.degree}deg, ${stops})`;
}

/**
 * 色标 index → 它在 CSS 里的两个色值（亮档/暗档）。`percent100` 不进 CSS 变量，只用于内联位置。
 */
export function gradientPalette(gradient: LinearHighlight): { light: string[]; dark: string[] } {
  return {
    light: gradient.colorStops.map((stop) => stop.light),
    dark: gradient.colorStops.map((stop) => stop.dark),
  };
}

/** 线格式里出现的那批合法色名（官方色板的短名；不在此列视为脏段）。 */
export const GRADIENT_COLOR_NAMES = [
  'blueDark', 'blueLight', 'cyan', 'green', 'orange', 'red', 'purple', 'brown', 'greyDark', 'greyLight',
] as const;

export type GradientColorName = (typeof GRADIENT_COLOR_NAMES)[number];

/**
 * 一枚色名解析成亮/暗两档的 CSS 变量名。本地只有一个主题 token（`--editor-<name>`），
 * `.dark` 块整体换值 ⇒ 亮/暗两档由同一个变量承担；显式写了 `light/dark` 的官方数据仍能解析。
 */
export function colorPair(name: string): { light: string; dark: string } {
  return { light: `var(--editor-${name})`, dark: `var(--editor-${name})` };
}

/**
 * 渐变高亮在面板上的几档预设。本地色板取自 `globals.css` 的 `--editor-*` 十枚；每档两个色标
 * （官方 MVP 也是两色标起步，多色标由存储层支持）。
 */
export const GRADIENT_PRESETS: readonly { id: string; label: string; colors: [string, string] }[] = [
  { id: 'sunset', label: '日落', colors: ['orange', 'red'] },
  { id: 'ocean', label: '海洋', colors: ['cyan', 'blueLight'] },
  { id: 'meadow', label: '草地', colors: ['green', 'cyan'] },
  { id: 'dusk', label: '黄昏', colors: ['purple', 'orange'] },
];

/** 预设 → 线格式（面板按钮直接拿它写 mark）。 */
export function presetValue(colors: readonly [string, string]): string {
  return serializeGradient(colors.map((name) => colorPair(name)));
}
