/**
 * spec: editor.key.enter-mid-block
 *
 * 主交互：在块中间按 Enter ⇒ 光标处断成两块，前块留前文、后块留后文，光标落**后块**行首。
 * 官方依据：`keyboard.md` 表 A `Enter`（块内换行=新建块）；
 * `interactions.md` §一 R1（Enter 的块级语义）与 §四（块名册口径）。
 *
 * 判据：
 *  - `blocks`（正文块文本数组）两侧逐字相同 ⇒ 断块结果一致；
 *  - `selection:anchorOffset` 末步两侧都是 0 ⇒ 光标落在后块行首；
 *  - 具名文本计数 delta 两侧一致（AAAA / BBBB 各 +1）。
 *
 * 采到的逐字证据（2026-10-23，smoke-01）：
 *  官方 blocks 末步 `["AAAA","BBBB"]`，本地同；两侧 `{AAAA:1, BBBB:1}`。
 */
export default {
  id: 'editor.key.enter-mid-block',
  wave: 0,
  surface: 'editor.block-split',
  target: 'both',
  builtFrom: ['keyboard.md 表 A Enter', 'interactions.md R1', 'interactions.md §四 块名册口径'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.enter-mid-block', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.enter-mid-block', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'AAAABBBB', settleMs: 800, label: 'type AAAABBBB' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 300, label: 'ArrowLeft x1' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 300, label: 'ArrowLeft x2' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 300, label: 'ArrowLeft x3' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 300, label: 'ArrowLeft x4' },
    { op: 'key', chord: 'Enter', settleMs: 900, label: 'Enter' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAAA', 'BBBB'],
  stateSelectors: ['editorBody'],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  expect: [
    { facet: 'blocks', op: 'equals', value: ['AAAA', 'BBBB'] },
    { facet: 'blocksCount', op: 'count', value: 2 },
    { facet: 'text:AAAA', op: 'count', value: 1 },
    { facet: 'text:BBBB', op: 'count', value: 1 },
    { facet: 'selection:collapsed', op: 'equals', value: true },
    { facet: 'selection:anchorOffset', op: 'equals', value: 0 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
