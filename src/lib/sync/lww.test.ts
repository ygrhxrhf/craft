import { describe, it, expect } from 'vitest';
import { decideLww } from './lww';

const T1 = '2026-09-28T10:00:00.000Z';
const T2 = '2026-09-28T11:00:00.000Z';

describe('decideLww（服务端裁决，客户端无条件 ≤ 即拒）', () => {
  it('记录不存在 → 应用（tSrv=null）', () => {
    expect(decideLww('upsert', T1, null)).toBe('apply');
    expect(decideLww('delete', T1, null)).toBe('apply'); // 幂等接受
  });
  it('客户端更新 → 应用', () => {
    expect(decideLww('upsert', T2, T1)).toBe('apply');
    expect(decideLww('delete', T2, T1)).toBe('apply');
  });
  it('客户端更旧或相等 → 拒绝', () => {
    expect(decideLww('upsert', T1, T2)).toBe('reject');
    expect(decideLww('upsert', T1, T1)).toBe('reject');
    expect(decideLww('delete', T1, T2)).toBe('reject');
  });
});
