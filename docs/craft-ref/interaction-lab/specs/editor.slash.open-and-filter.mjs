/**
 * spec: editor.slash.open-and-filter
 *
 * 主交互：空块里打 `/` 唤起插入面板，再输入关键字过滤（候选集收敛）。
 * 官方依据：`keyboard.md` 表 B `CMD_MENU = /`（裸斜杠，无需修饰键）；
 * `interactions.md` V10（插入 tab 16 个项目）；`capture.md` 三条教训
 * （`/` 面板节点不在 outerHTML 里 ⇒ 判在不在用 innerText）。
 *
 * 判据（**行为**，不是形态）：
 *  - 打 `/` 后面板出现：`domLength` 相对基线显著增大（两侧各自比自己的基线）；
 *  - 过滤后候选收敛：`domLength` 回落到接近基线（面板收起或候选清空）；
 *  - 正文块文本两侧都是 `/` → `/wen`（斜杠留在块里，没被菜单吃掉）。
 *
 * ★ 已声明偏差（产品级，见 gap.md）：本地 `/` 菜单是**分组带副标题**的长列表
 *   （`基础块 / 文本 / 普通文本段落 / 标题 1 …`，`role="listbox"`），
 *   官方是**扁平 20 项**（`列表 / 文本样式 / 装饰 / … / 插入看板集合`）。
 *   ⇒ `blocks` 两侧一致仍参与判定；候选**文案**差异按 deviations 声明、不参与判定。
 *
 * 采到的逐字证据（2026-10-23，smoke-01 + probe-verbatim）：
 *  官方面板 20 项逐字：列表 文本样式 装饰 颜色 缩进 对齐 字体 文字格式 日期和时间
 *    插入文件 插入片段 插入表格 插入分隔符 动作 提醒我… 取消样式 插入白板
 *    插入表格集合 插入画廊集合 插入看板集合（容器 `[data-testid="command-menu"]`）
 *  本地面板：`role="listbox"`，首三项 基础块 / 文本 / 普通文本段落，含「分隔线 - 极细」等细档
 */
export default {
  id: 'editor.slash.open-and-filter',
  wave: 0,
  surface: 'editor.slash-menu',
  target: 'both',
  builtFrom: ['keyboard.md 表 B CMD_MENU', 'interactions.md V10', 'capture.md 取 DOM 快照教训 1/2'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    slashMenu: { official: '[data-testid="command-menu"]', local: '[role="listbox"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.slash.open-and-filter', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.slash.open-and-filter', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 1200, label: 'type slash' },
    { op: 'type', text: 'wen', settleMs: 1200, label: 'type wen (filter)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['插入', '未找到'],
  stateSelectors: ['editorBody', 'slashMenu'],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  expect: [
    // ① 打 `/` 那一刻面板**在场**（第 1 步；两侧容器名不同，但都是"菜单在不在"这件事）
    { facet: 'state:slashMenu', op: 'gt', at: 1, value: 0 },
    // ② 斜杠本身留在正文块里（没被菜单吃掉）
    { facet: 'blocks', op: 'equals', at: 1, value: ['/'] },
    // ③ 过滤词也进正文块 ⇒ 侧栏/编辑器的"斜杠命令"是**就地打字**语义
    { facet: 'blocks', op: 'equals', at: 2, value: ['/wen'] },
    { facet: 'blocksCount', op: 'count', at: 2, value: 1 },
  ],

  /** 面板形态是产品级差异（官方扁平 20 项 vs 本地分组长列表），声明掉、不参与判定。 */
  deviations: [
    {
      facet: 'added-only-local',
      reason: '本地 / 菜单的**无匹配文案**是「无匹配命令」；官方过滤后直接把面板收起、不给无匹配文案（G1544 同源）',
      ref: 'chk-roster：官方 added=["/wen"]、本地 added=["/wen","无匹配命令"] · gap.md G1544',
    },
    {
      facet: 'countΔ:插入',
      reason: '菜单项文案与条数不同（官方扁平 8 条含「插入」：插入文件/片段/表格/分隔符/白板/表格集合/画廊集合/看板集合；本地 4 条）—— 与上面两条同源',
      ref: 'probe-verbatim.json · gap.md（本轮新登记）',
    },
    {
      facet: 'added-only-official',
      reason: '官方 / 菜单 20 项文案（列表/文本样式/装饰/…/插入看板集合）本地无对应扁平项',
      ref: 'gap.md（本轮新登记）· probe-verbatim.json',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 600 }, { op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
