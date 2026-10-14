import { describe, expect, it, vi } from 'vitest';

import { CLIPBOARD_EVENTS, createClipboardStop } from './boundary';

function fakeEvent(type: string) {
  return { type, stopPropagation: vi.fn() };
}

describe('the boundary handler', () => {
  it('is one handler that all three clipboard events share', () => {
    const stop = createClipboardStop();
    const events = CLIPBOARD_EVENTS.map(fakeEvent);
    for (const event of events) stop(event);
    expect(events.every((event) => event.stopPropagation.mock.calls.length === 1)).toBe(true);
  });

  it('names the intent after the event type it was handed', () => {
    const seen: string[] = [];
    const stop = createClipboardStop((intent) => seen.push(intent));
    for (const type of CLIPBOARD_EVENTS) stop(fakeEvent(type));
    expect(seen).toEqual(['cut', 'copy', 'paste']);
  });

  it('stops propagation even when nobody listens', () => {
    const stop = createClipboardStop();
    const event = fakeEvent('paste');
    stop(event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('never calls back for an unrelated event type', () => {
    const onIntent = vi.fn();
    const stop = createClipboardStop(onIntent);
    stop(fakeEvent('keydown'));
    expect(onIntent).not.toHaveBeenCalled();
    expect(stop.length).toBe(1);
  });
});
