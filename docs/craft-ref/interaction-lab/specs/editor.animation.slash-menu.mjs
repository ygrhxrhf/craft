/**
 * spec: editor.animation.slash-menu
 *
 * 主交互：**斜线菜单的入场动效 ＋ 菜单项悬停动效**。
 *
 * 为什么这一族要采：`observe: ['animation']` 与 `a11y`／`db` 一样从 **Wave 0 就挂着未实现**。
 * 静态账只有 token 层（两侧三档时长/缓动**完全一致**：`.15s`／`.2s`／`.5s` ＋
 * `cubic-bezier(.4,0,.2,1)`，见 `tokens.md:91` 与本地 `globals.css:240`），
 * 而「**哪些元素真的在动、动多久**」一条都没量过。
 *
 * ★ 采集方式是**事件式**不是采样式（本批为此新加探针）：监听 `animationstart/end` 与
 *   `transitionrun/end`。采样式会漏——本地菜单 `animation: enter .15s` 只有 150ms，
 *   `waitForTimeout(100)` 加一次 `page.evaluate` 的往返就超过它，采到的永远是空数组
 *   （本批实测踩到）。时长直接取事件的 `elapsedTime`（规范值），不自己掐表。
 * ★ 动画名两侧不可比：官方是构建哈希（`jOiMjk1699283064`）、本地是语义名（`enter`）
 *   ⇒ 探针已归一成 `(anim)`，可比的是「哪个属性在动 ＋ 多久 ＋ 落在哪种标签上」。
 *
 * 判据（都不写成 selfCheck，因为"有没有动"正是待测的差异本身）：
 *  - `animation.events`：入场动画 / 悬停过渡；
 *  - `animation.running`：采样时刻仍在循环的动效（只记不判）。
 */
export default {
  id: 'editor.animation.slash-menu',
  wave: 1,
  surface: 'editor.animation',
  target: 'both',
  builtFrom: [
    'README（`observe: animation` 自 Wave 0 未实现，本批首次落地）',
    'tokens.md:91 ＋ css-20261022（官方三档 `--transition-*` 与 `--transition-easing`）',
    'src/app/globals.css:240（本地同值 token）＋ slash-menu 项的 `transition-colors duration-150 ease-craft`',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    slashMenu: { official: '[data-testid="command-menu"]', local: '[role="listbox"]' },
    // 两侧菜单项都是 button（官方 20 枚直接子元素；本地带 role=option）⇒ 取第一枚。
    menuItemFirst: { official: '[data-testid="command-menu"] button >> nth=0', local: '[role="listbox"] button[role="option"] >> nth=0' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.animation.slash-menu', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.animation.slash-menu', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: '/', settleMs: 900, label: 'type "/" (menu mounts)' },
    { op: 'hover', selector: 'menuItemFirst', settleMs: 500, label: 'hover first menu item' },
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (close menu)' },
  ],

  observe: ['dom', 'text', 'blocks', 'state', 'animation'],
  stateSelectors: ['editorBody', 'slashMenu'],

  expect: [
    // 两侧共有的量：菜单确实开了、斜杠留在正文里
    { facet: 'state:slashMenu', op: 'gt', value: 0, at: 1 },
    { facet: 'blocks', op: 'equals', value: ['/'], at: 1 },
  ],

  /** 菜单**文案/结构**差异已由 G1544 承载（官方扁平 20 项 vs 本地分组长列表），本 spec 的判据是动效 ⇒ 声明掉不参与判定。 */
  deviations: [
    {
      facet: 'added-only-official',
      reason: '官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关',
      ref: 'gap.md G1544；editor.slash.open-and-filter 同一声明',
    },
    {
      facet: 'removed-only-local',
      reason: '本地列表屏的同步状态串（同步中/保存中）在官方无对应物；属外壳状态不是编辑器内容',
      ref: 'observe.mjs NOISE_RULES <SAVING>',
    },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
