import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { appendTextBlock, listBlocks } from '@/lib/ai/blocks';
import { extractReadableText, parseDuckDuckGoResults } from '@/lib/ai/tools';

const USER_AGENT = 'Mozilla/5.0 (compatible; CraftyAI/1.0)';

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: '未授权' }, { status: 401 });

  let body: { tool?: string; query?: string; url?: string; documentId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效请求' }, { status: 400 });
  }

  try {
    if (body.tool === 'blocks_get') {
      const documentId = body.documentId?.trim();
      if (!documentId) return Response.json({ error: '缺少文档 id' }, { status: 400 });
      const { document } = await requireDocumentAccess(documentId, session.user.id, 'viewer');
      return Response.json({ blocks: listBlocks(document.content) });
    }
    if (body.tool === 'insert_text') {
      const documentId = body.documentId?.trim();
      const text = body.text?.trim();
      if (!documentId || !text) return Response.json({ error: '缺少文档 id 或文本' }, { status: 400 });
      const { document } = await requireDocumentAccess(documentId, session.user.id, 'editor');
      const db = await getDb();
      const content = appendTextBlock(document.content, text);
      await db.orm.public.Document.where({ id: documentId }).update({ content });
      return Response.json({ blocks: listBlocks(content) });
    }
    if (body.tool === 'web_search' || body.tool === 'web_ask') {
      const query = body.query?.trim();
      if (!query) return Response.json({ error: '缺少查询词' }, { status: 400 });
      const html = await fetchText(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
      return Response.json({ results: parseDuckDuckGoResults(html) });
    }
    if (body.tool === 'web_crawl') {
      const url = body.url?.trim();
      if (!url || !/^https?:\/\//i.test(url)) return Response.json({ error: '无效 URL' }, { status: 400 });
      const html = await fetchText(url);
      return Response.json({ content: extractReadableText(html) });
    }
    return Response.json({ error: '未知工具' }, { status: 400 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : '联网工具失败',
      connectError: true,
    }, { status: 502 });
  }
}
