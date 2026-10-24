/**
 * spec: browse.box-select.drag-marquee
 *
 * 主交互：**浏览屏的框选（drag marquee）** —— 从空白处按住拖出一个矩形，划过的条目被选中。
 *
 * 静态依据（G1135／G1136／G1137／G1138，均在盘上结案，本 spec 是把它搬到屏幕上验）：
 *  - G1135 ⑥：渲染面逐字 `createPortal(<div className="_rubberBand_fdch5_1" style={{top,left,width,height}}/>, document.body)`
 *    ＋ CSS 逐字 `position:fixed; background:var(--accent-100); border:1px solid var(--accent-500);
 *    border-radius:var(--radius-sm); pointer-events:none; z-index:10`。
 *  - G1135 ①：**起手否决名单**逐字 `t.closest("[data-item-id], a, button, input, textarea, select, [contenteditable='true']")!=null`
 *    ⇒ **必须从空白处起手**（落在卡片/链接/按钮上不起手）。
 *  - G1135 ②：**起手阈值** `AVt=5`（pointermove 欧氏距离 < 5 不进入框选）。
 *  - G1135 ⑤：**起手即清选择**（`clearSelection()`），并记下起手前的选择集。
 *  - G1135 ④：**命中集每次整体替换**（`replaceSelection`，锚点＝命中集最后一个）。
 *  - G1137：条目寻址属性是 `data-item-id`（值是 uuid）。
 *  - G1138：★ **`_isActive_` 不能当选中判据**（静止态 8/8 张卡都带该类）；
 *    选中判据要走 **`role=checkbox` 的 `aria-checked`**。
 *
 * 本 spec 的两侧口径（实测 2026-10-24）：
 *  - 官方：`[data-item-id]` 14 枚、`role=checkbox` 14 枚；从空白起手斜拖 ⇒
 *    矩形 `_rubberBand_fdch5_1` 出现（`position:fixed`、`z-index:10`、`pointer-events:none`、
 *    底色 `rgba(46,109,233,0.12)`、边框 `solid 0.8px rgb(46,109,233)`、`border-radius:4px`），
 *    划过处 `aria-checked=true` 由 0 → 6 → 8；**松手后矩形消失、选中保留**。
 *  - 本地：`[data-item-id]` **0 枚**、`role=checkbox` **0 枚**、`[class*='rubber']` **0 枚**；
 *    同样起手斜拖 ⇒ **三档全零变化**（无矩形、无选中）。
 *
 * 判据（只用**两侧共有**的量，差异交给 differ）：
 *  - `blocksCount`：浏览屏无块概念，恒 0（两侧共有，仅作"页面没被拖坏"的自检）。
 *  ★ 选中集与矩形**不放进 expect**：官方有、本地无 ⇒ 产品级差异，按 V168/V169 的教训交给 differ。
 *
 * ★ 本 spec **只读**：不新建/不删除/不改名任何文档（框选不写数据，硬规则 1 天然满足）。
 *   但为了有"可划过的条目"，依赖浏览屏上**已有**文档；官方侧本就有 14 枚。
 *   本地侧若文档为 0 枚 ⇒ 框选无对象（读数仍为"零变化"，与"有对象也不变"同判；见台账诚实边界）。
 */
export default {
  id: 'browse.box-select.drag-marquee',
  wave: 1,
  surface: 'browse.box-select',
  target: 'both',
  builtFrom: [
    'gap.md G1135（严格矩形相交 j7e ＋ 七条配套：否决名单/阈值 5/自滚/整体替换/起手清/portal 矩形/焦点注册表）',
    'gap.md G1136（命中器按型制分派：list／cards／waterfall 三型 ＋ folderItems）',
    'gap.md G1137（浏览屏条目寻址属性 data-item-id）',
    'gap.md G1138（★ _isActive_ 不能当选中判据；选中判据走 role=checkbox 的 aria-checked）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 3000 },
  ],

  /**
   * ★ 坐标是**视口**坐标（1440×900）。官方侧内容视口 x ∈ [288,1440]、卡片首排 y=116 起、卡高 260。
   *   起手点 (295,500) 落在**卡片左侧的空白带**上（G1135 ① 的否决名单要求空白起手）。
   *   本地侧布局不同，但同样从内容区左侧空白起手；两侧都"划过若干条目"。
   */
  steps: [
    // ★ 矩形只在**按住期间**存在 ⇒ 拆成 dragHold →（观测）→ dragEnd 三步，否则矩形恒 null。
    { op: 'dragHold', from: { x: 295, y: 500 }, to: { x: 795, y: 200 }, steps: 10, settleMs: 400, label: 'dragHold marquee (blank -> across cards, held)' },
    { op: 'dragEnd', settleMs: 600, label: 'dragEnd (release; band unmounts, selection stays)' },
    { op: 'wait', ms: 500, label: 'wait (settle)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'marquee'],
  observeTexts: [],
  stateSelectors: ['editorBody'],

  expect: [
    // 两侧共有：浏览屏没有"编辑器块"，恒 0 ⇒ 仅作"页面没被拖坏"的自检
    { facet: 'blocksCount', op: 'count', value: 0 },
  ],

  teardown: [{ op: 'restoreCaret' }],
};