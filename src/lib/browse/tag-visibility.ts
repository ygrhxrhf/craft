/**
 * G174 — the space's tag switch means **hide, not delete**.
 *
 * Official wording, verbatim from `i18n-zh.tsv`:
 *   `tags.turn.off.tags.for.this.space`       「关闭此空间的标签吗？」
 *   `tags.turn.off.tags.for.this.space.desc`  「此空间中的标签仍处于活动状态。关闭后，标签将在所有位置隐藏。」
 *   `tags.yes.turn.off`                       「是的，关闭」
 *   `tags.no.keep.on`                         「不，保持开启」
 *   `tags.disabled`                           「标签已禁用。你可以在空间设置中启用它们。」
 *   `tags.enable.tags.in.the.settings`        「在设置中启用标签」
 *   `tags.changing.these.settings.wont.affect.member.settings` 「更改这些设置不会影响其他成员的设置。」
 *   `tags.settings.error`                     「保存标签设置时发生错误」
 *
 * Scope: the official sentence says the flag is per user × per space and never touches other
 * members. This build has one personal space per account and no per-member settings row, so the
 * flag lives on the device (the same place the sidebar's own order/visibility lives, G176/G600);
 * turning it off hides the collection everywhere and never touches a `Tag` row.
 */

export const USE_TAGS_LABEL = '使用标签';
export const TAGS_OFF_CONFIRM_TITLE = '关闭此空间的标签吗？';
export const TAGS_OFF_CONFIRM_DESC = '此空间中的标签仍处于活动状态。关闭后，标签将在所有位置隐藏。';
export const TAGS_OFF_CONFIRM = '是的，关闭';
export const TAGS_KEEP_ON = '不，保持开启';
export const TAGS_DISABLED_LINE = '标签已禁用。你可以在空间设置中启用它们。';
export const ENABLE_TAGS_IN_SETTINGS = '在设置中启用标签';
export const TAGS_SCOPE_NOTE = '更改这些设置不会影响其他成员的设置。';
export const TAGS_SAVE_ERROR = '保存标签设置时发生错误';

export const TAGS_VISIBILITY_STORAGE_KEY = 'craft.tags.hidden';

export function readTagsHidden(storage?: Pick<Storage, 'getItem'>): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TAGS_VISIBILITY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** `false` means the write failed (quota / private mode) — the panel turns that into the error line. */
export function writeTagsHidden(
  storage: Pick<Storage, 'setItem'> | undefined,
  hidden: boolean,
): boolean {
  cached = hidden;
  for (const listener of listeners) listener();
  if (!storage) return true;
  try {
    storage.setItem(TAGS_VISIBILITY_STORAGE_KEY, hidden ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
let cached: boolean | null = null;

export function subscribeTagsVisibility(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot; the server renders "visible" so hydration matches. */
export function readTagsHiddenNow(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (cached === null) cached = readTagsHidden(localStorage);
  return cached;
}

export function serverTagsHidden(): boolean {
  return false;
}

/***
 * The switch is derived state, so both the settings panel and the sidebar read the same value.
 * Turning it back on needs no confirmation — only switching off states a consequence.
 */
export function shouldConfirmTagTurnOff(next: boolean): boolean {
  return next === false;
}