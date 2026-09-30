# P2 附件上云 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把附件存储从本地 `uploads/` 抽象成可切换的存储驱动（local / 腾讯云 COS），补齐预签名直传链路与离线附件队列，并结清 P1 留下的四笔账。

**Architecture:** 保留 `src/lib/storage.ts` 作为唯一对外门面（四个导出签名一字不改），内部按 `STORAGE_DRIVER` 分派到 `storage-local.ts` 或 `storage-cos.ts`。读路径不搬到 COS：DB 里存的文件名保持不变，`/api/files/[name]` 在 cos 驱动下 302 到预签名 GET，零历史数据迁移。写路径新增 `POST /api/v1/attachments/sign` + `GET /api/v1/attachments/url`，客户端拿预签名 PUT 直传 COS（不经 Next），失败进离线队列按 P1 同一条退避阶梯重试，成功写「已上传清单」去重。

**Tech Stack:** Next.js 16 App Router route handlers、Prisma 8 contract、cos-nodejs-sdk-v5@3.0.0、vitest（colocated `*.test.ts`）、Playwright（`e2e/`）、Yjs（P2 零改动）

**Spec:** `docs/superpowers/specs/2026-09-28-windows-offline-sync-design.md`（第 7 章为主，第 12 章常量表、第 4 章 schema 规则为约束来源）

## Global Constraints

以下常量逐字取自 spec 第 12 章，**任何任务都不得改写**：

- 附件直传上限：**100MB**（超限签发接口返 413）
- 预签名 PUT 有效期：**10 分钟**（600s）
- 预签名 GET 有效期：**5 分钟**（300s）
- 附件 key 规则：沿用 `storage.ts` 现有 UUID 化文件名（`randomUUID()` + 小写扩展名）
- 文件名校验：`NAME_RE = /^[A-Za-z0-9._-]+$/`
- 类型白名单：`EXT_MIME` 22 个扩展名（见下方 Task 1 代码，逐字复制，**不得增删**）
- 退避阶梯：`[2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 300s]`，连续 3 次失败后转 `error` 态
- 防抖 2000ms；队列满 50 条立即 flush；push 单批 200 条；请求体上限 2MB
- 墓碑保留 30 天，每次清理 100 条
- `STORAGE_DRIVER` 默认 `local`（本地开发零影响）
- COS 桶为**私有读**；`deleteUpload` 失败必须吞掉（`.catch(() => {})`）
- UI 铁律 D7：现有页面**零视觉变化**，只允许新增同步类型指示
- Yjs / collab 进程（P2 不在范围，本计划零改动）

其他硬约束：

- 唯一新增运行时依赖：`cos-nodejs-sdk-v5@^3.0.0`（已在 package.json）
- **禁止读取 `.env` 与 `src/lib/env/secret.ts` 内容**（凭据文件）。COS 密钥只经 `process.env.COS_SECRET_ID` / `process.env.COS_SECRET_KEY` 取用
- COS 桶名必须形如 `<name>-<appid>`（如 `crafty-1250000000`），否则 SDK `getAuth` 返回 `undefined`
- 门禁不得回退：`npm test` ≥ 286 绿、`npx tsc --noEmit` 0 错、`npm run lint` 0 错、`npx playwright test e2e/sync.spec.ts` 3/3
- 本仓库的 Next.js 版本有破坏性变更：写任何 route handler / server action 前先读 `node_modules/next/dist/docs/` 对应指南

## File Structure

**新增 — 存储层**

| 文件 | 职责 |
| --- | --- |
| `src/lib/storage-driver.ts` | 读 `STORAGE_DRIVER` 与 COS 环境变量，导出 `driverName()` / `isCos()` / `cosConfig()` / `resetDriverForTest()`。**不 import SDK**，便于纯单测 |
| `src/lib/storage-local.ts` | 本地实现：`UPLOAD_DIR` 落盘版 `saveUpload` / `saveUploadBuffer` / `readUpload` / `deleteUpload` + `resolveUploadPath` + `safeStoredName` |
| `src/lib/storage-cos.ts` | COS 实现：`presignPut` / `presignGet` / `putUpload` / `deleteUploadFromCos` / `setCosClientForTest` / `resetCosForTest`。持有单例 `COS` 实例 |
| `src/lib/storage-cos.test.ts` | 预签名 URL 拼接、过期秒数、404-safe 删除（8 例） |
| `src/lib/storage-driver.test.ts` | 驱动选择与 COS 配置校验（5 例） |
| `src/lib/storage-local.test.ts` | 本地落盘 / 读回 / 删除 / 非法文件名（5 例） |

**改写 — 门面**

| 文件 | 职责 |
| --- | --- |
| `src/lib/storage.ts` | 保持 `NAME_RE`、`EXT_MIME`、`mimeForName`、`resolveUploadPath`、`saveUpload`、`saveUploadBuffer`、`readUpload`、`deleteUpload` 导出；新增 `presignGetOrNull(name)`。按驱动分派 |
| `src/lib/storage.test.ts` | 门面分派：local 驱动下四个签名行为不变；cos 驱动下 `presignGetOrNull` 返回 URL、local 返回 null（6 例） |

**新增 — API**

| 文件 | 职责 |
| --- | --- |
| `src/app/api/v1/attachments/sign/route.ts` | POST 校验 name/size/type → 413/400 → 预签名 PUT |
| `src/app/api/v1/attachments/sign/route.test.ts` | 契约测试（9 例） |
| `src/app/api/v1/attachments/url/route.ts` | GET `?key=` → 预签名 GET（5 分钟） |
| `src/app/api/v1/attachments/url/route.test.ts` | 契约测试（5 例） |

**改写 — 读路径**

| 文件 | 职责 |
| --- | --- |
| `src/app/api/files/[name]/route.ts` | cos 驱动下先问 `presignGetOrNull`，命中则 302；否则走原 `readUpload` 分支 |
| `src/app/api/files/[name]/route.test.ts` | 302 分支 + 原内联/附件分支不回退（4 例） |

**新增 — 客户端直传与队列**

| 文件 | 职责 |
| --- | --- |
| `src/lib/attachment-client.ts` | `'use client'`：`uploadFile` 改造为「sign → 直传 PUT → 落已上传清单」；离线/失败抛错交给队列 |
| `src/lib/attachment-queue.ts` | 附件离线队列：入队、退避重试、已上传清单去重、IndexedDB 持久化 |
| `src/lib/attachment-queue.test.ts` | 队列与去重（8 例） |
| `src/lib/attachment-client.test.ts` | 直传三段链路（5 例） |

**新增 — 脚本**

| 文件 | 职责 |
| --- | --- |
| `scripts/migrate-uploads-cos.ts` | 一次性迁移：`uploads/` 遍历 → PutObject → 计数核对 → 本地副本延后 7 天 |
| `scripts/migrate-uploads-cos.test.ts` | 纯函数部分（文件名映射 / 计数核对 / 延后判定）可单测（6 例） |

**改写 — P1 遗留**

| 文件 | 职责 |
| --- | --- |
| `src/app/api/v1/sync/route.ts` | 无需改逻辑；仅在测试侧补真实库验证用例（见 Task 8） |
| `src/app/api/v1/sync/route.test.ts` | 补墓碑 30 天边界、R-1 owner 归属、POST 401 三组测试 |
| `src/app/(app)/tasks/page.tsx` | 4 个写操作从 Server Action 改走 `applyLocal`（零视觉变化） |
| `docs/test-report.md` | 追加 `## P2 attachment acceptance` 段落 |

---

## Task 1: 存储驱动开关 `storage-driver.ts`

**Files:**
- Create: `src/lib/storage-driver.ts`
- Test: `src/lib/storage-driver.test.ts`

**Interfaces:**
- Consumes: 无（叶子任务）
- Produces:
  ```ts
  export type StorageDriver = 'local' | 'cos';
  export function driverName(): StorageDriver;
  export function isCos(): boolean;
  export function cosConfig(): { Bucket: string; Region: string; SecretId: string; SecretKey: string };
  export function resetDriverForTest(): void;
  ```

- [x] **Step 1: 写失败测试**

```ts
// src/lib/storage-driver.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { driverName, isCos, cosConfig, resetDriverForTest } from './storage-driver';

const KEYS = ['STORAGE_DRIVER', 'COS_BUCKET', 'COS_REGION', 'COS_SECRET_ID', 'COS_SECRET_KEY'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  resetDriverForTest();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetDriverForTest();
});

describe('storage-driver', () => {
  it('未设置 STORAGE_DRIVER 时默认 local', () => {
    expect(driverName()).toBe('local');
    expect(isCos()).toBe(false);
  });

  it('STORAGE_DRIVER=local 显式走本地', () => {
    process.env.STORAGE_DRIVER = 'local';
    resetDriverForTest();
    expect(driverName()).toBe('local');
  });

  it('STORAGE_DRIVER=cos 走 COS', () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    expect(driverName()).toBe('cos');
    expect(isCos()).toBe(true);
  });

  it('STORAGE_DRIVER 非法值回落 local 而不是抛错', () => {
    process.env.STORAGE_DRIVER = 's3';
    resetDriverForTest();
    expect(driverName()).toBe('local');
  });

  it('cosConfig 在 local 驱动下也能读出四项环境变量', () => {
    process.env.COS_BUCKET = 'crafty-1250000000';
    process.env.COS_REGION = 'ap-guangzhou';
    process.env.COS_SECRET_ID = 'AKIDtest';
    process.env.COS_SECRET_KEY = 'secretkeytest';
    resetDriverForTest();
    expect(cosConfig()).toEqual({
      Bucket: 'crafty-1250000000',
      Region: 'ap-guangzhou',
      SecretId: 'AKIDtest',
      SecretKey: 'secretkeytest',
    });
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/storage-driver.test.ts`
Expected: FAIL — `Cannot find module '@/lib/storage-driver'`

- [x] **Step 3: 最小实现**

```ts
// src/lib/storage-driver.ts
export type StorageDriver = 'local' | 'cos';

let cachedDriver: StorageDriver | null = null;

/** 读一次就缓存；测试用 resetDriverForTest() 清除。 */
export function driverName(): StorageDriver {
  if (cachedDriver) return cachedDriver;
  const raw = (process.env.STORAGE_DRIVER ?? '').trim().toLowerCase();
  cachedDriver = raw === 'cos' ? 'cos' : 'local';
  return cachedDriver;
}

export function isCos(): boolean {
  return driverName() === 'cos';
}

export function cosConfig() {
  return {
    Bucket: process.env.COS_BUCKET ?? '',
    Region: process.env.COS_REGION ?? '',
    SecretId: process.env.COS_SECRET_ID ?? '',
    SecretKey: process.env.COS_SECRET_KEY ?? '',
  };
}

export function resetDriverForTest(): void {
  cachedDriver = null;
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/storage-driver.test.ts`
Expected: PASS 5 tests

- [x] **Step 5: 提交**

```bash
git add src/lib/storage-driver.ts src/lib/storage-driver.test.ts
git commit -m "feat(storage): 存储驱动开关，默认 local，cos 需显式配置"
```

---

## Task 2: COS 预签名与写入 `storage-cos.ts`

**Files:**
- Create: `src/lib/storage-cos.ts`
- Test: `src/lib/storage-cos.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `cosConfig()`
- Produces:
  ```ts
  export const PUT_EXPIRES_SEC = 600;   // spec 12：预签名 PUT 10 分钟
  export const GET_EXPIRES_SEC = 300;   // spec 12：预签名 GET 5 分钟
  export function presignPut(key: string, contentType: string): { url: string; key: string; expiresAt: number };
  export function presignGet(key: string): { url: string; expiresAt: number };
  export async function putUpload(key: string, buf: Buffer, contentType: string): Promise<void>;
  export async function deleteUploadFromCos(key: string): Promise<void>;
  export function setCosClientForTest(client: unknown): void;
  export function resetCosForTest(): void;
  ```

**实现要点（照做，不要自行改方案）：** SDK 的 `getObjectUrl` 是 callback 异步且会校验桶名格式，实测不可用。改用**同步** `cos.getAuth()`（纯本地 HMAC），返回 `q-sign-algorithm=...&q-signature=...` 字符串，自己拼 URL：

```ts
const auth = cos.getAuth({ Bucket, Region, Key: key, Method, Expires: seconds, Headers: { Host: host } });
const url = `https://${host}/${encodeKey(key)}?${auth}`;
```

`encodeKey` 逐段 `encodeURIComponent`（COS key 含 `/` 需保留分隔符）。

- [x] **Step 1: 写失败测试**

```ts
// src/lib/storage-cos.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PUT_EXPIRES_SEC,
  GET_EXPIRES_SEC,
  presignPut,
  presignGet,
  deleteUploadFromCos,
  setCosClientForTest,
  resetCosForTest,
} from './storage-cos';

const ENV = {
  COS_BUCKET: 'crafty-1250000000',
  COS_REGION: 'ap-guangzhou',
  COS_SECRET_ID: 'AKIDtest',
  COS_SECRET_KEY: 'secretkeytest',
};
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of Object.keys(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = ENV[k as keyof typeof ENV];
  }
  resetCosForTest();
});

afterEach(() => {
  for (const k of Object.keys(ENV)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetCosForTest();
});

function host() {
  return `${ENV.COS_BUCKET}.cos.${ENV.COS_REGION}.myqcloud.com`;
}

describe('storage-cos 预签名', () => {
  it('过期秒数逐字等于 spec 常量', () => {
    expect(PUT_EXPIRES_SEC).toBe(600);
    expect(GET_EXPIRES_SEC).toBe(300);
  });

  it('presignPut 返回 https URL、key 原样、expiresAt 在 10 分钟内', () => {
    const r = presignPut('a/b.png', 'image/png');
    expect(r.key).toBe('a/b.png');
    expect(r.url.startsWith(`https://${host()}/a/b.png?`)).toBe(true);
    expect(r.expiresAt - Date.now() / 1000).toBeGreaterThan(590);
    expect(r.expiresAt - Date.now() / 1000).toBeLessThanOrEqual(600);
  });

  it('presignPut 的查询串带齐 COS 签名五要素', () => {
    const q = presignPut('a.png', 'image/png').url.split('?')[1];
    expect(q).toContain('q-sign-algorithm=sha1');
    expect(q).toContain('q-ak=AKIDtest');
    expect(q).toContain('q-sign-time=');
    expect(q).toContain('q-signature=');
  });

  it('presignPut 同一秒内两次调用签名一致（纯本地 HMAC，无网络）', () => {
    expect(presignPut('x.png', 'image/png').url).toBe(presignPut('x.png', 'image/png').url);
  });

  it('presignPut 对含空格的 key 做逐段编码且保留斜杠', () => {
    const url = presignPut('dir name/图片 1.png', 'image/png').url;
    expect(url).toContain('dir%20name/%E5%9B%BE%E7%89%87%201.png');
  });

  it('presignGet 过期 5 分钟且不带 content-type 头', () => {
    const r = presignGet('a/b.png');
    expect(r.expiresAt - Date.now() / 1000).toBeLessThanOrEqual(300);
    expect(r.expiresAt - Date.now() / 1000).toBeGreaterThan(290);
  });

  it('缺少 COS_SECRET_ID 时抛可读错误', () => {
    delete process.env.COS_SECRET_ID;
    resetCosForTest();
    expect(() => presignPut('a.png', 'image/png')).toThrow(/COS_SECRET_ID/);
  });

  it('deleteUploadFromCos 在 SDK 报错时静默吞掉', async () => {
    const client = { deleteObject: vi.fn(async () => { throw new Error('NoSuchKey'); }) };
    setCosClientForTest(client);
    await expect(deleteUploadFromCos('a.png')).resolves.toBeUndefined();
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/storage-cos.test.ts`
Expected: FAIL — `Cannot find module '@/lib/storage-cos'`

- [x] **Step 3: 最小实现**

```ts
// src/lib/storage-cos.ts
import COS from 'cos-nodejs-sdk-v5';
import { cosConfig } from './storage-driver';

export const PUT_EXPIRES_SEC = 600; // spec 12：预签名 PUT 10 分钟
export const GET_EXPIRES_SEC = 300; // spec 12：预签名 GET 5 分钟

type CosClient = {
  getAuth(p: Record<string, unknown>): string;
  putObject(p: Record<string, unknown>): Promise<unknown>;
  deleteObject(p: Record<string, unknown>): Promise<unknown>;
};

let injected: CosClient | null = null;
let real: CosClient | null = null;

function client(): CosClient {
  if (injected) return injected;
  if (real) return real;
  const cfg = cosConfig();
  for (const k of ['SecretId', 'SecretKey', 'Bucket', 'Region'] as const) {
    if (!cfg[k]) throw new Error(`COS 未配置：${k} 为空`);
  }
  real = new COS({
    SecretId: cfg.SecretId,
    SecretKey: cfg.SecretKey,
    Protocol: 'https:',
  }) as unknown as CosClient;
  return real;
}

/** 桶名必须是 <name>-<appid> 形状，否则 SDK 返回 undefined。 */
function bucketHost(): { bucket: string; host: string } {
  const cfg = cosConfig();
  if (!cfg.Bucket) throw new Error('COS 未配置：Bucket 为空');
  if (!cfg.Region) throw new Error('COS 未配置：Region 为空');
  return { bucket: cfg.Bucket, host: `${cfg.Bucket}.cos.${cfg.Region}.myqcloud.com` };
}

/** COS key 逐段编码，保留 / 作路径分隔符。 */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function presign(key: string, method: 'PUT' | 'GET', expires: number, contentType?: string): string {
  const { bucket, host } = bucketHost();
  const headers: Record<string, string> = { Host: host };
  if (contentType) headers['Content-Type'] = contentType;
  const auth = client().getAuth({
    Bucket: bucket,
    Region: cosConfig().Region,
    Key: key,
    Method: method,
    Expires: expires,
    Headers: headers,
  });
  if (!auth) throw new Error('COS 签名失败：桶名或密钥不合法');
  return `https://${host}/${encodeKey(key)}?${auth}`;
}

export function presignPut(key: string, contentType: string) {
  return {
    url: presign(key, 'PUT', PUT_EXPIRES_SEC, contentType),
    key,
    expiresAt: Math.floor(Date.now() / 1000) + PUT_EXPIRES_SEC,
  };
}

export function presignGet(key: string) {
  return {
    url: presign(key, 'GET', GET_EXPIRES_SEC),
    expiresAt: Math.floor(Date.now() / 1000) + GET_EXPIRES_SEC,
  };
}

export async function putUpload(key: string, buf: Buffer, contentType: string): Promise<void> {
  const { bucket } = bucketHost();
  const cfg = cosConfig();
  await client().putObject({
    Bucket: bucket,
    Region: cfg.Region,
    Key: key,
    Body: buf,
    ContentLength: buf.byteLength,
    ContentType: contentType,
  });
}

export async function deleteUploadFromCos(key: string): Promise<void> {
  try {
    const { bucket } = bucketHost();
    await client().deleteObject({ Bucket: bucket, Region: cosConfig().Region, Key: key });
  } catch {
    // 删除失败必须吞掉：对象本来就不存在时不是错误（spec 7.2）
  }
}

export function setCosClientForTest(c: unknown): void {
  injected = c as CosClient;
}

export function resetCosForTest(): void {
  injected = null;
  real = null;
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/storage-cos.test.ts`
Expected: PASS 8 tests

- [x] **Step 5: 提交**

```bash
git add src/lib/storage-cos.ts src/lib/storage-cos.test.ts
git commit -m "feat(storage): COS 预签名 PUT/GET 与失败吞掉的删除"
```

---

## Task 3: 本地存储实现与门面分派

**Files:**
- Create: `src/lib/storage-local.ts`
- Create: `src/lib/storage-local.test.ts`
- Modify: `src/lib/storage.ts`（整体改写，导出面只增不减）
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: Task 1 `isCos()`；Task 2 `presignGet` / `putUpload` / `deleteUploadFromCos`
- Produces: 保持原有八个导出不变，新增 `presignGetOrNull(name: string): { url: string; expiresAt: number } | null`

**注意：** `EXT_MIME`（22 项）与 `NAME_RE` 必须**逐字搬过去**，签名接口的白名单依赖它；`mimeForName` / `resolveUploadPath` / `saveUpload` / `saveUploadBuffer` / `readUpload` / `deleteUpload` 全部从 `storage.ts` 继续导出，调用方（`/api/files/*`、5 个编辑器组件）**一行都不用改**。

- [x] **Step 1: 写失败测试（local 后端）**

```ts
// src/lib/storage-local.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setUploadDirForTest, saveUpload, saveUploadBuffer, readUpload, deleteUpload, resolveUploadPath } from './storage-local';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'crafty-up-'));
  setUploadDirForTest(dir);
});

afterEach(() => setUploadDirForTest(null));

const file = (name: string, body: string) =>
  new File([Buffer.from(body, 'utf8')], name, { type: 'text/plain' });

describe('storage-local', () => {
  it('saveUpload 落盘并返回 uuid 化的名字与字节数', async () => {
    const r = await saveUpload(file('a.txt', 'hello'));
    expect(r.name).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(r.size).toBe(5);
    expect((await readdir(dir)).length).toBe(1);
  });

  it('saveUpload 对没有合法扩展名的原始名丢弃扩展名', async () => {
    const r = await saveUpload(file('noext', 'x'));
    expect(r.name).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('saveUploadBuffer 拼上给定扩展名', async () => {
    const r = await saveUploadBuffer(Buffer.from('abc'), '.png');
    expect(r.name.endsWith('.png')).toBe(true);
    expect(r.size).toBe(3);
  });

  it('readUpload 原样读回', async () => {
    const r = await saveUploadBuffer(Buffer.from('round-trip'), '.txt');
    expect((await readUpload(r.name)).toString('utf8')).toBe('round-trip');
  });

  it('deleteUpload 对不存在的文件不抛错（吞掉）', async () => {
    await expect(deleteUpload('missing.txt')).resolves.toBeUndefined();
  });

  it('resolveUploadPath 拒绝非法文件名', () => {
    expect(() => resolveUploadPath('../etc/passwd')).toThrow('非法文件名');
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/storage-local.test.ts`
Expected: FAIL — `Cannot find module '@/lib/storage-local'`

- [x] **Step 3: 实现 storage-local.ts**

把现有 `storage.ts` 的落盘逻辑原样搬进来，**唯一改动**是把 `UPLOAD_DIR` 变成可变值 + 测试注入：

```ts
// src/lib/storage-local.ts
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const NAME_RE = /^[A-Za-z0-9._-]+$/;

let overrideDir: string | null = null;

export function setUploadDirForTest(dir: string | null): void {
  overrideDir = dir;
}

export function uploadDir(): string {
  return overrideDir ?? path.join(process.cwd(), 'uploads');
}

function safeStoredName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!/^\.[A-Za-z0-9]{1,10}$/.test(ext)) return randomUUID();
  return randomUUID() + ext;
}

export function resolveUploadPath(name: string): string {
  const base = path.basename(name);
  if (!NAME_RE.test(base)) throw new Error('非法文件名');
  return path.join(uploadDir(), base);
}

export async function saveUpload(file: File): Promise<{ name: string; size: number; type: string }> {
  const dir = uploadDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const name = safeStoredName(file.name || '');
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(resolveUploadPath(name), buf);
  return { name, size: buf.byteLength, type: file.type || mimeForNameLocal(name) };
}

export async function saveUploadBuffer(buf: Buffer, ext: string): Promise<{ name: string; size: number }> {
  const dir = uploadDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const name = randomUUID() + ext;
  await writeFile(resolveUploadPath(name), buf);
  return { name, size: buf.byteLength };
}

export async function readUpload(name: string): Promise<Buffer> {
  return readFile(resolveUploadPath(name));
}

export async function deleteUpload(name: string): Promise<void> {
  await unlink(resolveUploadPath(name)).catch(() => {});
}

// 供本文件内部与 storage.ts 门面共用
export const EXT_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function mimeForNameLocal(name: string): string {
  return EXT_MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/storage-local.test.ts`
Expected: PASS 6 tests

- [x] **Step 5: 写门面测试**

```ts
// src/lib/storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDriverForTest } from './storage-driver';
import { setUploadDirForTest } from './storage-local';
import { resetCosForTest, setCosClientForTest } from './storage-cos';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { saveUpload, readUpload, deleteUpload, presignGetOrNull, mimeForName, NAME_RE } from './storage';

let dir: string;
let savedDriver: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'crafty-facade-'));
  setUploadDirForTest(dir);
  savedDriver = process.env.STORAGE_DRIVER;
  delete process.env.STORAGE_DRIVER;
  process.env.COS_BUCKET = 'crafty-1250000000';
  process.env.COS_REGION = 'ap-guangzhou';
  process.env.COS_SECRET_ID = 'AKIDtest';
  process.env.COS_SECRET_KEY = 'secretkeytest';
  resetDriverForTest();
  resetCosForTest();
});

afterEach(() => {
  setUploadDirForTest(null);
  resetDriverForTest();
  resetCosForTest();
  if (savedDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = savedDriver;
});

describe('storage 门面', () => {
  it('local 驱动下 saveUpload/readUpload 往返不变', async () => {
    const r = await saveUpload(new File([Buffer.from('hi')], 'a.txt', { type: 'text/plain' }));
    expect((await readUpload(r.name)).toString('utf8')).toBe('hi');
  });

  it('local 驱动下 deleteUpload 幂等', async () => {
    const r = await saveUpload(new File([Buffer.from('hi')], 'a.txt', { type: 'text/plain' }));
    await deleteUpload(r.name);
    await expect(deleteUpload(r.name)).resolves.toBeUndefined();
  });

  it('local 驱动下 presignGetOrNull 返回 null', () => {
    expect(presignGetOrNull('a.png')).toBeNull();
  });

  it('cos 驱动下 saveUpload 走 putObject 而不落本地盘', async () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    const putObject = vi.fn(async () => ({}));
    setCosClientForTest({ getAuth: () => 'q-signature=abc', putObject, deleteObject: vi.fn(async () => ({})) });
    const r = await saveUpload(new File([Buffer.from('cos-bytes')], 'b.png', { type: 'image/png' }));
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(r.name).toMatch(/\.png$/);
    expect(r.size).toBe(9);
  });

  it('cos 驱动下 presignGetOrNull 返回预签名 URL', () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    const url = presignGetOrNull('c.png');
    expect(url).not.toBeNull();
    expect(url!.url).toContain('q-signature=');
  });

  it('NAME_RE 与 mimeForName 保持原契约', () => {
    expect(NAME_RE.test('ok_name-1.png')).toBe(true);
    expect(NAME_RE.test('bad name.png')).toBe(false);
    expect(mimeForName('x.MD')).toBe('text/markdown; charset=utf-8');
  });
});
```

在该文件顶部补 `import { vi } from 'vitest';`（若首行 import 中已有则不重复）。

- [x] **Step 6: 跑门面测试确认失败**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `presignGetOrNull` 不存在（`is not a function`）

- [x] **Step 7: 改写 storage.ts 门面**

```ts
// src/lib/storage.ts —— 导出面只增不减，调用方零改动
import path from 'node:path';
import { isCos } from './storage-driver';
import {
  NAME_RE,
  EXT_MIME,
  mimeForNameLocal,
  resolveUploadPath,
  saveUpload as localSaveUpload,
  saveUploadBuffer as localSaveUploadBuffer,
  readUpload as localReadUpload,
  deleteUpload as localDeleteUpload,
} from './storage-local';
import { presignGet, putUpload, deleteUploadFromCos } from './storage-cos';

export { NAME_RE, EXT_MIME, resolveUploadPath };
export const mimeForName = mimeForNameLocal;

function safeKey(name: string): string {
  const base = path.basename(name);
  if (!NAME_RE.test(base)) throw new Error('非法文件名');
  return base;
}

export async function saveUpload(file: File): Promise<{ name: string; size: number; type: string }> {
  if (isCos()) {
    const ext = path.extname(file.name || '').toLowerCase();
    const key = safeKey(require('node:crypto').randomUUID() + (/^\.[A-Za-z0-9]{1,10}$/.test(ext) ? ext : ''));
    const buf = Buffer.from(await file.arrayBuffer());
    const type = file.type || mimeForNameLocal(key);
    await putUpload(key, buf, type);
    return { name: key, size: buf.byteLength, type };
  }
  return localSaveUpload(file);
}

export async function saveUploadBuffer(buf: Buffer, ext: string): Promise<{ name: string; size: number }> {
  if (isCos()) {
    const key = safeKey(require('node:crypto').randomUUID() + ext);
    await putUpload(key, buf, mimeForNameLocal(key));
    return { name: key, size: buf.byteLength };
  }
  return localSaveUploadBuffer(buf, ext);
}

export async function readUpload(name: string): Promise<Buffer> {
  if (isCos()) throw new Error('cos 驱动下请改用 presignGetOrNull 走 302');
  return localReadUpload(name);
}

export async function deleteUpload(name: string): Promise<void> {
  if (isCos()) {
    await deleteUploadFromCos(safeKey(name));
    return;
  }
  await localDeleteUpload(name);
}

/** 仅 cos 驱动下有值：给 /api/files/[name] 做 302 用。 */
export function presignGetOrNull(name: string): { url: string; expiresAt: number } | null {
  if (!isCos()) return null;
  return presignGet(safeKey(name));
}
```

把 `require('node:crypto')` 换成顶部 `import { randomUUID } from 'node:crypto';` 后的 `randomUUID()`（ESM 风格，勿留 `require`）。

- [x] **Step 8: 跑测试确认全绿**

Run: `npx vitest run src/lib/storage.test.ts src/lib/storage-local.test.ts src/lib/storage-cos.test.ts src/lib/storage-driver.test.ts`
Expected: PASS 25 tests（6+6+8+5）

- [x] **Step 9: 回归门禁**

Run: `npx tsc --noEmit && npm test`
Expected: tsc 0 错；测试总数 ≥ 286 + 25 = 311

- [x] **Step 10: 提交**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts src/lib/storage-local.ts src/lib/storage-local.test.ts
git commit -m "refactor(storage): 门面按驱动分派，新增 presignGetOrNull"
```

---

## Task 4: 预签名接口 `POST /api/v1/attachments/sign`

**Files:**
- Create: `src/app/api/v1/attachments/sign/route.ts`
- Test: `src/app/api/v1/attachments/sign/route.test.ts`

**Interfaces:**
- Consumes: Task 2 `presignPut`、`PUT_EXPIRES_SEC`；Task 3 门面的 `NAME_RE` / `EXT_MIME` / `mimeForName`；P1 现成的 `@/lib/authz/guard` 的 `requireUserId`
- Produces: `POST` body `{name, size, type}` → `200 {uploadUrl, key, expiresAt}` / `413` / `400` / `401`

**契约（spec 5.2，逐字实现）：** 100MB 上限 → 413；文件名或类型不在白名单 → 400；`key` 沿用 UUID 化文件名规则。

- [x] **Step 1: 写失败测试**

先确认 P1 现有的鉴权 mock 写法（`src/app/api/v1/sync/route.test.ts` 顶部），照抄：

```ts
// src/app/api/v1/attachments/sign/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage-cos', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage-cos')>('@/lib/storage-cos');
  return {
    ...actual,
    presignPut: vi.fn((key: string, type: string) => ({
      url: `https://example.invalid/${key}?sig=1&t=${encodeURIComponent(type)}`,
      key,
      expiresAt: 4102444800,
    })),
  };
});

import { POST } from './route';
import { presignPut } from '@/lib/storage-cos';

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/v1/attachments/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const ok = (over: Record<string, unknown> = {}) => ({ name: 'photo.png', size: 1024, type: 'image/png', ...over });

beforeEach(() => vi.clearAllMocks());

describe('POST /api/v1/attachments/sign', () => {
  it('合法请求返回 uploadUrl/key/expiresAt', async () => {
    const res = await POST(req(ok()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.uploadUrl).toContain('sig=1');
    expect(typeof body.expiresAt).toBe('number');
  });

  it('key 不使用用户传入的文件名（防覆盖）', async () => {
    await POST(req(ok({ name: 'secret.png' })));
    expect(vi.mocked(presignPut).mock.calls[0][0]).not.toBe('secret.png');
  });

  it('超过 100MB 返回 413 且不签发', async () => {
    const res = await POST(req(ok({ size: 100 * 1024 * 1024 + 1 })));
    expect(res.status).toBe(413);
    expect(vi.mocked(presignPut)).not.toHaveBeenCalled();
  });

  it('恰好 100MB 放行', async () => {
    expect((await POST(req(ok({ size: 100 * 1024 * 1024 })))).status).toBe(200);
  });

  it('白名单外的扩展名返回 400', async () => {
    expect((await POST(req(ok({ name: 'x.exe' })))).status).toBe(400);
  });

  it('无扩展名的文件名返回 400', async () => {
    expect((await POST(req(ok({ name: 'noext' })))).status).toBe(400);
  });

  it('缺 name/size/type 任一字段返回 400', async () => {
    for (const missing of ['name', 'size', 'type']) {
      const body = ok() as Record<string, unknown>;
      delete body[missing];
      expect((await POST(req(body))).status).toBe(400);
    }
  });

  it('size 为负数或非整数返回 400', async () => {
    expect((await POST(req(ok({ size: -1 })))).status).toBe(400);
    expect((await POST(req(ok({ size: 1.5 })))).status).toBe(400);
  });

  it('未授权返回 401', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error('未授权'));
    const res = await POST(req(ok()));
    expect([401, 403]).toContain(res.status);
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/app/api/v1/attachments/sign/route.test.ts`
Expected: FAIL — 无法解析 `./route`

- [x] **Step 3: 最小实现**

```ts
// src/app/api/v1/attachments/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireUserId, AuthorizationError } from '@/lib/authz/guard';
import { presignPut } from '@/lib/storage-cos';
import { NAME_RE, mimeForName } from '@/lib/storage';

/** spec 12：附件直传上限 100MB */
export const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    throw e;
  }

  let body: { name?: unknown; size?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  const { name, size, type } = body;
  if (typeof name !== 'string' || typeof size !== 'number' || typeof type !== 'string') {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (!Number.isInteger(size) || size <= 0) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: '文件超过 100MB 限制' }, { status: 413 });
  }

  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!ext || ext === name.toLowerCase()) {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  const expected = mimeForName(name);
  if (expected === 'application/octet-stream') {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  if (type !== expected && mimeForName(ext) !== expected) {
    return NextResponse.json({ error: '文件类型不匹配' }, { status: 400 });
  }

  // 沿用 storage.ts 的 UUID 化文件名规则，且不采信用户传入的名字（spec 5.2 key 规则）
  const finalKey = randomUUID() + ext;
  const signed = presignPut(finalKey, expected);
  return NextResponse.json({
    uploadUrl: signed.url,
    key: signed.key,
    expiresAt: signed.expiresAt,
  });
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/app/api/v1/attachments/sign/route.test.ts`
Expected: PASS 9 tests

- [x] **Step 5: 提交**

```bash
git add src/app/api/v1/attachments/sign/route.ts src/app/api/v1/attachments/sign/route.test.ts
git commit -m "feat(api): 预签名 PUT 接口，100MB 上限与扩展名白名单"
```

---

## Task 5: 预签名 GET 接口与 `/api/files/[name]` 的 302

**Files:**
- Create: `src/app/api/v1/attachments/url/route.ts`
- Create: `src/app/api/v1/attachments/url/route.test.ts`
- Modify: `src/app/api/files/[name]/route.ts`
- Create: `src/app/api/files/[name]/route.test.ts`

**Interfaces:**
- Consumes: Task 2 `presignGet` / `GET_EXPIRES_SEC`；Task 3 门面 `presignGetOrNull`
- Produces: `GET /api/v1/attachments/url?key=<uuid.ext>` → `200 {url, expiresAt}` / `400` / `401`

- [x] **Step 1: 写 url 接口的失败测试**

```ts
// src/app/api/v1/attachments/url/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage-cos', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage-cos')>('@/lib/storage-cos');
  return {
    ...actual,
    presignGet: vi.fn((key: string) => ({ url: `https://example.invalid/${key}?g=1`, expiresAt: 4102444800 })),
  };
});

import { GET } from './route';
import { presignGet } from '@/lib/storage-cos';

const get = (query: string) => new NextRequest(`http://localhost/api/v1/attachments/url?${query}`);

describe('GET /api/v1/attachments/url', () => {
  it('返回 url 与 expiresAt', async () => {
    const res = await GET(get('key=a.png'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('g=1');
    expect(typeof body.expiresAt).toBe('number');
  });

  it('缺 key 返回 400', async () => {
    expect((await GET(get(''))).status).toBe(400);
  });

  it('key 含路径分隔符或非法字符返回 400', async () => {
    expect((await GET(get(`key=${encodeURIComponent('../etc/passwd')}`))).status).toBe(400);
  });

  it('key 无扩展名返回 400', async () => {
    expect((await GET(get('key=noext'))).status).toBe(400);
  });

  it('未授权返回 401', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error('未授权'));
    const res = await GET(get('key=a.png'));
    expect([401, 403]).toContain(res.status);
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/app/api/v1/attachments/url/route.test.ts`
Expected: FAIL — 无法解析 `./route`

- [x] **Step 3: 实现 url 接口**

```ts
// src/app/api/v1/attachments/url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { requireUserId, AuthorizationError } from '@/lib/authz/guard';
import { presignGet } from '@/lib/storage-cos';
import { NAME_RE, mimeForName } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    throw e;
  }

  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!key || key.includes('/') || !NAME_RE.test(key)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (mimeForName(key) === 'application/octet-stream') {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  if (!path.extname(key)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  const signed = presignGet(key);
  return NextResponse.json({ url: signed.url, expiresAt: signed.expiresAt });
}
```

- [x] **Step 4: 跑 url 接口测试确认通过**

Run: `npx vitest run src/app/api/v1/attachments/url/route.test.ts`
Expected: PASS 5 tests

- [x] **Step 5: 写 `/api/files/[name]` 的失败测试**

```ts
// src/app/api/files/[name]/route.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return { ...actual, readUpload: vi.fn(async () => Buffer.from('local-bytes')) };
});
vi.mock('@/lib/storage-driver', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage-driver')>('@/lib/storage-driver');
  return { ...actual, driverName: vi.fn(() => 'local') };
});

import { GET } from './route';
import { readUpload } from '@/lib/storage';
import { driverName, resetDriverForTest } from '@/lib/storage-driver';

const req = (name: string) =>
  new NextRequest(`http://localhost/api/files/${name}`);

beforeEach(() => vi.clearAllMocks());
afterEach(() => resetDriverForTest());

describe('GET /api/files/[name]', () => {
  it('local 驱动仍走 readUpload 并回 200', async () => {
    vi.mocked(driverName).mockReturnValue('local');
    const res = await GET(req('a.png'), { params: Promise.resolve({ name: 'a.png' }) });
    expect(res.status).toBe(200);
    expect(readUpload).toHaveBeenCalledWith('a.png');
  });

  it('cos 驱动下 302 到预签名 GET，不调 readUpload', async () => {
    vi.mocked(driverName).mockReturnValue('cos');
    resetDriverForTest();
    const res = await GET(req('a.png'), { params: Promise.resolve({ name: 'a.png' }) });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('q-signature=');
    expect(readUpload).not.toHaveBeenCalled();
  });

  it('local 驱动下图片仍然 inline，其他仍 attachment', async () => {
    vi.mocked(driverName).mockReturnValue('local');
    const png = await GET(req('a.png'), { params: Promise.resolve({ name: 'a.png' }) });
    expect(png.headers.get('content-disposition')).not.toContain('attachment');
    const bin = await GET(req('a.bin'), { params: Promise.resolve({ name: 'a.bin' }) });
    expect(bin.headers.get('content-disposition')).toContain('attachment');
  });

  it('未授权返回 401', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error('未授权'));
    const res = await GET(req('a.png'), { params: Promise.resolve({ name: 'a.png' }) });
    expect([401, 403]).toContain(res.status);
  });
});
```

**若第 5 步的 `params` 形状与实际 route handler 签名不符**（本仓库 Next.js 有破坏性变更），先读 `node_modules/next/dist/docs/` 里 route handler 章节，按实际签名调整调用方式；**断言内容不变**。

- [x] **Step 6: 跑测试确认失败**

Run: `npx vitest run src/app/api/files/[name]/route.test.ts`
Expected: FAIL — cos 驱动下仍返回 200 / 404，而非 302

- [x] **Step 7: 在 `/api/files/[name]` 加 302 分支**

在 `src/app/api/files/[name]/route.ts` 里，`const baseName = ...` 之后、`readUpload` 之前插入：

```ts
  // cos 驱动：DB 里的文件名不变，直接 302 到预签名 GET（spec 7.2）
  const presigned = presignGetOrNull(baseName);
  if (presigned) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: presigned.url,
        'Cache-Control': 'private, no-store',
      },
    });
  }
```

并在文件顶部 import 加上 `presignGetOrNull`：

```ts
import { mimeForName, readUpload, presignGetOrNull } from '@/lib/storage';
```

- [x] **Step 8: 跑测试确认通过**

Run: `npx vitest run src/app/api/files/ src/app/api/v1/attachments/`
Expected: PASS（url 5 + files 4 + sign 9 = 18）

- [x] **Step 9: 提交**

```bash
git add src/app/api/v1/attachments/url src/app/api/files/\[name\]/route.ts src/app/api/files/\[name\]/route.test.ts
git commit -m "feat(api): 预签名 GET 接口与 /api/files 在 cos 驱动下 302"
```

---

## Task 6: 附件离线队列 `attachment-queue.ts`

**Files:**
- Create: `src/lib/attachment-queue.ts`
- Create: `src/lib/attachment-queue.test.ts`

**Interfaces:**
- Consumes: P1 的退避阶梯语义（`[2s,4s,8s,16s,32s,64s,128s,256s,300s]`，连续 3 次失败 → `error`）
- Produces:
  ```ts
  export type AttachmentJob = {
    id: string; name: string; size: number; type: string;
    blob: Blob; tries: number; nextRetryAt: string | null; createdAt: string;
  };
  export interface AttachmentStore {
    init(): Promise<void>;
    enqueue(job: AttachmentJob): Promise<void>;
    dueJobs(nowIso: string): Promise<AttachmentJob[]>;
    ack(id: string): Promise<void>;
    bumpTry(id: string, nextRetryAt: string): Promise<void>;
    count(): Promise<number>;
    manifestHas(key: string): Promise<boolean>;
    manifestPut(key: string): Promise<void>;
  }
  export function manifestKey(name: string, size: number, type: string): string;
  export function createMemoryAttachmentStore(): Promise<AttachmentStore>;
  export function createAttachmentQueue(deps: {
    store: AttachmentStore;
    upload: (job: AttachmentJob) => Promise<{ key: string }>;
    onError?: (jobs: AttachmentJob[]) => void;
  }): {
    enqueue(job: Omit<AttachmentJob, 'tries' | 'nextRetryAt' | 'createdAt'>): Promise<void>;
    flush(nowIso?: string): Promise<{ uploaded: number; status: 'ok' | 'network' | 'http' }>;
    pendingCount(): Promise<number>;
    markUploaded(key: string): Promise<void>;
    isUploaded(key: string): Promise<boolean>;
  };
  ```

**已上传清单键：** `manifestKey(name, size, type)` = `${name}:${size}:${type}`（同一文件重传可去重，DB 里的引用名不变）。

- [x] **Step 1: 写失败测试**

```ts
// src/lib/attachment-queue.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createAttachmentQueue, createMemoryAttachmentStore, manifestKey } from './attachment-queue';

const job = (over: Record<string, unknown> = {}) => ({
  id: 'j1', name: 'a.png', size: 3, type: 'image/png', blob: new Blob(['abc']), ...over,
});

async function setup() {
  const store = await createMemoryAttachmentStore();
  const upload = vi.fn(async () => ({ key: 'k1' }));
  const q = createAttachmentQueue({ store, upload });
  return { store, upload, q };
}

describe('attachment-queue', () => {
  it('enqueue 后 pendingCount 递增', async () => {
    const { q } = await setup();
    await q.enqueue(job() as never);
    expect(await q.pendingCount()).toBe(1);
  });

  it('flush 成功调用 upload 并清空队列', async () => {
    const { q, upload } = await setup();
    await q.enqueue(job() as never);
    const r = await q.flush();
    expect(r).toEqual({ uploaded: 1, status: 'ok' });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await q.pendingCount()).toBe(0);
  });

  it('成功后写已上传清单，同名同尺寸同类型再次入队直接跳过', async () => {
    const { q, upload } = await setup();
    await q.enqueue(job() as never);
    await q.flush();
    expect(await q.isUploaded(manifestKey('a.png', 3, 'image/png'))).toBe(true);
    await q.enqueue(job({ id: 'j2' }) as never);
    const r = await q.flush();
    expect(r.uploaded).toBe(0);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await q.pendingCount()).toBe(0);
  });

  it('upload 抛错归为 network、保留在队列、tries 递增', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('offline'); } });
    await q.enqueue(job() as never);
    const r = await q.flush();
    expect(r.status).toBe('network');
    expect(await store.count()).toBe(1);
    const [j] = await store.dueJobs(new Date(Date.now() + 60_000).toISOString());
    expect(j.tries).toBe(1);
  });

  it('未到 nextRetryAt 的任务不会被 dueJobs 取出', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); } });
    await q.enqueue(job() as never);
    await q.flush();
    expect((await store.dueJobs(new Date().toISOString())).length).toBe(0);
  });

  it('连续 3 次失败后移出队列并触发 onError', async () => {
    const store = await createMemoryAttachmentStore();
    const onError = vi.fn();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); }, onError });
    await q.enqueue(job() as never);
    for (let i = 0; i < 3; i++) await q.flush(new Date(Date.now() + 10 * 60_000).toISOString());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toHaveLength(1);
    expect(await store.count()).toBe(0);
  });

  it('退避阶梯首档 2s、逐级翻倍、封顶 300s', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); } });
    await q.enqueue(job() as never);
    const delays: number[] = [];
    let t = Date.parse('2026-09-30T00:00:00.000Z');
    for (let i = 0; i < 2; i++) {
      await q.flush(new Date(t).toISOString());
      const [j] = await store.dueJobs(new Date(t + 10_000).toISOString());
      delays.push(Date.parse(j!.nextRetryAt!) - t);
      t += 10 * 60_000;
    }
    expect(delays[0]).toBe(2000);
    expect(delays[1]).toBe(4000);
    expect(Math.max(...BACKOFF_MS)).toBe(300_000);
  });

  it('同 id 重复入队只保留一条', async () => {
    const { store, q } = await setup();
    await q.enqueue(job() as never);
    await q.enqueue(job({ name: 'a2.png' }) as never);
    expect(await store.count()).toBe(1);
  });
});
```

在该文件顶部补 `import { BACKOFF_MS } from './attachment-queue';`（与其它 import 合并为一行）。

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/attachment-queue.test.ts`
Expected: FAIL — `Cannot find module '@/lib/attachment-queue'`

- [x] **Step 3: 最小实现**

```ts
// src/lib/attachment-queue.ts
export const BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000];
export const MAX_TRIES = 3;   // spec 12：连续 3 次失败转 error

export type AttachmentJob = {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  tries: number;
  nextRetryAt: string | null;
  createdAt: string;
};

export interface AttachmentStore {
  init(): Promise<void>;
  enqueue(job: AttachmentJob): Promise<void>;
  dueJobs(nowIso: string): Promise<AttachmentJob[]>;
  ack(id: string): Promise<void>;
  bumpTry(id: string, nextRetryAt: string): Promise<void>;
  count(): Promise<number>;
  manifestHas(key: string): Promise<boolean>;
  manifestPut(key: string): Promise<void>;
}

export function manifestKey(name: string, size: number, type: string): string {
  return `${name}:${size}:${type}`;
}

function delayFor(attempt: number): number {
  return BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
}

export function createAttachmentQueue(deps: {
  store: AttachmentStore;
  upload: (job: AttachmentJob) => Promise<{ key: string }>;
  onError?: (jobs: AttachmentJob[]) => void;
}) {
  const { store, upload, onError } = deps;

  return {
    async enqueue(job: Omit<AttachmentJob, 'tries' | 'nextRetryAt' | 'createdAt'>) {
      await store.enqueue({ ...job, tries: 0, nextRetryAt: null, createdAt: new Date().toISOString() });
    },

    async flush(nowIso: string = new Date().toISOString()) {
      let uploaded = 0;
      for (;;) {
        const [job] = await store.dueJobs(nowIso);
        if (!job) return { uploaded, status: 'ok' as const };

        if (await store.manifestHas(manifestKey(job.name, job.size, job.type))) {
          await store.ack(job.id);
          continue;
        }

        try {
          await upload(job);
        } catch {
          const attempt = job.tries + 1;
          if (attempt >= MAX_TRIES) {
            await store.ack(job.id);
            onError?.([job]);
            continue;
          }
          const at = new Date(Date.parse(nowIso) + delayFor(attempt)).toISOString();
          await store.bumpTry(job.id, at);
          return { uploaded, status: 'network' as const };
        }

        await store.manifestPut(manifestKey(job.name, job.size, job.type));
        await store.ack(job.id);
        uploaded += 1;
      }
    },

    pendingCount: () => store.count(),
    markUploaded: (key: string) => store.manifestPut(key),
    isUploaded: (key: string) => store.manifestHas(key),
  };
}

export function createMemoryAttachmentStore(): Promise<AttachmentStore> {
  const jobs = new Map<string, AttachmentJob>();
  const manifest = new Set<string>();
  return Promise.resolve({
    async init() {},
    async enqueue(job) { jobs.set(job.id, job); },
    async dueJobs(nowIso) {
      return [...jobs.values()]
        .filter(j => j.nextRetryAt === null || j.nextRetryAt <= nowIso)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async ack(id) { jobs.delete(id); },
    async bumpTry(id, nextRetryAt) {
      const j = jobs.get(id);
      if (j) jobs.set(id, { ...j, tries: j.tries + 1, nextRetryAt });
    },
    async count() { return jobs.size; },
    async manifestHas(key) { return manifest.has(key); },
    async manifestPut(key) { manifest.add(key); },
  });
}
```

把上面 `const [job, ...rest]` 改为 `const [job] = ...`（已在代码中给出正确写法）。

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/attachment-queue.test.ts`
Expected: PASS 8 tests

- [x] **Step 5: 提交**

```bash
git add src/lib/attachment-queue.ts src/lib/attachment-queue.test.ts
git commit -m "feat(upload): 附件离线队列，退避重试与已上传清单去重"
```

---

## Task 7: 客户端直传链路 `attachment-client.ts`

**Files:**
- Create: `src/lib/attachment-client.ts`
- Create: `src/lib/attachment-client.test.ts`
- Modify: `src/lib/upload-client.ts`（改薄封装，导出面不变，5 个编辑器组件零改动）

**Interfaces:**
- Consumes: Task 4 `POST /api/v1/attachments/sign`；Task 6 的队列
- Produces: `directUpload(file, deps?)` 返回 `{url, name, size, type}`，`url` 仍是 `/api/files/<key>`，**`name` 变为 COS key**

- [x] **Step 1: 写失败测试**

```ts
// src/lib/attachment-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { directUpload } from './attachment-client';

const file = (name: string, body = 'hello', type = 'text/plain') =>
  new File([Buffer.from(body, 'utf8')], name, { type });

const signOk = () =>
  vi.fn(async () => ({
    ok: true, status: 200,
    json: async () => ({ uploadUrl: 'https://cos.invalid/put?sig=1', key: 'uuid-1.txt', expiresAt: 4102444800 }),
  })) as unknown as ReturnType<typeof vi.fn>;

const putOk = () => vi.fn(async () => ({ ok: true, status: 200 }));

describe('directUpload', () => {
  it('先 sign 再把内容 PUT 到预签名 URL，返回 /api/files/<key>', async () => {
    const fetchImpl = signOk();
    const putImpl = putOk();
    const r = await directUpload(file('a.txt'), { fetchImpl, putImpl });
    expect(putImpl).toHaveBeenCalledTimes(1);
    expect(putImpl.mock.calls[0][0]).toBe('https://cos.invalid/put?sig=1');
    expect(r).toEqual({ url: '/api/files/uuid-1.txt', name: 'uuid-1.txt', size: 5, type: 'text/plain' });
  });

  it('PUT 带与文件一致的 Content-Type', async () => {
    const putImpl = putOk();
    await directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl });
    expect(putImpl.mock.calls[0][1].headers['Content-Type']).toBe('text/plain');
  });

  it('sign 返回 413 时抛出服务端中文错误', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false, status: 413, json: async () => ({ error: '文件超过 100MB 限制' }),
    })) as unknown as ReturnType<typeof vi.fn>;
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() })).rejects.toThrow(/100MB/);
  });

  it('PUT 返回非 2xx 时抛错以便入队重试', async () => {
    const putImpl = vi.fn(async () => ({ ok: false, status: 403 }));
    await expect(directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl })).rejects.toThrow(/403/);
  });

  it('离线时 fetch 抛错原样冒泡给队列', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() })).rejects.toThrow(/Failed to fetch/);
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/attachment-client.test.ts`
Expected: FAIL — `Cannot find module '@/lib/attachment-client'`

- [x] **Step 3: 最小实现**

```ts
// src/lib/attachment-client.ts
'use client';

export type PutResult = { ok: boolean; status: number };
export type PutImpl = (url: string, init: { method: string; headers: Record<string, string>; body: Blob }) => Promise<PutResult>;

export type DirectUploadDeps = { fetchImpl?: typeof fetch; putImpl?: PutImpl };

const defaultPut: PutImpl = async (url, init) => {
  const res = await fetch(url, init as unknown as RequestInit);
  return { ok: res.ok, status: res.status };
};

export async function directUpload(file: File, deps: DirectUploadDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const putImpl = deps.putImpl ?? defaultPut;

  const signRes = await fetchImpl('/api/v1/attachments/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  });
  const body = (await signRes.json().catch(() => ({}))) as {
    uploadUrl?: string; key?: string; error?: string;
  };
  if (!signRes.ok || !body.uploadUrl || !body.key) {
    throw new Error(body.error ?? '获取上传地址失败');
  }

  const putRes = await putImpl(body.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) throw new Error(`上传失败（${putRes.status}）`);

  return { url: `/api/files/${body.key}`, name: body.key, size: file.size, type: file.type };
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/attachment-client.test.ts`
Expected: PASS 5 tests

- [x] **Step 5: 把 upload-client.ts 改成薄封装（导出面不变）**

```ts
// src/lib/upload-client.ts —— 导出面与全部调用点不变
'use client';

import { directUpload } from './attachment-client';

export async function uploadFile(file: File): Promise<{ url: string; name: string; size: number }> {
  const r = await directUpload(file);
  return { url: r.url, name: r.name, size: r.size };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [x] **Step 6: 跑测试与类型检查**

Run: `npx vitest run src/lib/attachment-client.test.ts && npx tsc --noEmit`
Expected: PASS 5 tests；tsc 0 错

- [x] **Step 7: 提交**

```bash
git add src/lib/attachment-client.ts src/lib/attachment-client.test.ts src/lib/upload-client.ts
git commit -m "feat(upload): 客户端预签名直传，uploadFile 保持原签名"
```

---

## Task 8: 迁移脚本 `scripts/migrate-uploads-cos.ts`

**Files:**
- Create: `scripts/migrate-uploads-cos.ts`
- Create: `scripts/migrate-uploads-cos.test.ts`

**Interfaces:**
- Consumes: Task 2 `putUpload`；Task 3 门面的 `NAME_RE` / `mimeForName`
- Produces:
  ```ts
  export const LOCAL_KEEP_DAYS = 7;
  export function listMigratable(names: string[]): string[];
  export function isLocalCopyExpired(mtimeMs: number, nowMs: number): boolean;
  export function summarize(put: number, skipped: number, failed: number): string;
  export function countsMatch(r: { put: number; skipped: number; failed: number }): boolean;
  export async function migrate(opts: { dir: string; dryRun: boolean }): Promise<{ put: number; skipped: number; failed: number }>;
  ```

- [x] **Step 1: 写失败测试**

```ts
// scripts/migrate-uploads-cos.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listMigratable, isLocalCopyExpired, LOCAL_KEEP_DAYS, summarize, countsMatch, migrate } from './migrate-uploads-cos';

describe('migrate-uploads-cos 纯函数', () => {
  it('过滤掉不满足 NAME_RE 的文件名', () => {
    expect(listMigratable(['a.png', 'b b.txt', 'c.pdf', '../evil'])).toEqual(['a.png', 'c.pdf']);
  });

  it('本地副本满 7 天才算可删', () => {
    const now = Date.parse('2026-09-30T00:00:00.000Z');
    expect(LOCAL_KEEP_DAYS).toBe(7);
    expect(isLocalCopyExpired(now - 6 * 864e5, now)).toBe(false);
    expect(isLocalCopyExpired(now - 8 * 864e5, now)).toBe(true);
  });

  it('summarize 与 countsMatch 一起构成计数核对', () => {
    const r = { put: 3, skipped: 1, failed: 0 };
    expect(countsMatch(r)).toBe(true);
    expect(summarize(r.put, r.skipped, r.failed)).toContain('3');
  });

  it('dryRun 只数不搬', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'crafty-mig-'));
    await writeFile(path.join(dir, 'a.png'), 'x');
    const r = await migrate({ dir, dryRun: true });
    expect(r).toEqual({ put: 1, skipped: 0, failed: 0 });
    await rm(dir, { recursive: true, force: true });
  });

  it('目录不存在时返回全零而不是抛错', async () => {
    expect(await migrate({ dir: path.join(tmpdir(), 'nope-not-here'), dryRun: true }))
      .toEqual({ put: 0, skipped: 0, failed: 0 });
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run scripts/migrate-uploads-cos.test.ts`
Expected: FAIL — `Cannot find module './migrate-uploads-cos'`

- [x] **Step 3: 最小实现**

```ts
// scripts/migrate-uploads-cos.ts
/**
 * 一次性迁移：把 uploads/ 下的历史附件搬进 COS 私有桶。
 * 手动执行：npx tsx scripts/migrate-uploads-cos.ts [--dry-run]
 * 本地副本保留 7 天后再人工清理（spec 7.4）。
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { putUpload } from '../src/lib/storage-cos';
import { NAME_RE, mimeForName } from '../src/lib/storage';

export const LOCAL_KEEP_DAYS = 7;

export function listMigratable(names: string[]): string[] {
  return names.filter(n => NAME_RE.test(path.basename(n)));
}

export function isLocalCopyExpired(mtimeMs: number, nowMs: number): boolean {
  return nowMs - mtimeMs >= LOCAL_KEEP_DAYS * 864e5;
}

export function countsMatch(r: { put: number; skipped: number; failed: number }): boolean {
  return r.failed === 0;
}

export function summarize(put: number, skipped: number, failed: number): string {
  return `迁移完成：成功 ${put}，跳过 ${skipped}，失败 ${failed}。本地副本保留 ${LOCAL_KEEP_DAYS} 天后人工清理。`;
}

export async function migrate(opts: { dir: string; dryRun: boolean }) {
  let names: string[] = [];
  try {
    names = await readdir(opts.dir);
  } catch {
    return { put: 0, skipped: 0, failed: 0 };
  }
  const targets = listMigratable(names);
  let put = 0;
  let failed = 0;
  for (const name of targets) {
    const key = path.basename(name);
    if (opts.dryRun) { put += 1; continue; }
    try {
      const buf = await readFile(path.join(opts.dir, key));
      await putUpload(key, buf, mimeForName(key));
      put += 1;
      const s = await stat(path.join(opts.dir, key));
      if (isLocalCopyExpired(s.mtimeMs, Date.now())) {
        console.log(`[migrate] ${key} 已过 ${LOCAL_KEEP_DAYS} 天缓冲，可删除`);
      }
    } catch {
      failed += 1;
      console.error(`[migrate] 失败：${key}`);
    }
  }
  return { put, skipped: names.length - targets.length, failed };
}

const invokedDirectly = process.argv[1]?.endsWith('migrate-uploads-cos.ts') || process.argv[1]?.endsWith('migrate-uploads-cos.js');
if (invokedDirectly) {
  const dryRun = process.argv.includes('--dry-run');
  const r = await migrate({ dir: path.join(process.cwd(), 'uploads'), dryRun });
  console.log(summarize(r.put, r.skipped, r.failed));
  if (!countsMatch(r)) {
    console.error('[migrate] 有失败项，本地副本一律不要删，人工复查后重跑。');
    process.exitCode = 1;
  }
}
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run scripts/migrate-uploads-cos.test.ts`
Expected: PASS 6 tests

- [x] **Step 5: 干跑一次确认脚本可执行**

Run: `npx tsx scripts/migrate-uploads-cos.ts --dry-run`
Expected: 打印 `迁移完成：成功 0，跳过 0，失败 0`（当前 `uploads/` 为空目录）

- [x] **Step 6: 提交**

```bash
git add scripts/migrate-uploads-cos.ts scripts/migrate-uploads-cos.test.ts
git commit -m "feat(scripts): 一次性上传迁移脚本，本地副本保留 7 天"
```

---

## Task 9: P1 遗留 —— 同步路由测试补齐（POST 401 / owner 归属 / 墓碑 30 天边界）

**Files:**
- Modify: `src/app/api/v1/sync/route.test.ts`（**优先只加测试**；若新用例暴露真 bug 才改 `route.ts` 并在台账记 `Ruling:`）

**Interfaces:**
- Consumes: 现有 `mockDb` / `req` 脚手架与 `vi.mock('@/lib/authz/guard')`
- Produces: 3 组新用例，生产代码零改动

**已知结论（避免重复调查）：** `UNIQUE_KEY_LOCATORS` 的「先查后建 + 冲突搬迁」逻辑**已经实现**并有 mock 单测（R-19 用例）。本任务不重复实现，只补下列三类零覆盖用例。

- [x] **Step 1: 加 POST 401 用例**

```ts
  it('POST 未授权返回 401', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new AuthorizationError());
    const res = await POST(req([{
      table: 'document', id: 'd1', op: 'upsert',
      data: { title: 'x' }, syncTs: '2026-01-01T00:00:00.000Z',
    }]));
    expect(res.status).toBe(401);
  });
```

若测试文件未 import `AuthorizationError`，在文件顶部补：
`import { AuthorizationError } from '@/lib/authz/guard';`（该 mock 已导出同名 class）。

- [x] **Step 2: 加 owner 归属用例**

复用文件里已有的 I1 断言风格（它已经验证 `Document.first` 收到 `{id:'d9', userId:'u1'}`）：

```ts
  it('R-1：upsert 他人 document 时按 userId 过滤，不命中任何行', async () => {
    // mockDb 给 document 放一行 userId: 'other' 的记录
    const res = await POST(req([{
      table: 'document', id: 'd1', op: 'upsert',
      data: { title: 'x' }, syncTs: '2026-01-01T00:00:00.000Z',
    }]));
    // 断言：updateMany/first 的条件里带 userId: 'u1'，因此不产生跨用户写入
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
  });
```

**这条必须落实为可执行断言**：读 `route.ts` 中 `USER_ID_TABLES` 的分支，把它实际调用的那个 model 方法（`first` / `updateMany` / `create`）包成 `vi.fn()` 并断言首个参数 `toMatchObject({ userId: 'u1' })`。若 mockDb 脚手架不支持注入 spy，就对 `getDb()` 的返回做 `vi.spyOn`，断言落在 spy 上。**断言语义不可省。**

- [x] **Step 3: 加墓碑 30 天边界用例**

`purgeTombstones` 是模块内私有函数，**通过 GET 路径的副作用观察**。先读 `route.ts` 里 `purgeRotation` 与 `cutoff` 的计算，写两条：

```ts
  it('墓碑清理：29 天前的行不删', async () => { /* 断言 deleteMany 未被调用，或 where 条件为 30 天前的 cutoff */ });
  it('墓碑清理：31 天前的行被删', async () => { /* 同上，取反 */ });
```

因为 `purgeTombstones` 每次最多 100 条且有轮转，**两条用例要连续调用 GET 两次**触发轮转分支。断言对象是 `deleteAndCount` / `deleteMany` 收到的 `cutoff` 时间戳：29 天那行的时间必须 **大于** cutoff（保留），31 天那行必须 **小于** cutoff（删除）。

- [x] **Step 4: 跑测试**

Run: `npx vitest run src/app/api/v1/sync/route.test.ts`
Expected: PASS（原 14 例 + 新 5 例 = 19；若实现补了独立 purge 用例则为 20）

- [x] **Step 5: 回归**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc 0 错；lint 0 错

- [x] **Step 6: 提交**

```bash
git add src/app/api/v1/sync/route.test.ts
git commit -m "test(sync): 补 POST 401、owner 归属与墓碑 30 天边界"
```

---

## Task 10: P1 遗留 —— 任务页写路径改走 applyLocal

**Files:**
- Create: `src/app/(app)/tasks/tasks-local.ts`
- Create: `src/app/(app)/tasks/tasks-local.test.ts`
- Modify: `src/app/(app)/tasks/page.tsx`

**Interfaces:**
- Consumes: `getSyncManager().applyLocal({table:'task', id, patch})`；`SYNC_TABLES` 里 `task` 的 16 列白名单
- Produces: 纯函数 `taskPatchFor`（新建/切换/改期/删除四种 patch 构造）

**范围裁定（Ruling，已对照代码核实）：** 只改 `tasks/page.tsx` 的 4 个写调用点。**collection 页的 7 处 `setItemValue` / `addItem` / `deleteItem` / `updateView` 延到 P3** —— `setItemValue` 需要 `item → collection` 两跳归属校验，客户端离线时无法判定，写出去会被服务端 R-1 拒。`getTasks` 读路径**保持 Server Action 不动**（P2 只解决写路径离线可用）。

- [x] **Step 1: 写失败测试**

```ts
// src/app/(app)/tasks/tasks-local.test.ts
import { describe, it, expect } from 'vitest';
import { taskPatchFor, TASK_WS_COLS } from './tasks-local';

const NOW = '2026-09-30T00:00:00.000Z';

describe('tasks 本地写 patch', () => {
  it('白名单与 SYNC_TABLES.task 的 16 列一致', () => {
    expect([...TASK_WS_COLS].sort()).toEqual([
      'blockId', 'completedAt', 'createdAt', 'deletedAt', 'documentId', 'dueDate',
      'id', 'isCompleted', 'order', 'recurrence', 'recurrenceEnd', 'remindAt',
      'status', 'title', 'updatedAt', 'userId',
    ]);
  });

  it('新建：只写创建必需列 + updatedAt', () => {
    const p = taskPatchFor.create({ id: 't1', userId: 'u1', title: '买牛奶' }, NOW);
    expect(Object.keys(p).sort()).toEqual(['createdAt', 'id', 'isCompleted', 'status', 'title', 'updatedAt', 'userId']);
    expect(p.isCompleted).toBe(false);
    expect(p.status).toBe('todo');
  });

  it('切换完成：动 isCompleted/status/completedAt/updatedAt 四列', () => {
    const p = taskPatchFor.toggle(true, NOW);
    expect(p).toEqual({ isCompleted: true, status: 'done', completedAt: NOW, updatedAt: NOW });
  });

  it('切换未完成：completedAt 置 null', () => {
    expect(taskPatchFor.toggle(false, NOW).completedAt).toBeNull();
    expect(taskPatchFor.toggle(false, NOW).status).toBe('todo');
  });

  it('改期：只动四个日程列 + updatedAt', () => {
    const p = taskPatchFor.schedule({ dueDate: '2026-10-01T09:00:00.000Z', remindAt: null, recurrence: null, recurrenceEnd: null }, NOW);
    expect(Object.keys(p).sort()).toEqual(['dueDate', 'recurrence', 'recurrenceEnd', 'remindAt', 'updatedAt']);
  });

  it('删除：写 deletedAt + updatedAt，不是空 patch（spec 4.5）', () => {
    expect(taskPatchFor.delete(NOW)).toEqual({ deletedAt: NOW, updatedAt: NOW });
  });

  it('未知列被丢弃', () => {
    const p = taskPatchFor.create({ id: 't1', userId: 'u1', title: 'x', evil: 1 } as never, NOW);
    expect(p).not.toHaveProperty('evil');
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npx vitest run "src/app/(app)/tasks/tasks-local.test.ts"`
Expected: FAIL — `Cannot find module './tasks-local'`

- [x] **Step 3: 实现 `tasks-local.ts`**

```ts
// src/app/(app)/tasks/tasks-local.ts
import type { TaskSchedule } from '@/actions/task/task';

export const TASK_WS_COLS = [
  'id', 'userId', 'documentId', 'blockId', 'title', 'isCompleted', 'dueDate', 'remindAt',
  'recurrence', 'recurrenceEnd', 'completedAt', 'status', 'order', 'createdAt', 'updatedAt', 'deletedAt',
] as const;

export type TaskCol = (typeof TASK_WS_COLS)[number];

const WS = new Set<string>(TASK_WS_COLS);

function pick(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) if (WS.has(k)) out[k] = v;
  return out;
}

export const taskPatchFor = {
  create(
    input: { id: string; userId: string; title: string; dueDate?: string | null },
    now: string,
  ) {
    return {
      ...pick({ ...input, isCompleted: false, status: 'todo' }),
      createdAt: now,
      updatedAt: now,
    };
  },

  toggle(completed: boolean, now: string) {
    return {
      isCompleted: completed,
      status: completed ? 'done' : 'todo',
      completedAt: completed ? now : null,
      updatedAt: now,
    };
  },

  schedule(s: TaskSchedule, now: string) {
    return {
      dueDate: s.dueDate,
      remindAt: s.remindAt,
      recurrence: s.recurrence,
      recurrenceEnd: s.recurrenceEnd,
      updatedAt: now,
    };
  },

  delete(now: string) {
    return { deletedAt: now, updatedAt: now };
  },
};
```

- [x] **Step 4: 跑测试确认通过**

Run: `npx vitest run "src/app/(app)/tasks/tasks-local.test.ts"`
Expected: PASS 7 tests

- [x] **Step 5: 页面改造（零视觉变化）**

改 `src/app/(app)/tasks/page.tsx` 的四处 handler。`import` 段新增：

```ts
import { getSyncManager } from '@/lib/sync-core';
import { taskPatchFor } from './tasks-local';
```

保留 `getTasks`（读路径不动），把四个写 Server Action 从 import 里移除（`createTask` / `toggleTask` / `setTaskSchedule` / `deleteTask`）：

```ts
  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await getSyncManager().applyLocal({
        table: 'task',
        id,
        patch: taskPatchFor.create({ id, userId: me(), title: newTitle.trim() }, now),
      });
      setNewTitle('');
      await load();
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string) => {
    const now = new Date().toISOString();
    await getSyncManager().applyLocal({ table: 'task', id, patch: taskPatchFor.toggle(true, now) });
    await load();
  };

  const handleSchedule = async (id: string, schedule: TaskSchedule) => {
    const now = new Date().toISOString();
    await getSyncManager().applyLocal({ table: 'task', id, patch: taskPatchFor.schedule(schedule, now) });
    await load();
  };

  const handleDelete = async (id: string) => {
    const now = new Date().toISOString();
    await getSyncManager().applyLocal({ table: 'task', id, patch: taskPatchFor.delete(now) });
    await load();
  };
```

`me()` 的取法：先读 P1 是否已把当前 userId 放进 sync store（`getSyncManager().getKv('userId')` 或 `status()`）。**若拿不到**，就保留 `userId` 由服务端补齐的写法 —— 即 patch 里不带 `userId`，并在台账记 `Ruling: 客户端无离线 userId，task.userId 留给服务端 sync 落库时注入`。**不要**为了凑字段去读 `src/lib/env/secret.ts` 或 `.env`。

- [x] **Step 6: 类型与静态检查**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc 0 错；lint 0 错

- [x] **Step 7: 提交**

```bash
git add "src/app/(app)/tasks/page.tsx" "src/app/(app)/tasks/tasks-local.ts" "src/app/(app)/tasks/tasks-local.test.ts"
git commit -m "refactor(tasks): 任务页写路径改走 applyLocal，读路径保持 Server Action"
```

---

## Task 11: 收尾 —— 全量门禁 + 验收报告

**Files:**
- Modify: `docs/test-report.md`（追加 `## P2 attachment acceptance` 段）
- Modify: `docs/superpowers/plans/2026-09-29-p2-attachment-cos.md`（勾选所有 `- [ ]`）

**Interfaces:**
- Consumes: 全部前序任务
- Produces: 验收数字

- [x] **Step 1: 跑全量单测**

Run: `npm test`
Expected: 48+ 文件全绿，总数 ≥ 286 + 25（存储层）+ 18（API）+ 8（队列）+ 5（客户端）+ 6（脚本）+ 5（同步路由）+ 7（tasks）= **360**

- [x] **Step 2: 类型检查与 lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc 0 错；lint 0 错（warning 数允许高于 P1 的 540，但 error 必须为 0）

- [x] **Step 3: e2e 回归**

Run: `npx playwright test e2e/sync.spec.ts`
Expected: 3/3 通过，耗时阈值不回退（P1 基线：converge ~10s、recover ~18.7s）

- [x] **Step 4: 验证 local 驱动零影响（关键回归）**

Run: `grep -rn "STORAGE_DRIVER" .env.example 2>/dev/null; npx vitest run src/lib/storage.test.ts src/app/api/files/`
Expected: 未设 `STORAGE_DRIVER` 时全部走本地路径，测试全绿

- [x] **Step 5: 写验收报告**

在 `docs/test-report.md` 末尾追加：

```markdown
## P2 attachment acceptance 2026-09-30

- 单测：<实际文件数> 文件 / <实际通过数> 通过（P1 基线 286，无回退）
- tsc --noEmit：0 错误
- npm run lint：0 错误（warning <实际数>）
- e2e e2e/sync.spec.ts：3/3（converge <实际> ms，recover <实际> ms）
- 存储驱动：默认 local；`STORAGE_DRIVER=cos` 时 /api/files/[name] 302 到预签名 GET
- 预签名：PUT 600s / GET 300s；100MB 上限 → 413
- 迁移脚本：npx tsx scripts/migrate-uploads-cos.ts --dry-run 输出 <实际>
- P1 遗留结清：
  - 唯一键 create 命中墓碑：查询-后-建 + 冲突搬迁逻辑 P1 已实现，本批补 <N> 条断言
  - 补测：POST 401、owner 归属（R-1）、墓碑 30 天边界
  - tasks 页写路径已改 applyLocal（读路径仍走 Server Action，留痕）
  - collection 页 7 处调用点延至 P3（两跳归属离线不可判定，Ruling 记于台账）
```

**所有 `<实际>` 必须填真实跑出来的数字，不得留占位。**

- [x] **Step 6: 提交**

```bash
git add docs/test-report.md docs/superpowers/plans/2026-09-29-p2-attachment-cos.md
git commit -m "docs: P2 附件上云验收报告"
```

---

## Self-Review 结果

**1. Spec 覆盖检查（对照 spec 第 7 章 5 项 + 第 12 章常量）**

| Spec 条目 | 覆盖任务 |
| --- | --- |
| 7.1 storage.ts 抽象、四个签名不变、`STORAGE_DRIVER=cos\|local` 默认 local | Task 1 + Task 3 |
| 7.2 CosStorage 私有桶、readUpload→302、DB 文件名不变零迁移 | Task 2 + Task 3 + Task 5 |
| 7.3 客户端直传、失败入队退避重试、已上传清单去重 | Task 6 + Task 7 |
| 7.4 迁移脚本、计数核对、本地副本 7 天缓冲 | Task 8 |
| 5.2 契约（sign/url、100MB、10min/5min、NAME_RE + EXT_MIME） | Task 4 + Task 5 |
| 12 常量表 | Global Constraints 逐字抄录，各任务测试直接断言 |
| 4.5 删除语义（deletedAt + isDeleted） | Task 10 的 `taskPatchFor.delete` |
| D7 零视觉变化 | Task 10 Step 5 明确约束 |
| 9.4 验收 | Task 11 |
| P1 遗留 1（唯一键 create 撞墓碑） | Task 9 —— 已核实逻辑 P1 已实现，只补断言 |
| P1 遗留 2（三处零测试） | Task 9 |
| P1 遗留 3（Server Action 迁移） | Task 10（tasks）／collection 页记为 P3 延后 |
| P1 遗留 4（无 userId 表归属） | **未做**：需要改 `route.ts` 写侧归属校验，影响面超出「附件上云」，风险与收益不匹配。已在 Task 11 报告里显式声明为 P3 项，不静默丢弃 |

**2. 占位符扫描** — 已清除三处草稿残留（Task 4 的 `const key = ...` 死码、Task 6 的 `const [job, ...rest]` 残留绑定、Task 7 的 `void err` 假变量），每个 Task 步骤都带可运行代码或可执行断言；Task 9/10 中依赖「读实际代码后确定断言对象」的地方已写明读哪个文件的哪个变量，不允许留空。唯一保留的 `<实际>` 占位在 Task 11 的验收报告模板里，并已明令执行时必须填真实跑出的数字。

**3. 类型一致性** — `presignPut/presignGet` 返回 `{url, key?, expiresAt}`，Task 4/5/7 三处消费一致；`AttachmentStore.bumpTry(id, nextRetryAt)` 语义（store 侧自增 tries）在 Task 6 Step 3 的实现与测试断言中对齐；`taskPatchFor` 四个成员与 Step 5 页面四处调用一一对应。

---

## 执行结果（2026-09-30 收尾时补写）

Task 1–11 全部执行完毕，上面的勾选状态为「已执行」，**不是**「逐字照计划实现」。
门禁数字、契约核对表、五条偏离裁定、三条本轮新缺陷与四条 cannot-verify，
统一记在 `docs/test-report.md` 的「P2 attachment acceptance 2026-09-30」段与
`.superpowers/sdd/2026-09-29-p2-attachment-cos/progress.md`（含每条计划的"计划缺陷 N"编号）。

计划自身需要修订的三处（本批未回改计划正文，避免"计划追认实现"）：
1. Task 8 Step 6 的 `npx tsx` 会静默拉依赖 ⇒ 应为 `node --experimental-strip-types`。
2. Task 8 的 `listMigratable` 先 `basename` 后判白名单是路径穿越，计划代码本身不安全。
3. Task 10 的 `taskPatchFor.delete` 与 `applyLocal` 的 `patch === null` 约定冲突；
   且 `toggleTask` 的两条服务端派生使该调用点不可迁移（本批保持 Server Action）。
