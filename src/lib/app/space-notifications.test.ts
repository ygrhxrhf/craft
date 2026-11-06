import { describe, expect, it } from 'vitest';

import {
  effectiveSpaceEmail,
  readSpaceEmailOverride,
  writeSpaceEmailOverride,
} from './space-notifications';

const userId = 'user-1';

describe('G163 按空间的邮件通知覆盖', () => {
  it('没设过／形状不对时返回 null（＝跟随全局）', () => {
    expect(readSpaceEmailOverride(null, userId)).toBeNull();
    expect(readSpaceEmailOverride({}, userId)).toBeNull();
    expect(readSpaceEmailOverride({ notifications: 'nope' }, userId)).toBeNull();
    expect(readSpaceEmailOverride({ notifications: { emailComments: { [userId]: 'yes' } } }, userId)).toBeNull();
  });

  it('写入按成员分格，保留空间设置的其它键', () => {
    const settings = { theme: 'dark', notifications: { push: true, emailComments: { someone: false } } };
    const next = writeSpaceEmailOverride(settings, userId, true);
    expect(readSpaceEmailOverride(next, userId)).toBe(true);
    expect(next.theme).toBe('dark');
    expect((next.notifications as Record<string, unknown>).push).toBe(true);
    // 同一空间里别人那一格不动。
    expect(readSpaceEmailOverride(next, 'someone')).toBe(false);
    // 不改入参。
    expect(readSpaceEmailOverride(settings, userId)).toBeNull();
  });

  it('null 删除这一格并顺手清掉空容器', () => {
    const only = writeSpaceEmailOverride({}, userId, false);
    expect(readSpaceEmailOverride(only, userId)).toBe(false);
    const cleared = writeSpaceEmailOverride(only, userId, null);
    expect(readSpaceEmailOverride(cleared, userId)).toBeNull();
    expect(cleared.notifications).toBeUndefined();
    expect(cleared.theme).toBeUndefined();

    const withSibling = writeSpaceEmailOverride(
      { notifications: { push: true, emailComments: { [userId]: true } } },
      userId,
      null,
    );
    expect((withSibling.notifications as Record<string, unknown>).emailComments).toBeUndefined();
    expect((withSibling.notifications as Record<string, unknown>).push).toBe(true);
  });

  it('生效值＝覆盖值 ?? 全局值', () => {
    expect(effectiveSpaceEmail(true, null)).toBe(true);
    expect(effectiveSpaceEmail(false, true)).toBe(true);
    expect(effectiveSpaceEmail(true, false)).toBe(false);
  });
});