# P4 腾讯云部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 台账：`.superpowers/sdd/` 首行 = 本计划路径；派子代理前需求写进 brief 文件，提示词保持短

**Goal:** 按 spec 3.1 把整套系统搬到腾讯云（单镜像三服务 + TencentDB + COS），完成终期验收 9.4 全量复测；凭证走运行时环境变量，迁移先备份 dry-run。

**Branch:** `feature/windows-offline-sync` 原地开发，不切新分支，不合并、不推送（除非明确要求）

**Architecture:** 三服务共用同一镜像、不同启动命令：`web: next start` / `collab: node src/collab/server.mjs` / `tldraw: node src/collab/tldraw-server.mjs`，均 `minInstances≥1`（spec 3.1 硬要求，缩容到 0 会杀 ws 与 tldraw 内存 Room）。TencentDB 为唯一 DB（`DATABASE_URL`），COS `attachments` 私有桶 + `releases` 更新源。Tauri 侧 `NEXT_PUBLIC_APP_URL/COLLAB_URL` 编译期注入，CSP 补生产域名。

**Tech Stack:** Next.js 16 App Router、Prisma 8 contract (`src/prisma/contract.prisma` → `npm run contract:emit` → `migration.ts`)、Tencent CloudBase/TCDB/COS、私有桶预签名、Tauri 2 + tauri-plugin-updater、vitest/Playwright

**Spec:** `docs/superpowers/specs/2026-09-28-windows-offline-sync-design.md` 3.1 / 11 / 9.4 / 12 为主，8.4 安全边界、5.x 同步协议、7.x 附件为约束

**Decisions (P4 递延裁定，已确认):**
- **R-23 多实例 poller 竞争：本期保持 web 单实例，不做 PG NOTIFY/LISTEN**，在 `spec` 与 `docs/test-report.md` 留痕为 P4 决议；扩容 >1 前必须改造为 NOTIFY/LISTEN 或按实例标记
- **前置采购：尚无云账号，P4 拆两阶段** — 阶段 A 本地可验证（Dockerfile/配置/验收脚本），阶段 B 云资源递延 BLOCKED，建资源前必列「产品/规格/预估费用」清单交确认

## Global Constraints

以下常量逐字取自 spec 第 12 章，任何任务不得改写：

- 元数据保存 debounce **2000ms**；队列满 **50** 立即 flush；push 单批 **200**；请求体上限 **2MB**
- pull 默认 **500** / 最大 **1000**；墓碑 **30 天**每请求清 **100**
- 附件直传上限 **100MB** 413；预签名 **PUT 10min (600s) / GET 5min (300s)**
- 退避 **2s 起倍增封顶 300s**，连续 **3 次**转 error；ws 断线 **30s** 轮询；广播去抖 **500ms**；`sync_events` 轮询 **500ms**
- 更新检查 **启动时 + 每 4h**；ws 服务 **minInstances≥1**
- D7 **零视觉改动**；凭证只经环境变量，严禁进代码/git

## File Structure

**新增：**
- `Dockerfile` — 多阶段单镜像，三启动命令
- `.dockerignore`
- `.env.example` — `DATABASE_URL/STORAGE_DRIVER/COS_*/NEXT_PUBLIC_APP_URL/COLLAB_URL/NEXTAUTH_URL/AUTH_SECRET` 落点（P2 遗留）
- `docs/deploy/cloudbase.md` — 三服务配置/启动命令/环境变量/CSP 域名清单（阶段 B，BLOCKED 占位）
- `scripts/bench-full-sync.mjs` — 全量 1000 条翻页计时探针
- `scripts/check-cos-config.mjs` — COS/STORAGE_DRIVER 配置自检（可选）

**修改：**
- `package.json` — 按需补 `start:collab` / `start:tldraw` 便于容器 CMD
- `next.config.*` — 评估 `output: standalone` 与 CSP 生产域名
- `src-tauri/tauri.conf.json` / `src-tauri/capabilities/default.json` — CSP `connect-src/img-src` 补生产域名（如需）
- `docs/test-report.md` — 新增 P4 章（9.4 生产复测数据 + 门禁对比 + R-23 留痕）

**不新增依赖**（P2 经验：`cos-nodejs-sdk-v5` 已有，不用 `tsx`，脚本走 `--experimental-strip-types`）

## 资源清单模板（阶段 B 建资源前必经，铁律）

| 资源 | 规格建议 | 预估费用（月） | 备注 |
|---|---|---|---|
| TencentDB PostgreSQL | 2核4G 50GB 单可用区（最小起） | ¥~300 | 需验证 PG 版本支持 metaUpdatedAt/sync_events/text[] |
| 云托管 web | 0.5核1G min1 max2 | 按量 | 三服务共镜像 |
| 云托管 collab | 0.5核1G **minInstances≥1** | 按量 | 杀 ws 即断 |
| 云托管 tldraw | 0.5核1G **minInstances≥1** | 按量 | 内存 Room |
| COS attachments | 私有读 标准存储 | 按量 |  |
| COS releases + CDN | 公有读/CDN | 按量 | Tauri 更新源 |
| 域名/TLS | 云托管自动 TLS | 0 |  |
| 签名证书 TrustAsia | — | 一次性 | P3 可能已购 |

> 未经明确答复，不执行任何开通/购买/建桶/备案

---

## Task 0 — 前置检查（开工必做，门禁只升不降）

- [ ] Step 0.1 复测门禁四件套（Windows 本机，`feature/windows-offline-sync`）：
  ```bash
  npm test
  npx tsc --noEmit
  npm run lint
  cargo check
  npx playwright test e2e/sync.spec.ts   # 3/3，阈值 10_068 / 18_667 不放宽
  # 全量（无并发 dev）：npx playwright test
  ```
  记录于 `docs/test-report.md` P4 章首表，对照 P3 基线：`npm test 60/403` / `tsc 0` / `lint 0 errors, 593 warnings` / `cargo 0` / `sync 3/3`，只升不降
- [ ] Step 0.2 前置采购 BLOCKED 列（见上表），阶段 A 不建资源
- [ ] Step 0.3 通读本计划 + spec 3.1/11/9.4/12 + test-report P1/P2/P3 章

**Verification:** 门禁表格填实测值；采购表标 BLOCKED；`git status` 无云凭证

---

## Task 1 — Dockerfile 单镜像三启动命令（阶段 A，可本地验证）

> **Spec:** 3.1 三服务共镜像；铁律：凭证与 DATABASE_URL 走运行时环境变量

- [ ] Step 1.1 选基座 `node:20-slim`，多阶段：`deps`（`npm ci`）→ `builder`（`npm run contract:emit && npm run build`）→ `runner`（`next start` 产物 + `src/collab/*.mjs` + Prisma runtime），非 root 用户，暴露 3000/3001/3002
- [ ] Step 1.2 三启动命令（同一镜像）：
  ```dockerfile
  CMD ["npm","run","start"]                          # web: next start
  # 另二服务以同一镜像不同 CMD 部署：node src/collab/server.mjs / node src/collab/tldraw-server.mjs
  ```
  `package.json` 按需补 `start:collab`/`start:tldraw`；`DATABASE_URL/AUTH_SECRET/COS_*` 仅 `ENV` 运行时注入，`NEXT_PUBLIC_*` 评估编译期注入 vs 运行时方案并在 `docs/deploy/cloudbase.md` 留痕
- [ ] Step 1.3 补 `.dockerignore`（`node_modules/.next/.git/uploads/.superpowers` 等），`next.config` 评估 `output: standalone`（减小镜像）
- [ ] Step 1.4 本地冒烟（不推远端）：
  ```bash
  docker build -t crafty:test .
  docker run --rm -e DATABASE_URL=postgresql://... -e AUTH_SECRET=test -p 3000:3000 crafty:test npm run start
  docker run --rm -e DATABASE_URL=... crafty:test node src/collab/server.mjs
  docker run --rm -e DATABASE_URL=... crafty:test node src/collab/tldraw-server.mjs
  curl -i http://localhost:3000/api/v1/sync              # 无 cookie → 307
  # 登录后：curl -b cookie jar http://localhost:3000/api/v1/sync → 200 {records,cursor,hasMore}
  ```

**Verification:** `docker build` 通过；三容器分别可起；无凭证落盘（`grep -r SecretId Dockerfile` 空）

**Rollback:** 删除 `Dockerfile/.dockerignore` 即回退；镜像 tag `crafty:test` 不推远端

---

## Task 2 — 云托管三服务（阶段 B，BLOCKED 占位）

> **Spec:** 3.1 `minInstances≥1` 硬要求；5.4 广播 500ms 去抖

- [ ] Step 2.1 在 `docs/deploy/cloudbase.md` 填三服务清单：服务名/镜像/CPU/Mem/min1/max2/启动命令/环境变量/CSP 域名/TLS，`collab/tldraw` 标注 `minInstances≥1` 不可为 0
- [ ] Step 2.2（BLOCKED，阶段 B 才执行）建三服务，共镜像不同 CMD，注入 `DATABASE_URL/AUTH_SECRET/NEXT_PUBLIC_APP_URL/COLLAB_URL/NEXTAUTH_URL/STORAGE_DRIVER=cos/COS_*`，配域名与自动 TLS
- [ ] Step 2.3 验证常驻：控制台 `minInstances≥1` 截图；`wss://collab...` 可连；缩容不杀连接；`web` 保持单实例（R-23 留痕）

**Verification (BLOCKED):** 控制台配置截图；`curl https://$APP/api/v1/sync` 认证链路；ws 连通性

**Rollback:** 保留上一版镜像，一键回滚；`minInstances` 改 0 前需确认 ws 影响

---

## Task 3 — TencentDB PostgreSQL（阶段 B，BLOCKED 占位）

> **Spec:** 4.x `metaUpdatedAt/sync_events/text[]` 需目标 PG 版本可用；铁律：备份 + dry-run

- [ ] Step 3.1 版本核对（阶段 B）：
  ```sql
  SELECT version();
  SELECT column_name FROM information_schema.columns WHERE table_name='Document' AND column_name='metaUpdatedAt';
  SELECT * FROM sync_events LIMIT 1;
  ```
- [ ] Step 3.2 迁移前 `pg_dump` 备份 + `prisma migrate diff` / `migration.ts --dry-run` 输出交审，再执行迁移；`Document/Whiteboard metaUpdatedAt = updatedAt` 回填校验；`sync_events` 写入/500ms 轮询可用
- [ ] Step 3.3 回归：改 `title` → `metaUpdatedAt` 变，改 `content` → 不变（4.2 bump 白名单）

**Verification (BLOCKED):** 版本号记录； dry-run 输出归档；备份文件留存

**Rollback:** `pg_restore` 回档；`DATABASE_URL` 切回原库

---

## Task 4 — COS 接入核对（阶段 A 部分可做，阶段 B 真桶）

> **Spec:** 7.x `STORAGE_DRIVER=cos` 私有桶 302；P2 假客户端零真实网络

- [ ] Step 4.1 阶段 A 核对：`storage.ts` 302 / 预签名 `PUT 600s GET 300s` / `NAME_RE /^[A-Za-z0-9._-]+$/` / `EXT_MIME` 22 项冻结 / `deleteUpload .catch`；跑 `node --experimental-strip-types scripts/migrate-uploads-cos.ts --dry-run`（P2 已通：成功2）
- [ ] Step 4.2 补 `.env.example`（P2 未验证项）：`DATABASE_URL/STORAGE_DRIVER/COS_BUCKET/COS_REGION/COS_SECRET_ID/COS_SECRET_KEY/NEXT_PUBLIC_APP_URL/COLLAB_URL/NEXTAUTH_URL/AUTH_SECRET`
- [ ] Step 4.3（BLOCKED）真桶闭环：`POST /api/v1/attachments/sign` → `PUT $uploadUrl` → `GET /api/v1/attachments/url?key=` → `302`；`releases` 桶挂 `latest.json`；存量按 `scripts/migrate-uploads-cos.ts` 真搬（本地副本保留7天）

**Verification:** 假客户端单测已绿（`npm test` 60/403）；真环境 `curl -X PUT $uploadUrl` 200 且 `302` 可达

**Rollback:** `STORAGE_DRIVER=local` 立即可回；桶不删数据

---

## Task 5 — 环境与配置（阶段 A 校对，阶段 B 注入）

> **Spec:** 8.4 capabilities 最小权限 + CSP `connect-src/img-src`

- [ ] Step 5.1 校 `NEXT_PUBLIC_APP_URL/COLLAB_URL/NEXTAUTH_URL`/回调 `CSP connect-src`（API + collab/tldraw wss + `*.myqcloud.com`）`img-src`（+ COS）`TLS`（云托管自动）；`src-tauri/tauri.conf.json` 现 `connect-src 'self' http://localhost:3000 ws://localhost:3001 ws://localhost:3002 https://*.myqcloud.com` 需补生产域名
- [ ] Step 5.2 核 `src-tauri/capabilities/default.json` 无新增权限；服务端 URL/更新公钥编译期注入，无运行时可改
- [ ] Step 5.3（阶段 B）云托管注入环境变量并验 `next.config` CSP 头与 tauri 一致

**Verification:** `tauri.conf.json`/`capabilities` diff 仅域名增量；`grep -r NEXT_PUBLIC` 无运行时可改路径

---

## Task 6 — 终期验收 9.4 全量（阶段 A 产脚本，阶段 B 生产复测）

> **Spec:** 9.4 五条；R-21 阈值永不放宽，生产数据如实记录入 `docs/test-report.md` 新章

| # | 验收项 | 严格阈值 | dev 现状 | 计划动作 |
|---|---|---|---|---|
| ① | 双端元数据 5s 互见 | **5s** | 6-7.7s，断言 10_068=worst+30% | 生产复测，如实记录 |
| ② | 断网30min→10s 收敛 | **10s** | 12-14s，断言 18_667 | 同上 |
| ③ | Tauri 冷启动 <2s | <2s | P3 递延 | 真机计时（本地库直读） |
| ④ | 全量1000条 <5s | <5s | 1819行 ~2s VERIFIED×2 | 生产复测翻页计时 |
| ⑤ | 门禁+桌面壳清单 | 全绿+托盘/快捷键/通知/自启/更新 | P3 部分 BLOCKED | 全量门禁重跑+手动清单 |
| ⑥ | 更新链路 | COS releases 冒烟通过 | BLOCKED | 走一次真实升级 |

- [ ] Step 6.1 产 `scripts/bench-full-sync.mjs`（`GET /api/v1/sync?since` 翻页至 `hasMore=false` 计时，500/1000 limit）与生产复测脚本占位
- [ ] Step 6.2 复测 `e2e/sync.spec.ts` 3/3（`converge <10_068` / `recover <18_667` 外层 120s 天花板，仅作防 flake，不改阈值）
- [ ] Step 6.3（阶段 B）生产执行 ①②④ 并把实测 worst/阈值/环境写入 `docs/test-report.md` 新章；③ 真机计时；⑤ 全量 `npm test/tsc/lint/e2e` + `e2e/visual` 抽样 + 桌面手动清单

**R-23 留痕：** 本期 web 单实例，`sync_events` "先到先删" poller 竞争不触发；在 `docs/test-report.md` 写明此为 P4 决议，扩容 >1 前必须 NOTIFY/LISTEN

**Verification:** 生产数据入报告；门禁只升不降；阈值未改

---

## Task 7 — 更新链路打通（阶段 B，BLOCKED）

> **Spec:** 8.5 `releases` 路径 + `tauri-plugin-updater` Ed25519

- [ ] Step 7.1 `releases` 桶/CDN + `latest.json` manifest（版本/签名/下载 URL）
- [ ] Step 7.2 编译期注入公钥与更新 URL，Tauri 侧 `启动时 + 每4h` 检查
- [ ] Step 7.3 真实升级冒烟：旧版→新版一遍

**Verification (BLOCKED):** `curl https://releases.../latest.json` 200；签名校验通过；安装后版本抬升

---

## 风险与回滚

- 云资源误建→费用：阶段 A 不建，阶段 B 必先清单确认
- 迁移失败：`pg_dump` 备份 + dry-run 先行，失败 `pg_restore`
- 镜像过大/启动失败：多阶段 + standalone 瘦身，保留上一版镜像回滚
- `minInstances 0` 误配：kill ws/Room，硬要求 ≥1
- 时钟回拨：观察 cursor 异常即上报

## 台账

每任务新代理 + 两阶段审查 + 终审；`.superpowers/sdd/` 记录 Ruling；超长需求写 brief 再派

