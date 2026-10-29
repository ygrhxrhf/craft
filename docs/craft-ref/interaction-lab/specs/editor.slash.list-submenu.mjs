/**
 * spec: editor.slash.list-submenu
 *
 * 主交互：**`/` 菜单里「列表」这一组展开后到底是哪几项**（官方 5 项候选 vs 本地命中的列表命令）。
 *
 * 为什么这一族要采：`G1613`（第 392 批）证明 `/` 菜单那 20 个名字是**分组入口**、过滤后才回子项。
 * 当时只读到了"列表 → 5 项"，但那 5 项各自**插进去是不是真的落成对应块**、以及本地那侧
 * 同名过滤会回哪些项，都还没并排比过。`G1544` 只到"形态不同"这一层。
 *
 * 判据：
 *  ① 两侧都能打出 `/` 并让面板在场（进 selfCheck）；
 *  ② 过滤「列表」后的**候选名册**——官方回 5 项子项、本地回自己的列表命令（文案不同是产品级差异，
 *     按 deviations 声明，不参与判定）；
 *  ③ 选中首项后正文块**类型**的变化（两侧各自比自己的基线）。
 */
export default {
  id: 'editor.slash.list-submenu',
  wave: 1,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1613（20 个名字是分组入口，过滤后回子项）',
    'gap.md G1544（官方扁平 20 项 vs 本地分组带副标题）',
    '本地 slash-commands.ts（6 条列表相关命令：无序/有序/待办/折叠/全部展开/全部收起）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.list-submenu', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.slash.list-submenu', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1300, label: 'type slash (group level)' },
    { op: 'type', text: '列表', settleMs: 1400, label: 'type 列表 (expand subgroup)' },
    { op: 'key', chord: 'Enter', settleMs: 1800, label: 'Enter (pick first candidate)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['列表', '待办', '折叠', '无序', '有序', '编号', '取消列表格式', '全部展开', '全部收起'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    { facet: 'blocksCount', op: 'count', at: 1, value: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '官方「列表」组展开后的子项文案（编号列表／待办列表／取消列表格式／无序列表）与本地列表命令文案不同源；这是 G1544／G1613 已登记的产品级差异',
      ref: 'gap.md G1613',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
