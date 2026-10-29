/**
 * spec: editor.slash.text-format-group
 *
 * 主交互：补采 `G1617` 里**两轮都失效**的那一格——`/文字格式` 展开后到底有没有子项。
 *
 * 为什么单独再写一个 spec：`G1617` 的 v1 序列（Backspace 删空）把光标弄掉了、v2（Escape+点块）
 * 让 `/` 再也开不了菜单，两次都拿不到可信读数。本批 `resetSlash`（第 396 批新增，含焦点断言）
 * 已经证明能让 `/` 稳定重开（`editor.slash.rest-groups` 五轮全中），所以用同一把工具再试一次。
 *
 * 判据：
 *  ① `resetSlash` 的焦点断言通过（否则直接红，不出读数）；
 *  ② 打 `/` 后回满 20 项（证菜单是好的）；
 *  ③ 过滤「文字格式」后回几项——**0 项＝纯分组头**（与 `G1618` 五词同类），≥1 项＝有子项。
 */
export default {
  id: 'editor.slash.text-format-group',
  wave: 1,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1617（文字格式那步两轮均无效，留空待重采）',
    'gap.md G1618（resetSlash 已证明能让 / 稳定重开）',
    'gap.md G1613（文字格式过滤后 0 项，来自另一轮）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    slashMenu: { official: '[data-testid="command-menu"]', local: '[role="listbox"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.text-format-group', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.slash.text-format-group', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1300, label: 'type slash (baseline roster)' },
    { op: 'resetSlash', settleMs: 800, label: 'reset (assert caret)' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#2)' },
    { op: 'type', text: '文字格式', settleMs: 1500, label: 'filter 文字格式' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['文字格式', '加粗', '斜体', '删除线', '下划线', '高亮', '代码'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    { facet: 'state:slashMenu', op: 'gt', at: 3, value: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '官方面板 20 项的整体文案在本地无对应扁平项，属 G1544／G1613 已登记的产品级差异',
      ref: 'gap.md G1613',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
