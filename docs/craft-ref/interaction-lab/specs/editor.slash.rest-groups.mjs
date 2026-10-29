/**
 * spec: editor.slash.rest-groups
 *
 * 主交互：`/` 菜单里**剩下五个分组入口**逐个展开——`装饰`／`插入片段`／`插入分隔符`／`动作`／`提醒我…`。
 *
 * 为什么这一族要采：`G1613` 的普查里这五项"过滤后 0 项"，但那一轮是**每组一次独立导航**；
 * 本 spec 把五次展开串成一条序列，用 `resetSlash`（第 396 批新增）在每组之间**重建光标落点并断言**，
 * 这样既省一次播种，又能把"清输入破坏了前提"这个坑（`G1617`）挡在门外。
 *
 * 判据：
 *  ① 每次 `resetSlash` 后焦点都在正文块内（断言失败即红，不把"菜单没开"读成"没有子项"）；
 *  ② 每次打 `/` 后面板在场；
 *  ③ 每组过滤后的候选名册——官方若回 0 项就是**纯分组头**（`G1613` 的结论），回 ≥1 项则说明
 *     该组下有子项；本地同词的表现一并记录。
 *  ★ 候选文案属产品级差异，按 deviations 声明、不参与 selfCheck。
 */
export default {
  id: 'editor.slash.rest-groups',
  wave: 1,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1613（20 个名字是分组入口；这五项过滤后 0 项）',
    'gap.md G1615／G1616／G1617（列表、对齐、格式三组已并排）',
    'gap.md G1596（提醒我… 的块菜单入口已采，斜杠路径未并排）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.rest-groups', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.slash.rest-groups', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#1)' },
    { op: 'type', text: '装饰', settleMs: 1400, label: 'filter 装饰' },

    { op: 'resetSlash', settleMs: 800, label: 'reset #1' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#2)' },
    { op: 'type', text: '插入片段', settleMs: 1400, label: 'filter 插入片段' },

    { op: 'resetSlash', settleMs: 800, label: 'reset #2' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#3)' },
    { op: 'type', text: '插入分隔符', settleMs: 1400, label: 'filter 插入分隔符' },

    { op: 'resetSlash', settleMs: 800, label: 'reset #3' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#4)' },
    { op: 'type', text: '动作', settleMs: 1400, label: 'filter 动作' },

    { op: 'resetSlash', settleMs: 800, label: 'reset #4' },
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash (#5)' },
    { op: 'type', text: '提醒我', settleMs: 1400, label: 'filter 提醒我 (no ellipsis)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['装饰', '插入片段', '插入分隔符', '动作', '提醒我', '分隔符', '代码片段', '复制', '提醒'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    // 每一次打 `/` 之后面板都在场（步 1/4/7/10/13）
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    { facet: 'state:slashMenu', op: 'gt', at: 4, value: 0 },
    { facet: 'state:slashMenu', op: 'gt', at: 7, value: 0 },
    { facet: 'state:slashMenu', op: 'gt', at: 10, value: 0 },
    { facet: 'state:slashMenu', op: 'gt', at: 13, value: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '官方这五个分组若有子项，其文案与本地同名命令并非同源；属 G1544／G1613 已登记的产品级差异',
      ref: 'gap.md G1613',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
