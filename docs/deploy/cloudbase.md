# 腾讯云部署清单（P4，阶段 B BLOCKED — 建资源前需清单确认）

> 铁律：任何创建/开通/购买前，先按此模板填「产品/规格/预估费用」交确认，未获明确答复不得执行

## 部署拓扑（spec 3.1）

```
云托管 web      next start                    (REST /api/v1, Server Actions, 静态资源)
云托管 collab   npm run start:collab          (Hocuspocus, 常驻 minInstances≥1)
云托管 tldraw   npm run start:tldraw          (TLSyncRoom, 常驻 minInstances≥1)  
TencentDB       PostgreSQL  (DATABASE_URL 唯一)
COS attachments 私有桶  (附件)
COS releases    公有/CDN  (Tauri 更新包 + latest.json)
```

三服务共用同一镜像（`Dockerfile` 三阶段），不同启动命令。`minInstances≥1` 硬要求：缩容到 0 会杀 ws 连接与 tldraw 内存 Room。

## 服务配置模板（填真实值后作为部署工单）

| 服务 | 镜像 | 启动命令 | CPU/Mem | 实例 | 环境变量 | 域名/TLS |
|---|---|---|---|---|---|---|
| web | `ccr.ccs.tencentyun.com/crafty:tag` | `npm run start` | 0.5C1G | min1 max2 | 见下 | `https://app.example.com` 自动 TLS |
| collab | 同上 | `npm run start:collab` | 0.5C1G | **min1** max2 | 同下 | `wss://collab.example.com` |
| tldraw | 同上 | `npm run start:tldraw` | 0.5C1G | **min1** max1 | 同下 | `wss://tldraw.example.com` |

**环境变量（运行时注入，严禁写入镜像）：**

```
DATABASE_URL=postgresql://...
AUTH_SECRET/NEXTAUTH_SECRET=...
COLLAB_SECRET=...
TLDRAW_INTERNAL_SECRET=...
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_COLLAB_URL=wss://collab.example.com
NEXT_PUBLIC_TLDRAW_SYNC_URL=wss://tldraw.example.com
NEXTAUTH_URL=https://app.example.com
STORAGE_DRIVER=cos
COS_BUCKET=crafty-attachments-xxxx
COS_REGION=ap-guangzhou
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_RELEASES_BUCKET=crafty-releases-xxxx
```

**CORS/CSP（spec 8.4）：**

- `connect-src` 需包含：`https://app.example.com wss://collab.example.com wss://tldraw.example.com https://*.myqcloud.com https://releases.example.com`
- `img-src` 加 `https://*.myqcloud.com`
- `src-tauri/tauri.conf.json` 与 `next.config` CSP 头保持一致

## R-23 留痕（P4 决议）

本期 `web` 保持单实例；`sync_events` 轮询 `先到先删` 在多实例下会漏 SSE 订阅者。扩容 >1 前必须改造为 PG `NOTIFY/LISTEN` 或按实例标记已处理。详见 `docs/test-report.md` P4 章。

## 验证命令

```bash
# 镜像构建
docker build -t crafty:test .
# 本地冒烟（见 Dockerfile 注释）
docker run --rm -e DATABASE_URL=... -p 3000:3000 crafty:test npm run start
docker run --rm -e DATABASE_URL=... crafty:test npm run start:collab
docker run --rm -e DATABASE_URL=... crafty:test npm run start:tldraw

# 云上
curl -i https://app.example.com/api/v1/sync                      # 无 cookie → 307
curl -b cookiejar https://app.example.com/api/v1/sync            # 已登录 → 200 {records,cursor,hasMore}
# 全量计时
node scripts/bench-full-sync.mjs --url https://app.example.com --cookie cookiejar

# ws
wscat -c "wss://collab.example.com?token=..."   # 需有效 HMAC token
```

## 回滚

- 三服务保留上一版镜像，云托管一键回滚
- 数据库：`pg_dump` 备份 + `pg_restore`
- 存储：`STORAGE_DRIVER=local` 立即可回，桶数据保留

## 费用清单（示例，正式需按控制台实时价填报）

| 资源 | 规格 | 预估月费 |
|---|---|---|
| TencentDB PostgreSQL | 2C4G 50GB 单可用区 | ¥~300 |
| 云托管 web/collab/tldraw | 各 0.5C1G min1 | 按量 |
| COS attachments/releases + CDN | 标准存储 + 流量 | 按量 |
| 域名/TLS | 自动 | 0 |

---

## 阶段 B 实测（2026-09-30）

> 以下全部为 CLI/API 实测回读值，非文档推断。**上文「费用清单」里的 0.5C1G 与 ap-guangzhou 已作废。**

### 环境

- EnvId `aaa11-d1gfgozz987c564a5`（别名 aaa11）· 个人版 `baas_personal` · 预付 · 到期 **2026-10-31** · 自动续费 · 地域 **ap-shanghai**
- 账号 AppId `1356535306`；镜像仓库命名空间 `ccr.ccs.tencentyun.com/tcb-100042093988-pgaa`
- 已开通后端：PostgreSQL（实例 `postgres-hypwq3vq`，`TenantType: SHARED`，pgvector 随环境提供）、云存储桶 `6161-aaa11-d1gfgozz987c564a5-1356535306`、静态托管 `aaa11-…-1356535306.tcloudbaseapp.com`、云函数（scf）、**云托管（`cloudrun list` 零报错）**
- 日志服务：原先未开通，本轮已开通（官方称不额外计费）。**开通前的容器日志无法回溯**

### VPC（`tcb api vpc DescribeVpcs/DescribeSubnets` 实测，禁止编造 id）

```
VpcId    vpc-pqi8rsug     Default-VPC     CIDR 172.17.0.0/16
SubnetId subnet-6ey5mtfj  Default-Subnet  CIDR 172.17.0.0/20  ap-shanghai-1  可用 IP 4093
```

⇒ `--vpc-config '{"vpcId":"vpc-pqi8rsug","vpcCIDR":"172.17.0.0/16","subnetId":"subnet-6ey5mtfj","subnetCIDR":"172.17.0.0/20"}'`

### PostgreSQL 连接信息：只有控制台通路，且当前**没有任何 TCP 端点**

控制台实际 IA（2026-09-30 截图核对，recipe 文档写的「数据库 → PostgreSQL → 设置 → 账号管理」**对不上**）：
左侧导航 **SQL 型数据库 → PostgreSQL 管理**，页内分组为 数据管理（数据库编辑器/SQL 编辑器）、数据库管理（Schema 可视化/表/函数/触发器/枚举类型/扩展/索引）、访问控制（**策略/角色**）、配置（配置）、平台管理（只读实例）；顶部 tab 为 **配置管理 / 数据库设置**。凭证应在「访问控制 → 角色」或「数据库设置」里找。

截图读到的实例事实：

| 项 | 值 |
|---|---|
| 实例 ID | `postgres-hypwq3vq`（与 `tcb env detail` 一致） |
| 状态 | 运行中 |
| 版本 | **PostgreSQL 17.11**（内核 v17.11_r1.24）≥ 本项目要求的 15 |
| 实例类型 | **共享集群**（页面提供「升级至独享集群」） |
| 规格 | 共享 CPU 及内存 |
| 存储 | 已用 9.75 MB |
| **内网地址** | **`-`（空）** |
| 外网 IPv4 | 未开启（显示「开启」按钮） |
| 安全组 | 暂无数据 |

⇒ **共享集群 PG 当前没有可连的 TCP 地址**。要让 Prisma（TCP 客户端）连上，必须先解决端点问题，候选见下（均需用户确认，涉及费用/暴露面）：开外网 IPv4（公网直连，暴露面大）、关联安全组后看内网地址是否出现（共享集群可能不支持）、升级独享集群（有费用）、或改用独立 TencentDB PostgreSQL（spec 3.1 原方案）。

- `tcb db pg` 只有 `migration`（new/list/fetch/up/repair），**取不到 host/账号**；`tcb api tcb Describe{PostgresqlInstances,EnvPostgresql,DBInstances}` 三个候选全 `InvalidAction`
- ⚠ CloudBase PG 自带一套迁移台账（`tcb db pg migration`），与本项目 Prisma 8 contract + `migration.ts` 是**两套机制**，接 Prisma 前需裁定用哪一套
- 云托管 + TCP 客户端必须同批设 `VpcConf` 且用**内网**地址，5432 白名单放行子网网段 `172.17.0.0/20`

### CLI 能力边界（tcb 3.8.5 实测）

| 项 | CLI 能否 | 说明 |
|---|---|---|
| `--min-num` / `--max-num` | ✅ | spec 3.1 的 `minInstances≥1` 可达 |
| `--vpc-config` | ✅ | 需 vpcId+vpcCIDR+subnetId+subnetCIDR 四项 |
| `--source` 云端构建 | ✅ | **本机不需要 docker**；`HasDockerfile: true`、`BuildDir: "."` |
| `--image-url` 发既有镜像 | ✅ | 跳过构建，约 1 分钟 |
| 环境变量 EnvParams | ❌ | deploy 无旗标；`tcb secrets` 只有 `get` 没有 `set` ⇒ 只能 MCP `manageCloudRun` / 控制台 / manager-node |
| CPU / Mem | ❌ | 无旗标；默认 **1C2G**（非 0.5C1G）⇒ 三个 min1 常驻服务费用约为原估算两倍 |
| `--open-access-types` 收窄 | ⚠ | 传 `OA` 的那次 pod 永不就绪（DeployId 002 `create_failed`），同镜像不带该旗标 9 秒就绪（003 `normal`）。**单对样本，指向该旗标但未做对照复现** |

### CLI 使用陷阱（本轮踩过）

- `--force` **不跳过** `Enable gray deployment?` 交互提示；stdin 为 `/dev/null` 时命令 **exit 0 但根本没提交**（假成功）⇒ 非交互场景用 `printf '\n' |`
- 判定部署结果**一律回读** `tcb cloudrun record list`（`Status`）与 `detail`，不信 CLI exit code
- `--wait` 超时报 `Deployment failed: timeout` ≠ 构建失败（002 的镜像其实构建并推送成功了）
- `logs process` 只认 `--run-id`（不认 `-s`/`--service-name`）；`record list` 取 RunId
- `env detail` 不认位置参数，要 `-e <envId>`

### 构建上下文

`--source` 不要直接指仓库根（`docs/craft-ref` 96M + `.git` 27M 白带）。用 `git ls-files` 生成干净上下文，实测 **18M**。

⚠ 上下文目录**必须建在仓库外**（放仓库根会让 `npm test` 收进副本里的 `e2e/*.spec.ts`，门禁当场假红——2026-09-30 实踩过一次，vitest `exclude` 已改 `**/e2e/**` 兜住，但仍不该在仓库里留副本）：

```bash
CTX="$(mktemp -d)/crafty-src"            # 仓库外
mkdir -p "$CTX" && git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$CTX"
cp --parents Dockerfile .dockerignore .env.example scripts/bench-full-sync.mjs "$CTX/"
```

### 已验证的端到端链路（2026-09-30 22:44）

```
curl -i https://crafty-build-probe-322089-12-1356535306.sh.run.tcloudbase.com/
→ HTTP/1.1 307 Temporary Redirect
  location: /login?callbackUrl=%2F
  x-cloudbase-upstream-type: Tencent-CloudBaseRun
  x-cloudbase-upstream-timecost: 26
```

⇒ Dockerfile 云端构建、镜像运行、Next middleware 鉴权链路、网关路由**全部通**。镜像：
`ccr.ccs.tencentyun.com/tcb-100042093988-pgaa/ca-skatvxbn_crafty-build-probe:crafty-build-probe-002-20260930222806`（digest `sha256:a1c1b212…`）

### 三服务端口映射

| 服务 | `--port` | 代码默认 |
|---|---|---|
| web | 3000 | `next start` 认 `PORT` |
| collab | 3001 | `COLLAB_PORT` 默认 3001（`src/collab/server.mjs:34`） |
| tldraw | 3002 | `TLDRAW_SYNC_PORT` 默认 3002（`src/collab/tldraw-server.mjs:21`） |

⚠ collab/tldraw **不读 `PORT`**，只读各自变量 ⇒ `--port` 必须与代码默认值一致，否则平台探测端口与实际监听端口不符

### 已知占位值（勿当真实配置）

- `src-tauri/tauri.conf.json` 的 updater endpoint `https://crafty-attachments-1250000000.cos.ap-guangzhou.myqcloud.com/releases/latest.json` 有两处错：① 指向**私有** `attachments` 桶，而 spec 8.5 要求 `releases` 是公有读/CDN 桶；② 地域 `ap-guangzhou` 与环境实际的 `ap-shanghai` 不符；③ AppId `1250000000` 是占位，真实为 `1356535306`。真实桶未建（Task 7.1），故本轮未改，避免半真配置
- `docs/deploy/cloudbase.md` 服务配置模板里的 `ccr.ccs.tencentyun.com/crafty:tag`、`app.example.com` 等均为示例值

### 待清理

探针服务 `crafty-build-probe`（min0，无在线版本）：
`tcb cloudrun delete -e aaa11-d1gfgozz987c564a5 -s crafty-build-probe --force`
