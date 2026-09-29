import { describe, it, expect } from 'vitest';
import { syncBootAction } from './SyncBoot';

// task-14 F1 回归：未认证时 boot 会让 EventSource 撞 middleware 307 → HTML →
// 致命 MIME 错误（中止不重连），实例退化 30s 轮询直到整页刷新。
describe('syncBootAction（SSE 只在认证后启动）', () => {
  it('loading / unauthenticated → 不 boot 不 resume', () => {
    expect(syncBootAction('loading', null, false)).toBe('none');
    expect(syncBootAction('loading', true, true)).toBe('none');
    expect(syncBootAction('unauthenticated', null, false)).toBe('none');
    expect(syncBootAction('unauthenticated', true, true)).toBe('none');
  });

  it('启动即已登录（loading → authenticated，boot 未执行）→ boot', () => {
    expect(syncBootAction('authenticated', null, false)).toBe('boot');
  });

  it('SPA 登录且 boot 从未执行（/login 直接登录）→ boot（而非 resume）', () => {
    // F1 根因场景：修复后 /login 不再 boot，故 booted=false 时必须补 boot
    expect(syncBootAction('authenticated', false, false)).toBe('boot');
  });

  it('R-12：boot 已执行过 + 明确见过 unauthenticated 再登录 → resume（解 401 暂停）', () => {
    expect(syncBootAction('authenticated', false, true)).toBe('resume');
  });

  it('重复 authenticated 通知 → boot 幂等分支（boot 本身幂等，安全）', () => {
    expect(syncBootAction('authenticated', true, true)).toBe('boot');
  });
});
