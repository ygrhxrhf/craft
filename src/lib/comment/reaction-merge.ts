/**
 * `gap.md` G1636 —— 评论表情的**多人共写**。表情存在 `comment.reactions` 这一 JSON 列里，
 * 而写侧只允许"行主人"改那一行（`where {id, userId}`）⇒ 协作者点别人评论上的 👍 会被按
 * `not_found` 拒收、界面弹「评论不存在或不属于你」，而官方那里对别人的评论加表情就是常态。
 *
 * 服务端不能直接放开整行（那等于允许改别人的正文），也不能按"整条数组 LWW"合并（A、B 同时
 * 各加一枚会互相覆盖掉一半）。可行的形状是**按人切片**：每个调用者只能改属于自己的条目，
 * 别人的条目一律以存量行为准。客户端本来就只动自己那几枚（`toggleReaction` 只增删自己的
 * (userId,glyph)），所以切片替换对正常客户端是等价的，对伪造客户端则是把"替别人加表情"
 * 这一手直接抹掉。
 *
 * 本模块是纯核：路由只负责授权与读写，条目的校验/合并全在这里，单测直接打。
 */
export interface ReactionEntry {
  glyph: string;
  userId: string;
  name: string;
}

/** 条目形状的上限：glyph 是一枚表情（少数是组合序列），name 是显示名。 */
const GLYPH_MAX = 32;
const NAME_MAX = 80;

function entry(value: unknown): ReactionEntry | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.glyph !== 'string' || raw.glyph.length === 0 || raw.glyph.length > GLYPH_MAX) return null;
  if (typeof raw.userId !== 'string' || raw.userId.length === 0) return null;
  if (typeof raw.name !== 'string') return null;
  return { glyph: raw.glyph, userId: raw.userId, name: raw.name };
}

/** 存量列（可能是 null／坏形状／旧载荷）读成一份干净条目表。 */
export function readReactionEntries(value: unknown): ReactionEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry).filter((row): row is ReactionEntry => row !== null);
}

/**
 * 合并一次表情写入：**只替调用者自己那一段切片**。
 *  - 存量里属于别人的条目原样保留；
 *  - 调用者提交的条目里，`userId` 不是本人的一律丢弃（伪造/误带别人的条目都不生效）；
 *  - 调用者自己的条目按 glyph 去重（同一枚只留第一条），name 截到 80 字。
 * 返回 `null` 表示这一笔的 `reactions` 不是数组（调用方按 `invalid` 拒收）。
 */
export function mergeReactionWrite(
  storedValue: unknown,
  incomingValue: unknown,
  caller: { id: string },
): ReactionEntry[] | null {
  if (incomingValue === undefined) return readReactionEntries(storedValue);
  if (!Array.isArray(incomingValue)) return null;

  const others = readReactionEntries(storedValue).filter((row) => row.userId !== caller.id);
  const mine: ReactionEntry[] = [];
  const seen = new Set<string>();
  for (const raw of incomingValue) {
    const parsed = entry(raw);
    if (!parsed || parsed.userId !== caller.id) continue;
    if (seen.has(parsed.glyph)) continue;
    seen.add(parsed.glyph);
    mine.push({
      glyph: parsed.glyph,
      userId: caller.id,
      name: parsed.name.slice(0, NAME_MAX),
    });
  }
  return [...others, ...mine];
}

/**
 * 这一笔的 payload 是不是**只改表情**（没有别的列）。路由用它分流：只改表情时，
 * 行主可以不是调用者——其余情况仍按"只能写自己的行"。
 */
export function isReactionOnlyPatch(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((key) => key === 'reactions');
}
