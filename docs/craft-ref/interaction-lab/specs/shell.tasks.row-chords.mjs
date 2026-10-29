/**
 * spec: shell.tasks.row-chords
 *
 * 主交互：**任务视图里「作用在任务行上」的六条键**（表 D 最后六条没有矩阵证据的行）：
 * `TOGGLE_DONE_SLASH`(Ctrl-/)／`SET_CANCELLED`(Ctrl-Alt-Shift-T)／`SCHEDULE_FOR_TODAY`(Ctrl-Alt-S)／
 * `OPEN_SCHEDULE_DATEPICKER`(Ctrl-Shift-S)／`OPEN_DEADLINE_DATEPICKER`(Ctrl-Shift-D)／
 * `REMIND_IN_ONE_HOUR`(Ctrl-Alt-R)。
 *
 * 为什么这一族要采：覆盖率扫描（第 389 批，逐行把 Windows 列对到 spec 的 chord）算出
 * 表 A–E 共 93 行里 77 行有矩阵证据，剩下 16 行里**有 6 行是这组任务行键**——
 * 它们此前只有"点菜单能找到同名动作"的证据（`G1596`–`G1598`），**没有一次是从键盘按出来的**。
 *
 * 判据（官方侧）：
 *  ① 起点是一条**排好期的 todo**（REST `taskInfo.scheduleDate`，非 UI 建）；
 *  ② 点中行拿到行焦点（`DIV[role=button]`），再按键；
 *  ③ 读数用 REST `taskInfo`：`done`（勾掉）／`canceled`（划线）／`scheduleDate`（排期）／
 *     `backdrop`＋焦点框（两种日期面板）；
 *  ★ 阴性对照：同序列里插一条**没绑定的** `Ctrl-Alt-U`，它必须零变化——
 *    否则"有变化"就分不清是键生效还是点击/渲染抖动（`G1574` 批就在这里踩过）。
 *
 * 判据（本地侧）：本地任务屏**没有任何键盘层**（`keymap.ts` 里 `TOGGLE_DONE`／`REMIND_IN_ONE_HOUR`
 * 等一个都没有，任务视图只有鼠标菜单），所以本 spec 在本地只采"按键后行状态不变"这一侧。
 */
export default {
  id: 'shell.tasks.row-chords',
  wave: 1,
  surface: 'shell.tasks',
  target: 'both',
  builtFrom: [
    'keyboard.md:157-163（表 D · 六条任务行键）',
    'gap.md G1596／G1597／G1598（三个时间动作的**菜单入口**，本批补键盘侧）',
    'gap.md G1574（任务行要先有焦点，键才生效）',
    '第 389 批覆盖率扫描：表 A–E 93 行中 16 行无矩阵证据，其中 6 行是本族',
  ],

  selectors: {
    editorBody: { official: 'body', local: 'body' },
    taskRow: { official: 'div,span,p', local: 'div,span,p' },    popupClose: { official: '[data-testid="open-in-app-popup-close"]', local: '[data-testid="open-in-app-popup-close"]' },
  },

  setup: [
    { op: 'navigate', url: "https://docs.craft.do/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/tasks", settleMs: 5500, gotoTimeoutMs: 60000, targets: ['official'] },
    { op: 'restTask', tags: ['RC1', 'RC2'], scheduleToday: true, targets: ['official'] },
    // ★ RC3 **不带排期**：只有它才能证明 SCHEDULE_FOR_TODAY 真的写了日期
    { op: 'restTask', tags: ['RC3'], scheduleToday: false, targets: ['official'] },
    { op: 'navigate', url: "https://docs.craft.do/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/tasks", settleMs: 5500, gotoTimeoutMs: 60000, targets: ['official'] },
    { op: 'click', selector: 'popupClose', settleMs: 1200, targets: ['official'] },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], targets: ['official'] },
    // 行焦点：单变量序列每次都回到同一条行上
    { op: 'clickTextIn', selector: 'taskRow', text: 'RC1', settleMs: 1000, targets: ['official'] },
    { op: 'navigate', url: '/tasks/all', settleMs: 9000, gotoTimeoutMs: 60000, targets: ['local'] },
  ],

  steps: [
    // 阴性对照：没绑定的组合键，必须零变化
    { op: 'key', chord: 'Control+Alt+u', settleMs: 1200, label: 'Ctrl-Alt-U (unbound control)' },
    // ★ 读回要等约 5s：REST 的 taskInfo 在按键后 1.2s 仍是旧值、5s 才落定（第 389 批实测）。
    //   这个等待写进 label，免得后来人以为"没变化"。
    { op: 'wait', ms: 4500, label: 'wait 4.5s for REST settle #0' },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], label: 'readback after control' },
    // ① 勾掉
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (blur before refocus)', targets: ['official'] },
    { op: 'clickTextIn', selector: 'taskRow', text: 'RC1', settleMs: 900, label: 'refocus RC1', targets: ['official'] },
    { op: 'key', chord: 'Control+Slash', settleMs: 1200, label: 'Ctrl-/ (TOGGLE_DONE_SLASH)' },
    { op: 'wait', ms: 4500, label: 'wait 4.5s #1' },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], label: 'readback after Ctrl-/' },
    // ② 取消
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (blur before RC2)', targets: ['official'] },
    { op: 'clickTextIn', selector: 'taskRow', text: 'RC2', settleMs: 900, label: 'focus RC2', targets: ['official'] },
    { op: 'key', chord: 'Control+Alt+Shift+t', settleMs: 1200, label: 'Ctrl-Alt-Shift-T (SET_CANCELLED)' },
    { op: 'wait', ms: 4500, label: 'wait 4.5s #2' },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], label: 'readback after SET_CANCELLED' },
    // ③ 一小时后提醒
    { op: 'key', chord: 'Control+Alt+r', settleMs: 1200, label: 'Ctrl-Alt-R (REMIND_IN_ONE_HOUR)' },
    { op: 'wait', ms: 4500, label: 'wait 4.5s #3' },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], label: 'readback after remind' },
    // ④ 排期面板 / ⑤ 截止面板：观测的是**浮层**（backdrop + 焦点框），不是 REST
    { op: 'key', chord: 'Control+Shift+s', settleMs: 1600, label: 'Ctrl-Shift-S (OPEN_SCHEDULE_DATEPICKER)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close schedule picker)' },
    { op: 'key', chord: 'Control+Shift+d', settleMs: 1600, label: 'Ctrl-Shift-D (OPEN_DEADLINE_DATEPICKER)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close deadline picker)' },
    // ⑥ 安排到今天：**先点没有排期的 RC3**，否则"本来就是今天"看不出变化
    { op: 'key', chord: 'Escape', settleMs: 500, label: 'Escape (blur)', targets: ['official'] },
    { op: 'clickTextIn', selector: 'taskRow', text: 'RC3', settleMs: 900, label: 'focus RC3 (unscheduled)', targets: ['official'] },
    { op: 'key', chord: 'Control+Alt+s', settleMs: 1200, label: 'Ctrl-Alt-S (SCHEDULE_FOR_TODAY)' },
    { op: 'wait', ms: 4500, label: 'wait 4.5s #4' },
    { op: 'restTaskState', tags: ['RC1', 'RC2', 'RC3'], label: 'readback after schedule-today' },
  ],

  // ★ 不用 dom／a11y 档（第 389 批实测）：两侧 DOM 规模差三个数量级（官方任务屏 300 文本字 vs 本地 6500），
  //   dom 差集会产出 6000+ 行噪声把真信号埋掉。这一族的判定量是**文本名册的 delta**与 REST 读回。
  observe: ['text', 'state'],
  observeTexts: ['RC1', 'RC2', '任务', '今天', '日期', '截止日期'],
  stateSelectors: ['editorBody'],

  // ★ 每次重新聚焦前先 Escape 失焦：官方任务行**点第二下会进编辑态**（TEXTAREA），
  //   编辑态下这几条键不生效（round-310 实测）——那样读到的'无变化'是假的。
  expect: [
    // 两侧都渲染出了任务屏（"任务"在场）；行的存在与否本身是差异信号，不进 selfCheck
    { facet: 'text:任务', op: 'gt', value: 0, at: 0 },
  ],
  // 官方侧多了一个"读回"步（restTaskState 只写日志、不产出观测面），selfCheck 只在两侧共有的步上求值
  selfCheckOnly: ['official', 'local'],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
  ],

  teardown: [
    { op: 'restTaskCleanup', tags: ['RC1', 'RC2', 'RC3'] },
    { op: 'restoreCaret' },
  ],
};
