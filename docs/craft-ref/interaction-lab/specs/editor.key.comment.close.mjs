/**
 * spec: editor.key.comment.close
 *
 * 主交互：**评论浮层怎么关**（`G1578` 留的边界：第 321 批实测「`Escape` 一次没关掉」）。
 *
 * 序列：选中文本 → `Ctrl-Shift-M` 开浮层 → `Escape` ×2 → 再试「点正文空白」。
 *
 * 判据：`state:popupBackdrop`（官方）在每一步的值。
 *  ★ 官方浮层是 `popup-backdrop`；本地侧本来就不开浮层（`G1578`），所以本地全程 0。
 */
export default {
  id: 'editor.key.comment.close',
  wave: 1,
  surface: 'editor.key.comment',
  target: 'both',
  builtFrom: [
    'gap.md G1578（边界：Escape 一次没关掉评论浮层，关闭键未定）',
    'keyboard.md:103（COMMENT = Ctrl-Shift-M）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.comment.close', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.comment.close', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'CMT', settleMs: 800, label: 'type CMT' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A (select)' },
    { op: 'key', chord: 'Control+Shift+m', settleMs: 1600, label: 'Ctrl-Shift-M (open comment)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape #1' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape #2' },
    { op: 'click', selector: 'editorBody', settleMs: 1200, label: 'click editor body (outside)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['CMT', '评论'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:CMT', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载', ref: 'gap.md G1583' },
    { prefix: 'selection:', reason: 'Ctrl-A 选区落点两侧不同，已由 select-all 梯子承载', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
