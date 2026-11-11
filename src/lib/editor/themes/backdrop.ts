/**
 * G706: the page backdrop. The official value is one string in one of four shapes — a bare
 * colour pair, the CLI's stringified gradient JSON, an `image("<url>","<token>")` expression,
 * or `none` (cleared). This module turns a stored `backdrop` value into what the page renders,
 * with the stringified-JSON shape (what `--backdrop-colors` actually writes) as the canonical
 * gradient carrier: `direction` and `size` are dimensions the flags cannot reach, so they are
 * kept as fields of the JSON rather than flattened away.
 */
import { colorPairCss, parseDualColor } from '@/components/editor/themes/page-style';

export interface BackdropGradient {
  kind: 'gradient';
  startColor: string;
  endColor: string;
  direction: string;
  size: string;
}

export interface BackdropImage {
  kind: 'image';
  url: string;
}

export interface BackdropColor {
  kind: 'color';
  light: string;
  dark?: string;
}

export type Backdrop = BackdropGradient | BackdropImage | BackdropColor | null;

interface GradientJson {
  type?: unknown;
  gradientColors?: { startColor?: unknown; endColor?: unknown };
  direction?: unknown;
  size?: unknown;
}

/** Split the arguments of a call expression at top-level commas (colours may be dual pairs). */
function splitArgs(source: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote = false;
  let current = '';
  for (const ch of source) {
    if (ch === '"') quote = !quote;
    if (!quote && ch === '(') depth += 1;
    if (!quote && ch === ')') depth -= 1;
    if (!quote && depth === 0 && ch === ',') {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  args.push(current.trim());
  return args;
}

/** Parse a stored backdrop value; `null` means "no backdrop". */
export function parseBackdrop(value: unknown): Backdrop {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw === 'none') return null;
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as GradientJson;
      const colors = parsed.gradientColors;
      const start = typeof colors?.startColor === 'string' && parseDualColor(colors.startColor) ? colors.startColor : null;
      const end = typeof colors?.endColor === 'string' && parseDualColor(colors.endColor) ? colors.endColor : null;
      if (parsed.type === 'gradient' && start && end) {
        return {
          kind: 'gradient',
          startColor: start,
          endColor: end,
          direction: typeof parsed.direction === 'string' ? parsed.direction : 'top-to-bottom',
          size: typeof parsed.size === 'string' ? parsed.size : 'full',
        };
      }
      return null;
    } catch {
      return null;
    }
  }
  // 预设里的写法：`gradient(<stop>, <stop>, radial|top-to-bottom)`，两枚色标各自可能是明暗双值。
  if (raw.startsWith('gradient(') && raw.endsWith(')')) {
    const args = splitArgs(raw.slice('gradient('.length, -1));
    const start = args[0];
    const end = args[1];
    if (!parseDualColor(start) || !parseDualColor(end)) return null;
    const direction = args[2] === 'radial' ? 'radial' : 'top-to-bottom';
    return { kind: 'gradient', startColor: start, endColor: end, direction, size: 'full' };
  }
  if (raw.startsWith('image(')) {
    const match = /image\(\s*"([^"]+)"\s*,/.exec(raw);
    if (!match) return null;
    let url = match[1];
    if (url.includes('%')) {
      try {
        url = decodeURIComponent(url);
      } catch {
        // 保留原文——解码失败不渲染也比渲染半个 URL 稳。
      }
    }
    return { kind: 'image', url };
  }
  const pair = parseDualColor(raw);
  if (pair) return { kind: 'color', light: pair.light, dark: pair.dark };
  return null;
}

/**
 * The CSS `background` for a backdrop, or undefined when there is none. Dual stops are emitted
 * as `light-dark()` pairs rather than resolved per scheme in JS: the string is then identical on
 * the server and on the first client render (see `colorChannelCss`), and the browser follows
 * `color-scheme` live when the theme changes.
 */
export function backdropBackground(backdrop: Backdrop): string | undefined {
  if (!backdrop) return undefined;
  switch (backdrop.kind) {
    case 'gradient': {
      const from = parseDualColor(backdrop.startColor);
      const to = parseDualColor(backdrop.endColor);
      const start = from ? colorPairCss(from.light, from.dark) : backdrop.startColor;
      const end = to ? colorPairCss(to.light, to.dark) : backdrop.endColor;
      const shape = backdrop.direction === 'radial' ? 'radial-gradient' : 'linear-gradient(to bottom';
      return backdrop.direction === 'radial'
        ? `${shape}(circle, ${start}, ${end})`
        : `${shape}, ${start}, ${end})`;
    }
    case 'color':
      return colorPairCss(backdrop.light, backdrop.dark);
    case 'image':
      return `url("${backdrop.url}") center / cover no-repeat`;
  }
}
