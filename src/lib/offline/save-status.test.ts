import { describe, expect, it } from 'vitest';

import {
  ALL_CHANGES_SAVED,
  NOT_AVAILABLE_OFFLINE,
  NOT_CONNECTED_TO_INTERNET,
  OFFLINE_UPDATED_TEMPLATE,
  formatOfflineStamp,
  offlineSaveLabel,
} from './save-status';

/**
 * `gap.md` G36 —— 保存状态的离线语义。官方逐字（`i18n-zh.tsv:40,200,201,1699`）：
 * 所有更改已保存／离线不可用／未连接到网络／离线更新于 [0]（`interactions.md:71` 的状态机表）。
 */
describe('保存状态的离线语义（G36）', () => {
  it('官方文案逐字', () => {
    expect(ALL_CHANGES_SAVED).toBe('所有更改已保存');
    expect(NOT_CONNECTED_TO_INTERNET).toBe('未连接到网络');
    expect(NOT_AVAILABLE_OFFLINE).toBe('离线不可用');
    expect(OFFLINE_UPDATED_TEMPLATE).toBe('离线更新于 [0]');
  });

  it('在线时不改徽标（返回 null ⇒ 调用方保留自己的在线态文案）', () => {
    expect(offlineSaveLabel({ offline: false, isDailyNote: false, draftSavedAt: null })).toBeNull();
    expect(offlineSaveLabel({ offline: false, isDailyNote: true, draftSavedAt: 1 })).toBeNull();
  });

  it('离线且非每日笔记 ⇒ 「未连接到网络」', () => {
    expect(offlineSaveLabel({ offline: true, isDailyNote: false, draftSavedAt: 123 })).toBe(
      NOT_CONNECTED_TO_INTERNET,
    );
  });

  it('离线且是每日笔记、拿得到草稿时刻 ⇒ 「离线更新于 HH:MM」', () => {
    const at = new Date(2026, 9, 15, 9, 5, 0).getTime();
    expect(offlineSaveLabel({ offline: true, isDailyNote: true, draftSavedAt: at })).toBe('离线更新于 09:05');
  });

  it('离线且是每日笔记但还没落过草稿 ⇒ 退回「未连接到网络」（不能编一个时间出来）', () => {
    expect(offlineSaveLabel({ offline: true, isDailyNote: true, draftSavedAt: null })).toBe(
      NOT_CONNECTED_TO_INTERNET,
    );
  });

  it('时刻格式化补零到 HH:MM', () => {
    expect(formatOfflineStamp(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('03:04');
    expect(formatOfflineStamp(new Date(2026, 0, 2, 23, 59, 5).getTime())).toBe('23:59');
  });
});
