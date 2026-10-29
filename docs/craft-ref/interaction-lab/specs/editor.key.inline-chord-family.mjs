/**
 * spec: editor.key.inline-chord-family
 *
 * 主交互：**表 A 的行内格式七键** —— `Ctrl-B` 加粗 / `Ctrl-I` 斜体 / `Ctrl-Shift--` 删除线 /
 * `Ctrl-Shift-B` 高亮 / `Ctrl-Shift-C` 代码 / `Ctrl-E` 行内代码（第二通路）/ `Ctrl-K` 链接。
 *
 * 为什么这一族要采：`editor.md-rules.inline-mark` 采的是**markdown 记号线**（`**X**` 那一族），
 * 这七条**快捷键**从没在屏幕上按过（`keyboard.md:38-45`）。两者的区别是产品级的：
 * 记号是"打字时自动转"，快捷键是"选中后施加"。
 *
 * 判据：每键**独占一个块**（打完立刻 Enter 换块），看该块的 `marks` 是否出现对应枚举：
 *  ① `Ctrl-B` ⇒ `bold`；② `Ctrl-I` ⇒ `italic`；③ `Ctrl-Shift--` ⇒ `strike`；
 *  ④ `Ctrl-Shift-B` ⇒ `highlight`；⑤ `Ctrl-Shift-C` ⇒ `code`；⑥ `Ctrl-E` ⇒ `code`；
 *  ⑦ `Ctrl-K` ⇒ `link`（★ 本地这条大概率被命令面板抢走：`CommandPalette.tsx:37` 的 window 级门控
 *     不排除 Shift、也不区分是否在编辑器内）。
 *
 * ★ 选区只选**本块的一个词**（`Ctrl-Shift-←` 从词尾选起），不用 `Ctrl-A`——整块全选会把上一块的
 *   残留标记也带进来，marks 是**按块聚合**的，混了就分不清是哪条键的结果。
 * ★ 不用 `Escape` 收尾：官方 `Escape` 会把焦点从编辑器送到 `body`（第 323 批实测），
 *   后面所有按键都会落空。用 `ArrowRight` 塌缩选区即可。
 */
export default {
  id: 'editor.key.inline-chord-family',
  wave: 1,
  surface: 'editor.key.inline-marks',
  target: 'both',
  builtFrom: [
    'keyboard.md:38-45（BOLD/ITALIC/STRIKETHROUGH/HIGHLIGHT/CODE/CODE2/URL 七行）',
    'keyboard.md 表 A 阶段自述：行内格式键从未在屏幕上按过',
    'src/components/search/CommandPalette.tsx:37（Ctrl-K 的 window 级门控，不排除 Shift／不看焦点）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.inline-chord-family', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.inline-chord-family', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'MK-BOLD', settleMs: 600, label: 'block 1: MK-BOLD' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (bold)' },
    { op: 'key', chord: 'Control+b', settleMs: 900, label: 'Ctrl-B (BOLD)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-ITALIC', settleMs: 600, label: 'block 2: MK-ITALIC' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (italic)' },
    { op: 'key', chord: 'Control+i', settleMs: 900, label: 'Ctrl-I (ITALIC)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-STRIKE', settleMs: 600, label: 'block 3: MK-STRIKE' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (strike)' },
    { op: 'key', chord: 'Control+Shift+Minus', settleMs: 900, label: 'Ctrl-Shift-- (STRIKETHROUGH)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-HILITE', settleMs: 600, label: 'block 4: MK-HILITE' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (highlight)' },
    { op: 'key', chord: 'Control+Shift+b', settleMs: 900, label: 'Ctrl-Shift-B (HIGHLIGHT)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-CODE', settleMs: 600, label: 'block 5: MK-CODE' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (code)' },
    { op: 'key', chord: 'Control+Shift+c', settleMs: 900, label: 'Ctrl-Shift-C (CODE)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-CODE2', settleMs: 600, label: 'block 6: MK-CODE2' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (code2)' },
    { op: 'key', chord: 'Control+e', settleMs: 900, label: 'Ctrl-E (CODE2)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 300, label: 'collapse' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'new block' },

    { op: 'type', text: 'MK-URL', settleMs: 600, label: 'block 7: MK-URL' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 500, label: 'select word (url)' },
    { op: 'key', chord: 'Control+k', settleMs: 1400, label: 'Ctrl-K (URL)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'inline'],
  observeTexts: ['MK-BOLD', 'MK-ITALIC', 'MK-STRIKE', 'MK-HILITE', 'MK-CODE', 'MK-CODE2', 'MK-URL'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    // 两侧共有的量：七个块都在（每块一词）
    { facet: 'blocksCount', op: 'count', value: 8, at: 35 },
    { facet: 'text:MK-URL', op: 'gt', value: 0, at: 35 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { prefix: 'selection:', reason: 'Ctrl-Shift-← 的选区落点两侧可能不同，本 spec 只借它制造"选中一个词"这个前置', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
