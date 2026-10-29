/**
 * spec: editor.key.equation
 *
 * 主交互：**`Ctrl-Shift-E`（面板「编辑」段・文字格式里的「输入方程」）**。
 *
 * 为什么这一族要采：这条键从未在屏幕上按过；本地 `craft-keymap.ts` 里**没有**方程/数学相关分支
 * （`grep EQUATION|MATH` 零命中），但仓内有 `math-inline.ts`／`math-block.ts` 扩展
 * ⇒ "有承载扩展、没有键位入口" 是本 spec 要证的形态。
 *
 * 判据：
 *  ① 两侧正文都在（`FORMULA` 在场，进 selfCheck）；
 *  ② 按键后**承载面**：官方若开方程输入层，文本名册／`popup-backdrop` 会露馅；
 *     本地按代码应**零反应**。⇒ 差异由 differ 判。
 */
export default {
  id: 'editor.key.equation',
  wave: 1,
  surface: 'editor.key.equation',
  target: 'both',
  builtFrom: [
    'keyboard.md 面板·样式段（输入方程 CtrlShiftE）',
    'src/components/editor/extensions/（有 math-inline.ts／math-block.ts，但 craft-keymap.ts 无方程分支）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.equation', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.equation', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'FORMULA', settleMs: 800, label: 'type FORMULA' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A (select text)' },
    { op: 'key', chord: 'Control+Shift+e', settleMs: 1600, label: 'Ctrl-Shift-E on selection' },
    { op: 'key', chord: 'Home', settleMs: 600, label: 'Home (collapse selection → caret)' },
    { op: 'key', chord: 'Control+Shift+e', settleMs: 1600, label: 'Ctrl-Shift-E at caret' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (blur probe)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['FORMULA', '方程', 'LaTeX', '输入'],
  stateSelectors: ['editorBody', 'popupBackdrop', 'dialog'],

  expect: [
    { facet: 'blocks', op: 'equals', value: ['FORMULA'], at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（同步中）随同步完成而消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES <SAVING>' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
