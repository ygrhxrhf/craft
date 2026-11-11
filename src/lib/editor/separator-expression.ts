/**
 * G708: the official `separator-style` expression is a small call syntax with two forms —
 * `washi(image, "<url>", "<token>")` when a theme supplies the tape image, and
 * `washi(pattern, "<name>", "#light #dark")` when only a built-in pattern is named. The
 * expression is stored verbatim; this parser is what the renderer reads so the tape comes
 * from the same value the official write side recorded.
 */
import { parseDualColor } from '@/components/editor/themes/page-style';
import { isWashiPattern, type WashiPatternName } from './washi-patterns';

export type SeparatorExpression =
  | { kind: 'line' }
  | { kind: 'doodle' }
  | { kind: 'washi-image'; url: string; token: string }
  | { kind: 'washi-pattern'; pattern: WashiPatternName; light: string; dark?: string };

/** Split the arguments of `washi(...)` at top-level commas (quoted URLs may contain commas). */
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

function unquote(value: string): string {
  return value.replace(/^"|"$/g, '');
}

/** Theme tape URLs are sometimes percent-encoded (`https%3A%2F%2F…`); decode for `<img src>`. */
function decodeUrl(url: string): string {
  if (!url.includes('%')) return url;
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export function parseSeparatorExpression(value: unknown): SeparatorExpression | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (raw === 'line') return { kind: 'line' };
  if (raw === 'doodle') return { kind: 'doodle' };
  if (!raw.startsWith('washi(') || !raw.endsWith(')')) return null;
  const args = splitArgs(raw.slice('washi('.length, -1));
  const first = args[0];
  if (first === 'image') {
    const url = unquote(args[1] ?? '');
    if (!url) return null;
    return { kind: 'washi-image', url: decodeUrl(url), token: unquote(args[2] ?? '') };
  }
  if (first === 'pattern') {
    const name = unquote(args[1] ?? '');
    if (!isWashiPattern(name)) return null;
    const pair = parseDualColor(unquote(args[2] ?? ''));
    if (!pair) return null;
    return { kind: 'washi-pattern', pattern: name, light: pair.light, dark: pair.dark };
  }
  return null;
}
