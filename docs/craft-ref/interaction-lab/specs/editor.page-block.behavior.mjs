/**
 * spec: editor.page-block.behavior
 *
 * 主交互：**页面块（`Ctrl-Shift-P` 造出来的那种块）在官方侧的三个基本动作**——
 * 往里打字、`Enter` 开子块、`Shift-Enter`（表 B 的 `RENAME`）。
 *
 * 为什么这一族要采：第 326 批证明了 `Ctrl-Shift-P` 能**真的插出页面块**（`G1584`），
 * 但"页面块放进去之后能干什么"从没采过；存量清单 D 行（`RENAME`）就卡在这里。
 * 本地**没有 page 块类型**（`G1408` 一族）⇒ 本 spec 的后半段步骤只对官方跑（`steps.targets`）。
 *
 * 判据（官方单侧为主）：
 *  ① 造完页面块后**块名册里有页面块**（名册里出现嵌套/新条目）；
 *  ② `Enter` 之后子块能不能出现（名册条目数变化）；
 *  ③ `Shift-Enter` 之后焦点去哪（`focus.tag`）——若是改成某个输入框，说明 `RENAME` 走的是"重命名输入态"。
 * ⇒ 两侧共有的量只有"正文都在"，差异交给 differ。
 */
export default {
  id: 'editor.page-block.behavior',
  wave: 1,
  surface: 'editor.page-block',
  target: 'both',
  builtFrom: [
    'keyboard.md:31（PAGE = Ctrl-Shift-P）／:296（RENAME = Shift-⏎）',
    'gap.md G1584（第 326 批：官方 `Ctrl-Shift-P` 真的插出页面块）',
    'gap.md G1408（本地无 page 块类型）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.page-block.behavior', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.page-block.behavior', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'PGBLK', settleMs: 700, label: 'type PGBLK' },
    { op: 'key', chord: 'Control+Shift+p', settleMs: 1600, label: 'Ctrl-Shift-P (PAGE)', targets: ['official'] },
    { op: 'type', text: 'INNER', settleMs: 900, label: 'type INNER (into page block)', targets: ['official'] },
    { op: 'key', chord: 'Enter', settleMs: 900, label: 'Enter (child block?)', targets: ['official'] },
    { op: 'type', text: 'CHILD', settleMs: 900, label: 'type CHILD', targets: ['official'] },
    { op: 'key', chord: 'Shift+Enter', settleMs: 1200, label: 'Shift-Enter (RENAME?)', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['PGBLK', 'INNER', 'CHILD', '页面'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:PGBLK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
