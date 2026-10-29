/**
 * spec: editor.key.list-family
 *
 * 主交互：**样式槽的列表四键** —— `Ctrl-Shift-6` 待办 / `-8` 项目符号 / `-9` 编号 / `-`` ` `` 无列表。
 *
 * 为什么这一族要采：`keyboard.md:295` 逐字写着「表 A 的列表家族**只试过 `Ctrl-Shift-7`** 一条」，
 * 另外四条**从未在屏幕上按过** ⇒ 表 A 的列表段此前全是契约级证据。
 * （`-7` 那一条本身也只是"屏上零增量"的负面读数，没有证明它到底做了什么。）
 *
 * 本地实现（`src/components/editor/extensions/craft-keymap.ts:32/34/35/36`）：
 * `TODO_LIST→toggleTaskList`／`BULLET_LIST→toggleBulletList`／`NUMBERED_LIST→toggleOrderedList`／
 * `NO_LIST→unsetList`（先 lift 列表项、再 setParagraph）。⇒ 四键都有显式接线。
 *
 * 判据：`kinds`（两侧归一到同一枚举）逐键变化。
 *  ① `-6` ⇒ `task`；② `-8` ⇒ `bullet`；③ `-9` ⇒ `numbered`；④ `-`` ` `` ⇒ `para`。
 * ★ 单块连按四个键，观察"换档是**替换**还是**叠加**"——这也是两侧容易分叉的地方。
 */
export default {
  id: 'editor.key.list-family',
  wave: 1,
  surface: 'editor.key.style-slots',
  target: 'both',
  builtFrom: [
    'keyboard.md:33-37（TODO_LIST=⌘⌥6／BULLET_LIST=-8／NUMBERED_LIST=-9／NO_LIST=-`）',
    'keyboard.md:295（列表家族只试过 -7 一条，其余四条从未上屏）',
    'src/components/editor/extensions/craft-keymap.ts:32-36（本地四键的接线）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.list-family', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.list-family', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA', settleMs: 800, label: 'type AAA' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 900, label: 'Ctrl-Shift-6 (TODO_LIST)' },
    { op: 'key', chord: 'Control+Shift+8', settleMs: 900, label: 'Ctrl-Shift-8 (BULLET_LIST)' },
    { op: 'key', chord: 'Control+Shift+9', settleMs: 900, label: 'Ctrl-Shift-9 (NUMBERED_LIST)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 900, label: 'Ctrl-Shift-` (NO_LIST)' },
  ],

  observe: ['dom', 'text', 'blocks', 'kinds'],
  observeTexts: ['AAA'],
  stateSelectors: ['editorBody'],

  expect: [
    // 两侧共有的量：文本一直在、块数恒 1（换档不该拆块）
    { facet: 'blocks', op: 'equals', value: ['AAA'], at: 1 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 4 },
  ],

  /**
   * 两条已登记的既有差异，与本 spec 的判据（四键是否换到同一档）无关：
   *  ① countΔ:AAA —— 本地任务块勾选框的可及名是合成串 `Task item checkbox for AAA`，
   *     同一个词被数两次；已由 **G1563** 登记（官方任务项在 AX 树里根本没有 checkbox）。
   *  ② blocks —— 官方把列表序号画进文本节点（`1. AAA`），本地由 CSS counter 画、不进 innerText；
   *     已由 **G866／G1556** 登记。
   * ⇒ 声明掉，不参与判定；本 spec 的结论只看 `kinds` 逐键变化。
   */
  deviations: [
    { facet: 'countΔ:AAA', reason: '本地任务块勾选框的合成可及名含任务文本 ⇒ 同一个词被 count 两次；已由 G1563 单独承载', ref: 'gap.md G1563' },
    { facet: 'blocks', reason: '官方把列表序号画进文本节点（1. AAA），本地由 CSS counter 画、不进 innerText；已由 G866／G1556 承载', ref: 'gap.md G866 · G1556；editor.md-rules.block-kind 同一声明' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
