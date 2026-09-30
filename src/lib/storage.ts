// storage.ts —— 门面：按 STORAGE_DRIVER 分派到本地盘或 COS。导出面只增不减，调用方零改动。
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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
    const key = safeKey(randomUUID() + (/^\.[A-Za-z0-9]{1,10}$/.test(ext) ? ext : ''));
    const buf = Buffer.from(await file.arrayBuffer());
    const type = file.type || mimeForNameLocal(key);
    await putUpload(key, buf, type);
    return { name: key, size: buf.byteLength, type };
  }
  return localSaveUpload(file);
}

export async function saveUploadBuffer(buf: Buffer, ext: string): Promise<{ name: string; size: number }> {
  if (isCos()) {
    const key = safeKey(randomUUID() + ext);
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
    // 吞错是硬约束（spec 7.2）：删除失败、或名字连白名单都过不了，都不算错误。
    // safeKey 必须放在 try 里 —— 基线 deleteUpload 从不抛出，抛了就破坏「导出面只增不减」的语义契约。
    try {
      await deleteUploadFromCos(safeKey(name));
    } catch {
      // 非法文件名 / 未配置 / 网络失败，一律吞掉
    }
    return;
  }
  await localDeleteUpload(name);
}

/** 仅 cos 驱动下有值：给 /api/files/[name] 做 302 用。 */
export function presignGetOrNull(name: string): { url: string; expiresAt: number } | null {
  if (!isCos()) return null;
  return presignGet(safeKey(name));
}

/**
 * 仅 cos 驱动下有值：给 /api/v1/attachments/sign 决定「走预签名直传」还是「走旧 multipart」。
 *
 * 客户端要读这个开关才能在 local 开发下继续走旧通道 —— 客户端拿不到服务端环境变量，
 * 也不能用 NEXT_PUBLIC_ 暴露存储凭据。两处独立判 isCos() 而共用一个公开布尔，
 * 是为了让「服务端没配 COS」和「服务端配了 cos」都能各走各的路。
 */
export function directUploadEnabled(): boolean {
  return isCos();
}
