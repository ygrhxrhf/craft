/**
 * G214/G1614：文档里嵌的集合块。官方三条「插入集合」落成的都是同一个 `collection` 对象，
 * 差别只在初始视图，所以这里只带一枚 `view` 档，视图名逐字取官方标签。
 */
export type CollectionEmbedView = 'table' | 'gallery' | 'kanban';

export const COLLECTION_EMBED_VIEWS: readonly CollectionEmbedView[] = ['table', 'gallery', 'kanban'];

/** 三档视图在块上显示的名字（官方斜杠项＝表格集合／画廊集合／看板集合）。 */
export const COLLECTION_EMBED_LABELS: Record<CollectionEmbedView, string> = {
  table: '表格',
  gallery: '画廊',
  kanban: '看板',
};

export function isCollectionEmbedView(value: unknown): value is CollectionEmbedView {
  return typeof value === 'string' && (COLLECTION_EMBED_VIEWS as readonly string[]).includes(value);
}

/** 传进来的值不在名册里就退回表格档（与官方「三型同格」的宽容读法一致）。 */
export function normalizeCollectionEmbedView(value: unknown): CollectionEmbedView {
  return isCollectionEmbedView(value) ? value : 'table';
}
