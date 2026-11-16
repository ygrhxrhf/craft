/**
 * R-19：唯一键表在「按 pk 定位不到、但唯一键撞上存量（含墓碑）行」时盲 create 会抛唯一约束
 * → 整批 500 → 客户端无限重推（毒批次）。冲突时按这里的定位器回读现存行，跑与主路径同一条
 * decideLww（update-or-reject）。**必须先读后写**：Postgres 一条语句失败即令事务进 aborted 态
 * （SQLSTATE 25P02），"盲 create → catch 里回读"这条路永远走不到（G1625）。
 *
 * G1627 —— 这份名单此前是手抄的：契约加了唯一约束而这里没跟，撞键那条就只能走到 create
 * 抛错、把整批打成毒批次（G1625／G1626 同族，触发条件换成唯一键）。
 * 从此 `columns` 是**声明面**：与 `src/prisma/contract.json` 里该表的唯一约束逐列对应，
 * 由 `unique-keys.test.ts` 现读契约逐表核对；没被覆盖的约束必须在那边逐条登记豁免理由。
 *
 * ☆ 作用域：`tag`／`favorite`／`block_reminder` 的 userId 是**会话用户**，强制取批级 userId
 * （不取 payload 值，避免越权定位他人行）；`document_member` 的 userId 是**被授权成员**，
 * 只能取 payload（带上会话 userId 就永远定位不到，"同一成员两枚 id"那类撞键会照样 500）。
 */
export interface UniqueKeyLocator {
  /** 与 contract 唯一约束的列逐列相同；测试拿它对账。 */
  columns: readonly string[];
  where: (key: Record<string, unknown>, userId: string) => Record<string, unknown> | null;
}

export const UNIQUE_KEY_LOCATORS: Record<string, UniqueKeyLocator> = {
  tag: {
    columns: ['name', 'userId'],
    where: (key, userId) => (key.name == null ? null : { name: key.name, userId }),
  },
  favorite: {
    columns: ['userId', 'documentId'],
    where: (key, userId) => (key.documentId == null ? null : { userId, documentId: key.documentId }),
  },
  collection_value: {
    columns: ['itemId', 'propertyId'],
    where: (key) =>
      (key.itemId == null || key.propertyId == null)
        ? null
        : { itemId: key.itemId, propertyId: key.propertyId },
  },
  // G252：`(blockId, remindAt)` 是唯一键——换设备用新 uuid 推同一枚块同一时刻的提醒会撞约束，
  // 按这对键回读存量行再跑同一条 decideLww，而不是盲 create 抛 500 把整批打成毒批次。
  block_reminder: {
    columns: ['blockId', 'remindAt'],
    where: (key, userId) =>
      (key.blockId == null || key.remindAt == null)
        ? null
        : { blockId: key.blockId, remindAt: key.remindAt, userId },
  },
  // G1627：成员行 `(documentId, userId)` 唯一。两枚定位列都是行自带列：documentId 已在上方
  // 文档作用域鉴权里核过属主，userId 是被授权成员（不是会话用户）。并发"两位所有者的设备
  // 各加同一人"时后到那笔会撞约束——定位器把它并到存量行、按 LWW 决定改档还是回传现值。
  document_member: {
    columns: ['documentId', 'userId'],
    where: (key) =>
      (key.documentId == null || key.userId == null)
        ? null
        : { documentId: key.documentId, userId: key.userId },
  },
  // G1640：表情行 `(commentId, userId, glyph)` 唯一。取消表情留下墓碑、再加同一枚时若客户端
  // 铸新 id 就会撞约束 ⇒ 必须并回那枚墓碑行、跑同一条 decideLww。userId 取**会话用户**：
  // 客户端载荷里根本不含它（服务端按会话覆盖），拿 payload 会永远定位不到。
  comment_reaction: {
    columns: ['commentId', 'userId', 'glyph'],
    where: (key, userId) =>
      (key.commentId == null || key.glyph == null)
        ? null
        : { commentId: key.commentId, userId, glyph: key.glyph },
  },
};
