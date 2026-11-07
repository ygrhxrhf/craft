import { describe, expect, it, vi } from 'vitest';

import { createPromiseBridge, type DialogEvent } from './bridge';

type Config = { id: string };
type Submission = { value: string };

function harness() {
  const events: DialogEvent<Config>[] = [];
  const bridge = createPromiseBridge<Config, Submission>((event) => events.push(event));
  return { events, bridge };
}

/** 官方桥形：`open` → 一次结局 → `closed`，且 `closed` 只在结局时补发。 */
describe('the event stream', () => {
  it('dispatches open with the config and nothing else', () => {
    const { events, bridge } = harness();
    void bridge.show({ id: 'a' });
    expect(events).toEqual([{ type: 'open', config: { id: 'a' } }]);
  });

  it('dispatches closed exactly once, after the outcome is delivered', () => {
    const { events, bridge } = harness();
    void bridge.show({ id: 'a' });
    bridge.submitResult({ value: 'x' });
    expect(events.map((event) => event.type)).toEqual(['open', 'closed']);
  });
});

describe('the promise', () => {
  it('resolves with what was submitted', async () => {
    const { bridge } = harness();
    const pending = bridge.show({ id: 'a' });
    bridge.submitResult({ value: 'x' });
    await expect(pending).resolves.toEqual({
      type: 'submitted',
      config: { value: 'x' },
    });
  });

  it('resolves cancelled when the user walks away', async () => {
    const { bridge } = harness();
    const pending = bridge.show({ id: 'a' });
    bridge.cancel();
    await expect(pending).resolves.toEqual({ type: 'cancelled', reason: 'dismiss' });
  });

  it('tells a submitted empty value apart from a cancellation', async () => {
    const { bridge } = harness();
    const pending = bridge.show({ id: 'a' });
    bridge.submitResult({ value: '' });
    await expect(pending).resolves.toEqual({ type: 'submitted', config: { value: '' } });
  });
});

describe('idempotency', () => {
  it('settles only the first outcome and ignores the rest', async () => {
    const { events, bridge } = harness();
    const resolve = vi.fn();
    const pending = bridge.show({ id: 'a' });
    void pending.then(resolve);
    bridge.cancel();
    bridge.cancel();
    bridge.submitResult({ value: 'late' });
    await new Promise((tick) => setTimeout(tick, 0));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ type: 'cancelled', reason: 'dismiss' });
    expect(events.map((event) => event.type)).toEqual(['open', 'closed']);
  });

  it('does nothing when there is no dialog open', async () => {
    const { events, bridge } = harness();
    bridge.cancel();
    bridge.submitResult({ value: 'x' });
    expect(events).toEqual([]);
  });

  it('works again after the previous dialog settled', async () => {
    const { events, bridge } = harness();
    const first = bridge.show({ id: 'a' });
    bridge.cancel();
    await first;
    const second = bridge.show({ id: 'b' });
    bridge.submitResult({ value: 'again' });
    await expect(second).resolves.toEqual({ type: 'submitted', config: { value: 'again' } });
    expect(events.map((event) => event.type)).toEqual(['open', 'closed', 'open', 'closed']);
  });
});
