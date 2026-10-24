/**
 * spec: editor.key.ctrl-arrow-word-nav
 *
 * 主交互：`Cmd+Left`/`Cmd+Right`（Windows `Ctrl+Left`/`Ctrl+Right`）在编辑器里到底做什么。
 *
 * 静态依据：`keyboard.md:76-77` 把这对键记成 `NAVIGATE_INTO`（进入）/ `NAVIGATE_OUT`（退出），
 *   且 `keyboard.md:1122` 的官方面板源把两条绑进 `general-navigation` 段；
 *   `keyboard.md:358-359` 又记官方面板中文作「导航到 / 返回上层」。
 *   ⇒ 静态记录说这是跨块/跨层导航键。本 spec 把它搬到屏幕上验。
 *
 * 上一手 `probe-w1p`（临时探针，未入仪器）已取到一组读数：
 *   - 三块 AAA/BBB/CCC、光标在中间块行尾：两侧 Ctrl+Left 都停在本块行首、Ctrl+Right 都回到本块行尾
 *     ⇒ 没有任何一侧跨块（"NAVIGATE 未生效"）。
 *   - 单块 `AAA BBB CCC`、光标在行尾：Ctrl+Left 三次两侧逐字相同（11→8→4→0），
 *     但 Ctrl+Right 两次两侧不同（官方 0→3→7 走到词尾；本地 0→4→8 走到词首）。
 *   - 键事件：官方 ArrowLeft+Ctrl 被消费（defaultPrevented=true）；本地未被消费。
 *
 * ⇒ 本 spec 把 probe-w1p 的判别性那一面（单块带空格）搬进仪器复采，并顺带采跨块那一面。
 *
 * 判据（只用两侧共有的量，差异交给 differ）：
 *  - `blocksCount` 与块文本名册：这对键只动光标、不动内容。
 *
 * 本 spec 不放 `selection:*` 进 expect：词边界落点在两侧不同（词尾 vs 词首）
 *   ⇒ 属产品级差异，按 V168/V169 的教训交给 differ 判，不在 selfCheck 里假红。
 *
 * ★ 首跑（`wave1-14`）暴露**本 spec 自身的一处缺陷**：`Enter` 之前没先 `End`
 *   ⇒ 光标停在上一步词边界处、分块点两侧不同（官方 7 / 本地 8，是词边界差异的**下游**）
 *   ⇒ 块名册被"自造差异"污染（官方 `AAA BBB` + `DDD CCC`、本地 `AAA BBB` + `DDDCCC`）。
 *   修法＝`Enter` 前先按 `End`，把分块点钉死在块尾。修后本 spec 的 selfCheck 才是干净的。
 */export default {
  id: 'editor.key.ctrl-arrow-word-nav',
  wave: 1,
  surface: 'editor.key.navigate',
  target: 'both',
  builtFrom: [
    'keyboard.md:76-77（NAVIGATE_INTO = Cmd+Right / NAVIGATE_OUT = Cmd+Left）',
    'keyboard.md:358-359（官方面板中文「导航到 / 返回上层」）',
    'keyboard.md:1122（面板源 general-navigation 段）',
    'probe-w1p（本轮探针：单块词边界差异 + 跨块零变化）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.ctrl-arrow-word-nav', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.ctrl-arrow-word-nav', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA BBB CCC', settleMs: 500, label: 'typeKeys AAA BBB CCC (single block)' },
    { op: 'key', chord: 'Control+ArrowLeft', settleMs: 600, label: 'Ctrl+Left #1' },
    { op: 'key', chord: 'Control+ArrowLeft', settleMs: 600, label: 'Ctrl+Left #2' },
    { op: 'key', chord: 'Control+ArrowLeft', settleMs: 600, label: 'Ctrl+Left #3' },
    { op: 'key', chord: 'Control+ArrowRight', settleMs: 600, label: 'Ctrl+Right #1' },
    { op: 'key', chord: 'Control+ArrowRight', settleMs: 600, label: 'Ctrl+Right #2' },
    { op: 'key', chord: 'End', settleMs: 400, label: 'End (pin caret at end of block 1)' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'Enter (second block)' },
    { op: 'typeKeys', text: 'DDD', settleMs: 500, label: 'typeKeys DDD (caret in block 2)' },
    { op: 'key', chord: 'ArrowUp', settleMs: 350, label: 'ArrowUp (back to block 1)' },
    { op: 'key', chord: 'End', settleMs: 400, label: 'End (end of block 1)' },
    { op: 'key', chord: 'Control+ArrowRight', settleMs: 700, label: 'Ctrl+Right across block boundary' },
    { op: 'key', chord: 'Control+ArrowLeft', settleMs: 700, label: 'Ctrl+Left across block boundary' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'keys'],
  observeTexts: ['AAA', 'BBB', 'CCC', 'DDD'],
  stateSelectors: ['editorBody'],

  expect: [
    { facet: 'blocks', op: 'equals', at: 6, value: ['AAA BBB CCC'] },
    { facet: 'blocks', op: 'equals', at: 8, value: ['AAA BBB CCC', ''] },
    { facet: 'blocks', op: 'equals', at: 9, value: ['AAA BBB CCC', 'DDD'] },
    { facet: 'blocksCount', op: 'count', at: 13, value: 2 },
    { facet: 'text:AAA', op: 'count', at: 13, value: 1 },
    { facet: 'text:DDD', op: 'count', at: 13, value: 1 },
    { facet: 'focusInEditor', op: 'equals', at: 13, value: true },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
