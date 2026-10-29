/**
 * spec: editor.key.find-replace
 *
 * 主交互：**页内查找 / 查找和替换两档键** —— `Ctrl-F` 与 `Ctrl-Shift-F`。
 *
 * 为什么这一族要采：`keyboard.md:296` 逐字写着「表 B 的 `FIND`/`REPLACE` … **一条都没在屏幕上按过**
 * ⇒ 这三张表目前全是契约级证据」。
 *
 * 本地实现（`src/components/editor/extensions/craft-keymap.ts:92-95`）有一个**自陈的取舍**：
 * 注释写「the official split between "find" and "find and replace" is not reproduced here」——
 * `FIND_IN_PAGE` 与 `REPLACE_IN_PAGE` 走同一分支、打开同一个面板。本 spec 就是把这句话
 * 从注释变成**两侧实测**。
 *
 * 判据：
 *  ① `Ctrl-F` 之后查找框都在（两侧共有的量，进 selfCheck）；
 *  ② **替换框在不在** —— 官方 `Ctrl-F` 只有查找框、`Ctrl-Shift-F` 才补出替换框；
 *     本地一键就摊开两框 ⇒ 这是本 spec 要判的产品差异。
 */
export default {
  id: 'editor.key.find-replace',
  wave: 1,
  surface: 'editor.key.find',
  target: 'both',
  builtFrom: [
    'keyboard.md:82-85（FIND_IN_PAGE=⌘F／REPLACE_IN_PAGE=⌘⇧F／FIND_NEXT=⌘G／FIND_PREVIOUS=⌘⇧G）',
    'keyboard.md:296（表 B 的 FIND/REPLACE 一条都没在屏幕上按过）',
    'src/components/editor/extensions/craft-keymap.ts:92-95（本地两键同一分支，注释自陈未复刻官方分档）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    findInput: { official: 'input[placeholder="在页面上查找文本"]', local: 'input[aria-label="查找"]' },
    replaceInput: { official: 'input[placeholder="替换为……"]', local: 'input[aria-label="替换为"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.find-replace', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.find-replace', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'ALPHA BETA ALPHA', settleMs: 900, label: 'type ALPHA BETA ALPHA' },
    { op: 'key', chord: 'Control+f', settleMs: 1400, label: 'Ctrl-F (find)' },
    { op: 'key', chord: 'Control+Shift+f', settleMs: 1400, label: 'Ctrl-Shift-F (find & replace)' },
  ],

  observe: ['dom', 'text', 'blocks', 'state', 'attrs'],
  observeTexts: ['ALPHA'],
  stateSelectors: ['editorBody', 'findInput', 'replaceInput'],
  attrProbes: [
    { key: 'findInput', selector: 'findInput', attrs: ['placeholder'] },
    { key: 'replaceInput', selector: 'replaceInput', attrs: ['placeholder'] },
  ],

  expect: [
    // 两侧共有的量：Ctrl-F 之后查找框在场
    { facet: 'state:findInput', op: 'gt', value: 0, at: 2 },
    { facet: 'blocks', op: 'equals', value: ['ALPHA BETA ALPHA'], at: 2 },
  ],

  /** 两条已知外壳噪声（都不是本 spec 的判据）：本地同步状态串、官方目录空态提示。 */
  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（同步中）随同步完成而消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES <SAVING>' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示（使用标题、页面或卡片创建目录。／目录）随面板重绘出现或消失；已由 G1556 一族的 TOC_PLACEHOLDER 承载', ref: 'src/lib/editor/official-copy.ts:8' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
