/**
 * spec: editor.slash.format-groups
 *
 * 主交互：把 `/` 菜单里**三个格式类分组**逐个展开——`颜色`／`字体`／`文字格式`。
 *
 * 为什么这一族要采：`G1613` 证明 20 个名字是分组入口，其中这三个此前只读到"过滤后 1／1／0 项"。
 * 本 spec 把三次展开串在同一条序列里（同一侧同一文档），**一次跑完就能并排看三个组**，
 * 而不是给每个组各开一个 spec（那会在矩阵里留下三个几乎同形的块）。
 *
 * 判据（每步都取一次观测，index 见注释）：
 *  1 `/` 面板在场
 *  2 过滤「颜色」→ 候选（官方预期回「默认颜色」）
 *  3 过滤「字体」→ 候选（官方预期回「默认字体」）
 *  4 过滤「文字格式」→ 候选（官方预期 **0 项**：纯分组头）
 *  ★ 候选文案属产品级差异，按 deviations 声明、不参与判定；本 spec 的 selfCheck 只锁"面板在场"。
 */
export default {
  id: 'editor.slash.format-groups',
  wave: 1,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1613（20 个名字是分组入口；颜色→1／字体→1／文字格式→0）',
    'gap.md G1615／G1616（列表组、对齐组已并排）',
    '本地 slash-commands.ts：颜色／字体／文字格式零命中',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.format-groups', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.slash.format-groups', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash' },
    { op: 'type', text: '颜色', settleMs: 1400, label: 'filter 颜色' },
    // ★ 不要用 Backspace 清过滤词：删到空之后**光标会掉出正文块**（第 395 批踩到，
    //   官方 \`blocks.found\` 变 0、后续读数全废）。改用 Escape 关菜单 + Simulate 一个
    //   干净的块尾落点：点正文块 → End。
    { op: 'key', chord: 'Escape', settleMs: 400, label: 'Escape (close menu)' },
    { op: 'click', selector: 'blockRoot', settleMs: 500, label: 'click body block (restore caret)' },
    { op: 'key', chord: 'End', settleMs: 300, label: 'End' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash #2' },
    { op: 'type', text: '字体', settleMs: 1400, label: 'filter 字体' },
    { op: 'key', chord: 'Escape', settleMs: 400, label: 'Escape #2' },
    { op: 'click', selector: 'blockRoot', settleMs: 500, label: 'click body block #2' },
    { op: 'key', chord: 'End', settleMs: 300, label: 'End #2' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash #3' },
    { op: 'type', text: '文字格式', settleMs: 1400, label: 'filter 文字格式' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['颜色', '字体', '文字格式', '默认颜色', '默认字体', '加粗', '斜体', '删除线'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    { facet: 'blocksCount', op: 'count', at: 1, value: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '官方「颜色」「字体」子分组回的是"默认颜色／默认字体"这类**单档占位项**，本地斜杠菜单无对应项（格式类动作都在右侧面板）——与 G1616 同族',
      ref: 'gap.md G1616',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
