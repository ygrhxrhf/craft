import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * G1674 —— 「所有文档的 MCP」的访问令牌。
 * 官方把整个空间当作一个 MCP 服务暴露给别人（界面上的「你的 MCP 连接 · 所有文档的 MCP」），
 * 客户端拿 URL + 令牌就能让外部 AI 工具读文档。本地不引新表：令牌是**自证的**——
 * `mcp_<base64url(userId)>.<scope>.<hmac>`，服务端用同一把密钥验回 userId 与档位，因此不需要
 * 落库、也不需要迁移。换密钥即全部失效，正好是"吊销全部令牌"的语义。
 *
 * 档位只有两档：`read` 读文档，`write` 还能把外部笔记推成文档（`/api/v1/import/markdown`，
 * xsxz 联动用）。档位签进 HMAC，所以拿读令牌手改成写令牌验不过。
 * 兼容旧格式 `mcp_<userId>.<hmac>`：那一版没有档位，一律按 `read` 认。
 */
export type McpScope = 'read' | 'write';

export interface McpIdentity {
  userId: string;
  scope: McpScope;
}

const SCOPE_SEGMENTS: McpScope[] = ['read', 'write'];

function secret(): string {
  return (
    process.env.MCP_SIGNING_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    'craft-mcp-signing-dev'
  );
}

function mac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function matches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
}

export function issueMcpToken(userId: string, scope: McpScope = 'read'): string {
  const id = Buffer.from(userId, 'utf8').toString('base64url');
  return `mcp_${id}.${scope}.${mac(`mcp|${scope}|${userId}`)}`;
}

export function verifyMcpToken(token: string | null | undefined): McpIdentity | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed.startsWith('mcp_')) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 2 && parts.length !== 3) return null;

  const userId = Buffer.from(parts[0].slice(4), 'base64url').toString('utf8');
  if (!userId) return null;

  // 旧格式：`mcp_<userId>.<hmac>`，签发时没有档位，只能按只读认。
  if (parts.length === 2) {
    return matches(parts[1], mac(`mcp|${userId}`)) ? { userId, scope: 'read' } : null;
  }

  const scope = parts[1] as McpScope;
  if (!SCOPE_SEGMENTS.includes(scope)) return null;
  return matches(parts[2], mac(`mcp|${scope}|${userId}`)) ? { userId, scope } : null;
}
