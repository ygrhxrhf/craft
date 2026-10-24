/**
 * spec: editor.key.shift-enter-hard-break
 *
 * 主交互：非空块内按 `Shift-Enter`（Windows 拼法；官方平台是 Win32）。
 *
 * ★★ 本 spec 的来由是一处**推翻既有静态记录**的新事实（第 300 批续批实测）：
 *   `keyboard.md:286` 与 `interactions.md:506`（V50 §4）记「官方 `Shift+Enter` 屏幕上零变化
 *   （`150,894→150,894`、`<br>` 恒 0）、连 contenteditable 默认插 `<br>` 都没有 ⇒ ✓ 确认无效」，
 *   并据此写了本地 `hard-break.ts` 的注释与 `Editor.tsx:313` 的取舍。
 *
 *   本轮四次独立运行（单块 / 三块中间块 / 三块末块 / **两块首块**＝V50 的原始前置）一致读到：
 *     - 官方：块内出现行内换行，`<br>` 计数 **0→1**，文本由 `AAA` 变 `AAA\n\uFEFF\n`，
 *             键事件 `Shift`,`Enter` **均未被消费**（`defaultPrevented=false`），
 *             刷新页面后换行**仍在**（⇒ 落进了文档模型，不是浏览器的瞬时产物）；
 *     - 本地：`<br>` 恒 0、文本一字未变，但键**被消费**（`Enter![consumed]`）⇒ 落到
 *             本地 `RENAME`（`src/lib/editor/keymap.ts:206` 把 `Shift-Enter` 绑给「编辑页面区块」）。
 *
 *   ⇒ 两侧都**不是**"零变化"：官方插软换行、本地什么都不插。判 `differ`，登记 gap。
 *
 * 判据（只用**两侧共有**的量，差异交给 differ）：
 *  - `breaks:totalBr`：块内 `<br>` 计数（0 → 1）；
 *  - `breaks:blocks`：逐块 `br:行数:文本` 三元组（文本里的 `\n` 写成 `|`）。
 *
 * 采到的逐字证据（2026-10-24，probe-w1o 语境 C ＝ V50 原始前置：两块、光标在首块行尾）：
 *  官方 C0 `totalBr=0` `AAA` ⇒ C1 `totalBr=1`、块文本 `AAA\n<ZWSP>\n`，`domBytes 114817→115048`（+231 B）；
 *  本地同序列 `totalBr` 恒 0、块文本恒 `AAA`。
 */
export default {
  id: 'editor.key.shift-enter-hard-break',
  wave: 1,
  surface: 'editor.key.hard-break',
  target: 'both',
  builtFrom: [
    'keyboard.md:286（旧记「确认无效」，本批推翻）',
    'interactions.md:506（V50 §4，同上）',
    'src/lib/editor/keymap.ts:206（本地把 Shift-Enter 绑给 RENAME）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.shift-enter-hard-break', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.shift-enter-hard-break', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  // 复刻 V50 §4 的前置：**两块**、光标停在**首块行尾**。
  steps: [
    { op: 'type', text: 'AAA', settleMs: 700, label: 'type AAA' },
    { op: 'key', chord: 'Enter', settleMs: 800, label: 'Enter (new block)' },
    { op: 'type', text: 'BBB', settleMs: 700, label: 'type BBB' },
    { op: 'key', chord: 'ArrowUp', settleMs: 350, label: 'ArrowUp (to block 1)' },
    { op: 'key', chord: 'End', settleMs: 350, label: 'End (end of block 1)' },
    { op: 'key', chord: 'Shift+Enter', settleMs: 1100, label: 'Shift+Enter' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'breaks'],
  observeTexts: ['AAA', 'BBB'],
  stateSelectors: ['editorBody'],

  expect: [
    { facet: 'blocksCount', op: 'count', value: 2 },
    { facet: 'text:AAA', op: 'count', value: 1 },
    { facet: 'text:BBB', op: 'count', value: 1 },
    // ★ 这里**不放** `breaks:totalBr gt 0`：它只在官方侧成立（本地恒 0）⇒ 属于**产品差异**，
    //   按 V168 已记的教训（selfCheck 只放"两侧共有"的量），差异交给 differ 判，不在这里假红。
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};