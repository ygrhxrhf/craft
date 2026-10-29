/**
 * spec: editor.blockmenu.task-items
 *
 * 主交互：**任务块的「块三点菜单」里有哪些项**（为 `G1596` 补边界：官方块菜单是否也有「提醒我…」）。
 *
 * 做法：造任务块 → 悬停块 → 点块右侧浮出的 `⋯`（按 DOM 找，不猜坐标）→ 读菜单项名册。
 *  ① 若菜单打不开，记"前置未建立"（`popup-backdrop`/dialog 无新增）。
 *  ② 名册里看「提醒我…」「将任务标记为已完成」「删除」等是否在。
 *
 * 判据：菜单项的**文本名册**（`observeTexts` 里逐项列出）。
 */
export default {
  id: 'editor.blockmenu.task-items',
  wave: 1,
  surface: 'editor.block-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1596（边界：官方块菜单里有没有「提醒我…」未查）',
    '本地 block-actions.ts:75-99（块菜单项清单，含 remind／任务完成／删除）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    blockMenuButton: { official: '[id^="blockrowwrap-"] [aria-label*="Ellipsis"], [id^="blockrowwrap-"] [data-testid*="menu"]', local: '[data-block-menu-trigger], .ProseMirror [aria-label*="菜单"]' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.blockmenu.task-items', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.blockmenu.task-items', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: 'MENUTASK', settleMs: 700, label: 'type MENUTASK' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 1000, label: 'Ctrl-Shift-6 (task block)' },
    { op: 'hover', selector: 'blockRoot', settleMs: 900, label: 'hover block (reveal ⋯)' },
    { op: 'clickXY', x: 1235, y: 185, settleMs: 1200, label: 'click ⋯ area (right of block)', targets: ['official'] },
    { op: 'clickText', text: '提醒我…', settleMs: 1500, label: 'pick 提醒我… (block menu)', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'html'],
  observeTexts: [
    '30 分钟', '1 小时', '1 天', '自定义…', '今天', '明天', '晚上',
    'MENUTASK', '提醒我…', '将任务标记为已完成', '将任务标记为已取消',
    '添加内容', '在上方插入区块', '在下方插入区块', '复制区块链接', '添加评论', '删除',
  ],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],
  htmlProbes: [{ key: 'block', selector: 'blockRoot' }],
  htmlLimit: 1200,

  expect: [
    { facet: 'text:MENUTASK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
