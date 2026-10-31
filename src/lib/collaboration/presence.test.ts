import { describe, expect, it, vi } from 'vitest';
import type { Awareness } from 'y-protocols/awareness';
import {
  colorForUserId,
  initialPresenceState,
  selectPeers,
  setLocalCursor,
  setLocalPresenceField,
} from './presence';

describe('colorForUserId', () => {
  it('is stable for the same user', () => {
    expect(colorForUserId('user-1')).toBe(colorForUserId('user-1'));
  });

  it('returns a hex colour from the palette', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
      expect(colorForUserId(id)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('spreads users across more than one colour', () => {
    const colors = new Set(Array.from({ length: 40 }, (_, i) => colorForUserId(`u${i}`)));
    expect(colors.size).toBeGreaterThan(2);
  });
});

describe('selectPeers', () => {
  const user = { id: 'u2', name: '李四', color: '#4a7de0' };
  const states = new Map<number, ReturnType<typeof initialPresenceState>>([
    [1, initialPresenceState({ id: 'u1', name: '张三', color: '#e0596b' })],
    [2, { user, cursor: { anchor: { position: 4 }, head: { position: 4 } } }],
    [3, { user: undefined }],
  ]);

  it('drops the local client and states without a user', () => {
    const peers = selectPeers(states, 1);
    expect(peers).toHaveLength(1);
    expect(peers[0].clientId).toBe(2);
    expect(peers[0].user.name).toBe('李四');
  });

  it('normalises a missing cursor to null so peers render before they move', () => {
    const withCursor = new Map([[7, initialPresenceState(user)]]);
    expect(selectPeers(withCursor, 1)[0].cursor).toBeNull();
  });

  it('surfaces the RTC editing-block and open-page dimensions', () => {
    const states = new Map([
      [2, { user, cursor: null, editingBlockId: 'blk-9', openPageId: 'doc-3' }],
      [3, { user }],
    ]);
    const peers = selectPeers(states, 1);
    expect(peers[0].editingBlockId).toBe('blk-9');
    expect(peers[0].openPageId).toBe('doc-3');
    expect(peers[1].editingBlockId).toBeNull();
    expect(peers[1].openPageId).toBeNull();
  });
});

describe('setLocalPresenceField', () => {
  function fakeAwareness(initial: Record<string, unknown> = {}) {
    const state = { ...initial };
    return {
      state,
      getLocalState: () => state,
      setLocalStateField: vi.fn((key: string, value: unknown) => {
        state[key] = value;
      }),
    } as unknown as Awareness & { state: Record<string, unknown> };
  }

  it('writes when the value changes', () => {
    const awareness = fakeAwareness({ editingBlockId: null });
    setLocalPresenceField(awareness, 'editingBlockId', 'blk-1');
    expect(awareness.setLocalStateField).toHaveBeenCalledWith('editingBlockId', 'blk-1');
  });

  it('skips the write when the value is unchanged', () => {
    const awareness = fakeAwareness({ editingBlockId: 'blk-1' });
    setLocalPresenceField(awareness, 'editingBlockId', 'blk-1');
    expect(awareness.setLocalStateField).not.toHaveBeenCalled();
  });

  it('treats undefined as null so leaving a block clears the field', () => {
    const awareness = fakeAwareness({ openPageId: 'doc-1' });
    setLocalPresenceField(awareness, 'openPageId', null);
    expect(awareness.setLocalStateField).toHaveBeenCalledWith('openPageId', null);
  });
});

describe('setLocalCursor', () => {
  function fakeAwareness(cursor: unknown = null) {
    const state: Record<string, unknown> = { cursor };
    return {
      getLocalState: () => state,
      setLocalStateField: vi.fn((key: string, value: unknown) => {
        state[key] = value;
      }),
    } as unknown as Awareness;
  }

  it('serialises mappable positions before publishing', () => {
    const awareness = fakeAwareness();
    const position = { toJSON: () => ({ position: 5 }) };
    setLocalCursor(awareness, {
      anchor: position as never,
      head: position as never,
    });
    expect(awareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
      anchor: { position: 5 },
      head: { position: 5 },
    });
  });

  it('does not rebroadcast an identical caret', () => {
    const awareness = fakeAwareness({ anchor: { position: 5 }, head: { position: 5 } });
    const position = { toJSON: () => ({ position: 5 }) };
    setLocalCursor(awareness, { anchor: position as never, head: position as never });
    expect(awareness.setLocalStateField).not.toHaveBeenCalled();
  });
});
