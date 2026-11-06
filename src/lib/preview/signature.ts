import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PreviewSize } from './document-preview';

/**
 * G216：官方预览 URL 带签名（`?s=<sig>`）——出图端点不靠会话也能被 CDN/浏览器取回，
 * 签名把「文档 id ＋ 时间戳 ＋ 尺寸 ＋ 主题」四元组钉死，改任何一项签名即失效。
 * 本地复用同一形制：HMAC-SHA256（密钥取 PREVIEW_SIGNING_SECRET / 认证密钥；本机无则可预期回退）。
 */
function signingSecret(): string {
  return (
    process.env.PREVIEW_SIGNING_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    'craft-preview-signing-dev'
  );
}

export function previewSignature(documentId: string, ts: string, size: PreviewSize, theming: boolean): string {
  return createHmac('sha256', signingSecret())
    .update(`${documentId}|${ts}|${size}|${theming ? '1' : '0'}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyPreviewSignature(
  documentId: string,
  ts: string,
  size: PreviewSize,
  theming: boolean,
  provided: string,
): boolean {
  const expected = previewSignature(documentId, ts, size, theming);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
}

/**
 * 服务端（页面组件）为卡片生成预览 URL——路径与查询参数照官方形制：
 * `/…/document_preview/v1/<doc>/t/<ts>?v=1&s=<sig>&size=m&theming=true`。
 * `ts` 取文档 `updatedAt` 的毫秒值：内容一变 URL 就变（官方用它做缓存推翻）。
 */
export function buildPreviewSrc(
  document: { id: string; updatedAt: string | Date },
  options?: { size?: PreviewSize; theming?: boolean },
): string {
  const size = options?.size ?? 'm';
  const theming = options?.theming ?? true;
  const parsed = new Date(document.updatedAt).getTime();
  const ts = String(Number.isFinite(parsed) ? parsed : Date.now());
  const signature = previewSignature(document.id, ts, size, theming);
  return `/api/render/document_preview/v1/${document.id}/t/${ts}?v=1&s=${signature}&size=${size}&theming=${theming ? 'true' : 'false'}`;
}