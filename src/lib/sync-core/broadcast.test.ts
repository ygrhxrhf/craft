import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBroadcaster, type EventSourceLike } from './broadcast';

class FakeES implements EventSourceLike {
  close = vi.fn();
  onopen: null | (() => void) = null;
  onmessage: null | ((ev: { data: string }) => void) = null;
  onerror: null | (() => void) = null;
}

describe('broadcast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('收到 meta 消息 → 500ms 去抖合并 → onMeta 一次', () => {
    const es = new FakeES();
    const onMeta = vi.fn();
    const b = createBroadcaster({ onMeta, eventSourceFactory: () => es as unknown as EventSourceLike });
    b.start();
    es.onopen!();
    es.onmessage!({ data: JSON.stringify({ t: 'meta', tables: ['document'], cursor: 'c1' }) });
    es.onmessage!({ data: JSON.stringify({ t: 'meta', tables: ['folder'], cursor: 'c2' }) });
    expect(onMeta).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onMeta).toHaveBeenCalledTimes(1);
    expect(b.isLive()).toBe(true);
  });

  it('onerror → 关闭 live 并启动 30s 轮询 onMeta；重连 onopen 停轮询', () => {
    const es = new FakeES();
    const onMeta = vi.fn();
    const b = createBroadcaster({ onMeta, eventSourceFactory: () => es as unknown as EventSourceLike });
    b.start();
    es.onopen!();
    es.onerror!();
    expect(b.isLive()).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(onMeta).toHaveBeenCalledTimes(1);       // 降级轮询触发一次对账
    // 浏览器 EventSource 自带重连：同一实例重连成功后再次触发 open（真实 API 行为）
    es.onopen!();
    expect(b.isLive()).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(onMeta).toHaveBeenCalledTimes(1);       // 已恢复 live，轮询停止
  });
});
