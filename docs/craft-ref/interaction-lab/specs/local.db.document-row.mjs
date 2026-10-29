/**
 * spec: local.db.document-row
 *
 * 主交互：**本地库里那一行到底发生了什么** —— 建文档 → 打字 → 走产品路径删进最近删除。
 *
 * 为什么这一族要采：`observe: ['db']` 是 Wave 0 起挂着三档里的最后一档。而且在本地它
 * **特别容易说错**：文档 `content` 按红线**不进同步白名单**
 * （`src/lib/sync/tables.ts` 的 `DOC_CONTENT_COLS`）⇒ "编辑器里看得见"与"库里存着"是两件事。
 * 没有这一档，任何"操作已生效"都只有屏幕一侧的证据。
 *
 * ★ 这一档是**单侧**的：官方没有可查的库，所以它只进 selfCheck、不进两侧 differ。
 *   本 spec 在官方侧会照常建/删文档（对拍通路不变），只是 `db` 字段记 `skipped`。
 *
 * 判据（全部只在本地侧成立）：
 *  ① 建完立刻能在库里查到这一行（`exists=true`、`isDeleted=false`、标题逐字）；
 *  ② 打完字 `contentLen` **仍为 0** —— 这正是红线的可观测后果，写死在断言里防回归；
 *  ③ 走「移至最近删除」之后 `isDeleted` **翻成 true**（行还在，不是物理删除）。
 */
export default {
  id: 'local.db.document-row',
  wave: 1,
  surface: 'shell.db',
  target: 'both',
  builtFrom: [
    'README（`observe: db` 自 Wave 0 未实现，本批落地；单侧自证面）',
    'src/lib/sync/tables.ts:11（DOC_CONTENT_COLS 不进 document 同步白名单 ⇒ content 不落库）',
    'src/prisma/contract.prisma（documents 行字段：title／isDeleted／parentId／folderId）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-local.db.document-row', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-local.db.document-row', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'DBCONTENT', settleMs: 1200, label: 'type DBCONTENT' },
    { op: 'deleteTempDoc', settleMs: 2500, label: 'delete via product path' },
  ],

  // 库面是**单侧**的：官方没有可查的库 ⇒ 断言只在本地侧求值。
  selfCheckOnly: ['local'],

  observe: ['dom', 'text', 'blocks', 'db'],
  observeTexts: ['DBCONTENT'],
  stateSelectors: ['editorBody'],

  expect: [
    // ① 建完就在库里（基线步）。★ 标题**不在基线步断言**：建文档与写标题是两次异步落库，
    //   基线读数时 title 还是空串（实测），到第 1 步才落定。
    { facet: 'db:exists', op: 'equals', value: true, at: 0 },
    { facet: 'db:isDeleted', op: 'equals', value: false, at: 0 },
    { facet: 'db:title', op: 'equals', value: 'QODER-ILAB-local.db.document-row', at: 1 },
    // ② 打完字仍在、文本进正文，但 content 不进库（红线）
    { facet: 'blocks', op: 'equals', value: ['DBCONTENT'], at: 1 },
    { facet: 'db:contentLen', op: 'equals', value: 0, at: 1 },
    // ③ 删完 isDeleted 翻 true
    { facet: 'db:isDeleted', op: 'equals', value: true, at: 2 },
  ],

  /**
   * 本 spec 的判据是**库面**（只在本地侧求值）。两侧文本名册的差异来自外壳：
   * 删除前后侧栏行、官方侧栏的组织方式与本地不同（本地 246 篇历史文档的占位行、官方 2 张卡），
   * 与本 spec 无关 ⇒ 按 README「已声明偏差」判据声明掉，不参与判定。
   */
  deviations: [
    { facet: 'added-only-local', reason: '外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关', ref: 'editor.paste.plain-text 同族噪声' },
    { facet: 'added-only-official', reason: '同上', ref: 'editor.paste.plain-text 同族噪声' },
    { facet: 'removed-only-local', reason: '同上', ref: 'editor.paste.plain-text 同族噪声' },
    { facet: 'removed-only-official', reason: '同上', ref: 'editor.paste.plain-text 同族噪声' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
