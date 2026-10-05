# ADR-0003：元数据增量同步采用游标轮询

- 状态：已接受
- 日期：2026-10-01
- 分支：`deploy/vps-fullstack-offsite-backup`

## 背景

Crafty 有三套同步机制，其中两套已由既有组件覆盖：

| 数据 | 真源 | 机制 | 状态 |
|---|---|---|---|
| 文档正文 | `YjsDocumentState.state` | Hocuspocus WS 增量 | 已有 |
| 白板 | 内存 room → `Whiteboard.data` | tldraw-sync WS | 已有 |
| 其余元数据 | Postgres 行 | Prisma + REST | **无实时，本 ADR 解决** |

元数据指：目录树、文档标题/图标/排序、收藏、标签、集合（Collection）及其属性/项/值/视图、白板列表、任务、日记配置、分享开关。

使用场景是**单人 2–3 台设备**，目标是秒级感知，不是多人协作。

## 决策

**`GET /api/sync/changes?since=<cursor>` + 客户端定时轮询。不引入 WebSocket / SSE / 托管实时服务。**

响应结构：

```jsonc
{
  "cursor": "2026-10-01T04:00:00.000Z",   // 下次请求带回
  "hasMore": false,                        // 有表撞到单表上限，立即再拉一次
  "changes": { "Document": [...], "Folder": [...] },  // updatedAt > since
  "full":    { "Tag": [...], "Favorite": [...] }      // 无 updatedAt，每次全量
}
```

### 为什么不推送

单人场景下 2–3 秒轮询只需几十行客户端代码。SSE/WebSocket 要处理断线重连、代理缓冲、超时、连接数上限，而换来的只是"少几百毫秒延迟"——对一个人在两台设备间切来切去的场景没有实际差别。托管实时服务（Liveblocks、Supabase Realtime）按连接数计费，与"成本接近 0"的目标直接冲突。

### 表分两类

**增量表**（有 `updatedAt`）：Folder、Document、Whiteboard、Task、Collection，以及通过父 id 归属的 DocumentShare、CollectionProperty、CollectionItem、CollectionView、CollectionValue。

**全量表**（**没有 `updatedAt` 列，只有 `createdAt`**）：Tag、DocumentTag、Favorite、Backlink。

这四张表做不了游标，且**删除也无法检测**（无软删字段）。选项只有两个：改 schema 加 `updatedAt` + 软删，或者每次全量。实测开发库规模：Tag 2 行、DocumentTag 2 行、Favorite 0 行、Backlink 64 行——每次全量只多几 KB。所以选全量，零迁移。

若将来任一关联表达到数千行，再给它们加 `updatedAt` 与软删列并转为增量；接口形状不变，客户端无感。

### 不传正文（红线）

`Document.content`、`Document.plainText`、`Whiteboard.data` **不在任何白名单里**。正文由 Yjs 同步，白板由 tldraw-sync 同步；把它们塞进轮询载荷既浪费带宽，又会给正文造出第二个真源——那正是 ADR-0001 刚消灭的问题。

测试里有显式断言守住这条：`FORBIDDEN_COLUMNS` 不得出现在任何表的列白名单中。

同样排除的还有 `password`、`passcode`、`token`、`shareToken`。分享的**开关状态**（`isPublished`/`slug`/`sharePermission`/`shareVersion`）要同步，但令牌本身不外发。

### 租户隔离

每张表都必须收敛到调用者自己的行。两类做法：

- 直接带 `userId` 的表 → `where({ userId })`
- 挂在父对象上的表 → `IN (<父 id 集合>)`

**踩坑**：ORM 的对象形式 `where({ id: { in: [...] } })` **不报错但静默匹配 0 行**。必须用回调形式 `where((d) => d.id.in([...]))`。已写进代码注释。

另有一个实现陷阱：如果把父 id 过滤放到内存里做（先按游标取一页再 filter），别人的行会占满页预算，导致 `hasMore` 永远为 true、客户端陷入无限轮询。所以过滤必须在 SQL 层完成。

## 已知代价

1. **延迟上限 = 轮询间隔**。默认建议 2–3 秒。
2. **游标是毫秒截断，Postgres 存微秒**。同一毫秒内的行会被重放一次。客户端按 id 幂等覆盖即可，无害；测试断言的是"重放行必须是上一批已发过的行"，而非"第二批次为空"。
3. **单次请求有额外查询**：为了给父 id 集合做过滤，每次会全量取一次 `Document.id`、`Collection.id`、`CollectionItem.id`。只取 id 列，单人规模下是毫秒级。
4. **全量表每次都传**。
5. `hasMore` 为 true 时客户端应立即再拉一次，否则会落后。

## 未覆盖

- `CommentThread` / `Comment`：评论是协作功能，单人自用基本不用；且过滤需要 documentId 集合再套一层。暂不同步。
- `DocumentMember`：协作者名单，单人场景为空。
- `DocumentVersion`：版本历史体积大且低频，按需拉取即可，不进轮询。

## 实施中发现：schema 真源不是 `prisma/schema.prisma`

`prisma/schema.prisma` 已过时——它缺少 `Document.pageStyle`、`Task`、`DocumentShare`、`DocumentMember`、`CommentThread`、`Comment`、`Backlink.sourceBlockId`、`Whiteboard.share*` 等。真正的 contract 真源是 **`src/prisma/contract.prisma`**（`contract.json` / `contract.d.ts` 由它生成）。

本次实现按 `contract.prisma` 取字段。建议后续把 `prisma/schema.prisma` 删掉或明确标注为废弃，避免再被当成真源。

## 有意偏差登记（2026-10-04，`13f3549`）：侧栏树另开一条批量读，与本 ADR 的单游标轮询并存

本 ADR 定的通路是 `(app)/layout.tsx:11` 挂着的 `<MetadataSyncProvider />`（第 10 行是它的注释：
polls `/api/sync/changes` for the signed-in session），经 `GET /api/sync/changes` 单游标轮询。
侧栏四棵树
（document／folder／collection／whiteboard）**没有**改走这条同步缓存，而是在 2026-10-04 被收敛成
一条独立的批量 server action：`src/actions/sidebar/snapshot.ts` 的 `getSidebarSnapshot()`
一次 `Promise.all` 四个读，客户端由 `src/lib/sidebar/use-sidebar-snapshot.ts` 按
`treeVersion:pathname` 做模块级共享缓存，四棵树共用同一发请求。

**这是有意的偏差，不得升格为本 ADR 的官方结论**，理由与实测数字一并登记如下。

### 测到的降载（同一探针、同一动作串、各 6 次装载）

| | 收敛前 `a15f261` | 收敛后 `13f3549` |
| --- | --- | --- |
| 每次装载的不同 action id 数 | 5 | 2 |
| 6 次装载的 action 往返总数 | 84（71 枚树读 ＋ 13 枚铃铛） | 21（8 枚快照 ＋ 13 枚铃铛） |
| 四棵树各自作为独立 action 的出现次数 | 71 | **0** |

⇒ 单看 server action 面，收敛成立（约 −75%）。

### `getSidebarSnapshot()` 的耗时分布（n=8，暖机后稳态）

`199, 211, 223, 247, 248, 266, 272, 287 ms` ⇒ min 199／p50 248／max 287／合计 1953 ms。

⚠ 提交信息与历轮笔记里出现的 `516 / 1047 / 1494 ms` 是**冷启动**（首次编译＋首批调用）读数，
不代表稳态；本表才是。按在册纪律，队列类延迟只报分布不报单发样本。

### 判语与仍未判的部分

1. **降载价值＝已判，成立**，但只在 action 面上成立。
2. **它对标题落库缺陷毫无作用**：只有收敛的构建上，标题写入延迟 6 次全部超出旧的 1200ms 预算
   （1264／1434／2712／4855／4901／4932 ms）。真根因在 `EditorHeader` 的防抖依赖，见
   `docs/test-report.md` 第六节第 5 条。⇒ 别把这条偏差当作"同步链路性能问题的解"。
3. **SQL 往返数未观测**。`src/prisma/db.ts` 没有查询日志钩子，要拿真实 SQL 条数必须改产品码去装
   middleware，本轮没做。上表的"往返"一律指 HTTP／server action 层。四个读各自 `await auth()`
   ＋ 一次查询，`Promise.all` 只保证并发提交，**是否真的合并了数据库工作量没有证据**；
   稳态 248ms 与"并行"相符但不构成证明。
   ☆ **该问已于 2026-10-04 晚实测，并把这条偏差的价值判窄（读数在 `docs/test-report.md` 第六节第 10 条）**：
   临时把一枚 `afterQuery` 计数中间件接到 `src/prisma/db.ts`（取完读数即 `git restore`，最终字节里没有它）。
   结论＝**这条改动省的不是往返次数**：冷 `/documents` 的语句数在同一份字节上跑出 119 与 169、整跑 358–400，
   所以"从 N 条降到 M 条"这类句式从此不可用，本 ADR 上表凡以"往返"论降载的句子都只适用于 action／HTTP 面。
   能作证的两件事：① **形状**（二值、可复现）＝同步轮询的归属读从
   `SELECT id, userId FROM documents`（无谓词、行数＝全表 888）变为
   `SELECT id FROM documents WHERE userId = $1`（619＝本账号行数），A/B/A 三档 0↔≥27 与 10↔0；
   ② **字节**（直接问库）＝五枚列表读原先裸奔整行，`content 119,517 B ＋ plainText 11,230 B`
   vs 元数据列合计 42,340 B（侧栏那 605 行）。⇒ 本条改判为**"已观测：省的是传输量与跨账号规模，
   不是往返次数"**；顺带把本 ADR 第 2 条那句"别把它当同步链路性能问题的解"升格为有据判语。
4. **本 ADR 的代价第 1 条（延迟上限＝轮询间隔）没有因此改变**，树的刷新仍然额外吃一次独立请求。
5. **待判的结构性问题**（留给下一批，属设计级、要用户点名）：侧栏树到底该不该改读同步缓存，
   从而取消这条并行通路；以及铃铛（13 发／6 次装载，已是当前最大的 fan-out）为什么比树还频繁。
   ☆ **后半问已于 2026-10-05 实测结案（仪器＝`../impl-scripts/probe-bell-fanout.cjs`：同一探针两跑、
   每跑 6 次装载、每次装载之间等 8 秒≈3 个轮询间隔、按 dev 日志追加的字节切片逐跑计数）**：
   - 读数＝默认配置下**铃铛 2 发／装载、树快照 1 发／装载**，6 跑逐次无一例外（总 12／6）。
     浏览器侧按 `next-action` 头的 POST 计数与服务端 `ƒ` 行一一对上（`00ee35a2=2`、`0076970c=1`）
     ＝不是日志解析出来的假象。
   - 对照（唯一变量＝一行配置）＝在 `next.config.ts` 临时写 `reactStrictMode: false` 复跑＝
     **铃铛 1 发／装载、树仍 1**（总 6／6＝1:1）。读数取完即 `git restore`，最终字节里没有它
     （`git diff HEAD -- next.config.ts` 空）。
   - 成因＝`reactStrictMode` 不写时 Next 解析为 true（`node_modules/next/dist/build/define-env.js:151`
     `config.reactStrictMode === null ? true`），dev 下 React 因此对每个客户端组件的 effect 双跑一次挂载。
     铃铛的 `useEffect(..., [revision])` 直接调 `listNotifications()`、**没有在途合并** ⇒ 每装载付两发；
     树的 `src/lib/sidebar/use-sidebar-snapshot.ts:17` 那枚 module-level `cached = {key, promise}`
     （key＝`treeVersion:pathname`）让双跑的第二跑命中同 key、复用同一 promise ⇒ 只付一发。
     ⇒ **"铃铛比树频繁"既不是铃铛在轮询、也不是它多开了通路，而是同一份 dev 计数器上"有没有在途缓存"之差：
     树被缓存挡住了，铃铛没有。**
   - ~~与历轮 13／8 的对账＝本跑工作区安静，两跑都是零额外重发，那一段复现不出来、仍未判~~
     ⇒ **✎ 已于 2026-10-05 补测结案**（仪器加上"在第 N 发装载之前执行一份 SQL"的写侧挂钩＝关键：装载之前插入的那枚到期提醒会被登录那发首屏消费掉＝量到的永远是"无重发"＝假零）：
     **13＝12＋1** 逐枚复现＝`bell=2/2/3/2/2/2`，多出的那发是**真·新提醒的合法重发**；
     **8＝6＋2** 那一侧只证到"存在这样一条机制、且能按单变量复现与取消"，**没有证到当时就是它**（当时工作区的行精度无从回查）。
     ★ 机制＝**时间戳精度**：服务端回游标是 `new Date(maxTs).toISOString()`＝毫秒；应用自己写的行 `µs == ms×1000`
     （实测 `documents` 最新行 `126-126000`、`folders` `941-941000`、`tasks` `272-272000`、`notifications` `498-498000`）
     ⇒ `updatedAt > since` 为假＝不重放；而带真微秒的行（取样 `now()`＝`524.524681`，截毫秒后＝`525.525000`）
     **游标永远收敛不过去** ⇒ 每一枚**新会话**的首发轮询把该行当新行重放 ⇒ 侧栏表 ⇒ `bumpTree`
     ⇒ **每次整页装载多付一发树读**（会话内被 `sameRow` 抑制，所以只有重装看得见；与 StrictMode 无关、生产档同样付）。
     两侧对照唯一变量＝精度：微秒行 ⇒ `snapshot=2×6`（总 12）；同形状但 `date_trunc('milliseconds', now())` ⇒ `snapshot=1×6`（总 6）；清行后复跑亦为 1×6。
     ⇒ ☆ **本 ADR 由此新增一条数据面不变量**：凡不经过本应用写 `updatedAt` 的通路（迁移、直连 SQL、别的服务）**必须截到毫秒**，
     否则本 ADR 的增量同步在"整页重装"这一档不成立。
   - ~~未验＝双发是 dev 语义~~ ⇒ **✎ 已于 2026-10-05 补测结案，dev 语义这一支成立**
     （仪器＝`../impl-scripts/probe-bell-count.cjs`，改按响应体形状分类，因为 `next start` 不写 dev 那些 `ƒ` 行）：
     `npm run build`（exit 0）＋`next start -p 3002` 下连跑两档共 12 次装载，**铃铛每装载恰好 1 发**
     （响应体含 `remindAt` 而**不含** `whiteboards`＝结构上不可能是快照那枚），另一枚 action POST 也恰好 1 发／装载。
     ☆ 那"另一枚"在生产档**没能直接标签命中**：`response.text()` 对它报
     `Network.getResponseBody: No resource with given identifier found`（同一次装载里较小的那枚体能读到、较大的读不到），
     所以它的身份＝**排除法**（一次装载只有两枚 action POST、其中一枚已被体形状钉为铃铛）＋dev 档那两枚 id
     各自的发数与 `ƒ` 行逐一对齐＝**不是直接读到的**。
     ☆ 另＝action id 在 dev 与 prod 之间不通用（dev `00ee35a2`/`0076970c` vs prod `006b1cbc`/`009e7112`）
     ⇒ 任何"按 id 认身份"的计数器都不能跨构建档复用。
     ⇒ 结论改写为：**"铃铛 2 发／装载"是 dev 仪表的读数，不是产品代价；生产档铃铛与树同为 1 发／装载。**
   - 处方＝~~要用户点名才做~~ ⇒ **✎ 2026-10-05 用户具名后已做**（`src/lib/read-per-revision.ts` 纯核＋5 枚单测，
     对"无缓存"桩的逐字红＝`expected "vi.fn()" to be called 1 times, but got 2 times`；`NotificationBell` 按 `revision` 走该核）。
     ☆ 先记一句价值判语：**在"生产档＝1 发／装载"之下，这枚缓存不省任何线上往返**，它消的是 dev 计数器上那一发幻影
     ⇒ 本 ADR 原先"铃铛＝当前最大 fan-out"的判语作废，这一改动属**仪器可信度**、不属产品成本。
     验收（默认档＝StrictMode 开）＝6 装载逐枚 `bell=1`、`snapshot=1`＝与生产档读数同形；
     合法重发未被吃掉＝`e2e/reminder-delivery.spec.ts` **2 passed**（20.7s／32.1s）。
     ☆ 另 4 枚单测（revision 上台阶／回来／失败不入缓存）在无缓存桩上本就绿＝它们是**防过度缓存的护栏**、不是本改动的证据。
   - ☆ **补测过程中撞到的两条现场事实**（与 fan-out 无关、但影响任何生产档复跑）：
     ① 生产档本地跑必须在登录前给 `AUTH_TRUST_HOST=true`，否则 Auth.js v5 直接
     `UntrustedHost`、`/api/auth/providers` 回 500、`NEXTAUTH_URL` 指对端口也不够（dev 档因为
     `NODE_ENV=development` 才默认信任 localhost）；
     ② **`next build` 会覆盖同目录正在运行的 dev server 的 `.next`**——本轮那枚就是这么变成
     "端口在听、登录跳 `/api/auth/error`"的废器的，而 `playwright.config.ts` 的
     `reuseExistingServer: !CI` 会把它当成可用服务直接复用 ⇒ 跑过 build 之后必须先确认 3000 上那枚活着的是谁。
