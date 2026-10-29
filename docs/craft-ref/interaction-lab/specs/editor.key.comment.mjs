/**
 * spec: editor.key.comment
 *
 * 主交互：**选中文本后按 `Ctrl-Shift-M`（`COMMENT`＝面板「添加或查看评论」）**。
 *
 * 为什么这一族要采：本地 `src/components/editor/shell-shortcuts.tsx:17-19` 的注释写着
 * `COMMENT ⌘⇧M` **故意不绑**——「waits on an entry point that was never collected，
 * listing it without an action would bind a key that does nothing」。也就是说本地缺的不是键，
 * 是**官方这个入口长什么样**。本 spec 就是去把那个入口采下来。
 *
 * 判据：
 *  ① 两侧正文都渲染出来了（`QCOMMENTMARK` 在场，进 selfCheck）；
 *  ② `Ctrl-Shift-M` 之后**弹出的承载面**：官方若弹评论框，其文案会出现在文本名册里；
 *     本地按设计**零反应**（`HANDLED` 集合里没有 `COMMENT`）。
 *     ⇒ 差异本身由 differ 判，不写进 selfCheck。
 *
 * 本 spec 也是**发现型**的：评论框的确切 DOM 选择器此前从未采过，先用文本名册定位，
 * 再把选择器补进 `stateSelectors`（见 README 坑 15）。
 */
export default {
  id: 'editor.key.comment',
  wave: 1,
  surface: 'editor.key.comment',
  target: 'both',
  builtFrom: [
    'keyboard.md 面板·编辑段（`添加或查看评论 CtrlShiftM`）',
    'src/lib/editor/keymap.ts:213（本地把 COMMENT 登记进键位表）',
    'src/components/editor/shell-shortcuts.tsx:17-19（本地故意不绑，等官方入口形态）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.comment', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.comment', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'QCOMMENTMARK alpha', settleMs: 900, label: 'type QCOMMENTMARK alpha' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A (select block text)' },
    { op: 'key', chord: 'Control+Shift+m', settleMs: 1600, label: 'Ctrl-Shift-M (COMMENT)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['QCOMMENTMARK', '评论', '添加评论'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    // 两侧共有的量：正文渲染出来了
    { facet: 'blocksCount', op: 'count', value: 1, at: 0 },
    { facet: 'text:QCOMMENTMARK', op: 'gt', value: 0, at: 1 },
  ],

  /** 两条已知外壳噪声（与本 spec 判据无关）。 */
  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（同步中）随同步完成而消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES <SAVING>' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { prefix: 'selection:', reason: '本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
