/**
 * G1084 —— 把字形探测接到真正的消费者上。
 *
 * 官方把「整条兜底栈都测不到字形」的字符挑出来，好让它们走 emoji／图片字形。本地没有
 * emoji 图片字形资产，能做的等价取舍是**不给只会画成豆腐块的候选**：候选列表先过一遍
 * 字形探测，平台画不出来的字符就不进菜单，用户不会选中一个显示不了的字。
 *
 * 探测本身在 `glyph-probe.ts`（宽度为零＝整条栈无字形）。那条判据的前提是栈末挂着
 * `AdobeBlank`；本地没有这份不可见字体，栈末会落到系统 last-resort 并把缺字形画成豆腐块
 * （宽度非零）。因此本地的等价判据再加一条：**与一个必然缺字形的哨兵字符同宽**同样算
 * 缺——豆腐块是同一个 last-resort 字形，宽度一致。
 */

import { createMeasurer, isGlyphMissing, type Measure } from '@/lib/editor/glyph-probe';

/** 既没有字形也没有语义的码位；任何字体对它都只能画 last-resort 豆腐块。 */
const NOTDEF_SENTINEL = '\uFFFF';

/** 一个「该字符是否画不出来」的判定，按字符缓存结论。 */
export type UnavailableProbe = (character: string) => boolean;

export function createUnavailableProbe(measure: Measure): UnavailableProbe {
  const notdefWidth = measure(NOTDEF_SENTINEL);
  const cache = new Map<string, boolean>();

  return (character) => {
    const cached = cache.get(character);
    if (cached !== undefined) return cached;
    const width = measure(character);
    const unavailable = isGlyphMissing(width) || (notdefWidth > 0 && width === notdefWidth);
    cache.set(character, unavailable);
    return unavailable;
  };
}

/** 只有浏览器里才有 canvas；服务端渲染阶段拿到 `null` 就一律放行。 */
let sharedProbe: UnavailableProbe | null | undefined;

function probe(): UnavailableProbe | null {
  if (sharedProbe === undefined) {
    const measure = createMeasurer();
    sharedProbe = measure ? createUnavailableProbe(measure) : null;
  }
  return sharedProbe;
}

/** 去掉当前平台只能画成豆腐块的候选；拿不到 canvas 时原样返回。 */
export function dropUnavailableGlyphs<T extends { char: string }>(
  entries: T[],
  isUnavailable: UnavailableProbe | null = probe(),
): T[] {
  if (!isUnavailable) return entries;
  return entries.filter((entry) => !isUnavailable(entry.char));
}
