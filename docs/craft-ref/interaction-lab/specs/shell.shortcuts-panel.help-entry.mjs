/**
 * spec: shell.shortcuts-panel.help-entry
 *
 * 主交互：**快捷键面板的真实入口**——顶栏 `Question Mark Icon` → 菜单「快捷键」。
 *
 * 为什么这一族要采：`G793` 记过"入口在当前环境缺失（三条通路逐一穷尽）"，把它归因于
 * "宽度门控 vs 窗口状态未证"。本批发现真因是**视口太小**（第 84 批是 648×578，顶栏挤掉了
 * Help 键），另有一个没人记过的**前置**：面板只在**光标位于编辑器内**时打开。
 *
 * 判据：
 *  ① 1440×900 下 `[aria-label="Question Mark Icon"]` 在场；
 *  ② 点它 ⇒ 菜单 6 项（`role="menuitem"`）；
 *  ③ 点「快捷键」⇒ 出现 `role="dialog"` 且含「通用/文档/任务/编辑/样式/整理/合集」分类名册。
 *  ★ 本 spec 在**编辑器文档内**跑（setup 先 seed 一篇并点正文拿焦点）——列表页点同一项只关菜单。
 */
export default {
  id: 'shell.shortcuts-panel.help-entry',
  wave: 1,
  surface: 'shell.shortcuts-panel',
  target: 'both',
  builtFrom: [
    'gap.md G793（入口缺失，归因未证）',
    'gap.md G1543（面板 89 条 / 7 类，但入口当时没拿到）',
    '关键：help menu → 快捷键 的入口与"编辑器内焦点"这条前置，均为第 401 批新读',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    helpButton: { official: '[aria-label="Question Mark Icon"]', local: '[aria-label="Question Mark Icon"]' },
    menuItem: { official: '[role="menuitem"]', local: '[role="menuitem"]' },
    panel: { official: '[role="dialog"]', local: '[role="dialog"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.shortcuts-panel.help-entry', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-shell.shortcuts-panel.help-entry', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (drop any menu)' },
    // 关键前置：面板只在**光标位于编辑器内**时打开（列表页点同一项只关菜单）
    { op: 'click', selector: 'editorBody', settleMs: 700, label: 'click editor body (need editor focus)' },
    // 本地没有这个按钮（这正是本 spec 的观测对象）⇒ 用 clickOptional，缺失时记一行、不判错
    { op: 'clickOptional', selector: 'helpButton', settleMs: 1600, label: 'click 顶栏 Help (Question Mark Icon)' },
    { op: 'clickTextOptional', text: '快捷键', settleMs: 2200, label: 'pick 快捷键 (open panel)' },
  ],

  observe: ['text', 'state', 'a11y'],
  observeTexts: ['通用', '文档', '任务', '编辑', '样式', '整理', '合集', '快捷键', 'Markdown 快捷方式'],
  stateSelectors: ['panel', 'helpButton'],

  expect: [
    // 两侧都渲染出编辑器（标题在场）；面板是否存在本身是差异信号
    { facet: 'text:QODER-ILAB-shell.shortcuts-panel.help-entry', op: 'gt', value: 0, at: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '本地没有帮助菜单与快捷键面板（G771），面板 7 分类名册在本地无对应物',
      ref: 'gap.md G1622／G771',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
