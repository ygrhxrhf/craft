/**
 * `gap.md` G173 —— **固定标签**（`tags-browse.md` §四）。官方这一支有五件可执行的东西：
 *
 *   `tags.pin.tag`「固定标签」 / `tags.unpin.tag`「取消固定标签」
 *   `tags.pin.and.show.all.children`「固定并显示所有子项」
 *   `tags.pin.key.tags`「固定关键标签以便快速访问」（空态引导句）
 *   `tags.pinned.limit.reached`「你已达到固定标签数的上限」（上限数值是远端 `[0]` 类，语言包不给数）
 *   `tags.pinned.error`「无法固定标签」（失败句）
 *   `tags.manage.pinned`「管理固定标签」（管理入口）
 *
 * 固定位在 `tag.pinned` 上（G607 已落列、《sync/tables.ts》已在白名单），本模块只放
 * 判据与文案——固定动作本身仍走离线内核那一条路。
 */

export const PIN_TAG_LABEL = '固定标签';
export const PIN_TAG_KEY = 'tags.pin.tag';
export const UNPIN_TAG_LABEL = '取消固定标签';
export const UNPIN_TAG_KEY = 'tags.unpin.tag';
export const PIN_SHOW_CHILDREN_LABEL = '固定并显示所有子项';
export const PIN_SHOW_CHILDREN_KEY = 'tags.pin.and.show.all.children';
export const PIN_KEY_TAGS_HINT = '固定关键标签以便快速访问';
export const PIN_KEY_TAGS_HINT_KEY = 'tags.pin.key.tags';
export const PINNED_LIMIT_REACHED = '你已达到固定标签数的上限';
export const PINNED_LIMIT_REACHED_KEY = 'tags.pinned.limit.reached';
export const PINNED_ERROR = '无法固定标签';
export const PINNED_ERROR_KEY = 'tags.pinned.error';
export const MANAGE_PINNED = '管理固定标签';
export const MANAGE_PINNED_KEY = 'tags.manage.pinned';

/**
 * 固定数上限。官方把数值放在 `[0]` 槽由远端下发、语言包只给一句话 ⇒ 本地取一个保守值，
 * 且集中在这一个常量里（不散落在 UI）。
 */
export const PINNED_TAG_LIMIT = 10;

export interface PinDecision {
  /** 能不能执行这次固定。 */
  allowed: boolean;
  /** 被拒时该显示哪一句（官方 `pinned.limit.reached`）。 */
  reason: string | null;
  /** 连带展开的所有子标签 id（`固定并显示所有子项` 打开时才有）。 */
  ids: string[];
}

/**
 * 固定一枚标签的判据：已固定的枚数到上限 ⇒ 拒绝并给官方那句；否则放行。
 * `withChildren` 打开时，把该行的**全部后代**一并列入（不只是直接子级）。
 */
export function pinDecision(input: {
  pinnedCount: number;
  withChildren: boolean;
  tagId: string;
  childrenOf: (id: string) => string[];
  limit?: number;
}): PinDecision {
  const limit = input.limit ?? PINNED_TAG_LIMIT;
  if (input.pinnedCount >= limit) {
    return { allowed: false, reason: PINNED_LIMIT_REACHED, ids: [] };
  }
  const ids = [input.tagId];
  if (input.withChildren) {
    const seen = new Set(ids);
    const pending = [...input.childrenOf(input.tagId)];
    while (pending.length > 0) {
      const next = pending.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      ids.push(next);
      pending.push(...input.childrenOf(next));
    }
  }
  return { allowed: true, reason: null, ids };
}

/** 固定/取消固定那枚按钮的两句（官方成对文案）。 */
export function pinToggleLabel(pinned: boolean): { label: string; key: string } {
  return pinned
    ? { label: UNPIN_TAG_LABEL, key: UNPIN_TAG_KEY }
    : { label: PIN_TAG_LABEL, key: PIN_TAG_KEY };
}

/**
 * 管理行上那一句说明：还有空位时给「固定关键标签以便快速访问」（官方空态引导），
 * 满了给 `pinned.limit.reached`。
 */
export function pinnedManagingHint(pinnedCount: number, limit: number = PINNED_TAG_LIMIT): string {
  return pinnedCount >= limit ? PINNED_LIMIT_REACHED : PIN_KEY_TAGS_HINT;
}
