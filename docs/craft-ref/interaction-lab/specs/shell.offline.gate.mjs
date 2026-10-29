/**
 * spec: shell.offline.gate
 *
 * 主交互：**断网后点「新建文档」**——官方是"置灰 / 点后弹提示 / 静默"三选一的哪一档？
 *
 * 为什么这一族要采：`dialogs.md` 的「仍未采到」里挂着一条原话——
 * 「离线门禁是"禁用控件"还是"点击后弹提示"—— 两种都可能，未观测」。而 `dialogs.md §四`
 * 列了十行 `alert.not.connected.*` / `alert.reconnect.*` 门禁文案，说明**官方有多种告警**；
 * 到底哪一个动作给哪一档，此前全靠文案推。
 *
 * 判据：
 *  ① **阳性对照先行**：CDP 断网后 `navigator.onLine === false` 且 `fetch` 抛错
 *     （否则后面读到的"没变化"不作数——第 389 批的教训）；
 *  ② 断网后点「新建文档」，看四个量：`bodyTextLength`／`location.href`／有无 toast／
 *     按钮 `disabled` 属性；
 *  ③ 恢复联网后**再点一次**同一按钮：必须能建出文档（证按钮本身可用，差异来自断网）。
 */
export default {
  id: 'shell.offline.gate',
  wave: 1,
  surface: 'shell.offline',
  target: 'both',
  builtFrom: [
    'dialogs.md §四（离线门禁清单十行）与「仍未采到」第三条（置灰 vs 弹提示）',
    '第 389 批教训：没有阳性对照的"没变化"不作数（G1605）',
  ],

  selectors: {
    editorBody: { official: 'body', local: 'body' },
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 4500, gotoTimeoutMs: 60000 },
  ],

  steps: [
    { op: 'netProbe', label: 'netProbe (online baseline)' },
    { op: 'setOffline', offline: true, settleMs: 1500, label: 'go offline' },
    { op: 'netProbe', label: 'netProbe (must be offline)' },
    { op: 'click', selector: 'newButton', settleMs: 3000, label: 'click 新建文档 while offline' },
    { op: 'setOffline', offline: false, settleMs: 1500, label: 'back online' },
    { op: 'netProbe', label: 'netProbe (restored)' },
    { op: 'click', selector: 'newButton', settleMs: 4000, label: 'click 新建文档 while online (positive control)' },
  ],

  observe: ['dom', 'text', 'state', 'attrs'],
  observeTexts: ['新建文档', '无标题', '离线', '网络'],
  stateSelectors: ['newButton'],
  attrProbes: [{ key: 'newButton', selector: 'newButton', attrs: ['aria-disabled', 'disabled'] }],

  expect: [
    { facet: 'text:新建文档', op: 'gt', value: 0, at: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
