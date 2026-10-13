/**
 * The central keymap layer (`keyboard.md` §「本地实现 gap」: the repo has no keymap at all — three
 * hard-coded bindings, everything else Tiptap defaults).
 *
 * Two rules come straight from the collected spec and are the reason a single `Mod-...` string
 * cannot express these bindings:
 *
 * - **Platform switch**: `bae(d) = isMac ? d : (d.winMatcher ?? d)` — Windows falls back to the
 *   Mac descriptor only when the row has no Windows matcher of its own.
 * - **Display string**: modifiers concatenate in the order meta → ctrl → alt → shift → key, Mac
 *   joins them with spaces (`⌘ ⇧ K`) and Windows with dashes (`Ctrl-Shift-K`).
 */

export type Platform = 'mac' | 'win';

export interface Chord {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  /** `event.key` — letters, digits and punctuation (the `Oo` / `q7` matchers). */
  key?: string;
  /** `event.code` — the physical key, for the `Vr` matchers that ignore the layout. */
  code?: string;
}

export interface KeyBinding {
  /** Official command id, used as the identity in tests and in the panel. */
  id: string;
  /** 官方中文, from the collected tables. */
  label: string;
  group: ShortcutGroup;
  mac: Chord;
  /**
   * The Windows side. Three states, not two (G1477): absent falls back to the Mac chord, a chord
   * binds Windows to that chord, and `null` is the official `QM` "matcher is always false" — the
   * key is deliberately unbound on Windows, which is not the same as falling back.
   */
  win?: Chord | null;
}

/** The six contexts the official panel groups by (`keyboard.md` §官方快捷键面板的分组). */
export type ShortcutGroup =
  | 'general'
  | 'editing'
  | 'tables'
  | 'taskViews'
  | 'collections'
  | 'findReplace';

export const GROUP_LABELS: Record<ShortcutGroup, string> = {
  general: '通用',
  editing: '编辑',
  tables: '在表格中',
  taskViews: '在任务视图中',
  collections: '在合集中',
  findReplace: '在查找和替换中',
};

export function chordFor(binding: KeyBinding, platform: Platform): Chord | null {
  if (platform === 'mac') return binding.mac;
  // `null` is the explicit "unbound here" state; only an absent value falls back to Mac.
  if (binding.win === null) return null;
  return binding.win ?? binding.mac;
}

/**
 * Which side of `bae(d)` the runtime should read. Node and headless Chromium on Windows both
 * fall through to `win`, which is the side the tests exercise.
 */
export function detectPlatform(): Platform {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (!nav) return 'win';
  const hint = [
    nav.userAgent ?? '',
    String((nav as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? ''),
    String(nav.platform ?? ''),
  ].join(' ');
  return /Mac|iPhone|iPad|iPod/.test(hint) ? 'mac' : 'win';
}

/** Names the collected display strings use; anything unmapped falls back to `event.key`. */
const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Home: '↖',
  End: '↘',
  Enter: '⏎',
  Escape: 'esc',
  Tab: '⇥',
  Backspace: '⌫',
  Delete: '⌦',
  ' ': 'space',
  Space: 'space',
};

const MAC_LABELS = ['⌘', '⌃', '⌥', '⇧'];
const WIN_LABELS = ['Ctrl', 'Ctrl', 'Alt', 'Shift'];

function keyName(chord: Chord): string {
  // Display always reads the *character*; `code` exists only to answer the matcher, and printing
  // it would spell `KeyD` where the collected string says `D`.
  const value = chord.key;
  if (value === undefined) return '';
  // The collected strings print letters in capitals on both platforms (`⌘ D`, `Ctrl-Shift-M`)
  // while punctuation keeps its own shape (`⌘ ⌥ ,`), so only a lone letter is uppercased.
  if (value.length === 1 && /[a-z]/i.test(value)) return value.toUpperCase();
  return KEY_NAMES[value] ?? value;
}

export function displayFor(binding: KeyBinding, platform: Platform): string {
  const chord = chordFor(binding, platform);
  // A key that is deliberately unbound on this platform has nothing to print.
  if (!chord) return '';
  const flags = [chord.metaKey, chord.ctrlKey, chord.altKey, chord.shiftKey];
  const labels = platform === 'mac' ? MAC_LABELS : WIN_LABELS;
  const parts: string[] = [];
  flags.forEach((held, index) => {
    if (held) parts.push(labels[index]);
  });
  const key = keyName(chord);
  if (key) parts.push(key);
  return parts.join(platform === 'mac' ? ' ' : '-');
}

export interface KeyCombo {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
  code?: string;
}

export function matches(combo: KeyCombo, binding: KeyBinding, platform: Platform): boolean {
  const chord = chordFor(binding, platform);
  // Unbound on this platform: no combination can match it.
  if (!chord) return false;
  if (chord.metaKey !== combo.metaKey) return false;
  if (chord.ctrlKey !== combo.ctrlKey) return false;
  if (chord.altKey !== combo.altKey) return false;
  if (chord.shiftKey !== combo.shiftKey) return false;
  // A `code` matcher asks about the physical key; otherwise the character decides, and a
  // layout-shifted letter must not be accepted on the strength of its old label.
  if (chord.code) return chord.code === combo.code;
  if (chord.key === undefined) return false;
  return chord.key.toLowerCase() === combo.key.toLowerCase();
}

function chord(
  mods: Partial<Pick<Chord, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>>,
  key: string,
  code?: string,
): Chord {
  return {
    metaKey: mods.metaKey ?? false,
    ctrlKey: mods.ctrlKey ?? false,
    altKey: mods.altKey ?? false,
    shiftKey: mods.shiftKey ?? false,
    key,
    ...(code ? { code } : {}),
  };
}

/**
 * G14 的点名项：块移动、样式槽、⇧⏎ 重命名、⌘D 副本，以及表 C 四枚外壳键。Rows whose Windows
 * matcher is dead on the dispatch side (`MOVE_BLOCK_TOP_MAC` / `MOVE_BLOCK_BOTTOM_MAC`, G1479)
 * carry an explicit `win: null` so they print nothing and match nothing there.
 */
export const KEY_BINDINGS: KeyBinding[] = [
  // 表 A · 样式槽 1–9/0（连续一档；Windows 因 Shift 取代 Alt 整体位移，NO_LIST 落到反引号）
  // Digits and the backtick are `Vr(...)` matchers — `event.code`, "不跟随布局": on Windows the
  // Shift makes the *character* `1` arrive as `!` and `` ` `` as `~`, so only the physical key
  // identifies the slot. `key` stays the character because that is what gets printed.
  { id: 'TITLE', label: '标题', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '1', 'Digit1'), win: chord({ ctrlKey: true, shiftKey: true }, '1', 'Digit1') },
  { id: 'SUBTITLE', label: '副标题', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '2', 'Digit2'), win: chord({ ctrlKey: true, shiftKey: true }, '2', 'Digit2') },
  { id: 'HEADING', label: '标题', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '3', 'Digit3'), win: chord({ ctrlKey: true, shiftKey: true }, '3', 'Digit3') },
  { id: 'STRONG', label: '强调', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '4', 'Digit4'), win: chord({ ctrlKey: true, shiftKey: true }, '4', 'Digit4') },
  { id: 'BODY', label: '正文', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '5', 'Digit5'), win: chord({ ctrlKey: true, shiftKey: true }, '5', 'Digit5') },
  { id: 'TODO_LIST', label: '待办', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '6', 'Digit6'), win: chord({ ctrlKey: true, shiftKey: true }, '6', 'Digit6') },
  { id: 'TOGGLE_LIST', label: '列表', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '7', 'Digit7'), win: chord({ ctrlKey: true, shiftKey: true }, '7', 'Digit7') },
  { id: 'BULLET_LIST', label: '项目符号', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '8', 'Digit8'), win: chord({ ctrlKey: true, shiftKey: true }, '8', 'Digit8') },
  { id: 'NUMBERED_LIST', label: '编号', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '9', 'Digit9'), win: chord({ ctrlKey: true, shiftKey: true }, '9', 'Digit9') },
  { id: 'NO_LIST', label: '无列表', group: 'editing', mac: chord({ metaKey: true, altKey: true }, '0', 'Digit0'), win: chord({ ctrlKey: true, shiftKey: true }, '`', 'Backquote') },

  // 表 B · 块移动与块操作
  { id: 'MOVE_BLOCK_UP', label: '区块上移', group: 'editing', mac: chord({ altKey: true }, 'ArrowUp', 'ArrowUp') },
  { id: 'MOVE_BLOCK_DOWN', label: '区块下移', group: 'editing', mac: chord({ altKey: true }, 'ArrowDown', 'ArrowDown') },
  { id: 'MOVE_BLOCK_TOP', label: '区块移至顶部', group: 'editing', mac: chord({ altKey: true }, 'Home', 'Home') },
  { id: 'MOVE_BLOCK_BOTTOM', label: '区块移至底部', group: 'editing', mac: chord({ altKey: true }, 'End', 'End') },
  // G1479: on Windows these two print a chord but never dispatch — the official reference to
  // `Ctrl-Shift-↑/↓` lives only in the panel assembler, and the `⌘⌥↑/↓` pair is Mac-only. So the
  // Windows side is an explicit "unbound" rather than a fallback.
  { id: 'MOVE_BLOCK_TOP_MAC', label: '区块移至顶部', group: 'editing', mac: chord({ metaKey: true, altKey: true }, 'ArrowUp', 'ArrowUp'), win: null },
  { id: 'MOVE_BLOCK_BOTTOM_MAC', label: '区块移至底部', group: 'editing', mac: chord({ metaKey: true, altKey: true }, 'ArrowDown', 'ArrowDown'), win: null },
  { id: 'DUPLICATE', label: '创建副本', group: 'editing', mac: chord({ metaKey: true }, 'd', 'KeyD'), win: chord({ ctrlKey: true }, 'd', 'KeyD') },
  { id: 'RENAME', label: '编辑页面区块', group: 'editing', mac: chord({ shiftKey: true }, 'Enter') },

  // 表 C · 外壳 / 全局
  { id: 'TOGGLE_LEFT_SIDEBAR', label: '切换侧栏', group: 'general', mac: chord({ metaKey: true }, '\\', 'Backslash'), win: chord({ ctrlKey: true }, '\\', 'Backslash') },
  { id: 'TOGGLE_FOCUS_MODE', label: '专注模式', group: 'general', mac: chord({ metaKey: true }, '.', 'Period'), win: chord({ ctrlKey: true }, '.', 'Period') },
  { id: 'TOGGLE_KEY_SHORTCUTS', label: '显示快捷键', group: 'general', mac: chord({ metaKey: true, altKey: true }, ',', 'Comma'), win: chord({ ctrlKey: true, shiftKey: true }, ',', 'Comma') },
  { id: 'OPEN_DAILY_NOTE', label: '打开每日笔记', group: 'general', mac: chord({ metaKey: true, altKey: true }, 'n', 'KeyN'), win: chord({ ctrlKey: true, altKey: true }, 'n', 'KeyN') },
  { id: 'COMMENT', label: '添加评论', group: 'general', mac: chord({ metaKey: true, shiftKey: true }, 'm', 'KeyM'), win: chord({ ctrlKey: true, shiftKey: true }, 'm', 'KeyM') },

  // 表 B 的查找四键。它们分在 `findReplace` 组：`⌘G` 与编辑组的 `⌘G`（组合）同键不同上下文，
  // 正是「同组内不可撞」这道闸刻意按组分家的原因。Find 与 Replace 面板已实现，所以这四行是
  // 真绑着的，不是为了让分组好看才收进来的。
  { id: 'FIND_IN_PAGE', label: '页内查找', group: 'findReplace', mac: chord({ metaKey: true }, 'f', 'KeyF'), win: chord({ ctrlKey: true }, 'f', 'KeyF') },
  { id: 'FIND_NEXT', label: '查找下一个', group: 'findReplace', mac: chord({ metaKey: true }, 'g', 'KeyG'), win: chord({ ctrlKey: true }, 'g', 'KeyG') },
  { id: 'REPLACE_IN_PAGE', label: '查找与替换', group: 'findReplace', mac: chord({ metaKey: true, shiftKey: true }, 'f', 'KeyF'), win: chord({ ctrlKey: true, shiftKey: true }, 'f', 'KeyF') },
  { id: 'FIND_PREVIOUS', label: '查找上一个', group: 'findReplace', mac: chord({ metaKey: true, shiftKey: true }, 'g', 'KeyG'), win: chord({ ctrlKey: true, shiftKey: true }, 'g', 'KeyG') },
];
