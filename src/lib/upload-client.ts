'use client';

// 薄封装：导出面与基线逐字不变，5 个编辑器组件（Editor / image-block-view /
// image-gallery-view / slash-commands / PropertyCell）零改动。
import { directUpload } from './attachment-client';
import { directUploadEnabled } from './storage-config';

/** 直传不可用时的回退通道：老的多段表单 POST，字节过应用服务器。 */
async function legacyUpload(file: File): Promise<{ url: string; name: string; size: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/files', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? '上传失败');
  }
  return data;
}

export async function uploadFile(file: File): Promise<{
  url: string;
  name: string;
  size: number;
}> {
  // local 驱动下开关为 false ⇒ 逐字走基线的 multipart 通道，本地开发零影响（spec 7.1）。
  if (directUploadEnabled()) {
    const r = await directUpload(file);
    return { url: r.url, name: r.name, size: r.size };
  }
  return legacyUpload(file);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
