// 列名单以 src/prisma/contract.prisma 实际字段为准（已逐一核对）：
// - daily_notes_config：contract 无 format/template，按全列改为 folderId/templateId/startTime
// - user：仅同步设置类字段（spec 5.1「仅」），email/password/createdAt 不入 payload
// - collection 五表 / comment / comment_thread / document_share：按同模式补全（全列白名单）
export const DOC_META_COLS = [
  'title', 'icon', 'coverImage', 'coverType', 'font', 'width', 'pageStyle',
  'parentId', 'folderId', 'order', 'isDeleted', 'deletedAt',
  'isDailyNote', 'dailyNoteDate', 'isTemplate', 'metaUpdatedAt',
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
   */
  createRequires?: string[];
}

export const SYNC_TABLES: TableDef[] = [
  { table: 'document', model: 'Document', cols: [...DOC_META_COLS], tsCol: 'metaUpdatedAt', id: r => String(r.id), createRequires: ['title'] },
  { table: 'folder', model: 'Folder', cols: ['id','name','icon','order','parentId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'tag', model: 'Tag', cols: ['id','name','color','userId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'document_tag', model: 'DocumentTag', cols: ['documentId','tagId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => `${r.documentId}__${r.tagId}` },
  { table: 'favorite', model: 'Favorite', cols: ['id','userId','documentId','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'task', model: 'Task', cols: ['id','userId','documentId','blockId','title','isCompleted','dueDate','remindAt','recurrence','recurrenceEnd','completedAt','cancelledAt','status','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'daily_notes_config', model: 'DailyNotesConfig', cols: ['id','userId','folderId','templateId','startTime','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'user', model: 'User', cols: ['id','name','image','theme','editorFont','editorWidth','notifyComments','notifyReminders','notifyDaily','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection', model: 'Collection', cols: ['id','name','icon','description','order','folderId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_item', model: 'CollectionItem', cols: ['id','collectionId','order','documentId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_property', model: 'CollectionProperty', cols: ['id','collectionId','name','type','config','order','isVisible','width','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_value', model: 'CollectionValue', cols: ['id','itemId','propertyId','value','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_view', model: 'CollectionView', cols: ['id','collectionId','name','type','config','isActive','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'comment', model: 'Comment', cols: ['id','threadId','userId','body','reactions','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'comment_thread', model: 'CommentThread', cols: ['id','documentId','blockId','blockText','resolved','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'document_share', model: 'DocumentShare', cols: ['id','documentId','token','slug','passcode','isPublished','permission','shareVersion','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // document_member：contract 有 updatedAt、无 deletedAt（移除仍是服务端硬删，不走墓碑）
  { table: 'document_member', model: 'DocumentMember', cols: ['id','documentId','userId','role','addedBy','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // notification：服务端生成的提醒，tsCol=updatedAt（contract 已有该列，解决时 bump）
  { table: 'notification', model: 'Notification', cols: ['id','userId','kind','taskId','documentId','title','remindAt','isResolved','resolvedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // whiteboard：spec 5.1 白板 payload 排除 data（内容走独立通道），tsCol=metaUpdatedAt
  { table: 'whiteboard', model: 'Whiteboard', cols: ['id','name','shareToken','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'metaUpdatedAt', id: r => String(r.id) },
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
