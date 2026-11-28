import { AuthorizationError } from '@/lib/authz/guard';
import { verifyMcpToken } from '@/lib/mcp/token';
import {
  ImportError,
  MAX_IMPORT_CHARS,
  MAX_IMPORT_FILES,
  importMarkdownForUser,
  type MarkdownFile,
} from '@/lib/import/import-documents';

/**
 * xsxz（本机阅读器）把读书笔记推成文档的入口。
 *
 * 与 `/api/mcp` 同源但不同面：那边是 JSON-RPC 的只读工具，这边是给本机应用用的普通 HTTP
 * 接口，鉴权走同一个自证令牌，但必须带 `write` 档——读令牌在这里一律 403，否则任何拿读
 * 令牌的客户端都能往空间里灌文档。
 *
 * 一次一请求、全量成败：`documentId` 是幂等键，客户端第二次推同一本书就更新那一篇；
 * 文档被删掉则回 404 `not_found`，客户端清掉本地映射后按新建重推。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME_CHARS = 200;

function fail(status: number, code: string, message: string) {
  return Response.json({ ok: false, code, message }, { status });
}

function optionalId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

type ParsedFiles = { ok: true; files: MarkdownFile[] } | { ok: false; status: number; message: string };

function parseFiles(raw: unknown): ParsedFiles {
  if (!Array.isArray(raw) || !raw.length) return { ok: false, status: 400, message: 'files 不能为空' };
  if (raw.length > MAX_IMPORT_FILES) {
    return { ok: false, status: 400, message: `一次最多 ${MAX_IMPORT_FILES} 篇` };
  }
  const files: MarkdownFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, status: 400, message: 'files 里的每一项都得是对象' };
    }
    const file = item as Record<string, unknown>;
    if (typeof file.name !== 'string' || !file.name.trim()) {
      return { ok: false, status: 400, message: '每篇都要有 name' };
    }
    if (typeof file.text !== 'string') {
      return { ok: false, status: 400, message: '每篇都要有 text（Markdown 正文）' };
    }
    if (file.name.length > MAX_NAME_CHARS) return { ok: false, status: 400, message: 'name 过长' };
    if (file.text.length > MAX_IMPORT_CHARS) {
      return {
        ok: false,
        status: 413,
        message: `《${file.name}》超过 ${MAX_IMPORT_CHARS} 字符上限`,
      };
    }
    files.push({
      name: file.name,
      text: file.text,
      documentId: optionalId(file.documentId),
      parentDocumentId: optionalId(file.parentDocumentId),
    });
  }
  return { ok: true, files };
}

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : '';
  const identity = verifyMcpToken(token);
  if (!identity) {
    return fail(401, 'unauthorized', '令牌无效。请在连接页复制「阅读笔记导入」的地址与写入令牌。');
  }
  if (identity.scope !== 'write') {
    return fail(403, 'read_only', '这个令牌是只读的，推送笔记需要写入令牌。');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, 'invalid_json', '请求体不是合法 JSON');
  }

  const parsed = parseFiles(body.files);
  if (!parsed.ok) {
    return fail(parsed.status, 'invalid_files', parsed.message);
  }

  try {
    const documents = await importMarkdownForUser(identity.userId, {
      files: parsed.files,
      folderId: optionalId(body.folderId) ?? null,
      folderName: typeof body.folder === 'string' ? body.folder : null,
    });
    return Response.json({ ok: true, documents });
  } catch (error) {
    if (error instanceof ImportError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'too_large' ? 413 : 400;
      return fail(status, error.code, error.message);
    }
    if (error instanceof AuthorizationError) {
      return fail(403, 'forbidden', error.message);
    }
    throw error;
  }
}

export async function GET() {
  return Response.json(
    {
      name: 'Crafty 阅读笔记导入',
      transport: 'http',
      usage: 'POST /api/v1/import/markdown with Authorization: Bearer <write token>',
      body: {
        folder: '文件夹名，缺省 Imported Notes',
        folderId: '已有的文件夹 id（优先于 folder）',
        files: [{ name: '《书名》.md', text: '# markdown', documentId: '已有文档 id，给了就更新', parentDocumentId: '父文档 id，可选' }],
      },
      limits: { files: MAX_IMPORT_FILES, charsPerFile: MAX_IMPORT_CHARS },
    },
    { status: 200 },
  );
}
