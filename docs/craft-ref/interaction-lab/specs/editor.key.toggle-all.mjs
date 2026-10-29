/**
 * spec: editor.key.toggle-all
 *
 * 主交互：**`Ctrl-Alt-T`（`TOGGLE_TOGGLES` = 展开/折叠全部折叠块）**。
 *
 * 为什么这一族要采：`keyboard.md:51` 记了绑定、`keyboard.md:132` 把 `Ctrl-Alt-T` 同时印给
 * 「折叠块」与「任务标记完成」两处（同键按块型分派）。本地 `src/components/editor/extensions/toggle-all.ts`
 * 里有 `setOpenOnAllToggles`，但**没有任何键位接线**（`grep TOGGLE_TOGGLES` 零命中）⇒ 预测本地零反应，
 * 官方未知。
 *
 * 判据（折叠/展开都会让**子块文本是否还在屏上**改变）：
 *  ① 造一个折叠块 `HEAD1` ＋ 子块 `CHILD1`（`Ctrl-Shift-7` 转折叠块 → `Enter` 进子块）；
 *  ② `Ctrl-Alt-T` 第一次 ⇒ 若"全部折叠"，`CHILD1` 计数应从 1 掉到 0；
 *  ③ 再按一次 ⇒ 若"全部展开"，`CHILD1` 回到 1。
 *  ★ 两步都观察，避免把"折叠生效"与"只是没变"混在一起。
 */
export default {
  id: 'editor.key.toggle-all',
  wave: 1,
  surface: 'editor.key.toggle',
  target: 'both',
  builtFrom: [
    'keyboard.md:51（TOGGLE_TOGGLES = ⌘⌥T / Ctrl-Alt-T）',
    'keyboard.md:132（同键兼「折叠块」与「任务标记完成」两义）',
    'src/components/editor/extensions/toggle-all.ts（有 setOpenOnAllToggles，但无键位接线）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    toggleish: { official: '[data-testid="editor-body"] [class*="toggle"]', local: '.ProseMirror [data-open], .ProseMirror .toggle-summary' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.toggle-all', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.toggle-all', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HEAD1', settleMs: 700, label: 'type HEAD1' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'key', chord: 'Backspace', settleMs: 500, label: 'Backspace (back to block 1)' },
    { op: 'type', text: '/', settleMs: 900, label: 'slash menu' },
    // 官方斜线菜单是**二级菜单**（G1544）：「折叠列表」在「列表」下面
    { op: 'clickText', text: '列表', settleMs: 1000, label: 'open 列表 submenu', targets: ['official'] },
    // 本地是**扁平过滤**：直接打过滤词（关键字含 toggle）
    { op: 'typeKeys', text: 'toggle', settleMs: 900, label: 'filter toggle', targets: ['local'] },
    { op: 'clickText', text: '折叠列表', settleMs: 1300, label: 'pick 折叠列表' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (child block)' },
    { op: 'type', text: 'CHILD1', settleMs: 800, label: 'type CHILD1' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #1 (collapse all?)' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #2 (expand all?)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'attrs'],
  observeTexts: ['HEAD1', 'CHILD1'],
  attrProbes: [{ key: 'block', selector: 'blockRoot', attrs: ['class', 'aria-expanded', 'data-type', 'role'] }],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop', 'toggleish'],

  expect: [
    { facet: 'text:HEAD1', op: 'gt', value: 0, at: 1 },
    { facet: 'text:CHILD1', op: 'gt', value: 0, at: 4 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
