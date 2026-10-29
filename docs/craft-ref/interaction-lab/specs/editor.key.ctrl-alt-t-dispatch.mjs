/**
 * spec: editor.key.ctrl-alt-t-dispatch
 *
 * 主交互：**`Ctrl-Alt-T` 按**块型分派**——折叠块上＝折叠/展开；任务块上＝切换完成**。
 *
 * 为什么这一族要采：`keyboard.md:51/132` 静态记着"同一物理键在「折叠块」与「任务标记完成」两处都被印"，
 * 但**屏上从未在同一会话里对两种块型各按一次**。`G1593` 证了折叠块上能改折叠态；
 * `G1574` 证了官方任务行能靠 `Ctrl-Alt-T` 切完成——但那是**任务视图**里的行，不是**编辑器里的任务块**。
 * 本 spec 补的是后者，并把两者放进同一次运行里做对照。
 *
 * 判据：
 *  ① 折叠块：`data-open`/`aria-expanded` 或子块可见性变化（`G1593` 用子块计数）；
 *  ② 任务块：块的 `type`／`checked` 变化（用 REST 读回 `markdown` 是否变 `- [x]`）。
 *  ★ 本 spec 不判"应该哪种"，只把两种块型上同键的效果并列记下来。
 */
export default {
  id: 'editor.key.ctrl-alt-t-dispatch',
  wave: 1,
  surface: 'editor.key.toggle',
  target: 'both',
  builtFrom: [
    'keyboard.md:51（TOGGLE_TOGGLES = Ctrl-Alt-T）／:132（同键兼「折叠块」与「任务标记完成」）',
    'gap.md G1593（折叠块上 Ctrl-Alt-T 能改折叠态）',
    'gap.md G1574（任务视图的行上 Ctrl-Alt-T 切完成——但那是任务屏，不是编辑器内任务块）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    toggleish: { official: '[data-testid="editor-body"] [aria-expanded], [data-testid="editor-body"] [class*="toggle"]', local: '.ProseMirror [data-open], .ProseMirror .toggle-summary' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.ctrl-alt-t-dispatch', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.ctrl-alt-t-dispatch', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    // A 段：任务块上按 Ctrl-Alt-T
    { op: 'type', text: 'TASKA', settleMs: 700, label: 'type TASKA' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 1000, label: 'Ctrl-Shift-6 (TODO_LIST → task block)' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1400, label: 'Ctrl-Alt-T on TASK block #1' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1600, label: 'Ctrl-Alt-T on TASK block #2' },

    // B 段：另起一块，造折叠块后按同一个键
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (new block)' },
    { op: 'type', text: 'FOLDB', settleMs: 700, label: 'type FOLDB' },
    { op: 'typeKeys', text: '/', settleMs: 900, label: 'slash menu' },
    { op: 'clickText', text: '列表', settleMs: 1000, label: 'open 列表 submenu', targets: ['official'] },
    { op: 'typeKeys', text: 'toggle', settleMs: 900, label: 'filter toggle', targets: ['local'] },
    { op: 'clickText', text: '折叠列表', settleMs: 1300, label: 'pick 折叠列表' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1400, label: 'Ctrl-Alt-T on TOGGLE block' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['TASKA', 'FOLDB'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop', 'toggleish'],

  expect: [
    { facet: 'text:TASKA', op: 'gt', value: 0, at: 1 },
    { facet: 'text:FOLDB', op: 'gt', value: 0, at: 5 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
