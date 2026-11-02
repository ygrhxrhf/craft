import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rejectionCopy } from './rejection-copy';
import type { SyncRejection } from '@/lib/sync-core/types';

const reject = (over: Partial<SyncRejection>): SyncRejection => ({
  table: 'document', id: 'd1', op: 'delete', syncTs: '2026-09-28T12:00:00.000Z',
  reason: 'not_found', ...over,
});

describe('rejectionCopy（服务端拒收时屏上说什么，G1506）', () => {
  it('空明细不说话（每一轮 ack 都会带一个数组）', () => {
    expect(rejectionCopy([])).toBeNull();
  });

  it('☆ 逐字＝e2e 的判据：not_found 的文档说「文档不存在或不属于你」', () => {
    const copy = rejectionCopy([reject({})])!;
    expect(copy.title).toBe('保存失败');
    expect(copy.description).toBe('文档不存在或不属于你');
  });

  it('同一轮里多枚 not_found 只说一句，且把涉及的表都点到', () => {
    const copy = rejectionCopy([
      reject({ id: 'd1' }),
      reject({ id: 'd2' }),
      reject({ table: 'folder', id: 'f1' }),
    ])!;
    expect(copy.description).toBe('文档、文件夹不存在或不属于你');
  });

  it('LWW 竞态说另一种话——把"没有权限"和"版本更旧"混成一句就都说错了', () => {
    const copy = rejectionCopy([reject({ reason: 'stale', op: 'upsert', data: { title: 'srv' } })])!;
    expect(copy.title).toBe('保存失败');
    expect(copy.description).toContain('比服务端旧');
    expect(copy.description).not.toContain('不属于你');
  });

  it('没有 reason 的旧响应体（服务端未升级）按竞态处理，不谎报"不存在"', () => {
    const copy = rejectionCopy([reject({ reason: undefined })])!;
    expect(copy.description).toContain('比服务端旧');
  });

  it('未登记的表用协议名兜底，不会漏出一句没有主语的话', () => {
    const copy = rejectionCopy([reject({ table: 'collection_value' })])!;
    expect(copy.description).toBe('collection_value不存在或不属于你');
  });
});

/**
 * 接线闸（本仓读源码的对照面）：通路三段——服务端带 reason ⇒ manager 发明细 ⇒ SyncBoot 上屏。
 * 摘掉任何一段，上面那些纯函数用例仍然全绿，而屏上照样什么都看不见（G1497 一整批的教训形状）。
 */
describe('拒绝回路的接线（G1506）', () => {
  const boot = readFileSync(
    join(process.cwd(), 'src', 'components', 'sync', 'SyncBoot.tsx'), 'utf8');

  it('SyncBoot 订阅 onRejected 并把文案交给 toast.add', () => {
    expect(boot).toContain('onRejected(');
    expect(boot).toContain('rejectionCopy');
    expect(boot).toMatch(/toast\.add\(\{[^}]*copy\.description/);
  });

  it('两枚 reason 都上屏：G1511 之后 stale 是真实失败，不再是去抖窗口的正常第二笔', () => {
    expect(boot).toContain('rejectionCopy');
    expect(boot).toMatch(/toast\.add\(\{[^}]*copy\.description/);
    expect(boot).not.toContain('[sync] 本机改动比服务端旧');
  });
});
