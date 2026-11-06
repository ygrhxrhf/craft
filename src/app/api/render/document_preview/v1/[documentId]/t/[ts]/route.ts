import { NextRequest } from 'next/server';

import { requireUserId } from '@/lib/authz/guard';
import { resolveDocumentAccess } from '@/lib/authz/document-access';
import { renderDocumentPreview, type PreviewSize, type PreviewTheme } from '@/lib/preview/document-preview';
import { verifyPreviewSignature } from '@/lib/preview/signature';

const SIZES = new Set<string>(['s', 'm', 'l']);

/**
 * G216：文档卡片预览的出图端点，路径/查询参数照官方形制——
 * `/api/render/document_preview/v1/<doc>/t/<ts>?v=1&s=<sig>&size=m&theming=true`。
 *
 * 两层门：① 签名（`s` 把 doc/ts/size/theming 四元组钉死，篡改即 403）；
 * ② 会话＋文档权限（预览不额外扩大可读面）。`ts` 是缓存推翻用的版本戳，内容一改
 * 卡片上的 URL 就换新。`theming=true` 时按 `theme` 参数出图（缺省 light）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string; ts: string }> },
) {
  const { documentId, ts } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response('未授权', { status: 401 });
  }

  const url = new URL(request.url);
  const sizeParam = url.searchParams.get('size') ?? 'm';
  const size = (SIZES.has(sizeParam) ? sizeParam : 'm') as PreviewSize;
  const theming = url.searchParams.get('theming') !== 'false';
  const signature = url.searchParams.get('s') ?? '';
  if (!verifyPreviewSignature(documentId, ts, size, theming, signature)) {
    return new Response('签名无效', { status: 403 });
  }

  const access = await resolveDocumentAccess(documentId, userId);
  if (!access) {
    return new Response('文档不存在', { status: 404 });
  }

  const document = access.document as {
    title?: string | null;
    icon?: string | null;
    content?: unknown;
  };
  const theme: PreviewTheme = theming && url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const svg = renderDocumentPreview(
    { title: document.title ?? '', icon: document.icon ?? null, content: document.content },
    { size, theme },
  );

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // 私有缓存：同一浏览器 60 秒内重复取图不再回源；内容改动会换 ts 与签名。
      'cache-control': 'private, max-age=60',
    },
  });
}