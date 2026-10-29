/**
 * spec: editor.key.group-and-blocklink
 *
 * 主交互：**整理段的组合键 `Ctrl-G`（组合）／`Ctrl-Shift-G`（取消组合）**，
 * 外加**编辑段的 `Ctrl-Shift-K`（区块链接）**。
 *
 * 为什么这一族要采：面板「整理」分类印着 `组合 CtrlG`／`取消组合 CtrlShiftG`（`keyboard.md:400` 一带），
 * 「编辑」分类印着 `区块链接 CtrlShiftK`；这三条**都没有在屏幕上按过**，而本地代码里
 * **根本没有 group 扩展**（`src/components/editor/extensions/` 无 group 文件、`craft-keymap.ts`
 * 无 GROUP 分支）⇒ 预测是"本地零反应"，但预测不是证据。
 *
 * 判据（逐键单变量，全部看**块名册／种类名册是否变化**＋**有没有承载面出现**）：
 *  ① `Ctrl-G`：选中两块后按 —— 官方若成组，块名册/结构应有变化；本地按代码应恒不变；
 *  ② `Ctrl-Shift-G`：再按一次 —— 解组；
 *  ③ `Ctrl-Shift-K`：有文本选区时按 —— 区块链接选择器是否出现（文本名册会露馅）。
 * ⇒ 差异本身由 differ 判，不写进 selfCheck。
 */
export default {
  id: 'editor.key.group-and-blocklink',
  wave: 1,
  surface: 'editor.key.group-blocklink',
  target: 'both',
  builtFrom: [
    'keyboard.md 面板·整理段（组合 CtrlG／取消组合 CtrlShiftG）',
    'keyboard.md 面板·编辑段（区块链接 CtrlShiftK）',
    'src/components/editor/extensions/（无 group 扩展）；craft-keymap.ts 无 GROUP 分支',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.group-and-blocklink', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.group-and-blocklink', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A (select both blocks)' },
    { op: 'key', chord: 'Control+g', settleMs: 1200, label: 'Ctrl-G (GROUP)' },
    { op: 'key', chord: 'Control+Shift+g', settleMs: 1200, label: 'Ctrl-Shift-G (UNGROUP)' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A again' },
    { op: 'key', chord: 'Control+Shift+k', settleMs: 1500, label: 'Ctrl-Shift-K (BLOCK_LINK)' },
    { op: 'key', chord: 'Escape', settleMs: 800, label: 'Escape (close)' },

    { op: 'key', chord: 'Home', settleMs: 500, label: 'Home (caret to block start)' },
    { op: 'key', chord: 'Control+Shift+ArrowRight', settleMs: 600, label: 'select word ALPHA' },
    { op: 'key', chord: 'Control+Shift+k', settleMs: 1500, label: 'Ctrl-Shift-K on word (BLOCK_LINK single)' },
    { op: 'key', chord: 'Escape', settleMs: 800, label: 'Escape (close 2)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['ALPHA', 'BETA', '区块', '链接到'],
  stateSelectors: ['editorBody', 'popupBackdrop', 'dialog'],

  expect: [
    // 两侧共有的量：两块都在、块数 2
    { facet: 'blocks', op: 'equals', value: ['ALPHA', 'BETA'], at: 3 },
    { facet: 'blocksCount', op: 'count', value: 2, at: 3 },
  ],

  /** 已知外壳噪声（与本 spec 判据无关）。 */
  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（同步中）随同步完成而消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES <SAVING>' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { prefix: 'selection:', reason: 'Ctrl-A 的选区落点两侧不同，已由 select-all 梯子单独采集与登记', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
