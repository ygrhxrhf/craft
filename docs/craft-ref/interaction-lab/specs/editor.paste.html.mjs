/**
 * spec: editor.paste.html
 *
 * 主交互：**粘贴一段带格式的 HTML**（`<b>` 粗体 ＋ `<i>` 斜体 ＋ `<a href>` 链接），看两侧**保不保格式**。
 *
 * 为什么这一族要采：`editor.paste.plain-text` 只覆盖"纯文本／裸 URL"；**富文本粘贴**（从网页或
 * 别的编辑器复制一段带格式的内容）是粘贴面的主干，**从来没上屏对过**。两侧都宣称能解析 HTML
 * （官方 Slate 自带 `htmlDeserializer`；本地 TipTap 走 ProseMirror 的 `clipboardTextParser`）。
 *
 * 判据（`inline` 档归一后的 `marks`）：
 *  ① 两侧都先打一个 `HEAD` 当锚（进 selfCheck）；
 *  ② 粘贴 `<b>BOLDX</b> <i>ITX</i> <a href="https://example.com">LINKX</a>` 之后，
 *     该块的 `marks` 是否含 `bold`／`italic`／`link`；文本名册里三个词是否都在。
 * ⇒ 差异由 differ 判；本 spec 不预设"应该保留"。
 */
export default {
  id: 'editor.paste.html',
  wave: 1,
  surface: 'editor.paste',
  target: 'both',
  builtFrom: [
    'specs/editor.paste.plain-text.mjs（同族：只覆盖纯文本／裸 URL）',
    '本地 TipTap/ProseMirror 的 clipboard HTML 解析；官方 Slate htmlDeserializer（静态已知，屏上未验）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    blockLeaf: { official: '[id^="blockrowwrap-"]:not([data-testid]) [data-slate-node="text"]', local: '.ProseMirror > p' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.paste.html', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.paste.html', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HEAD', settleMs: 700, label: 'type HEAD' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (new block)' },
    { op: 'pasteHtml', html: '<b>BOLDX</b> <i>ITX</i> <a href="https://example.com">LINKX</a>', text: 'BOLDX ITX LINKX', settleMs: 1500, label: 'paste rich HTML' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'inline'],
  observeTexts: ['HEAD', 'BOLDX', 'ITX', 'LINKX'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:BOLDX', op: 'gt', value: 0, at: 3 },
    { facet: 'text:LINKX', op: 'gt', value: 0, at: 3 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
