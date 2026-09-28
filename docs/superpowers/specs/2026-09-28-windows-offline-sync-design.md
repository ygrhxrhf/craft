# Crafty Windows 端离线优先同步重构 · 设计文档

日期：2026-09-28
状态：v2，待审阅
范围：仅 Windows 桌面端（为安卓预留接缝），单用户

---

## 1. 背景与目标

### 1.1 现状（基于代码事实）

- 自托管 Next.js 单体：SSR + Server Actions（`src/actions/*`）+ Prisma 8 / PostgreSQL（`src/prisma/contract.prisma`，target `postgres`）
- 正文实时协同：Yjs + Hocuspocus（`src/collab/server.mjs`，ws:3001）；白板 tldraw sync（`src/collab/tldraw-server.mjs`）
- 附件：本地磁盘 `process.cwd()/uploads`（`src/lib/storage.ts`），无云端存储
- 离线能力：仅"正文保存失败写 IndexedDB 草稿、下次打开回放"（`src/lib/offline/draft-store.ts`），非离线优先
- 鉴权：NextAuth session cookie（`requireUserId` → `auth()`，`src/lib/authz/guard.ts:31`）
- 无桌面端、无安卓端

### 1.2 目标

1. Windows 桌面端（Tauri 2）：托盘、全局快捷键、原生通知、开机自启、自动更新
2. 云端数据库 + 离线优先：断网可完整读写文档树与正文，联网自动对账收敛
3. 多端实时同步：正文/白板 ws 真·实时；元数据广播后秒级到达
4. 为安卓端与多用户预留接缝（本期不实现，见第 10 章）

### 1.3 非目标

- 安卓端实现
- 多用户协作改造
- Server Actions 全量 REST 化（仅元数据新建 REST；正文保存保留 Server Action）
- 白板离线编辑（见 8.6 已知限制）

---

## 2. 已确认决策

| # | 决策项 | 结论 |
|---|---|---|
| D1 | 客户端 | 仅 Windows，Tauri 2，WebView2 加载云服务 URL |
| D2 | 数据存储 | 云端 Postgres + 本地离线库（双端数据源，本地优先渲染） |
| D3 | 云选型 | 腾讯组合：TencentDB for PostgreSQL + 云托管三服务 + COS |
| D4 | 同步方案 | 分层同步：正文/白板走现有 ws；元数据 REST 增量 + ws 广播 |
| D5 | 用户模型 | 单账号；冲突 = 记录级 LWW（服务端裁决，服务端时钟为准） |
| D6 | 多用户 | 本期不做；升级点标注见第 10 章 |
| D7 | UI 影响 | **现有页面视觉/布局/组件零改动**（同一套前端跑在 WebView2）。仅新增：①同步状态指示器（状态栏角落，synced 时隐藏，offline 显示"离线 · N 条待传"）②同步 error toast（仅失败弹一次）③设置面板"开机自启"开关 ④离线时 AI/搜索/导入等按钮提示"需要网络"。经确认采用此方案（备选的"全部藏进托盘"已否决） |

---

## 3. 架构总览

### 3.1 部署拓扑（目标态）

```
┌─ 腾讯云 ────────────────────────────────────────────────┐
│ 云托管 · 服务A「web」     next start（REST /api/v1、        │
│                          Server Actions、静态资源）         │
│ 云托管 · 服务B「collab」  node src/collab/server.mjs       │
│                          （Hocuspocus，常驻 minInstances≥1）│
│ 云托管 · 服务C「tldraw」  node src/collab/tldraw-server.mjs│
│                          （常驻 minInstances≥1）           │
│ TencentDB for PostgreSQL  ← DATABASE_URL（唯一数据库）       │
│ COS 桶 attachments        ← 附件                            │
│ COS 路径 releases         ← Tauri 更新包 + manifest（CDN）   │
└──────────────────────────────────────────────────────────┘
     ▲ HTTPS/REST + Cookie        ▲ WSS（collab / tldraw）
     │                            │
┌────┴────────────────────────────┴──────────────────────┐
│ Windows · Tauri 2（WebView2）                           │
│  现有 Next.js 前端（TipTap/Yjs/白板，UI 复用）             │
│  sync-core（平台无关）► 存储适配器 SQLite(Tauri)/IndexedDB(Web)│
│  附件队列 ► COS 直传（服务端签发预签名 URL）                  │
└──────────────────────────────────────────────────────────┘
```

三服务共用同一镜像、不同启动命令。`minInstances≥1` 是硬要求：缩容到 0 会杀 ws 连接与 tldraw 内存 Room。

### 3.2 客户端逻辑分层

```
UI 组件（现有，仅改元数据调用点，见 5.5）
  ├── 正文编辑 → 现有 Yjs 路径（零改动）
  └── 元数据编辑 → sync-core.applyLocal()（写本地库 + 入队）
        │
sync-core（新增 src/lib/sync-core/，平台无关）
  ├── reconciler.ts   游标对账（pull 循环 / push 分批）
  ├── queue.ts        待推送队列（持久化 + 合并 + 退避）
  ├── broadcast.ts    ws 广播订阅 → 500ms 去抖 → 触发 pull
  ├── store.ts        存储接口（表读写/事务/cursor/pending_ops）
  └── adapter-sqlite.ts / adapter-idb.ts（同一接口两个实现）
        │
platform.ts（唯一平台入口：isDesktop / storageBackend / notify / openExternal）
```

业务代码只 import `sync-core` 与 `platform.ts`，不直接感知 SQLite/IndexedDB 差异。

---

## 4. 数据模型变更（schema 迁移）

流程：改 `src/prisma/contract.prisma` → `npm run contract:emit` → 更新 `migration.ts`（按仓库 prisma-8 skill 流程）。

### 4.1 规则 S1：同步表必须有 updatedAt + deletedAt

| 表 | 补 updatedAt | 补 deletedAt | 关联代码改造 |
|---|---|---|---|
| Tag | 新增 | 新增 | `src/actions/tag/tag.ts:110` 硬删 → 软删 |
| DocumentTag | 新增 | 新增 | `tag.ts:82` 硬删 → 软删 |
| Favorite | 新增 | 新增 | `favorite.ts:18` 硬删 → 软删 |
| Task | 已有 | 新增 | Task 删除 action 改软删 |
| CollectionItem/Property/Value/View | 已有 | 新增 | 集合删除 action 改软删 |
| Comment / CommentThread | 已有 | 新增 | 删除 action 改软删 |
| DocumentShare | 已有 | 新增 | 删除 action 改软删 |
| Document / Folder / Collection / Whiteboard | 已有 | 已有 | 现状即软删（isDeleted+deletedAt），复用 |
| DailyNotesConfig | 已有 | 不需要 | 单行 upsert，无删除 |

唯一键与软删冲突处理（实现约定）：唯一约束不加 deletedAt 后缀；删除"标签/收藏"等带唯一键的行时**保留行、只标墓碑**；再次创建同名时复用旧行并清空 deletedAt（upsert 语义）。

### 4.2 规则 S2：Document/Whiteboard 新增 `metaUpdatedAt`

**为什么**：`updateDocument`（`src/actions/document/update.ts`）混写 title 与 content。若 LWW 用 `updatedAt`，一次正文保存会把元数据版本顶高，离线端元数据 push 被误拒。

- 新增列：`Document.metaUpdatedAt TimestamptzString?`、`Whiteboard.metaUpdatedAt TimestamptzString?`
- **bump 白名单（服务端精确判断）**：
  - Document 元数据字段：`title` `icon` `coverImage` `coverType` `font` `width` `pageStyle` `parentId` `folderId` `order` `isDeleted` `deletedAt` `isDailyNote` `dailyNoteDate`
  - Document 正文派生字段（**不** bump）：`content` `plainText` `wordCount` `charCount` `version`
  - Whiteboard 元数据字段：`name` `shareToken` `isDeleted` `deletedAt`
- 其余同步表没有独立内容列：**`updatedAt` 即 LWW 时间戳**

### 4.3 规则 S3：syncTs 定义

`syncTs` = Document/Whiteboard 的 `metaUpdatedAt`，其余同步表的 `updatedAt`。下文"同步时间戳"均指 syncTs。

### 4.4 历史数据回填（迁移内完成）

- 缺 `updatedAt` 的新列：回填库 `now()`
- Document/Whiteboard：`metaUpdatedAt = updatedAt` 逐行回填
- 已有 `deletedAt IS NOT NULL` 的行保持原样（已是墓碑）

### 4.5 删除语义

- 所有删除 action → `SET deletedAt = now(), isDeleted = true`（有 isDeleted 的表）
- 恢复（`delete.ts:28` 现状 `deletedAt: null`）→ 同时 bump syncTs
- 硬删仅允许出现在墓碑清理（4.6）

### 4.6 墓碑清理（懒清理，无 cron）

任意 `GET /api/v1/sync` 完成后顺带执行：每请求最多 DELETE 100 条 `deletedAt < now() - 30 days`，按表轮转。单用户量级足够。

### 4.7 不参与元数据同步

| 表/列 | 原因 |
|---|---|
| Document.content / plainText / wordCount / charCount / version | 正文链路（Yjs + Server Action），派生列 |
| Backlink | 正文派生，服务端 `syncBacklinks` 重算 |
| YjsDocumentState | Yjs 持久化自身 |
| DocumentVersion | 版本历史链路（`src/actions/version.ts`） |
| DocumentMember | 多用户 ACL，单用户无操作入口 |
| Whiteboard.data | tldraw 链路 |

---

## 5. 同步协议

### 5.1 同步表与字段范围（v1 完整清单）

| # | 表 | payload 字段范围 | syncTs |
|---|---|---|---|
| 1 | document | 规则 S2 元数据白名单，**不含** content/plainText/wordCount/charCount/version | metaUpdatedAt |
| 2 | folder | 全列 | updatedAt |
| 3 | tag | 全列 | updatedAt |
| 4 | document_tag | 全列；id = `${documentId}__${tagId}`（复合主键映射） | updatedAt |
| 5 | favorite | 全列 | updatedAt |
| 6 | task | 全列 | updatedAt |
| 7 | collection / collection_item / collection_property / collection_value / collection_view | 全列 | updatedAt |
| 8 | whiteboard | `name` `shareToken` `isDeleted` `deletedAt`，**不含 data** | metaUpdatedAt |
| 9 | daily_notes_config | 全列（单行 upsert） | updatedAt |
| 10 | user | 仅 `theme` `editorFont` `editorWidth` `name` `image` | updatedAt |
| 11 | comment / comment_thread | 全列 | updatedAt |
| 12 | document_share | 全列 | updatedAt |

payload 形状：`{ table, id, op, data, syncTs }`，`op ∈ {"upsert","delete"}`；delete 仅 `{table, id, syncTs}`。
Document/Whiteboard 服务端 SELECT 用显式列名单（禁止 `SELECT *`），保证 content/data 永不进 payload。

### 5.2 REST API（`src/app/api/v1/`）

**通用约定**：NextAuth session cookie 鉴权（同源），未登录 `401 {"error":"unauthorized"}`；时间 ISO8601 UTC 定长毫秒（`2026-09-28T10:03:00.123Z`）；`Cache-Control: no-store`。

**GET /api/v1/sync**

```
query:
  since  可省略（=全量起点）；格式 "<ISO>|<recordId>"
  limit  默认 500，最大 1000（越界 400）

200:
{
  "records": [
    { "table": "document", "id": "uuid", "op": "upsert",
      "data": { "title": "...", "...": "不含 content" },
      "syncTs": "2026-09-28T10:03:00.123Z" },
    { "table": "tag", "id": "uuid", "op": "delete", "syncTs": "..." }
  ],
  "cursor": "<最后一条 syncTs>|<其 id>",
  "hasMore": true
}
语义：返回全部 (syncTs,id) 字典序 > since 的记录，按 (syncTs,id) 升序。
hasMore=true → 客户端以返回 cursor 继续拉；每批立即应用到本地并推进 cursor
（中途断线从断点续拉，不回滚）。
```

错误：`400` since 格式错/limit 越界；`401`；`500 {"error":"internal"}`。

**POST /api/v1/sync**

```
请求：
{
  "records": [
    { "table": "folder", "id": "uuid", "op": "upsert",
      "data": { ... }, "syncTs": "客户端时间，仅作 LWW 比较输入" }
  ]
}
约束：records ≤ 200/批（超 400）；请求体 ≤ 2MB（超 413）

200:
{
  "applied":  [ { "table": "folder", "id": "uuid" } ],
  "rejected": [ { "table","id","op","data","syncTs": "<服务端最新>" } ],
  "cursor": "<本次事务产生的最大 (syncTs,id)>"
}
```

**服务端 LWW 裁决（精确算法）**

```
T_srv = 服务端现值 syncTs；T_cli = payload.syncTs
op=upsert：
  记录不存在           → 应用；syncTs = 服务端 now()
  存在且 T_cli > T_srv  → 应用；syncTs = 服务端 now()
  存在且 T_cli ≤ T_srv  → 拒绝；rejected 回传服务端完整最新值
op=delete：
  同上比较；接受 → 软删 deletedAt=now()、syncTs = 服务端 now()
  记录本就不存在       → 幂等接受，无副作用
批内同 id 多条 → 按数组顺序逐条应用（后条以前条结果为基线）
整批单事务原子；重复推送幂等
```

错误：`400` 形状不合法；`401`；`413`；`500`（整批回滚，客户端整批重推）。

**附件端点**

```
POST /api/v1/attachments/sign   {name, size, type}
  → 200 {uploadUrl, key, expiresAt}  COS 预签名 PUT，10 分钟
  → 413 size>100MB；400 文件名/类型非法（沿用 storage.ts 的 NAME_RE 与 EXT_MIME 白名单）
GET  /api/v1/attachments/url?key=<uuid.ext>
  → 200 {url, expiresAt}  COS 预签名 GET，5 分钟
key 规则：沿用 storage.ts 现有 UUID 化文件名
```

### 5.3 游标语义（精确）

- 格式 `"<syncTs>|<recordId>"`；syncTs 定长毫秒保证字符串可比
- 记录 R 在 cursor C 之后 ⇔ `R.syncTs > C.ts` ∨ (`R.syncTs = C.ts` ∧ `R.id > C.id`)
- 服务端实现：逐表 `WHERE (syncTs,id) > (C.ts,C.id) ORDER BY syncTs,id LIMIT n` 后多路归并（单用户量级，不强制 UNION）
- 客户端仅存 1 个 cursor（`sync_state` 表 `key='cursor'`）
- 回环抑制：`POST /sync` 响应 cursor ≥ 本地 cursor → 直接落库，不触发 pull

### 5.4 实时广播

**进程间通知（web 与 collab 是两进程）**：数据库通知表，不引入 Redis——

```
新增表 sync_events(id bigserial PK, ts timestamptz, tables text[], cursor text)
web 侧：元数据写入成功后 INSERT（与业务同事务，保证不漏）
collab 侧：每 500ms SELECT 未处理行 → 给该用户全部 ws 连接广播 → DELETE 已处理行
延迟 ≤500ms，单用户可接受
```

**发射点**：`/api/v1/sync` 落库后（applied 非空时）、所有服务端元数据 action 落库后（updateDocument 元数据字段、create/delete/restore/move/rename、tag/favorite/collection/comment/share/user 设置）。

**广播消息**：`{ "t": "meta", "tables": ["document","folder"], "cursor": "<syncTs>|<id>" }`（发给该用户全部 ws 连接）。

**客户端处理**：收到且 cursor > 本地 → 500ms 去抖合并 → `GET /sync?since=本地cursor` 拉完 → apply + 推进 cursor → 发 `store:changed(table)` → UI 刷新。广播丢失无害。

**降级**：ws 未连时每 30s pull（仅窗口存活且已登录）；ws 重连成功立即对账一次。

### 5.5 客户端写路径改造点（逐点）

| 调用点 | 现状 | 改为 |
|---|---|---|
| `DocumentTreeItem` 重命名/移动/改图标 | Server Action `updateDocument` | `applyLocal("document", id, patch)` |
| 新建/删除/恢复 文档、文件夹 | `src/actions/{document,folder}/*` | `applyLocal`（本地建行 + 队列） |
| 标签增删、收藏切换 | `tag.ts`、`favorite.ts` | `applyLocal` |
| 任务、集合、评论、分享、设置、白板改名 | 各自 Server Actions | `applyLocal` |
| **正文保存**（Editor onUpdate / Ctrl+S / 卸载 flush） | Server Action `updateDocument` | **保留**，请求体收敛为 `{content, plainText, wordCount, charCount, version}` |
| 登录注册、导入导出、AI、搜索、版本恢复 | Server Actions / API | 不变（离线不可用，8.6） |

**`applyLocal(table, id, patch)` 语义**：

```
1. 事务内：merge 写本地镜像行 + syncTs=本地时间 + 登记 pending_ops
   （delete → 本地行标 deletedAt + 登记 delete 项）
2. 同 (table,record_id) 已有待推项 → 合并为最后一条（离线改 100 次标题只推 1 条）
3. 立即返回，UI 即时渲染
4. flush 触发：debounce 2s ∥ 队列 ≥50 条 ∥ 收到广播 ∥ 窗口重新聚焦 ∥ online 事件
5. flush：按 created_at 升序分批 POST（每批 ≤200；folder 排在 document 前）
6. 成功：rejected 覆盖本地、推进 cursor、删除 applied 队列项
7. 失败：指数退避 2s→4s→8s…封顶 300s；连续 3 次 → error（toast 仅一次）
```

**本地库结构（SQLite / IndexedDB 同构）**

```
<12 张同步表镜像>：列 = payload 字段 + deletedAt + id 主键索引
sync_state(key TEXT PK, value TEXT)   -- 'cursor' / 'lastPullAt' / 'schemVersion'
pending_ops(seq, table, record_id, op, payload, created_at, tries, next_retry_at)
本地 schema 演进：启动读 schemVersion，按版本增量执行 DDL（不用 ORM）
```

### 5.6 标题/正文拆分（关键点）

```
标题/元数据 → applyLocal（REST 链路，服务端 bump metaUpdatedAt）
正文保存    → updateDocument 仅传正文类字段（服务端不 bump metaUpdatedAt）
```

- `updateDocument` 改造：字段白名单——正文类不触 metaUpdatedAt；元数据字段（兼容期）触发
- 编辑器标题输入与正文编辑并行两条链路，互不阻塞
- 正文保存后仍重算派生表（Backlink/Task）与 plainText/wordCount，逻辑不变

### 5.7 冲突与边界（精确行为）

| # | 场景 | 行为 |
|---|---|---|
| C1 | 双端离线改同一记录后先后重连 | 后 push 者 syncTs 旧 → rejected → 本地被服务端值覆盖（先到者胜），无 UI 提示 |
| C2 | 离线改的记录在别端被删 | pull 到墓碑 → 本地跟随删（本地未推修改丢弃，rejected 带 delete） |
| C3 | 客户端时钟偏差 | 服务端应用时无条件 `syncTs = 服务端 now()`；客户端 syncTs 仅作比较输入 |
| C4 | 离线新建文档、父文件夹在别端被删 | pull 到父墓碑 → 子行 parentId/folderId 置空迁至"待整理"根，不丢数据 |
| C5 | 正文+标题同时离线改 | 正文 Yjs 合并、标题 LWW，链路独立，重连各自收敛 |
| C6 | 批次失败 | 整批事务原子：全成或 500；500 整批重推，幂等容许重复 |
| C7 | 自己 push 触发的广播回拉 | 回环抑制（5.3） |

---

## 6. 离线策略

### 6.1 存储分层

| 层 | 内容 | Tauri | Web（保留可用） |
|---|---|---|---|
| 离线库 | 12 表镜像 + sync_state + pending_ops | SQLite（tauri-plugin-sql，`%APPDATA%`） | IndexedDB（idb 封装，同构） |
| 正文缓存 | 每文档 Yjs 状态 | y-indexeddb（现有，不改） | 同左 |
| 附件缓存 | 已下载文件 + 已传清单 | `%APPDATA%/attachments/` | Cache Storage |
| 正文弃稿 | draft-store（现有兜底） | IndexedDB（现有，不改） | 同左 |

### 6.2 三条数据流

**启动**：读本地库渲染（0 等待）→ 在线则 `GET /sync?since=cursor` 循环拉完（每批即到即用）→ 订阅广播；离线跳过 pull，等 online 事件。

**本地变更**：`applyLocal`（5.5）。

**远端变更**：广播 → pull 循环（5.4）；ws 断线走 30s 轮询。

### 6.3 关键细节

- 推送顺序：`created_at` 升序 + 同批内 folder 先于 document。服务端**不做父存在性校验**（`parentId/folderId` 可空、无强外键约束），父缺失由客户端队列顺序保证
- 全新设备：省略 since = 全量起点；正文按需加载（打开哪篇连哪篇 Yjs）
- 附件去重：上传前查"已传清单"（`sync_state` 内 JSON），命中跳过
- 队列 >1000 条：状态栏"待同步 N"角标，分批继续推，不丢不阻塞

### 6.4 边界行为

| 场景 | 行为 |
|---|---|
| 离线超 30 天（墓碑已清） | 首轮全量对账（since 省略）时，本地存在但全量中不存在的行 → 判定删除 |
| 队列积压 | 50 条即 flush + 200/批，1000 条约 5 批秒级完成 |
| 本地库损坏 | 启动 PRAGMA integrity_check（Web 跳过）；失败 → 改名备份 + 重建 + 全量拉 |

---

## 7. 附件存储迁移

### 7.1 抽象接口（保持 `src/lib/storage.ts` 导出签名）

```
saveUpload(file) / saveUploadBuffer(buf, ext) / readUpload(name) / deleteUpload(name)
实现：LocalStorage（现默认）→ CosStorage
开关：STORAGE_DRIVER=cos|local（默认 local，本地开发零影响）
```

### 7.2 CosStorage

- `saveUpload`：服务端 SDK 写私有桶（key = 现 UUID 规则），返回元数据形状不变
- `readUpload`：`/api/files/[name]` 改为 302 到预签名 GET URL（DB 存文件名不变，历史数据零迁移）
- `deleteUpload`：DeleteObject，失败容错 `.catch(() => {})`（同现状）

### 7.3 客户端直传（新上传主路径）

```
1. POST /api/v1/attachments/sign → 预签名 PUT
2. 客户端直传 COS（不经 Next）
3. 失败 → 附件队列退避重试（同 5.5）；离线 → 排队等 online
4. 成功 → 记入"已传清单"，文档内文件名引用照旧
现有 /api/files 端点保留并切到 CosStorage（兼容旧调用方）
```

### 7.4 存量迁移

一次性脚本 `scripts/migrate-uploads-cos.ts`：遍历 `uploads/` → 逐个 PutObject（带进度）→ 校验数量 → 删除本地副本（保留 7 天缓冲）。手动执行。

---

## 8. Tauri 壳与桌面体验

### 8.1 壳结构

```
src-tauri/
├── tauri.conf.json           # 窗口/安全/更新
├── src/main.rs               # 托盘、全局快捷键、单实例、菜单
├── capabilities/default.json # 最小权限（无通用 fs、无 shell）
└── Cargo.toml
```

- 窗口 1280×800，`tauri-plugin-window-state` 记忆位置尺寸
- `tauri-plugin-single-instance`：二次启动聚焦已有窗口
- 首版加载编译期注入的 `NEXT_PUBLIC_APP_URL`；预留"包内静态资源模式"，不在本期

### 8.2 桌面能力清单

| 能力 | 插件 | 配置 | 优先级 |
|---|---|---|---|
| 托盘 | 内建 TrayIcon | 关窗最小化到托盘（设置可关）；菜单：显示/新建文档/退出 | P0 |
| 全局快捷键 | tauri-plugin-global-shortcut | `Ctrl+Alt+C` 切换显隐 | P0 |
| 原生通知 | tauri-plugin-notification | 仅同步 error、大附件完成 | P1 |
| 开机自启 | tauri-plugin-autostart | 默认关，设置可开 | P1 |
| 自动更新 | tauri-plugin-updater | COS+CDN manifest，Ed25519 公钥编译期注入；启动时+每 4h 检查 | P1 |
| 深浅色 | 内建 theme 监听 | 注入 `data-theme`，复用现有 theme 链路 | P1 |
| 原生菜单 | 内建 Menu | 文件/编辑/视图/帮助；Ctrl+S/Z/Y/C 转发前端 keydown | P1 |
| 文件关联 .md | file association | 安装器注册 → 点击走导入流程 | P2 |

### 8.3 `platform.ts`（唯一平台入口）

```ts
isDesktop(): boolean                   // window.__TAURI_INTERNALS__ 探测
storageBackend(): 'sqlite' | 'idb'     // sync-core 装配
notify(title: string, body: string)    // Tauri 通知 / Web Notification
openExternal(url: string)              // shell open / window.open
```

安卓未来在 WebView 壳注入同名对象即可复用 sync-core（本期不实现）。

### 8.4 安全边界

- capabilities：仅窗口/托盘/快捷键/通知/sql（限定本地库路径）/updater
- CSP `connect-src`：API 域名 + collab/tldraw wss 域名 + COS 域名；`img-src` 加 COS
- 服务端 URL、更新公钥编译期注入，无运行时可改配置

### 8.5 打包发布

- `tauri build` → NSIS（~10MB，资源走网络）+ MSI
- **代码签名证书（TrustAsia 等）列为前置采购项**，无签名触发 SmartScreen 拦截
- 更新包 + `latest.json` 上传 COS releases 路径

### 8.6 已知限制（明确声明）

| 限制 | 说明 |
|---|---|
| 白板离线不可编辑 | tldraw 数据不经离线库；离线打开显示"离线不可用"占位，联网恢复 |
| 离线全文搜索不可用 | 离线仅匹配标题/文件夹名（本地 LIKE）；正文搜索需联网走现有 `search.ts` |
| 登录/注册/AI/导入导出/版本恢复 | 依赖服务端，离线不可用，UI 显示"需要网络" |
| wordCount/charCount/plainText | 正文派生列，离线期间不更新，重连后随下次正文保存校正 |
| 同记录双端离线同时编辑 | 后到者被覆盖（LWW，单用户接受，无冲突 UI） |

---

## 9. 错误处理与测试

### 9.1 同步状态机

```
offline ──online事件──► syncing ──队列空+对账完──► synced
   ▲                      │                        │
   └────offline事件────────┴──── ws close ────► degraded(30s轮询)
                             │
                       连续3次失败
                             ▼
                          error ──重试成功/网络恢复──► syncing
```

- 指示器：synced 隐藏 / syncing 转圈 / offline"离线 · N 条待传" / degraded"实时连接断开" / error toast 一次 + 角标
- 正文保存失败仍走 draft-store，与本状态机独立

### 9.2 错误分类

| 错误 | 处理 |
|---|---|
| 网络不可达 | 转 offline（online/offline 事件 + ws close 双信号），本地读写不受影响 |
| 401 会话过期 | 队列暂停（不丢）→ 跳登录 → 登录成功 resume flush |
| rejected（LWW） | 非错误：覆盖本地 + 移除队列项 |
| 400/413 | 不重试，console + error（程序 bug 信号） |
| 5xx / 超时 / 网络错 | 指数退避 2s→300s；连续 3 次 → error |
| COS 直传失败 | 附件队列独立退避，不阻塞元数据 |
| 本地库损坏 | 6.4 处理 |
| ws 广播断 | 降级 30s 轮询，不进 error |

核心原则：**任何同步失败不阻塞编辑**——本地写入永远成功，同步永远后台。

### 9.3 测试策略

**单元（vitest，`npm test`）**

- `reconciler`：游标推进；同 syncTs 多记录按 id 续传不漏；hasMore 循环；回环抑制
- LWW 服务端算法：不存在/较新/较旧/成对 delete/批内同 id；幂等重推
- `queue`：同 record 合并、退避序列、flush 分批与 folder 排序
- 双适配器一致性：同一套用例跑 sqlite（better-sqlite3 内存库）与 idb（fake-indexeddb）

**集成**

- `/api/v1/sync`：400/401/413 边界、200 条与 2MB 限制、事务原子（中途异常整批回滚）
- 广播链路：web INSERT → collab ≤500ms 广播 → 客户端拉取完成
- 墓碑清理：30 天边界前后行数

**端到端（Playwright，`npm run test:e2e`）**

- 双上下文模拟两台设备：A 改树 → B 5 秒内刷新
- `setOffline(true)` 断网编辑 → 恢复 → 双端 10s 内收敛一致
- 全新 context 首次登录 → 全量拉取渲染完整树
- 刷新页面 → cursor 断点续拉（后端断言 since 参数）

**桌面壳**：手动清单（托盘/快捷键/通知/自启/更新/深浅色）；CI 冒烟 `tauri build` 产物可启动。

### 9.4 验收标准

1. 双端改元数据，5 秒内互见
2. 断网 30 分钟自由编辑，恢复后 10 秒内双端收敛一致
3. 冷启动到可编辑 < 2s（本地库直读）
4. 全量同步 1000 条 < 5s
5. 现有 `npm test` 与 `npm run test:e2e` 全绿（含新增用例）

---

## 10. 多用户升级点（本期不实现，预留标注）

协议骨架（增量 pull/push + 单水位 + ws 广播 + 墓碑 + 服务端时间戳）就是多用户形态，届时**不动骨架**。需要改动的三处：

| # | 升级点 | 现状（单用户） | 多用户改法 | 影响面 |
|---|---|---|---|---|
| U1 | 冲突裁决 | 服务端 LWW（`T_cli ≤ T_srv` 即拒），双人同时改同字段会丢编辑 | 服务端裁决函数换为字段级合并 / 3-way diff + 冲突提示 UI | **只换 `POST /sync` 内的裁决函数**；协议报文、cursor、客户端队列、本地库全部不动 |
| U2 | 可见性过滤 | sync 返回该账号全部记录 | 每张表查询加 ACL join：`DocumentMember` + `DocumentShare` + `Folder` 继承，只返回可见记录 | 每个 sync 查询一个 join，约 1-2 天 |
| U3 | 广播范围 | `collab` 把 meta 事件发给"该用户全部 ws 连接" | 改为按空间/文档订阅广播；`sync_events` 表加 `scope` 字段 | Hocuspocus 本身按 document 组织连接，只改订阅粒度 |

**无需改动**：正文 Yjs（CRDT 天生多人）、白板 tldraw sync（官方多会话）、墓碑、`sync_events` 表结构（可加列）、单 cursor 语义、本地库结构、Tauri 壳。

**已有多用户地基**（项目内现成）：`User` 多账号表、`DocumentMember`（`contract.prisma:379`）、`DocumentShare` token/slug、`src/lib/authz/guard.ts` 与 `document-access.ts`、`src/lib/share/resolve.ts`。

**预估升级代价**：+1 周（U1 是大头，U2/U3 各 1-2 天）。

**本期约定（YAGNI）**：不预写多用户代码；但以下设计决策已按多用户可升级方向选定，实现时不得回退——
1. LWW 裁决集中在服务端单个函数（U1 换函数即可）
2. sync 查询集中在一个数据访问层（U2 加过滤即一处生效）
3. `sync_events` 表带 `tables` 数组与可扩展列
4. 服务端时间戳（客户端钟永不入库）

---

## 11. 工期与分期

| 期 | 内容 | 任务明细 | 验收 | 预估 |
|---|---|---|---|---|
| P1 | 同步内核（先在 Web 端跑通） | ① schema 迁移（S1/S2 列 + 回填 + 软删改造）② `GET/POST /api/v1/sync` + LWW 函数 ③ `sync_events` 表 + collab 轮询广播 ④ `sync-core`（reconciler/queue/双适配器）⑤ UI 元数据调用点改造（5.5 表）⑥ 单测+集成+E2E | Web 双上下文：A 改树 B 5s 内刷新；断网编辑恢复后收敛 | 1.5 周 |
| P2 | 附件上云 | ① storage.ts 抽象 + CosStorage ② sign/url 端点 ③ 客户端直传 + 队列 ④ 存量迁移脚本 | 本地开发 `STORAGE_DRIVER=local` 不受影响；cos 模式上传/读取/删除全通 | 0.5 周 |
| P3 | Tauri 桌面端 | ① `src-tauri` 壳 + platform.ts ② SQLite 适配器接入 ③ 托盘/快捷键/通知/自启/更新/菜单 ④ CSP/capabilities | 离线启动 <2s 可编辑；P0/P1 桌面能力手动清单通过 | 1 周 |
| P4 | 云上部署与验收 | ① Dockerfile + 云托管三服务 ② TencentDB/COS/域名接入 ③ 环境变量与迁移执行 ④ 验收标准 9.4 全测 | 9.4 五条全过；`npm test` / `test:e2e` 全绿 | 0.5 周 |

**合计约 3.5 周**。P1 是关键路径；P2/P3 可在 P1 的 E2E 稳定后并行一人。

### 前置采购/开通项（第 1 周内完成，否则阻塞 P4）

| # | 项 | 用途 | 阻塞期 |
|---|---|---|---|
| 1 | 腾讯云账号 + TencentDB for PostgreSQL 实例 | DATABASE_URL | P4（P1-P3 用本地 Postgres 开发） |
| 2 | 云托管服务开通 + 域名/备案（如需） | web/collab/tldraw 三服务 | P4 |
| 3 | COS 桶（attachments + releases）+ CDN | 附件、更新包 | P2/P4 |
| 4 | 代码签名证书（TrustAsia 等） | NSIS/MSI 签名，免 SmartScreen 拦截 | P3 打包前 |
| 5 | TLS 证书（云托管可自动配） | wss/https | P4 |

---

## 12. 附录：常量表（实现时以此为准）

| 常量 | 值 | 位置 |
|---|---|---|
| 元数据保存 debounce | 2000ms | sync-core flush |
| 队列立即 flush 阈值 | 50 条 | sync-core |
| push 批大小 | 200 条/批 | sync-core + 服务端 400 |
| 请求体上限 | 2 MB | 服务端 413 |
| pull 默认/最大 limit | 500 / 1000 | 服务端 400 |
| 重试退避 | 2s 起倍增，封顶 300s；3 次转 error | queue.ts |
| ws 断线轮询间隔 | 30s | broadcast.ts |
| 广播去抖窗口 | 500ms | broadcast.ts |
| sync_events 轮询间隔 | 500ms | collab server |
| 墓碑保留期 | 30 天，每请求清 100 条 | 服务端 |
| 附件直传上限 | 100 MB | sign 端点 413 |
| 预签名有效期 | PUT 10min / GET 5min | sign/url 端点 |
| 更新检查间隔 | 启动时 + 每 4h | tauri updater |
| ws 服务常驻 | minInstances ≥ 1 | 云托管配置 |

