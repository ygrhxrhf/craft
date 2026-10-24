/**
 * spec: editor.key.turn-into-style
 *
 * 主交互：**块间转换保真（文本样式档 TURN_INTO 族）** —— `Ctrl-Shift-1/2/3/5`
 * （`keyboard.md:26-30` 表 A：`TITLE`／`SUBTITLE`／`HEADING`／`BODY`）把当前块的**样式档**换掉。
 *
 * 为什么这一族是"块间转换保真"的主干：`model.md` §一之六 记官方是
 * **九值 `textStyle` ＋ 数字序号 `eY()` ＋ 导出映射表**（`title→h1 … toggle→h4`、`Video/File→p` 塌缩）
 * ⇒ 「同一个块、只换样式档」正是官方模型里**唯一一种"块间转换"**（其余都是换类型 ⇒ 另起块）。
 * 所以本 spec 采的是：**同一个块内**换档后 ① 文本是否原样保留 ② 块数是否不变 ③ 计算样式的字号/字重是否跟着换。
 *
 * 两侧的键位依据（`keyboard.md:26-30`）：
 *  - 官方 Windows：`Ctrl-Shift-1`（TITLE）／`-2`（SUBTITLE）／`-3`（HEADING）／`-5`（BODY）。
 *  - 本地：`src/lib/editor/keymap.ts:177-181` **同一组键位**（`TITLE`／`SUBTITLE`／`HEADING`／`BODY`
 *    四条的 `win` 都是 `ctrl+shift+digit`）⇒ 键位面**一致**，故本 spec 的差异只可能出在"转换行为"上。
 *
 * ★ 观测面用 `computed`（字号/字重）：样式档转换在两侧都**不改文本**、也**不改块数**
 *   （同一个块就地换档），所以只有计算样式能区分"换档成功"与"按了没反应"。
 *
 * 判据（只用**两侧共有**的量，差异交给 differ）：
 *  - 文本名册：`AAA` 恒 1（换档不动文本）。
 *  - `blocksCount`：恒 1（换档不建块）。
 *  ★ `computed` 的**取值**不放 expect：两侧字号/字重天然不同（两套实现）⇒ 交给 differ 比 **delta**。
 */
export default {
  id: 'editor.key.turn-into-style',
  wave: 1,
  surface: 'editor.key.turn-into',
  target: 'both',
  builtFrom: [
    'keyboard.md:26-30（表 A：TITLE=Ctrl-Shift-1／SUBTITLE=-2／HEADING=-3／BODY=-5）',
    'model.md §一之六（九值 textStyle ＋ 数字序号 eY() ＋ 导出映射表 title→h1 …）',
    'src/lib/editor/keymap.ts:177-181（本地同组键位）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    blockLeaf: { official: '[id^="blockrowwrap-"]:not([data-testid]) [data-slate-node="text"]', local: '.ProseMirror > p, .ProseMirror > h1, .ProseMirror > h2, .ProseMirror > h3' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.turn-into-style', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.turn-into-style', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA', settleMs: 600, label: 'typeKeys AAA (body block)' },
    { op: 'key', chord: 'Control+Shift+Digit1', settleMs: 800, label: 'Ctrl-Shift-1 (TITLE)' },
    { op: 'key', chord: 'Control+Shift+Digit3', settleMs: 800, label: 'Ctrl-Shift-3 (HEADING)' },
    { op: 'key', chord: 'Control+Shift+Digit2', settleMs: 800, label: 'Ctrl-Shift-2 (SUBTITLE)' },
    { op: 'key', chord: 'Control+Shift+Digit5', settleMs: 800, label: 'Ctrl-Shift-5 (BODY, back)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'computed'],
  observeTexts: ['AAA'],
  stateSelectors: ['editorBody'],
  // ★ 两个探针：editorBody 只作「页面还在」的粗检；**blockLeaf 才是判据** ——
  //   样式档落在块的**文本叶**上（实测官方 leaf 15px/400 → 23px/700(TITLE) → 18px/600(HEADING)），
  //   而块行外壳的字号/字重**不变**（16px/400）⇒ 探外壳会读成「没反应」。
  computedProbes: [
    { key: 'editorBody', selector: 'editorBody' },
    { key: 'blockLeaf', selector: 'blockLeaf' },
  ],
  computedProps: ['fontSize', 'fontWeight', 'lineHeight', 'color'],

  expect: [
    // 两侧共有：文本一字未变、块数恒 1（换档是"同一个块就地换样式"）
    { facet: 'text:AAA', op: 'count', at: 5, value: 1 },
    { facet: 'blocksCount', op: 'count', at: 5, value: 1 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};