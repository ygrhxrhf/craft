import { beforeEach, describe, expect, it } from 'vitest';

import {
  forgetAllUserDisplay,
  mergeUserDisplayEntries,
  rememberUserDisplay,
  userDisplayEntries,
  userDisplayOf,
} from './user-display';

beforeEach(() => {
  forgetAllUserDisplay();
});

describe('userDisplayOf / rememberUserDisplay（G1507 的另一半）', () => {
  it('学不到的那一枚返回 null，而不是半空的对象——调用方据此决定收不收进候选', () => {
    expect(userDisplayOf('u-never')).toBeNull();
  });

  it('只学到邮箱的那一枚也站得住（名字为 null，标签落回邮箱）', () => {
    rememberUserDisplay({ userId: 'u1', email: 'a@example.com' });
    expect(userDisplayOf('u1')).toEqual({ name: null, email: 'a@example.com' });
  });

  it('后到的空白不覆盖先学到的：只增不减', () => {
    rememberUserDisplay({ userId: 'u1', name: '协作者乙', email: 'b@example.com' });
    rememberUserDisplay({ userId: 'u1' });
    expect(userDisplayOf('u1')).toEqual({ name: '协作者乙', email: 'b@example.com' });
  });

  it('空 userId 不写（服务端账号缺失时不该造出一枚空键的显示名）', () => {
    rememberUserDisplay({ userId: '', name: '无名', email: 'x@example.com' });
    expect(userDisplayOf('')).toBeNull();
  });

  it('快照＋并回：round-trip 不丢，且并回仍走只增不减（G1520 的落库底座）', () => {
    rememberUserDisplay({ userId: 'u1', name: '协作者乙', email: 'b@example.com' });
    const snap = userDisplayEntries();
    // 清空后从快照并回，等价于"刷新页面后 hydrate"
    forgetAllUserDisplay();
    expect(userDisplayOf('u1')).toBeNull();
    mergeUserDisplayEntries(snap);
    expect(userDisplayOf('u1')).toEqual({ name: '协作者乙', email: 'b@example.com' });
  });

  it('并回遇空白不覆盖内存里已有的姓名（只增不减在 hydrate 上也成立）', () => {
    rememberUserDisplay({ userId: 'u1', name: '协作者乙', email: 'b@example.com' });
    mergeUserDisplayEntries([['u1', { name: null, email: '' }]]);
    expect(userDisplayOf('u1')).toEqual({ name: '协作者乙', email: 'b@example.com' });
  });

  it('并回 null／undefined 是 no-op（库里没有这一段缓存）', () => {
    mergeUserDisplayEntries(null);
    mergeUserDisplayEntries(undefined);
    expect(userDisplayEntries()).toEqual([]);
  });
});
