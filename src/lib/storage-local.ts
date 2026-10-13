// 基线 storage.ts 第 1 行还 import 了未使用的 mkdir；搬迁时顺手删掉，避免 lint warning 跟到新文件。
import { readFile, unlink, writeFile } from 'node:fs/promises';
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
  // NAME_RE 放行 '.' 与 '..'，而 path.join(dir, '..') 会真的跳到父目录。
  // basename + 字符白名单挡不住这一种，所以最后钉一道「结果必须仍在上传目录内」。
  const full = path.join(uploadDir(), base);
  const rel = path.relative(path.resolve(uploadDir()), path.resolve(full));
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('非法文件名');
  return full;
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
