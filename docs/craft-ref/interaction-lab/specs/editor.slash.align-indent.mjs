/**
 * spec: editor.slash.align-indent
 *
 * 主交互：**`/` 菜单里「对齐」「缩进」这两组展开后有什么**——官方分别回 4 项／2 项。
 *
 * 为什么这一族要采：`G1613` 证明 20 个名字是分组入口。其中「对齐 → 4 项」「缩进 → 2 项」
 * 只读到过条数，**没并排过两侧**；而本地 `slash-commands.ts` 里 `grep 对齐|缩进` **零命中**
 * （它们只作为 FormatTab 工具栏的 `ALIGNMENT_CONTROLS`／`INDENT_CONTROLS` 存在）
 * ⇒ 预测：**本地过滤「对齐」回 0 项**。
 *
 * 判据：
 *  ① 两侧都能打出 `/` 并让面板在场（进 selfCheck）；
 *  ② 过滤「对齐」后的候选名册：官方 4 项（居中／两端／右／左）、本地预测 0 项；
 *  ③ 两侧各按一次 Enter，看正文块变化（本地无候选时 Enter 不改变块型）。
 *  ★ 文本 RTL／对齐类属性不进 selfCheck——两侧承载属性名不同，只记 ctext 名册。
 */
export default {
  id: 'editor.slash.align-indent',
  wave: 1,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: [
    'gap.md G1613（20 个名字是分组入口，过滤后回子项）',
    'gap.md G1615（列表组并排：官方 5 项 vs 本地 8 项）',
    '本地 slash-commands.ts：对齐/缩进零命中（只在 FormatTab 的 ALIGNMENT_CONTROLS／INDENT_CONTROLS）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.align-indent', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.slash.align-indent', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1300, label: 'type slash' },
    { op: 'type', text: '对齐', settleMs: 1400, label: 'type 对齐 (expand subgroup)' },
    { op: 'key', chord: 'Enter', settleMs: 1700, label: 'Enter (pick first candidate)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['对齐', '居中', '左对齐', '右对齐', '两端', '缩进', '减少缩进'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    { facet: 'blocksCount', op: 'count', at: 1, value: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    {
      facet: 'added-only-official',
      reason: '官方「对齐」子菜单四项（居中／两端／右／左）本地斜杠菜单没有对应项——本地把它放在 FormatTab 工具栏（ALIGNMENT_CONTROLS 5 档），属 G1615 同族的产品级差异',
      ref: 'src/components/editor/tabs/FormatTab.tsx:13,262',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
