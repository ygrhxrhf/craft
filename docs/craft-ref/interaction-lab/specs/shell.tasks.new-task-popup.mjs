/**
 * spec: shell.tasks.new-task-popup
 *
 * 主交互：**任务屏上按 `Ctrl-J`（`OPEN_NEW_TASK_POPUP`）**。
 *
 * 为什么这一族要采：`keyboard.md:296` 逐字写着「表 D（任务视图 23 项）**一条都没在屏幕上按过**
 * ⇒ 整张表此前全是契约级证据」。本 spec 是表 D 的第一条上屏。
 *
 * 判据：
 *  ① 两侧任务屏都渲染出来了（同名文本计数在场，进 selfCheck）；
 *  ② `Ctrl-J` 之后**新建任务的承载面**：官方弹独立弹窗（`popup-backdrop` ＋ 输入框 `新任务`
 *     ＋ 排期/截止两枚按钮）；本地实测**无反应**（正文长度一字不变、无新对话框）。
 *     ⇒ 差异本身由 differ 判，不写进 selfCheck。
 */
export default {
  id: 'shell.tasks.new-task-popup',
  wave: 1,
  surface: 'shell.tasks',
  target: 'both',
  builtFrom: [
    'keyboard.md:107-131（表 D · 任务视图／合集 23 项；OPEN_NEW_TASK_POPUP = ⌘J / Ctrl-J）',
    'keyboard.md:296（表 D 整表一条都没在屏幕上按过）',
  ],

  selectors: {
    // 任务屏没有编辑器体 ⇒ 焦点宿主退回 body（本 spec 不判"焦点是否在编辑器内"）
    editorBody: { official: 'body', local: 'body' },
    newTaskPopup: { official: '[data-testid="popup-backdrop"]', local: '[role="dialog"]' },
    taskInput: { official: 'input[aria-label="新任务"]', local: 'input[placeholder^="添加任务"]' },
  },

  setup: [
    { op: 'navigate', url: '/tasks', settleMs: 3500 },
  ],

  steps: [
    { op: 'key', chord: 'Control+j', settleMs: 1800, label: 'Ctrl-J (OPEN_NEW_TASK_POPUP)' },
    { op: 'key', chord: 'Escape', settleMs: 800, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'attrs'],
  observeTexts: ['任务'],
  stateSelectors: ['newTaskPopup', 'taskInput'],
  attrProbes: [{ key: 'taskInput', selector: 'taskInput', attrs: ['placeholder', 'aria-label'] }],

  expect: [
    // 两侧共有的量：任务屏渲染出来了（"任务"这个词在场）
    { facet: 'text:任务', op: 'gt', value: 0, at: 0 },
  ],

  teardown: [{ op: 'restoreCaret' }],
};
