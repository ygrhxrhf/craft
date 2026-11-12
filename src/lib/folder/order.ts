/**
 * 文件夹的确定性次序：`order` → `createdAt` → `id`。
 *
 * `order` 是唯一的用户可调位次，但绝大多数行还是默认 0（新建、旧数据都没写 order）。
 * 并列时若退回数据库堆序，一次 UPDATE（重命名、改图标）就会把行挪到堆尾；侧栏折叠
 * 只渲染前 20 项，挪出去的那一行就再也点不到。服务端查询用同一组三连排序，
 * 这里给客户端排序用，保证「本地乐观行」和「ack 后的服务端行」落在同一位置。
 */
export interface FolderOrderKey {
  id: string;
  order: number;
  createdAt?: string | null;
}

export function compareFolderOrder(a: FolderOrderKey, b: FolderOrderKey): number {
  if (a.order !== b.order) return a.order - b.order;
  const ca = a.createdAt ?? '';
  const cb = b.createdAt ?? '';
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
