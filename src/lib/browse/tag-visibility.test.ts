import { describe, expect, it } from 'vitest';

import {
  ENABLE_TAGS_IN_SETTINGS,
  TAGS_DISABLED_LINE,
  TAGS_OFF_CONFIRM,
  TAGS_OFF_CONFIRM_DESC,
  TAGS_OFF_CONFIRM_TITLE,
  TAGS_KEEP_ON,
  TAGS_SCOPE_NOTE,
  TAGS_VISIBILITY_STORAGE_KEY,
  readTagsHidden,
  shouldConfirmTagTurnOff,
  writeTagsHidden,
} from './tag-visibility';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    read: (key: string) => map.get(key) ?? null,
  };
}

describe('G174 — turning tags off is a hide, not a delete', () => {
  it('states the consequence in the two button labels and the description', () => {
    // 逐字取自 tags.turn.off.tags.for.this.space{,.desc} / tags.yes.turn.off / tags.no.keep.on
    expect(TAGS_OFF_CONFIRM_TITLE).toBe('关闭此空间的标签吗？');
    expect(TAGS_OFF_CONFIRM_DESC).toBe(
      '此空间中的标签仍处于活动状态。关闭后，标签将在所有位置隐藏。',
    );
    expect(TAGS_OFF_CONFIRM).toBe('是的，关闭');
    expect(TAGS_KEEP_ON).toBe('不，保持开启');
  });

  it('points the disabled state back at the settings that can undo it', () => {
    expect(TAGS_DISABLED_LINE).toBe('标签已禁用。你可以在空间设置中启用它们。');
    expect(ENABLE_TAGS_IN_SETTINGS).toBe('在设置中启用标签');
  });

  it('says the setting is per member, not per space-wide', () => {
    expect(TAGS_SCOPE_NOTE).toBe('更改这些设置不会影响其他成员的设置。');
  });

  it('only asks for confirmation when switching off', () => {
    expect(shouldConfirmTagTurnOff(false)).toBe(true);
    expect(shouldConfirmTagTurnOff(true)).toBe(false);
  });
});

describe('the device flag behind the switch', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    expect(readTagsHidden(storage)).toBe(false);
    expect(writeTagsHidden(storage, true)).toBe(true);
    expect(storage.read(TAGS_VISIBILITY_STORAGE_KEY)).toBe('1');
    expect(readTagsHidden(storage)).toBe(true);
    writeTagsHidden(storage, false);
    expect(readTagsHidden(storage)).toBe(false);
  });

  it('reads as visible when storage is unavailable or corrupt', () => {
    expect(readTagsHidden(undefined)).toBe(false);
    expect(readTagsHidden(memoryStorage({ [TAGS_VISIBILITY_STORAGE_KEY]: 'yes' }))).toBe(false);
  });

  it('reports a failed write instead of pretending it saved', () => {
    const failing = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(writeTagsHidden(failing, true)).toBe(false);
  });
});