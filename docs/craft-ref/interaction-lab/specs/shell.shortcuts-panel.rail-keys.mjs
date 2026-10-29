/**
 * spec: shell.shortcuts-panel.rail-keys
 *
 * 主交互：快捷键面板**左栏分类**的键位——`↓`／`↑`／`Home`／`End`。
 *
 * 为什么这一族要采：`G859` 记过一处冲突——库 `TabsList` 默认 `loopFocus:!0`（环绕），
 * 而第 89 批屏上结案是「±1 夹紧不环绕」，两者口径不一致、当时留了个 `~` 待验。
 * 第 498 批用一次性探针先拿到序列（选中项 `通用→…→合集` 后夹紧），本 spec 把它固化成可复跑的一格。
 *
 * 判据：
 *  ① 面板打开后左栏 7 个分类是**普通 `BUTTON[tabindex=0]`、无 ARIA role**（选中态只由 `_variantActive_` 类表达）；
 *  ② `↓` 移动的是**选中项**（内容面随之切换），Dom 焦点不动；
 *  ③ 到末类「合集」再按 `↓` 不动（**夹紧**、不回首类）；`↑` 从「合集」回「整理」；
 *  ④ `Home`／`End` 对这个 rail **无作用**。
 *  ★ `Enter`／`Space` 激活的是**持焦**的那一枚（点击不改焦点）——这一条用一次性正控制测（第 495 批），
 *    不进本 spec：焦点来源不可由 spec 稳定构造，写进来会把"键有没有作用"与"焦点落在哪"混在一起。
 */
export default {
  id: 'shell.shortcuts-panel.rail-keys',
  wave: 1,
  surface: 'shell.shortcuts-panel',
  target: 'both',
  builtFrom: [
    'gap.md G859（面板分类纵导航：库默认环绕 vs 屏上夹紧，`~` 待验）',
    'gap.md G1622（面板 7 分类名册）',
    'gap.md G807（Enter 在"面板分类按钮"上不激活——第 495 批正控制推翻其前提）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    helpButton: { official: '[aria-label="Question Mark Icon"]', local: '[aria-label="Question Mark Icon"]' },
    panel: { official: '[role="dialog"]', local: '[role="dialog"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.shortcuts-panel.rail-keys', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-shell.shortcuts-panel.rail-keys', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (drop any menu)' },
    // 面板只在光标位于编辑器内时打开（第 401 批前置）
    { op: 'click', selector: 'editorBody', settleMs: 700, label: 'click editor body (need editor focus)' },
    { op: 'clickOptional', selector: 'helpButton', settleMs: 1600, label: 'click 顶栏 Help' },
    { op: 'clickTextOptional', text: '快捷键', settleMs: 2400, label: 'pick 快捷键 (open panel)' },
    { op: 'clickTextOptional', text: '通用', settleMs: 700, label: 'click 通用 (selection=通用)' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓1' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓2' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓3' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓4' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓5' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓6' },
    { op: 'key', chord: 'ArrowDown', settleMs: 450, label: '↓7 (expect clamp at 合集)' },
    { op: 'key', chord: 'ArrowUp', settleMs: 450, label: '↑ (expect 整理)' },
    { op: 'key', chord: 'Home', settleMs: 450, label: 'Home (expect no-op)' },
    { op: 'key', chord: 'End', settleMs: 450, label: 'End (expect no-op)' },
  ],

  observe: ['text', 'state'],
  observeTexts: [
    '通用', '文档', '任务', '编辑', '样式', '整理', '合集',
    '快捷键', '取消', '每日笔记', '全局快捷键', '查找', '文本样式', '移动所选区块', '在表格中',
  ],
  stateSelectors: ['panel', 'helpButton'],

  // 只对官方求值：本地没有面板（G771），断言在本地必然落空、会把"本来就没有这个面"伪装成仪器故障。
  selfCheckOnly: ['official'],
  expect: [
    { facet: 'text:快捷键', op: 'gt', value: 0, at: 4 },
    { facet: 'text:每日笔记', op: 'gt', value: 0, at: 6 },
    { facet: 'text:在表格中', op: 'gt', value: 0, at: 12 },
    { facet: 'text:移动所选区块', op: 'gt', value: 0, at: 13 },
    { facet: 'text:在表格中', op: 'count', value: 0, at: 15 },
    { facet: 'text:移动所选区块', op: 'gt', value: 0, at: 15 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'added-only-official', reason: '本地没有帮助菜单与快捷键面板（G771／G1622），左栏 7 分类在本地无对应物', ref: 'gap.md G859／G1622' },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
