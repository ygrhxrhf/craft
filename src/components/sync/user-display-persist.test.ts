import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `gap.md` G1520 —— 显示名缓存要**活过整页重载**。
 * 这里钉住 hydrate／persist 两半：读回缓存并进内存、把内存快照落回内核的 kv 段。
 */
const cache = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('./local-records', () => ({
  readUserDisplayCache: vi.fn(async () => cache.value as never),
  writeUserDisplayCache: vi.fn(async (entries: unknown) => {
    cache.value = entries;
  }),
}));

import { readUserDisplayCache, writeUserDisplayCache } from './local-records';
import { forgetAllUserDisplay, rememberUserDisplay, userDisplayOf } from './user-display';
import {
  hydrateUserDisplay,
  persistUserDisplay,
  resetUserDisplayPersistForTest,
} from './user-display-persist';

beforeEach(() => {
  vi.clearAllMocks();
  cache.value = null;
  forgetAllUserDisplay();
  resetUserDisplayPersistForTest();
});

describe('hydrateUserDisplay（G1520）', () => {
  it('首次 hydrate 把库里的缓存并回内存（刷新后 @ 才标得出那枚人）', async () => {
    cache.value = [['u1', { name: '协作者乙', email: 'b@example.com' }]];
    await hydrateUserDisplay();
    expect(userDisplayOf('u1')).toEqual({ name: '协作者乙', email: 'b@example.com' });
  });

  it('库里没有这一段缓存 ⇒ no-op，不抛', async () => {
    cache.value = null;
    await expect(hydrateUserDisplay()).resolves.toBeUndefined();
    expect(userDisplayOf('u1')).toBeNull();
  });

  it('幂等：第二次不再读库（读一次就够，别每次 @ 都摸一遍磁盘）', async () => {
    cache.value = [['u1', { name: '乙', email: 'b@example.com' }]];
    await hydrateUserDisplay();
    await hydrateUserDisplay();
    expect(readUserDisplayCache).toHaveBeenCalledTimes(1);
  });

  it('hydrate 走只增不减：库里那枚姓名空，不覆盖内存里已学到的', async () => {
    rememberUserDisplay({ userId: 'u1', name: '协作者乙', email: 'b@example.com' });
    cache.value = [['u1', { name: null, email: '' }]];
    await hydrateUserDisplay();
    expect(userDisplayOf('u1')).toEqual({ name: '协作者乙', email: 'b@example.com' });
  });
});

describe('persistUserDisplay（G1520）', () => {
  it('把当前快照落回库里（下一次 hydrate 读得到）', async () => {
    rememberUserDisplay({ userId: 'u2', name: '协作者丙', email: 'c@example.com' });
    persistUserDisplay();
    await vi.waitFor(() => expect(writeUserDisplayCache).toHaveBeenCalledTimes(1));
    expect(cache.value).toEqual([['u2', { name: '协作者丙', email: 'c@example.com' }]]);
  });

  it('每次都立刻落库（不用去抖定时器——那一枚会被整页重载取消掉，正是本 Gap 的场景）', async () => {
    rememberUserDisplay({ userId: 'u2', name: '丙', email: 'c@example.com' });
    persistUserDisplay();
    rememberUserDisplay({ userId: 'u3', name: '丁', email: 'd@example.com' });
    persistUserDisplay();
    await vi.waitFor(() => expect(writeUserDisplayCache).toHaveBeenCalledTimes(2));
    expect((cache.value as unknown[]).length).toBe(2);
  });
});
