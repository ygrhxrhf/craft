// 列名单以 src/prisma/contract.prisma 实际字段为准（已逐一核对）：
// - daily_notes_config：contract 无 format/template，按全列改为 folderId/templateId/startTime
// - user：仅同步设置类字段（spec 5.1「仅」），email/password/createdAt 不入 payload
// - collection 五表 / comment / comment_thread / document_share：按同模式补全（全列白名单）
export const DOC_META_COLS = [
  'title', 'icon', 'coverImage', 'coverType', 'font', 'width', 'pageStyle',
  'parentId', 'folderId', 'order', 'isDeleted', 'deletedAt',
  'isDailyNote', 'dailyNoteDate', 'metaUpdatedAt',
] as const;

export const DOC_CONTENT_COLS = ['content', 'plainText', 'wordCount', 'charCount', 'version'] as const;

export interface TableDef {
  table: string;      // 协议名
  model: string;      // Prisma 模型名（db.orm.public.<model>）
  cols: string[];     // payload 列（显式名单，禁 SELECT *）
  tsCol: string;      // syncTs 列
  id: (r: Record<string, unknown>) => string;
}

export const SYNC_TABLES: TableDef[] = [
  { table: 'document', model: 'Document', cols: [...DOC_META_COLS], tsCol: 'metaUpdatedAt', id: r => String(r.id) },
  { table: 'folder', model: 'Folder', cols: ['id','name','icon','order','parentId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'tag', model: 'Tag', cols: ['id','name','color','userId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'document_tag', model: 'DocumentTag', cols: ['documentId','tagId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => `${r.documentId}__${r.tagId}` },
  { table: 'favorite', model: 'Favorite', cols: ['id','userId','documentId','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'task', model: 'Task', cols: ['id','userId','documentId','blockId','title','isCompleted','dueDate','remindAt','recurrence','recurrenceEnd','completedAt','status','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'daily_notes_config', model: 'DailyNotesConfig', cols: ['id','userId','folderId','templateId','startTime','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'user', model: 'User', cols: ['id','name','image','theme','editorFont','editorWidth','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection', model: 'Collection', cols: ['id','name','icon','description','order','folderId','userId','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_item', model: 'CollectionItem', cols: ['id','collectionId','order','documentId','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_property', model: 'CollectionProperty', cols: ['id','collectionId','name','type','config','order','isVisible','width','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_value', model: 'CollectionValue', cols: ['id','itemId','propertyId','value','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'collection_view', model: 'CollectionView', cols: ['id','collectionId','name','type','config','isActive','order','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'comment', model: 'Comment', cols: ['id','threadId','userId','body','reactions','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'comment_thread', model: 'CommentThread', cols: ['id','documentId','blockId','blockText','resolved','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  { table: 'document_share', model: 'DocumentShare', cols: ['id','documentId','token','slug','passcode','isPublished','createdAt','updatedAt','deletedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // document_member：contract 有 updatedAt、无 deletedAt（移除仍是服务端硬删，不走墓碑）
  { table: 'document_member', model: 'DocumentMember', cols: ['id','documentId','userId','role','addedBy','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // notification：服务端生成的提醒，tsCol=updatedAt（contract 已有该列，解决时 bump）
  { table: 'notification', model: 'Notification', cols: ['id','userId','kind','taskId','documentId','title','remindAt','isResolved','resolvedAt','createdAt','updatedAt'], tsCol: 'updatedAt', id: r => String(r.id) },
  // whiteboard：spec 5.1 白板 payload 排除 data（内容走独立通道），tsCol=metaUpdatedAt
  { table: 'whiteboard', model: 'Whiteboard', cols: ['id','name','shareToken','isDeleted','deletedAt','createdAt','updatedAt'], tsCol: 'metaUpdatedAt', id: r => String(r.id) },
];
