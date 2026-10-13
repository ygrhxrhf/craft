import { describe, it, expect, vi } from 'vitest';
import { statusToView } from './SyncStatusIndicator';

describe('statusToView（spec 9.1 映射）', () => {
  it('synced → 不渲染', () => {
    expect(statusToView('synced', 0)).toEqual({ render: false });
  });
  it('offline → 显示待传数；syncing → 转圈；degraded → 文案；error → 角标', () => {
    expect(statusToView('offline', 7)).toEqual({ render: true, text: '离线 · 7 条待传', tone: 'warn' });
    expect(statusToView('syncing', 3).render).toBe(true);
    expect(statusToView('degraded', 0)).toEqual({ render: true, text: '实时连接断开', tone: 'warn' });
    expect(statusToView('error', 0)).toEqual({ render: true, text: '同步失败', tone: 'error' });
  });
});
