import { describe, expect, it } from 'vitest';

import {
  KEY_BINDINGS,
  chordFor,
  detectPlatform,
  displayFor,
  matches,
  type KeyBinding,
  type Platform,
} from './keymap';

const by = (id: string): KeyBinding => {
  const hit = KEY_BINDINGS.find((binding) => binding.id === id);
  if (!hit) throw new Error(`no binding with id ${id}`);
  return hit;
};

describe('the platform switch — `bae(d) = isMac ? d : (d.winMatcher ?? d)`', () => {
  it('takes the Windows matcher when the row has one', () => {
    const binding = by('TITLE');
    expect(chordFor(binding, 'mac')).toMatchObject({ metaKey: true, altKey: true });
    expect(chordFor(binding, 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, altKey: false });
  });

  it('resolves a row that is deliberately unbound on Windows to null (G1479)', () => {
    const binding = by('MOVE_BLOCK_TOP_MAC');
    expect(chordFor(binding, 'mac')).toMatchObject({ metaKey: true, altKey: true });
    expect(chordFor(binding, 'win')).toBeNull();
    expect(displayFor(binding, 'win')).toBe('');
  });

  it('falls back to the Mac descriptor when the row carries no Windows matcher', () => {
    const binding = by('MOVE_BLOCK_UP');
    expect(binding.win).toBeUndefined();
    expect(chordFor(binding, 'win')).toBe(binding.mac);
    expect(displayFor(binding, 'win')).toBe('Alt-↑');
  });

  it('never resolves to a meta chord on Windows', () => {
    // The failure this catches is a forgotten `winMatcher`: a ⌘-based Mac row left unchanged
    // would print `⌘ K` as a Windows binding, which is not a chord a Windows user can press.
    // A row explicitly unbound on Windows resolves to null and is skipped.
    for (const binding of KEY_BINDINGS) {
      const chord = chordFor(binding, 'win');
      if (!chord) continue;
      expect(chord.metaKey, `${binding.id} carries no meta key on windows`).toBe(false);
    }
  });

  it('treats an explicit null win chord as unbound, not as a fallback (G1477)', () => {
    const macOnly = {
      ...KEY_BINDINGS[0],
      id: 'MAC_ONLY',
      win: null,
    };
    expect(chordFor(macOnly, 'mac')).toBe(macOnly.mac);
    expect(chordFor(macOnly, 'win')).toBeNull();
    // Nothing to print, and no combination can match it.
    expect(displayFor(macOnly, 'win')).toBe('');
    expect(matches({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, key: 'x' }, macOnly, 'win')).toBe(false);
  });
});

describe('the platform the runtime reports', () => {
  it('reads Windows off this test runtime, so the assertions below are the Windows side', () => {
    // The whole table is checked against both sides, but a macOS host would silently flip this
    // and the Windows rows would stop being exercised at all.
    expect(detectPlatform()).toBe('win');
  });
});

describe('display strings match the collected ones character for character', () => {
  const expected: Array<[string, Platform, string]> = [
    ['TITLE', 'mac', '⌘ ⌥ 1'],
    ['TITLE', 'win', 'Ctrl-Shift-1'],
    ['NO_LIST', 'mac', '⌘ ⌥ 0'],
    ['NO_LIST', 'win', 'Ctrl-Shift-`'],
    ['MOVE_BLOCK_UP', 'mac', '⌥ ↑'],
    ['MOVE_BLOCK_UP', 'win', 'Alt-↑'],
    ['MOVE_BLOCK_TOP', 'mac', '⌥ ↖'],
    ['MOVE_BLOCK_BOTTOM', 'win', 'Alt-↘'],
    ['MOVE_BLOCK_TOP_MAC', 'mac', '⌘ ⌥ ↑'],
    // On Windows this row is deliberately unbound (G1479), so it prints nothing.
    ['MOVE_BLOCK_TOP_MAC', 'win', ''],
    ['DUPLICATE', 'mac', '⌘ D'],
    ['DUPLICATE', 'win', 'Ctrl-D'],
    ['RENAME', 'mac', '⇧ ⏎'],
    ['RENAME', 'win', 'Shift-⏎'],
    ['TOGGLE_LEFT_SIDEBAR', 'mac', '⌘ \\'],
    ['TOGGLE_LEFT_SIDEBAR', 'win', 'Ctrl-\\'],
    ['TOGGLE_FOCUS_MODE', 'mac', '⌘ .'],
    ['TOGGLE_FOCUS_MODE', 'win', 'Ctrl-.'],
    ['TOGGLE_KEY_SHORTCUTS', 'mac', '⌘ ⌥ ,'],
    ['TOGGLE_KEY_SHORTCUTS', 'win', 'Ctrl-Shift-,'],
    ['OPEN_DAILY_NOTE', 'mac', '⌘ ⌥ N'],
    ['OPEN_DAILY_NOTE', 'win', 'Ctrl-Alt-N'],
    ['COMMENT', 'mac', '⌘ ⇧ M'],
    ['COMMENT', 'win', 'Ctrl-Shift-M'],
    // G52：标记取消。表D keyboard.md:116 与官方面板逐字相同；:117 那条斜线通路是 Mac 专用。
    ['SET_CANCELLED', 'mac', '⌘ ⌥ ⇧ T'],
    ['SET_CANCELLED', 'win', 'Ctrl-Alt-Shift-T'],
    ['SET_CANCELLED_SLASH', 'mac', '⌘ ⌥ /'],
    ['SET_CANCELLED_SLASH', 'win', ''],
  ];

  it.each(expected)('%s on %s prints %s', (id, platform, text) => {
    expect(displayFor(by(id), platform)).toBe(text);
  });
});

describe('no two bindings in one group share a chord', () => {
  // This is the gate that would have caught the two Windows rows the ledger prints identically
  // (`MOVE_BLOCK_TOP_MAC` and `SELECT_TO_TOP_MAC` are both `Ctrl-Shift-↑`): a flat table cannot
  // express official context dispatch, so a collision here is a sign the table is lying. A row
  // whose Windows side is `null` is unbound there and takes part in no collision.
  const platforms: Platform[] = ['mac', 'win'];

  it.each(platforms)('on %s', (platform) => {
    const seen = new Map<string, string>();
    for (const binding of KEY_BINDINGS) {
      const text = displayFor(binding, platform);
      // A row unbound on this platform prints nothing and can collide with nothing.
      if (!text) continue;
      const key = `${binding.group}|${text}`;
      const previous = seen.get(key);
      expect(
        previous,
        `${binding.id} collides with ${previous} on ${platform} (${key})`,
      ).toBeUndefined();
      seen.set(key, binding.id);
    }
  });
});

describe('标记取消这一对键（G52＝表D keyboard.md:116–117）', () => {
  const win = { metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, key: '' };

  it('Ctrl-Alt-Shift-T 才是取消；同族的 Ctrl-Alt-T（标记已完成）不许被判成取消', () => {
    // 这两行只差一枚 Shift，正是 `matches` 里"每一枚修饰键都得对上"那条规则的靶子。
    expect(matches({ ...win, ctrlKey: true, altKey: true, shiftKey: true, key: 't', code: 'KeyT' }, by('SET_CANCELLED'), 'win')).toBe(true);
    expect(matches({ ...win, ctrlKey: true, altKey: true, key: 't', code: 'KeyT' }, by('SET_CANCELLED'), 'win')).toBe(false);
    expect(matches({ ...win, ctrlKey: true, altKey: true, shiftKey: true, key: 'T', code: 'KeyT' }, by('SET_CANCELLED'), 'win')).toBe(true);
    // 官方中文列的标签逐字＝「标记取消」，两行同名（面板也各印一次）。
    expect(by('SET_CANCELLED').label).toBe('标记取消');
    expect(by('SET_CANCELLED_SLASH').label).toBe('标记取消');
  });

  it('斜线那一枚在 Windows 是"注册了但永不命中"，不是回落到 Mac 键位', () => {
    // QM 屏蔽 Windows ⇒ `win: null`，与"这行没有 win 字段"是两回事（G1477 的同一条判据）。
    expect(chordFor(by('SET_CANCELLED_SLASH'), 'win')).toBeNull();
    expect(chordFor(by('SET_CANCELLED'), 'win')).not.toBeNull();
    expect(matches({ ...win, metaKey: true, altKey: true, key: '/', code: 'Slash' }, by('SET_CANCELLED_SLASH'), 'mac')).toBe(true);
  });
});

describe('matching a keyboard event', () => {
  const combo = (over: Partial<Parameters<typeof matches>[0]>) => ({
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    key: '',
    ...over,
  });

  it('answers each platform against its own chord', () => {
    expect(matches(combo({ ctrlKey: true, key: 'D', code: 'KeyD' }), by('DUPLICATE'), 'win')).toBe(true);
    expect(matches(combo({ metaKey: true, key: 'd', code: 'KeyD' }), by('DUPLICATE'), 'mac')).toBe(true);
    // The same event must not satisfy the other platform's chord.
    expect(matches(combo({ ctrlKey: true, key: 'D', code: 'KeyD' }), by('DUPLICATE'), 'mac')).toBe(false);
    expect(matches(combo({ metaKey: true, key: 'd', code: 'KeyD' }), by('DUPLICATE'), 'win')).toBe(false);
  });

  it('needs every modifier to line up, not just the ones listed', () => {
    expect(matches(combo({ altKey: true, key: 'ArrowUp', code: 'ArrowUp' }), by('MOVE_BLOCK_UP'), 'win')).toBe(true);
    expect(matches(combo({ altKey: true, shiftKey: true, key: 'ArrowUp', code: 'ArrowUp' }), by('MOVE_BLOCK_UP'), 'win')).toBe(false);
    expect(matches(combo({ key: 'ArrowUp', code: 'ArrowUp' }), by('MOVE_BLOCK_UP'), 'win')).toBe(false);
  });

  it('asks the physical key for the `code` matcher, so a layout cannot change the answer', () => {
    // Dvorak reports `q` for the physical D key; the descriptor is `Vr("KeyD")`.
    expect(matches(combo({ ctrlKey: true, key: 'q', code: 'KeyD' }), by('DUPLICATE'), 'win')).toBe(true);
    expect(matches(combo({ ctrlKey: true, key: 'D', code: 'KeyX' }), by('DUPLICATE'), 'win')).toBe(false);
  });

  it('identifies a digit slot by the physical key, because Shift changes the character', () => {
    // The Windows style slots are Ctrl-Shift-1…0: Shift turns `1` into `!` and `` ` `` into `~`,
    // so a matcher reading `event.key` would never fire on Windows. This is the `Vr("Digit1")`
    // rule from the ledger ("不跟随布局").
    expect(matches(combo({ ctrlKey: true, shiftKey: true, key: '!', code: 'Digit1' }), by('TITLE'), 'win')).toBe(true);
    expect(matches(combo({ ctrlKey: true, shiftKey: true, key: '~', code: 'Backquote' }), by('NO_LIST'), 'win')).toBe(true);
    // Same character, different physical key: must not match.
    expect(matches(combo({ ctrlKey: true, shiftKey: true, key: '!', code: 'Digit2' }), by('TITLE'), 'win')).toBe(false);
    // The printed string still reads the character the ledger prints.
    expect(displayFor(by('TITLE'), 'win')).toBe('Ctrl-Shift-1');
    expect(displayFor(by('NO_LIST'), 'win')).toBe('Ctrl-Shift-`');
  });

  it('asks the character for the letter matcher, so punctuation matches by name', () => {
    expect(matches(combo({ ctrlKey: true, key: '.', code: 'Period' }), by('TOGGLE_FOCUS_MODE'), 'win')).toBe(true);
    expect(matches(combo({ metaKey: true, shiftKey: true, key: 'M', code: 'KeyM' }), by('COMMENT'), 'mac')).toBe(true);
  });
});

describe('identity of every row', () => {
  it('carries an id and the official Chinese label', () => {
    expect(KEY_BINDINGS.length).toBeGreaterThan(0);
    for (const binding of KEY_BINDINGS) {
      expect(binding.id, 'id').toMatch(/^[A-Z0-9_]+$/);
      expect(binding.label.length, `${binding.id} label`).toBeGreaterThan(0);
    }
  });

  it('uses the corrected label for ⇧⏎ — the language pack has no 「重命名」 key (G750)', () => {
    expect(by('RENAME').label).toBe('编辑页面区块');
  });
});
