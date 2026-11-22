import { getDb } from '@/prisma/db';
import { verifyMcpToken } from '@/lib/mcp/token';

/**
 * G1674 —— 「所有文档的 MCP」：把本账号的文档以 MCP 工具的形式暴露给外部 AI 工具。
 *
 * 传输用 MCP 的 Streamable HTTP 那一档的**无状态子集**：`POST /api/mcp` 一次一条 JSON-RPC 2.0
 * 消息，直接回 JSON（不发 SSE 流、不带 session）。客户端配置里填 URL + `Authorization: Bearer
 * <令牌>`，令牌在接入中心的「所有文档的 MCP」卡上复制（见 `issueMcpToken`）。
 *
 * 工具刻意只读三枚：列出、搜索、读块。写入面（`insert_text` 之类）留作后续，因为那要先有
 * 权限档（官方 `permission` 三轴）落到工具层的判据。
 */

export const runtime = 'nodejs';

const TOOLS = [
  {
    name: 'documents_list',
    description: '列出本空间的文档（按更新时间倒序），返回 id、标题、更新时间与是否日记。',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: '最多返回几篇，默认 20，上限 100' } },
    },
  },
  {
    name: 'documents_search',
    description: '在文档标题与正文里搜索，返回命中的文档。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索词' },
        limit: { type: 'number', description: '最多返回几篇，默认 10' },
      },
      required: ['query'],
    },
  },
  {
    name: 'document_read',
    description: '读取一篇文档的正文（纯文本）。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文档 id' } },
      required: ['id'],
    },
  },
] as const;

type Row = Record<string, unknown>;

async function documentsList(userId: string, limit: number) {
  const db = await getDb();
  const rows = (await db.orm.public.Document
    .where({ userId, isDeleted: false })
    .all()) as Row[];
  rows.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  return rows.slice(0, limit).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
    isDailyNote: Boolean(row.isDailyNote),
  }));
}

async function documentsSearch(userId: string, query: string, limit: number) {
  const db = await getDb();
  const rows = (await db.orm.public.Document
    .where({ userId, isDeleted: false })
    .all()) as Row[];
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return rows
    .filter((row) => {
      const title = String(row.title ?? '').toLowerCase();
      const text = String(row.plainText ?? '').toLowerCase();
      return title.includes(needle) || text.includes(needle);
    })
    .slice(0, limit)
    .map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      excerpt: String(row.plainText ?? '').slice(0, 200),
      updatedAt: String(row.updatedAt ?? ''),
    }));
}

async function documentRead(userId: string, id: string) {
  const db = await getDb();
  const row = (await db.orm.public.Document.first({ id })) as Row | null;
  if (!row || row.userId !== userId || row.isDeleted) return null;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    text: String(row.plainText ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
}

function rpcResult(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result });
}

function rpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } });
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const userId = verifyMcpToken(token);
  if (!userId) {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: '令牌无效。请在接入中心复制「所有文档的 MCP」的地址与令牌。' } },
      { status: 401 },
    );
  }

  let message: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  const { id, method, params } = message;

  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'Crafty Documents', version: '1.0.0' },
    });
  }

  if (method === 'notifications/initialized' || method === 'ping') {
    return rpcResult(id, {});
  }

  if (method === 'tools/list') {
    return rpcResult(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    const name = String(params?.name ?? '');
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    try {
      if (name === 'documents_list') {
        const limit = Math.min(Number(args.limit ?? 20) || 20, 100);
        const list = await documentsList(userId, limit);
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] });
      }
      if (name === 'documents_search') {
        const query = String(args.query ?? '');
        const limit = Math.min(Number(args.limit ?? 10) || 10, 50);
        const hits = await documentsSearch(userId, query, limit);
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(hits, null, 2) }] });
      }
      if (name === 'document_read') {
        const doc = await documentRead(userId, String(args.id ?? ''));
        if (!doc) return rpcError(id, -32004, '文档不存在');
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }] });
      }
      return rpcError(id, -32601, `未知工具：${name}`);
    } catch (error) {
      return rpcError(id, -32603, `工具执行失败：${String((error as Error)?.message ?? error)}`);
    }
  }

  return rpcError(id, -32601, `未知方法：${String(method)}`);
}

export async function GET() {
  return Response.json(
    {
      name: 'Crafty Documents MCP',
      transport: 'streamable-http (stateless)',
      usage: 'POST /api/mcp with Authorization: Bearer <token>',
      tools: TOOLS.map((tool) => tool.name),
    },
    { status: 200 },
  );
}
