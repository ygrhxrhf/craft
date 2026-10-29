/**
 * spec: shell.tasks.section-fold-keys
 *
 * 主交互：**任务视图「分组标题」的折叠键族** —— 表 D 的 `SECTION_TOGGLE_COLLAPS`(space)／
 * `SECTION_COLLAPSE`(←)／`SECTION_EXPAND`(→)。
 *
 * 为什么这一族要采：`keyboard.md:165` 记了静态结论——这三个键用 `Vn`（只写键条件、四个修饰
 * 字段一概不写）⇒ 任务视图里 `space`／`←`／`→` **在任何修饰组合下都命中**。但一直没上屏：
 * 本批之前，这两条只停在"表 D 契约级"。
 *
 * ★ 前置（第 381/382 批两次探到的坑）：分组标题是**内容区的整行 `<button>`**（宽 1120、高 40），
 *   不是「今天／明天」那种日期字样——后者是**顶部视图切换页签**，点它等于换视图，不是折叠。
 *   且必须先把焦点放到这行按钮上，键才会走到它的处理器；焦点在 body 时 `Space` 落进
 *   「添加任务」的 textarea。⇒ 本 spec 用 `focusText`（不点击，只聚焦）。
 *
 * 判据：
 *  ① 任务屏渲染出来（「任务」在场，进 selfCheck）；
 *  ② 官方：聚焦「未归档」标题后，`←` 收起（行数 2→0）、`→` 展开（0→2）、`Space` 与
 *     `Ctrl+Space` 都能**来回切换**；重复按同向键**不再变化**（幂等）。
 *     本地：任务屏是单张平表（`h1 任务收件箱` ＋ 一个 `<section>`），**没有分组标题行**可聚焦。
 */
export default {
  id: 'shell.tasks.section-fold-keys',
  wave: 1,
  surface: 'shell.tasks',
  target: 'both',
  builtFrom: [
    'keyboard.md:157-158（表 D · SECTION_TOGGLE_COLLAPS / SECTION_COLLAPSE / SECTION_EXPAND）',
    'keyboard.md:165（Vn：任意修饰组合都命中）',
    'gap.md G1591（块选择态下 Space 是"插入块"，佐证 Space 按上下文分派）',
  ],

  selectors: {
    // 任务屏没有编辑器体 ⇒ 焦点宿主退回 body
    editorBody: { official: 'body', local: 'body' },
    sectionRow: { official: '[data-testid="editor-body"]', local: '[data-testid="task-groups"]' },
    popupClose: { official: '[data-testid="open-in-app-popup-close"]', local: '[data-testid="open-in-app-popup-close"]' },
  },

  setup: [
    // ★ 官方空间根会重定向到「所有文档」，不是任务屏 ⇒ 任务屏只能走绝对 URL。
    //   本地 /tasks 即「未归档」，两侧任务屏内容不同是本 spec 的观测对象，不是 setup 缺陷。
    { op: 'navigate', url: "https://docs.craft.do/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/tasks", settleMs: 5500, gotoTimeoutMs: 60000, targets: ['official'] },
    { op: 'navigate', url: '/tasks', settleMs: 9000, gotoTimeoutMs: 60000, targets: ['local'] },
    { op: 'click', selector: 'popupClose', settleMs: 1200, label: 'close open-in-app popup', targets: ['official'] },
  ],

  steps: [
    // 官方：聚焦内容区「未归档」整行按钮（本地无此元素 ⇒ 该步跳过）
    { op: 'focusText', text: '未归档', minWidth: 400, settleMs: 400, label: 'focus 未归档 header', targets: ['official'] },
    { op: 'key', chord: 'ArrowLeft', settleMs: 900, label: 'ArrowLeft #1 (SECTION_COLLAPSE)' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 900, label: 'ArrowLeft #2 (idempotent)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 900, label: 'ArrowRight #1 (SECTION_EXPAND)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 900, label: 'ArrowRight #2 (idempotent)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space #1 (SECTION_TOGGLE_COLLAPS)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space #2 (toggle back)' },
    { op: 'key', chord: 'Control+Space', settleMs: 900, label: 'Ctrl+Space #1 (Vn: modifier still hits)' },
    { op: 'key', chord: 'Control+Space', settleMs: 900, label: 'Ctrl+Space #2 (toggle back)' },
    { op: 'key', chord: 'Shift+ArrowLeft', settleMs: 900, label: 'Shift+ArrowLeft (Vn: modifier still hits)' },
    { op: 'key', chord: 'ArrowRight', settleMs: 900, label: 'ArrowRight (restore expanded)' },
  ],

  observe: ['dom', 'text', 'state'],
  observeTexts: ['任务', '未归档', '今天', '即将进行', '所有任务'],
  stateSelectors: ['editorBody', 'sectionRow'],

  expect: [
    { facet: 'text:任务', op: 'gt', value: 0, at: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: '本 spec 的焦点本就在分组标题按钮上（不是编辑器），焦点档不参与判定', ref: 'lab.mjs focusText' },
  ],

  teardown: [{ op: 'restoreCaret' }],
};
