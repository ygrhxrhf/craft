import { getDb } from '@/prisma/db';
import { serializeDocument } from '@/lib/document-codec';
import { verifyMcpToken } from '@/lib/mcp/token';

/**
 * 把一篇文档导出成 Markdown，给外部应用（xsxz 阅读器）把稿子当书读。
 *
 * 与 `/api/mcp` 同一个自证令牌，但两档都收：导出是只读操作，读令牌与写令牌都该能用。
 * 只认本人文档——别人的 id、已删除的 id 一律 404，不区分「不存在」与「没有权限」，
 * 免得把别人文档的存在性漏出去。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const identity = verifyMcpToken(token);
  if (!identity) {
    return Response.json(
      {
        ok: false,
        code: 'unauthorized',
        message: '令牌无效。请在接入中心复制「所有文档的 MCP」的地址与令牌。',
      },
      { status: 401 },
    );
  }

  const { id } = await params;
  const db = await getDb();
  const row = (await db.orm.public.Document.first({ id })) as Row | null;
  if (!row || row.userId !== identity.userId || row.isDeleted) {
    return Response.json({ ok: false, code: 'not_found', message: '文档不存在' }, { status: 404 });
  }

  const content = row.content ?? { type: 'doc', content: [] };
  const markdown = serializeDocument(content, 'markdown');
  return Response.json({
    ok: true,
    id: String(row.id),
    title: String(row.title ?? ''),
    markdown,
    chars: markdown.length,
    updatedAt: String(row.updatedAt ?? ''),
  });
}
