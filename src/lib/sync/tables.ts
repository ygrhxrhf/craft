// 列名单以 src/prisma/contract.prisma 实际字段为准（已逐一核对）：
// - daily_notes_config：contract 无 format/template，按全列改为 folderId/templateId/startTime
// - user：仅同步设置类字段（spec 5.1「仅」），email/password/createdAt 不入 payload
// - collection 五表 / comment / comment_thread / document_share：按同模式补全（全列白名单）
export const DOC_META_COLS = [
  'title', 'icon', 'coverImage', 'coverType', 'coverImages', 'coverShuffle', 'coverFrame', 'coverCropMask', 'coverWidth', 'coverAspect', 'coverRawWidth', 'coverRawAspect', 'font', 'width', 'pageStyle',
  'parentId', 'folderId', 'order', 'isDeleted', 'deletedAt',
  'isDailyNote', 'dailyNoteDate', 'isTemplate', 'lastViewedAt', 'metaUpdatedAt', 'isArchived',
] as const;

export const DOC_CONTENT_COLS = ['content', 'plainText', 'wordCount', 'charCount', 'version'] as const;

export interface TableDef {
  table: string;      // 协议名
  model: string;      // Prisma 模型名（db.orm.public.<model>）
  cols: string[];     // payload 列（显式名单，禁 SELECT *）
  tsCol: string;      // syncTs 列
  id: (r: Record<string, unknown>) => string;
  /**
   * G1505「铸造必需列」：服务端对"按 pk 定位不到行"的 upsert 一律 `create`——那既是离线
   * 新建的合法通路（`create-local.ts` 一定带全字段），也是"陈旧列表上的一行被点了一次恢复"
   * 时铸出一枚只有那两三列的壳行的通路（`TrashList.tsx` 的 `patch:{isDeleted,deletedAt}`）。
   * 两者在协议里形状不同，只能靠键形区分：缺这里任一枚键 ⇒ 不认定是新建 ⇒ 不 create。
   * ☆ 逐表判定，不整体锁死：只有"陈旧行动作"真在本仓发生过的表才配这一列。
   *
   * G1626 —— 这份名单同时是**必填列闸**：缺省（`?? []`）对 `every` 是空真 ⇒ 没配闸的表
   * 任何单点 patch 都能铸出一行，撞上该表的 NOT NULL 就把整条事务 abort 成 25P02 毒批次
   * （G1625 同族）。取键下限＝contract 里"无默认值且非服务端强制"的列，由
   * `create-requires.test.ts` 对 `contract.json` 逐表核对；再往上的键只用于形状区分。
   */
  createRequires?: string[];
}

export const SYNC_TABLES: TableDef[] = [
  { table: 'document', model: 'Document', cols: [...DOC_META_COLS], tsCol: 'metaUpdatedAt', id: r => String(r.id), createRequires: ['title'] },
  // G1513：逐表补 createRequires（键对同一枚 patch 是**合取**——全部命中才认定是离线新建）。
  // 取键判据＝"离线新建一定带、而该表任一单点动作一定不带"。folder 的单点动作＝改名 {name}／
  // 移入回收站 {isDeleted,deletedAt}／拖动 {parentId,order}；离线新建（create-local.ts）带 name
  // 与 isDeleted:false ⇒ 两枚合取把三个单点动作在陈旧行上的"铸壳"全挡住。
  { table: 'folder', model: 'Folder', cols: ['id','name','icon','description','pinnedDocumentIds','order','parentId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['name', 'isDeleted'] },
  // G1626：tag 的单点动作＝拖动 {order}／固定 {pinned}；离线新建（TagEditDialog）带 name ⇒
  // 只要求 contract 的必填列 name，把两枚单点动作在陈旧行上的铸壳挡住。
  { table: 'tag', model: 'Tag', cols: ['id','name','color','order','pinned','userId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['name'] },
  // G1626：document_tag 的两条写路径（挂标签 / 摘标签）都自带 documentId+tagId，两枚即 contract 必填列。
  { table: 'document_tag', model: 'DocumentTag', cols: ['documentId','tagId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => `${r.documentId}__${r.tagId}`, createRequires: ['documentId', 'tagId'] },
  // G1626：favorite 的离线新建（toggle-local）带 documentId；拖动排序 {order} 不带 ⇒ 挡住。
  { table: 'favorite', model: 'Favorite', cols: ['id','userId','documentId','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['documentId'] },
  // G1626：「服务端生成」三表没有离线铸造面，故不配闸（结构闸里逐表列名豁免）：
  // - customStyle：只有 `createCustomStyle` action 建行，内核唯一写＝改名/设默认；
  // - daily_notes_config：契约里零必填列（folderId/templateId/startTime 均可空），配闸只会误伤；
  // - notification：服务端生成、客户端只写 readAt/isResolved。
  { table: 'customStyle', model: 'CustomStyle', cols: ['id','userId','name','style','isDefault','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // G1513：task 的单点动作＝改排期 {dueDate,remindAt,recurrence,recurrenceEnd}／删除（patch:null）；
  // 离线新建（taskPatchFor.create）一定带 title（哪怕空串）⇒ title 把改排期在陈旧行上的铸壳挡住。
  { table: 'task', model: 'Task', cols: ['id','userId','documentId','blockId','title','isCompleted','dueDate','scheduleDate','remindAt','recurrence','recurrenceEnd','seriesId','completedAt','cancelledAt','status','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['title'] },
  { table: 'daily_notes_config', model: 'DailyNotesConfig', cols: ['id','userId','folderId','templateId','startTime','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // G120/G162：自定义提示词与助手开关都是 per-user 设置（官方 settings_state），随 user 设置行同步，不进文档载荷。
  { table: 'user', model: 'User', cols: ['id','name','image','theme','editorFont','editorWidth','completedTaskAppearance','notifyComments','notifyReminders','notifyDaily','prompts','promptObjects','tagIgnoreRules','assistantEnabled','assistantDisabledSpaces','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // G1626：collection 自身没有客户端 create 通路（`createCollection` 是服务端 action），
  // 而改名 {name}／移入回收站 {isDeleted,deletedAt} 两枚单点动作都在本仓发生过 ⇒ 两枚合取
  // 把"陈旧行上改名/删除铸出壳集合"全挡住（与 folder 同一判据）。
  { table: 'collection', model: 'Collection', cols: ['id','name','icon','description','titleColumn','order','folderId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['name', 'isDeleted'] },
// G1626：collection 三表各有内核新建通路（AddItem/AddProperty/AddView 走 applyLocal），
  // 只要求 contract 的必填列；单点动作（改 order／开关 isVisible／改 config／级联墓碑）都不带它们。
  { table: 'collection_item', model: 'CollectionItem', cols: ['id','collectionId','order','documentId','schemas','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['collectionId'] },
  { table: 'collection_property', model: 'CollectionProperty', cols: ['id','collectionId','name','type','config','order','isVisible','width','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['collectionId', 'name', 'type'] },
  { table: 'collection_value', model: 'CollectionValue', cols: ['id','itemId','propertyId','value','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['itemId', 'propertyId'] },
  { table: 'collection_view', model: 'CollectionView', cols: ['id','collectionId','name','type','config','isActive','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['collectionId', 'type'] },
  // G1513：comment 的单点动作＝删除 {deletedAt}；离线新建（CommentSection）
  // 一定带 threadId＋body ⇒ 两枚（也是 contract 必填列）把删除在陈旧行上的铸壳挡住。
  // G1640：表情不再是 `reactions` 列（已拆成 comment_reaction 行表），comment 的写面只剩正文与墓碑。
  { table: 'comment', model: 'Comment', cols: ['id','threadId','userId','body','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['threadId', 'body'] },
  // G1640：表情按人一行（每人每枚一行）。写侧天然收窄到本人（userId＝会话用户），
  // 两人同时各加一枚也不再互相覆盖；唯一键 (commentId,userId,glyph) 由定位器收口。
  // 契约必填列＝commentId／userId／glyph（name 有默认、其余由生成器给）。
  { table: 'comment_reaction', model: 'CommentReaction', cols: ['id','commentId','userId','glyph','name','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['commentId', 'userId', 'glyph'] },
  // G1513：comment_thread 的单点动作＝解决 {resolved}／删除 {deletedAt}；离线新建一定带 documentId。
  { table: 'comment_thread', model: 'CommentThread', cols: ['id','documentId','blockId','blockText','resolved','resolvedBy','resolvedAt','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['documentId'] },
  // G1626：document_share 的离线新建＝ShareDialog 的补种（documentId+token+…）；其余全是单点改档。
  { table: 'document_share', model: 'DocumentShare', cols: ['id','documentId','token','slug','passcode','isPublished','permission','showAuthor','showPageTitle','hideTableOfContents','hidePresentationMode','showWatermark','enableSeo','expiresAt','commentLevel','enableObjectLinks','showDuplicateAsTemplate','emailBasedAccessEnabled','hideHashTagWords','allowedEmails','allowedDomains','defaultDomain','shareVersion','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['documentId', 'token'] },
  // document_member：contract 有 updatedAt、无 deletedAt（移除仍是服务端硬删，不走墓碑）。
  // G1626：userId 不在 USER_ID_TABLES ⇒ 服务端不代填，create 缺它就是 NOT NULL 毒批次；
  // 改档 {role}／移除（patch:null）都不带两枚 ⇒ 一起构成闸。
  { table: 'document_member', model: 'DocumentMember', cols: ['id','documentId','userId','role','addedBy','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['documentId', 'userId'] },
  // notification：服务端生成的提醒（无离线铸造面，故不配闸），tsCol=updatedAt（contract 已有该列，解决时 bump）
  { table: 'notification', model: 'Notification', cols: ['id','userId','kind','taskId','blockId','documentId','title','remindAt','readAt','isResolved','resolvedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // G252：非任务块的提醒自己一张表（任务块的提醒随 `Task.remindAt`）。单点动作＝resolve/unresolve
  // {isCompleted,completionDate}。G1626：contract 必填列是 documentId+blockId+remindAt+title
  // （title 无默认值且非服务端代填），四枚合取；目前没有客户端 create 通路，全交给服务端 action。
  { table: 'block_reminder', model: 'BlockReminder', cols: ['id','userId','documentId','blockId','title','remindAt','isCompleted','completionDate','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id), createRequires: ['documentId', 'blockId', 'remindAt', 'title'] },
  // G324/G421 的 team／space 四表**不进同步**：空间/团队面板走 server action 直读（`getSpaceContext`／
  // `getTeamContext`），既无客户端镜像消费者、也无 `applyLocal` 推送路径（与 oauth 两表同档）。
  // ☆ 曾经把它们放进来过一次，代价是 GET 侧 `where({ userId })` 撞上 `Team` 没有 userId 列 ⇒
  //   整条 sync 500（`field does not support equality comparisons`）。没有消费者的表不入册，就不必特例。
  // whiteboard：spec 5.1 白板 payload 排除 data（内容走独立通道），tsCol=metaUpdatedAt
  // G1513：whiteboard 目前**没有**内核新建通路（`createWhiteboard` 是服务端 action，不走 applyLocal），
  // 唯一内核写＝面包屑改名 {name} ⇒ 要求 name 与 isDeleted 两枚（改名只带 name）把陈旧白板行上的
  // "改名铸出只剩 name 的壳白板"挡住；将来若给白板加离线新建，那笔必须带齐这两枚才放行。
  { table: 'whiteboard', model: 'Whiteboard', cols: ['id','name','shareToken','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'metaUpdatedAt', id: r => String(r.id), createRequires: ['name', 'isDeleted'] },
];

const COLS_BY_TABLE = new Map(SYNC_TABLES.map((d) => [d.table, new Set(d.cols)]));

/**
 * `gap.md` G1492 —— 静态那道闸（`tables.test.ts`「全仓每一处 applyLocal 的字面量 patch 键都必须在
 * `cols` 里」）只判得出**写得出键名的字面量**，而本仓 `applyLocal` 有一半调用点把 `patch` 交给变量。
 * 这一枚是它的运行时补面：入队之前把 payload 的键与所属表的 `cols` 求差，多出来的就是
 * "本地已经改了、服务端永远不会知道"的那一列（G03 那整类失真的机制本体）。
 *
 * ☆ 这里只告警不改写：把差掉的键悄悄剔掉会让界面照常乐观上色、和静默丢失一模一样难查；
 *   未注册的表返回空数组（`document_tag` 那类复合键写入由调用方自己负责，别在这里发明规则）。
 */
export function unknownPayloadKeys(table: string, data: Record<string, unknown> | undefined): string[] {
  const cols = COLS_BY_TABLE.get(table);
  if (!cols || !data) return [];
  return Object.keys(data).filter((key) => !cols.has(key));
}
