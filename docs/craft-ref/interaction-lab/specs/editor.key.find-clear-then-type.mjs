/**
 * spec: editor.key.find-clear-then-type
 *
 * 主交互：**查找框"清空后再输入"的路由**（`WAVE1-REPORT` 里挂着的"清空后再打字的路由"）。
 *
 * 为什么这一族要采：此前查找面只测了"按 `Ctrl-F` 出现查找框"（`editor.key.find-replace`），
 * 从没测过**有结果之后清空、再输入另一个词**——这是查找框最常用的循环，也最容易分叉
 * （有的实现清空即关闭、有的保留但清空结果、有的把上一次的结果缓存住）。
 *
 * 判据（只用两侧共有的量）：
 *  ① `ALPHA` 有 2 处 ⇒ 查找 `ALPHA` 时结果计数应 ≥ 2；
 *  ② 清空后 ⇒ 结果计数归零/消失；
 *  ③ 再输入 `BETA` ⇒ 结果计数变成 1。
 *  ★ 计数用 `countDelta` 与「查找输入框的值」两个共有的量，不判各自面板的文案。
 */
export default {
  id: 'editor.key.find-clear-then-type',
  wave: 1,
  surface: 'editor.key.find',
  target: 'both',
  builtFrom: [
    'specs/editor.key.find-replace.mjs（只测了"面板出现"与两档差异）',
    'WAVE1-REPORT（悬挂项：清空后再打字的路由）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    findInput: { official: 'input[placeholder="在页面上查找文本"]', local: 'input[aria-label="查找"]' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.find-clear-then-type', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.find-clear-then-type', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA BETA ALPHA', settleMs: 900, label: 'type ALPHA BETA ALPHA' },
    { op: 'key', chord: 'Control+f', settleMs: 1400, label: 'Ctrl-F (open find)' },
    { op: 'typeKeys', text: 'ALPHA', settleMs: 1500, label: 'type ALPHA (2 hits expected)' },
    { op: 'key', chord: 'Control+a', settleMs: 600, label: 'Ctrl-A (select query in input)' },
    { op: 'key', chord: 'Backspace', settleMs: 1200, label: 'Backspace (clear query)' },
    { op: 'typeKeys', text: 'BETA', settleMs: 1500, label: 'type BETA (1 hit expected)' },
  ],

  observe: ['dom', 'text', 'state', 'attrs'],
  observeTexts: ['ALPHA', 'BETA', '结果', '个结果'],
  attrProbes: [{ key: 'findInput', selector: 'findInput', attrs: ['placeholder', 'value', 'aria-label'] }],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop', 'findInput'],

  expect: [
    { facet: 'state:findInput', op: 'gt', value: 0, at: 1 },
    { facet: 'text:ALPHA', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
