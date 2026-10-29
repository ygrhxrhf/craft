/**
 * spec: editor.key.insert-block-space
 *
 * 主交互：**表 B 的「插入新区块」两键** —— `Space`（在下方插入）/ `Shift-Space`（在上方插入），
 * 外加 `Escape`（`CANCEL`：官方按下去会把焦点从编辑器送到 `body`，第 323 批侧证）。
 *
 * 为什么这一族要采：`keyboard.md:60-61`（`INSERT_AFTER = space`／`INSERT_BEFORE = Shift space`）
 * 从没在屏幕上按过。这一族特别值得采，因为**本地很可能是"打出一个空格"**——
 * 若真如此，就是"同一个物理键在两套里做完全不同的事"。
 *
 * 判据（块名册逐键变化）：
 *  ① 光标在 `ALPHA` 块里按 `Space` ⇒ 官方插一枚空块在下方（名册 `[ALPHA, '']`）；
 *     本地若只是空格，名册仍是 `[ALPHA ]`（文本里多一个空格、块数不变）；
 *  ② 接着打 `BETA`：官方落在新块里（`[ALPHA, BETA]` 或 `[ALPHA, ' BETA']`），本地并回原块；
 *  ③ `Shift-Space` ⇒ 官方在上方插空块；本地若只是 Shift+空格，同样并回原块。
 * ⇒ 差异由 differ 判，不写进 selfCheck。
 */
export default {
  id: 'editor.key.insert-block-space',
  wave: 1,
  surface: 'editor.block-insert',
  target: 'both',
  builtFrom: [
    'keyboard.md:60-61（INSERT_AFTER = space／INSERT_BEFORE = Shift space）',
    'keyboard.md 表 B 阶段自述：这两条从未在屏幕上按过',
    '第 323 批实测：官方 Escape 把焦点从编辑器送到 body（本 spec 第 ④ 步，仅记录）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.insert-block-space', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.insert-block-space', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (INSERT_AFTER)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Shift+Space', settleMs: 900, label: 'Shift-Space (INSERT_BEFORE)' },
    { op: 'type', text: 'GAMMA', settleMs: 800, label: 'type GAMMA' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (CANCEL · blur probe)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'selection'],
  observeTexts: ['ALPHA', 'BETA', 'GAMMA'],
  stateSelectors: ['editorBody', 'dialog'],

  expect: [
    { facet: 'blocksCount', op: 'count', value: 1, at: 0 },
    { facet: 'text:ALPHA', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数（本批读数 35）随列表重绘出现；是外壳计数不是编辑器内容', ref: 'observe.mjs NOISE_RULES 未覆盖该串，逐 spec 声明' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
