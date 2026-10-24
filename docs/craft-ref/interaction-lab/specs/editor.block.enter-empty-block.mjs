/**
 * spec: editor.block.enter-empty-block
 *
 * 主交互：Enter 打在**空块**上的语义（不是块中间断块，那已由
 * `editor.key.enter-mid-block` 覆盖）。
 * 官方依据：`keyboard.md` 表 B `EDIT_BLOCK = ⏎`；`interactions.md` R1。
 *
 * 判据（两侧共同行为）：
 *  - 空块上 Enter ⇒ **块数 +1**（不是无反应）；
 *  - 新块是**空块**（正文块名册末项文本为空）。
 *
 * 采集到的逐字证据（2026-10-23 probe-keys）：
 *  官方：`Xy` 块上 Enter ⇒ 两块 `["Xy",""]`，光标落在新空块（activeElement 仍在 editor）。
 */
export default {
  id: 'editor.block.enter-empty-block',
  wave: 1,
  surface: 'editor.block-split',
  target: 'both',
  builtFrom: ['keyboard.md 表 B EDIT_BLOCK', 'interactions.md R1'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.enter-empty-block', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.enter-empty-block', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'XY', settleMs: 700, label: 'type XY' },
    { op: 'key', chord: 'End', settleMs: 300, label: 'End (光标到块尾)' },
    { op: 'key', chord: 'Enter', settleMs: 900, label: 'Enter on non-empty block tail' },
    { op: 'key', chord: 'Enter', settleMs: 900, label: 'Enter on empty block' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['XY'],
  stateSelectors: ['editorBody'],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  // ★ `at` 是 **record 里的 step 下标**，baseline 占 0 ⇒ 第 1 个动作是 1。
  //   本 spec 的 steps 有 4 条（type XY / End / Enter / Enter）⇒ 下标 1..4。
  expect: [
    { facet: 'blocksCount', op: 'count', at: 1, value: 1 },
    { facet: 'blocksCount', op: 'count', at: 3, value: 2 },
    { facet: 'blocksCount', op: 'count', at: 4, value: 3 },
    { facet: 'blocks', op: 'equals', at: 4, value: ['XY', '', ''] },
    { facet: 'text:XY', op: 'count', at: 4, value: 1 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
