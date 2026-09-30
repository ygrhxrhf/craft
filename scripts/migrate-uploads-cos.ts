/**
 * 一次性迁移：把 uploads/ 下的历史附件搬进 COS 私有桶（spec 7.4）。
 *
 * 手动执行：node --experimental-strip-types scripts/migrate-uploads-cos.ts [--dry-run] [--dir uploads]
 *
 * 两条设计约束，都是实测逼出来的：
 * 1. **不 import `../src/lib/storage`**。那个门面用无扩展名相对路径 import（`'./storage-driver'`），
 *    Node 的类型剥离不做路径解析 ⇒ 直接跑会 `Cannot find module`。
 *    本脚本只需要两个纯常量，它们原样出自 `storage-local.ts`（`storage.ts` 逐字 re-export），
 *    而 `storage-local.ts` 可以被 Node 直接加载。**这不是复制常量**：值必须与门面一致，
 *    改 `EXT_MIME` 时要连这里一起改（`scripts/` 不在 tsc 的 include 内，单测 4 会挡住漂移）。
 * 2. **putUpload 是注入的**。`storage-cos.ts` 顶层 import `cos-nodejs-sdk-v5`（CJS），
 *    Node 加载 .ts 文件时 CJS 依赖解析成 undefined ⇒ 走 CLI 入口时在 import 阶段就炸。
 *    真正执行时才动态 import 它，单测则注入假实现 —— 迁移逻辑因此可以纯内存测。
 *
 * 迁移语义（spec 7.4）：遍历 → 逐个 PutObject（带进度）→ 校验数量 → 删除本地副本（保留 7 天缓冲）。
 * 本脚本**不删任何文件**：只按 mtime 打印「这份已过 7 天缓冲，可删」，删除动作留人工。
 * spec 写的是「删除本地副本（保留 7 天缓冲）」，自动化删除一旦 COS 侧静默丢件就不可逆，
 * 而 spec 未要求无人值守，故按最保守的读法实现，并在 summarize 里显式写明「人工清理」。
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// 两条 import 路径都写成**变量**，因为两边的要求正好相反、字面量满足不了任何一边：
// - Node 的类型剥离不做路径解析 ⇒ 必须带 .ts 后缀，否则 ERR_MODULE_NOT_FOUND（已实测）；
// - tsc 只校验字面量 import 路径 ⇒ 带 .ts 后缀报 TS5097，开 allowImportingTsExtensions
//   属于改全局编译选项（Global Constraints 不许，且曾被权限层拦下）。
// 变量路径 tsc 不做模块解析（不报 5097、不报找不到模块），发给 Node 的仍是逐字这串 ⇒
// 两条通路同时成立，且没有任何编译豁免——tsc 照常完整类型检查本文件。
const STORAGE_LOCAL_MODULE = '../src/lib/storage-local.ts';
const COS_MODULE = '../src/lib/storage-cos.ts';

// 类型这一侧走**类型位置**的字面量 import：tsc 用 bundler 解析能拿到真实类型
// （extensionless 解析到 .ts），且类型位置的 import 在运行时被整体擦除，Node 根本看不到它。
type StorageLocal = typeof import('../src/lib/storage-local');
const { NAME_RE, mimeForNameLocal } = (await import(STORAGE_LOCAL_MODULE)) as StorageLocal;

export const LOCAL_KEEP_DAYS = 7;

/** 与 storage-cos.ts 的 putUpload 同签名；dryRun 不需要它。 */
export type PutFn = (key: string, buf: Buffer, contentType: string) => Promise<void>;

export function listMigratable(names: string[]): string[] {
  // 白名单必须**逐字**判原始条目，不能先 basename 归一化。
  // `path.basename('../evil')` 返回 'evil'（已实测）⇒ 计划里那版过滤器会把
  // '../evil' 判为合法，随后 `readFile(path.join(dir,'../evil'))` 读到上传目录**外面**的文件，
  // 并以 key 'evil' 传进 putUpload。NAME_RE 里的 '.' 与 '..' 同样过白名单，
  // 所以还要显式排除这两个纯点号名。
  return names.filter(n => NAME_RE.test(n) && !/^\.+$/.test(n));
}

export function isLocalCopyExpired(mtimeMs: number, nowMs: number): boolean {
  return nowMs - mtimeMs >= LOCAL_KEEP_DAYS * 864e5;
}

export function countsMatch(r: { put: number; skipped: number; failed: number }): boolean {
  return r.failed === 0;
}

export function summarize(put: number, skipped: number, failed: number): string {
  return `迁移完成：成功 ${put}，跳过 ${skipped}，失败 ${failed}。`
    + `本地副本保留 ${LOCAL_KEEP_DAYS} 天后人工清理。`;
}

export async function migrate(opts: { dir: string; dryRun: boolean; put?: PutFn }) {
  let names: string[] = [];
  try {
    names = await readdir(opts.dir);
  } catch {
    // 目录不存在/不可读：视为「没有可迁移的东西」，不该让一次性脚本整体失败。
    return { put: 0, skipped: 0, failed: 0 };
  }
  const targets = listMigratable(names);
  const skipped = names.length - targets.length;
  if (opts.dryRun || !opts.put) {
    return { put: targets.length, skipped, failed: 0 };
  }
  const put = opts.put;
  let ok = 0;
  let failed = 0;
  let notAFile = 0;
  for (const name of targets) {
    const key = path.basename(name);
    try {
      const full = path.join(opts.dir, key);
      // 目录不是「上传失败」：它压根不该被搬。计入 skipped（可提示人工处理），
      // 而不是 failed —— 否则 countsMatch 会因为一个嵌套目录就把整轮标成需要重跑。
      if (!(await stat(full)).isFile()) {
        notAFile += 1;
        console.log(`[migrate] ${key} 不是普通文件，跳过`);
        continue;
      }
      const buf = await readFile(full);
      // 类型按扩展名判定，不采信磁盘元数据（与 T4 的 /sign 同一原则）。
      await put(key, buf, mimeForNameLocal(key));
      ok += 1;
      try {
        const s = await stat(full);
        if (isLocalCopyExpired(s.mtimeMs, Date.now())) {
          console.log(`[migrate] ${key} 已过 ${LOCAL_KEEP_DAYS} 天缓冲，可人工删除`);
        }
      } catch {
        // 读不到 mtime 不影响迁移结果，不计入 failed。
      }
    } catch {
      // 单个文件失败不中断整轮：否则一次网络抖动会毁掉整批迁移。
      failed += 1;
      console.error(`[migrate] 失败：${key}`);
    }
  }
  return { put: ok, skipped: skipped + notAFile, failed };
}

/** 真跑时动态加载 COS 写入器；单测注入假实现，迁移逻辑因此不碰网络。 */
async function realPut(): Promise<PutFn> {
  const mod = await import(COS_MODULE);
  return mod.putUpload as PutFn;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dirFlag = process.argv.find(a => a.startsWith('--dir='));
  const dir = dirFlag ? dirFlag.slice('--dir='.length) : path.join(process.cwd(), 'uploads');
  // dry-run 连 COS 配置都不该读，否则没配 COS 时干跑也过不去。
  const put = dryRun ? undefined : await realPut();
  const r = await migrate({ dir, dryRun, put });
  console.log(summarize(r.put, r.skipped, r.failed));
  if (!countsMatch(r)) {
    console.error('[migrate] 有失败项，本地副本一律不要删，人工复查后重跑。');
    process.exitCode = 1;
  }
}

// 只在被直接执行时跑，测试 import 时不触发。
const invokedDirectly = process.argv[1]?.endsWith('migrate-uploads-cos.ts')
  || process.argv[1]?.endsWith('migrate-uploads-cos.js');
if (invokedDirectly) {
  await main();
}
