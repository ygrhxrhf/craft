import type { AccessLevel } from '@/lib/authz/resource';

/**
 * `gap.md` G1633 —— 同步**写侧归属**的声明面。
 *
 * 这几份名单此前散在 `route.ts` 里当内联常量：GET 侧按归属收窄、POST 侧逐表比档。G1523
 * 补了文档四表、G1628 补了集合四表，但**每补一次都是补一处**——名单在 GET 侧长、在 POST
 * 侧短，正是这两个洞的共同成因（`collection_value` 连 collectionId 都没有、`comment` 只有
 * 写入者自己的 userId）。`write-scope.test.ts` 从 `contract.json` 现读同步表的引用列，
 * 逐表核对这张表被哪个作用域盖住或登记了豁免理由 ⇒ 新增一张带归属引用的同步表而这里没跟，
 * 闸先红，不必等真机再撞一次越权。
 *
 * ☆ 与 GET 侧名单刻意不同：GET 的 `DOC_SCOPED_TABLES` 是"按本人文档拉子表"的读面，`comment`
 *   不读那条路（评论行按 `userId` 拉、正文那条线程的评论走 `getThreads` action 直读）⇒ 写侧
 *   要校验归属，读侧不必跟着改。
 */
export type WriteScope =
  | {
    kind: 'document';
    /**
     * 定位归属的**本地列**：`documentId` 直取；`threadId` 经评论线程两跳到文档；
     * `commentId` 是表情行——`commentId` → 评论 → 线程 → 文档（三跳）。
     */
    field: 'documentId' | 'threadId' | 'commentId';
    /** 调用者至少要有这一档，才能对这条记录做写动作（与各自 server action 同档）。 */
    level: AccessLevel;
  }
  | { kind: 'collection' };

/**
 * 逐表档位对齐各自 action 的要求（别按"最小可用"随手放低）：
 *  - `document_tag`＝editor（attachTag/detachTag）
 *  - `comment_thread`／`comment`／`comment_reaction`＝commenter（createThread/addReply/加表情）
 *  - `document_share`／`document_member`＝owner（分享档位与成员增删）
 *  - 集合四表＝本人所有且未软删（集合没有协作者概念）
 */
export const WRITE_SCOPES: Record<string, WriteScope> = {
  document_tag: { kind: 'document', field: 'documentId', level: 'editor' },
  comment_thread: { kind: 'document', field: 'documentId', level: 'commenter' },
  document_share: { kind: 'document', field: 'documentId', level: 'owner' },
  document_member: { kind: 'document', field: 'documentId', level: 'owner' },
  // G1633：评论行的 userId 是**写入者本人**（不是归属人）——只按 userId 收窄，任何登录用户
  // 都能往任意 threadId 下铸一条自己的评论，而 `getThreads` 按 threadIds 读回全部作者的行
  // ⇒ 别人的文档里会出现陌生人插的评论。归属要经 threadId → 线程 → 文档再判 commenter。
  comment: { kind: 'document', field: 'threadId', level: 'commenter' },
  // G1640：表情行同理——userId 是**加表情的人**；归属经 `commentId` → 评论 → 线程 → 文档。
  // 档位仍是 commenter（与官方"可评论"档同义：能评论就能对评论加表情）。
  comment_reaction: { kind: 'document', field: 'commentId', level: 'commenter' },
  collection_item: { kind: 'collection' },
  collection_property: { kind: 'collection' },
  collection_view: { kind: 'collection' },
  collection_value: { kind: 'collection' },
};
