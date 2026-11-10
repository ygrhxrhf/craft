/**
 * `gap.md` G580 —— 原子内联元素的权威四类 `math / day / mention / tag` 里，本地此前只有
 * `math` 与 `mention`。本模块是 `day` 与 `tag` 两类的**共享纯逻辑**（因此可单测、不依赖编辑器）：
 *
 * - `day` 存 `YYYY.MM.DD`（与官方 `day://` 链接同一字符串形态）；解析走严格日期校验，
 *   脏值（`2026.02.30`）不认可。
 * - `tag` 存标签名（与 `tags` 表的 `name` 同一口径），点击去 `/tags/<id>`。
 * - `ATOM_NODE_NAMES` 是"光标在里面就不动默认行为"的判据，直接照官方 `Wc`/`Jm` 的四类枚举。
 */

import { dayNoteHref } from '@/lib/links/craft-schemes';

export const ATOM_NODE_NAMES = ['mathBlock', 'inlineMath', 'dayAtom', 'mention', 'tagAtom'] as const;

/**
 * 官方 `Jm`：折叠选区且父节点 `type ∈ {math, day, mention, tag}` ⇒ 视为"光标在某原子内"。
 * 本地 `math` 拆成 `mathBlock`（块级）与 `inlineMath`（行内）两个节点名，都算进那一类。
 */
export function isAtomNodeName(name: string): boolean {
  return (ATOM_NODE_NAMES as readonly string[]).includes(name);
}

/**
 * 光标是否落在原子内联元素内部（官方 `Wc(r) != null` 的本地等价物）。
 *
 * ProseMirror 里原子节点是叶子：`$from.parent` 就是那个原子节点本身（depth ≥ 1），
 * 或者 `$from.nodeBefore` / `$from.nodeAfter` 是原子节点（光标紧贴它）。
 * 官方只看"父节点是这四类"，这里按同一口径判父节点，另带紧贴的情形——那样 Backspace
 * 不会把原子删掉，交给 ProseMirror 默认的 node selection 删除。
 */
export function caretInsideAtom(
  parentName: string,
  nodeBefore: { type: { name: string } } | null,
  nodeAfter: { type: { name: string } } | null,
): boolean {
  if (isAtomNodeName(parentName)) return true;
  if (nodeBefore && isAtomNodeName(nodeBefore.type.name)) return true;
  if (nodeAfter && isAtomNodeName(nodeAfter.type.name)) return true;
  return false;
}

/** 严格日期：`YYYY.MM.DD` / `YYYY-MM-DD`，四位年，且必须是真实存在的日历日。 */
export function parseDayAtomDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}.${pad(month)}.${pad(day)}`;
}

/** 原子的 `day://` 深链（与官方 `e1e` 同一形态：点分隔 + 两位零填充，由 craft-schemes:dayNoteHref 统一生成）。 */
export function dayAtomHref(date: string | null | undefined): string {
  const normalized = parseDayAtomDate(date);
  if (!normalized) return '';
  const [y, m, d] = normalized.split('.').map(Number);
  return dayNoteHref(new Date(y, m - 1, d));
}

/** 胶囊上显示的那一行（`2026.09.27` 直接印出来）。 */
export function dayAtomLabel(date: string | null | undefined): string {
  return parseDayAtomDate(date) ?? '';
}

/** `tag` 原子的标签名归一：去首尾空白与开头的 `#`（用户常带 `#` 输入）。 */
export function normalizeTagAtomName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/^#+/, '').trim();
  return name || null;
}

/** `tag` 原子的落点：标签详情页。 */
export function tagAtomHref(tagId: string | null | undefined): string {
  return tagId ? `/tags/${tagId}` : '/tags';
}

/**
 * 一个文本块里的**原子内联子节点**枚数（官方 `JO` 的 `elementContent.length` 判据）。
 * `textContent` 对原子节点是空串，所以「只有一枚原子、没有文字」的块若只看文本长度会被
 * 误判成空块（进而触发 Enter 的三段降级或 Backspace 的删块）——这里补上原子计数。
 */
export function countAtomicInlines(node: {
  childCount: number;
  child: (i: number) => { isText: boolean; type: { name: string } } | null;
}): number {
  let count = 0;
  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    if (child && !child.isText && isAtomNodeName(child.type.name)) count += 1;
  }
  return count;
}
