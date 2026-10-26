/**
 * spec: editor.a11y.task-item-checkbox
 *
 * 主交互：**编辑器里任务项的勾选框，两侧在无障碍树上怎么暴露**。
 *
 * 为什么这一族要采：`observe: ['a11y', …]` 从 Wave 0 就挂在「未实现」名单上，
 * 而它承载的是**整个产品的一个维度**——读屏用户能不能用。此前一条都没量过。
 * 唯一相关的是 `editor.md-rules.block-kind` 里一条**已声明偏差**：
 * 本地任务块的 checkbox 可及名是 TipTap 的默认串 `Task item checkbox for <text>`
 * （`node_modules/@tiptap/extension-list/src/task-item/task-item.ts:83-85`），
 * 官方任务块没有这个串 —— 但当时只登记了「串在多不在少」，**没说官方到底是什么名**。
 *
 * 判据（本 spec 要回答的三个问题）：
 *  ① 编辑器子树里**有没有** checkbox 角色（两侧都该有）；
 *  ② 它的**可及名**是什么（本批首次量到两侧各自的真名）；
 *  ③ `checked` 状态在不勾选时两侧都是 false。
 *
 * ★ 采集口径：`captureA11y` 走 CDP `Accessibility.getFullAXTree`，按**编辑器子树**收口
 *   （先走 DOM 收 `backendNodeId`，再按 `backendDOMNodeId` 过滤）。不收口的话本地侧栏把
 *   每篇历史文档都画成按钮，比的只是"谁的文档多"（实测全页 button：官方 24 / 本地 375）。
 * ★ 只留可操作角色，丢 generic/StaticText 这类结构节点 —— 两侧渲染框架不同（Slate 扁平 /
 *   TipTap 树），结构节点数天然不等。
 */
export default {
  id: 'editor.a11y.task-item-checkbox',
  wave: 1,
  surface: 'editor.a11y',
  target: 'both',
  builtFrom: [
    'interaction-lab/README.md（`observe: a11y` 自 Wave 0 未实现，本批首次落地）',
    'gap.md（editor.md-rules.block-kind 的已声明偏差：本地 checkbox 可及名是 TipTap 默认串）',
    'node_modules/@tiptap/extension-list/src/task-item/task-item.ts:83-85（getCheckboxLabel 默认串）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.a11y.task-item-checkbox', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.a11y.task-item-checkbox', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: '[ ] ', settleMs: 1000, label: 'md "[ ] " (task item)' },
    { op: 'typeKeys', text: 'Buy milk', settleMs: 1000, label: 'type task text' },
  ],

  observe: ['dom', 'text', 'blocks', 'kinds', 'a11y'],
  observeTexts: ['Buy milk'],
  stateSelectors: ['editorBody'],

  expect: [
    // selfCheck 只放**两侧共有**的量（README 纪律）：任务文本进块名册。
    // ★「勾选框在不在 AX 树里」两侧本就不同（官方没有、本地有）⇒ 那是 differ 的产出，
    //   不能写成 selfCheck 断言，否则官方侧必然 FAIL、把真差异伪装成仪器故障。
    { facet: 'blocks', op: 'equals', value: ['Buy milk'] },
    { facet: 'blocksCount', op: 'count', value: 1 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
