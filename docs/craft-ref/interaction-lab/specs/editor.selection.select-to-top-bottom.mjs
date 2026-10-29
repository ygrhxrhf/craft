/**
 * spec: editor.selection.select-to-top-bottom
 *
 * 主交互：三块 `AAA`/`BBB`/`CCC`，光标在中间块 `BBB` 行尾，依次按四个「选至顶/底」族组合键
 * （Windows 拼法；官方平台是 Win32）。
 *
 * ★ 本 spec 的来由：`keyboard.md:72-75` 把这一族记成两条变体 ——
 *   `SELECT_TO_TOP_COMMON = Ctrl-Shift-↖`（COMMON）与 `SELECT_TO_TOP_MAC = Ctrl-Shift-↑`（MAC），
 *   而 `keyboard.md:486` 记装配器是 `Ll ? [COMMON, MAC] : [COMMON]`（`Ll` = 是 Mac）
 *   ⇒ **预测：Windows 上只注册 COMMON（Home/End 那对），`Ctrl-Shift-↑↓` 不该生效**。
 *   本 spec 把这个静态预测搬到屏幕上验，并顺带采 `keyboard.md:225` 提到的 `Alt-Shift-↑↓`。
 *
 * 实测（2026-10-24，`runs/wave1-13-*`，两侧 0 error）：
 *  ① `Ctrl+Shift+Home`：官方**进入块选区态**（`bodyCls` 含 `block-select`、`selection.present=false`、焦点交 `body`）；
 *     本地做**文本选区**（`abIdx 1 → foIdx 0`、选中文本 `AAA\n\nBBB`、焦点仍在编辑器）⇒ 产品级差异。
 *  ② `Ctrl+Shift+End`：官方同样进块选区态；本地文本选区（`foIdx 2`、`\nCCC`）。
 *  ③ `Ctrl+Shift+↑`：官方键被消费（`stopPropagation`，capture 收到、bubble 收不到）但**选区零变化**
 *     ⇒ 与 ① 的预测吻合（MAC 变体在 Windows 不生效）；本地**生效**（做文本选区）。
 *  ④ `Alt+Shift+↓`：官方**进块选区态**；`Alt+Shift+↑` 官方**零变化**（不对称）。
 *
 * 判据（只用**两侧共有**的量，差异交给 differ）：
 *  - `blocksCount` 与块文本名册：全程三块、文本不变（选至顶/底只动选区、不动内容）。
 *
 * ★ 本 spec **不放** `selection:*` 与 `focusInEditor` 进 `expect`：它们在两侧落到**两个不同状态**
 *   （官方块选区 / 本地文本选区）⇒ 属产品级差异，按 V168 的教训交给 differ 判，不在 selfCheck 里假红。
 */
export default {
  id: 'editor.selection.select-to-top-bottom',
  wave: 1,
  surface: 'editor.selection.select-to-top-bottom',
  target: 'both',
  builtFrom: [
    'keyboard.md:72-75（SELECT_TO_TOP/BOTTOM 的 COMMON 与 MAC 两条变体）',
    'keyboard.md:486（装配器 Ll ? [COMMON, MAC] : [COMMON]）',
    'keyboard.md:225（编辑器扩展选择侧：⌘⇧↑/↓、⌥⇧↑/↓）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.selection.select-to-top-bottom', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.selection.select-to-top-bottom', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  // 用键盘（ArrowUp + End）把光标放到中间块行尾 —— 比鼠标点块更稳（实测点块会落到别处）。
  steps: [
    { op: 'type', text: 'AAA', settleMs: 500, label: 'type AAA' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'Enter' },
    { op: 'type', text: 'BBB', settleMs: 500, label: 'type BBB' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'Enter' },
    { op: 'type', text: 'CCC', settleMs: 500, label: 'type CCC' },
    { op: 'key', chord: 'ArrowUp', settleMs: 350, label: 'ArrowUp (to BBB)' },
    { op: 'key', chord: 'End', settleMs: 350, label: 'End (end of BBB)' },
    { op: 'key', chord: 'Control+Shift+ArrowUp', settleMs: 900, label: 'Ctrl+Shift+↑ (SELECT_TO_TOP_MAC)' },
    { op: 'key', chord: 'Control+Shift+ArrowDown', settleMs: 900, label: 'Ctrl+Shift+↓ (SELECT_TO_BOTTOM_MAC)' },
    { op: 'key', chord: 'Control+Shift+Home', settleMs: 900, label: 'Ctrl+Shift+Home (COMMON 选至顶)' },
    { op: 'key', chord: 'Control+Shift+End', settleMs: 900, label: 'Ctrl+Shift+End (COMMON 选至底)' },
    { op: 'key', chord: 'Alt+Shift+ArrowDown', settleMs: 900, label: 'Alt+Shift+Down' },
    { op: 'key', chord: 'Alt+Shift+ArrowUp', settleMs: 900, label: 'Alt+Shift+Up' },
    { op: 'key', chord: 'Control+Shift+ArrowUp', settleMs: 900, label: 'Ctrl+Shift+↑ (SELECT_TO_TOP_MAC / Win 面板串)' },
    { op: 'key', chord: 'Control+Shift+ArrowDown', settleMs: 900, label: 'Ctrl+Shift+↓ (SELECT_TO_BOTTOM_MAC / Win 面板串)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAA', 'BBB', 'CCC'],
  stateSelectors: ['editorBody'],

  expect: [
    // 两侧共有：全程三块、文本一字未变（选至顶/底只动选区）
    { facet: 'blocksCount', op: 'count', value: 3 },
    { facet: 'text:AAA', op: 'count', value: 1 },
    { facet: 'text:BBB', op: 'count', value: 1 },
    { facet: 'text:CCC', op: 'count', value: 1 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};