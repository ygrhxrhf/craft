/**
 * G171 —— 标签的忽略规则（自定义规则是一等实体）。官方那组键给出三件事：
 *   - `tags.ignore.list.desc`「这里的任何内容都不会出现在你的标签列表中，即使带有 #」；
 *   - `tags.text.to.ignore`「要忽略的文本」＋增删改（`add.custom.rule`／`edit.rule`／`delete.rule`）；
 *   - 命中来源「被自定义规则忽略的标签：[0]」。
 *
 * 存储形状＝`users.tagIgnoreRules` 的 `[{id, text}]`（见 contract 注释），匹配口径是
 * **标签名包含规则文本**（大小写不敏感；两侧都先去掉开头的 `#`，所以带 `#` 的词同样命中）。
 * 纯函数只处理列表与匹配，不碰数据库。
 */

export interface IgnoreRule {
  id: string;
  text: string;
}

/** 去掉开头的一个 `#` 与首尾空白；空串返回 ''。 */
export function normalizeIgnoreText(value: string): string {
  return value.replace(/^\s*#\s*/, '').trim();
}

/** 把库里那枚 JSON 读成规则列表；坏形状一律丢弃（不抛错，设置页照常打开）。 */
export function parseIgnoreRules(value: unknown): IgnoreRule[] {
  if (!Array.isArray(value)) return [];
  const rules: IgnoreRule[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { id?: unknown; text?: unknown };
    if (typeof record.id !== 'string' || typeof record.text !== 'string') continue;
    const text = normalizeIgnoreText(record.text);
    if (!text) continue;
    rules.push({ id: record.id, text });
  }
  return rules;
}

/** 追加一条；同一文本（大小写不敏感）已存在时原样返回并标记 `added: false`。 */
export function appendIgnoreRule(
  rules: readonly IgnoreRule[],
  text: string,
  id: string,
): { rules: IgnoreRule[]; added: boolean } {
  const normalized = normalizeIgnoreText(text);
  if (!normalized) return { rules: [...rules], added: false };
  const exists = rules.some((rule) => rule.text.toLocaleLowerCase() === normalized.toLocaleLowerCase());
  if (exists) return { rules: [...rules], added: false };
  return { rules: [...rules, { id, text: normalized }], added: true };
}

/** 改名；空文本返回原列表（调用方不提交）。 */
export function renameIgnoreRule(rules: readonly IgnoreRule[], id: string, text: string): IgnoreRule[] {
  const normalized = normalizeIgnoreText(text);
  if (!normalized) return [...rules];
  return rules.map((rule) => (rule.id === id ? { ...rule, text: normalized } : rule));
}

export function removeIgnoreRule(rules: readonly IgnoreRule[], id: string): IgnoreRule[] {
  return rules.filter((rule) => rule.id !== id);
}

/** 这个标签命中的第一条规则；没有命中返回 null。 */
export function ignoredBy(tagName: string, rules: readonly IgnoreRule[]): IgnoreRule | null {
  const name = normalizeIgnoreText(tagName).toLocaleLowerCase();
  if (!name) return null;
  for (const rule of rules) {
    if (name.includes(rule.text.toLocaleLowerCase())) return rule;
  }
  return null;
}

/** 把标签分两堆：正常显示的与被规则忽略的（后者带命中的那条规则，供来源标注）。 */
export function splitIgnored<T extends { name: string }>(
  tags: readonly T[],
  rules: readonly IgnoreRule[],
): { visible: T[]; ignored: { tag: T; rule: IgnoreRule }[] } {
  const visible: T[] = [];
  const ignored: { tag: T; rule: IgnoreRule }[] = [];
  for (const tag of tags) {
    const rule = ignoredBy(tag.name, rules);
    if (rule) ignored.push({ tag, rule });
    else visible.push(tag);
  }
  return { visible, ignored };
}

/** 每条规则命中的标签名（设置页的来源标注用）。 */
export function matchesByRule<T extends { name: string }>(
  tags: readonly T[],
  rules: readonly IgnoreRule[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const tag of tags) {
    const rule = ignoredBy(tag.name, rules);
    if (!rule) continue;
    (out[rule.id] ??= []).push(tag.name);
  }
  return out;
}