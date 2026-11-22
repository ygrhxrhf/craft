import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * G1674 —— 「所有文档的 MCP」的访问令牌。
 *
 * 官方把整个空间当作一个 MCP 服务暴露给别人（界面上的「你的 MCP 连接 · 所有文档的 MCP」），
 * 客户端拿 URL + 令牌就能让外部 AI 工具读文档。本地不引新表：令牌是**自证的**——
 * `mcp_<base64url(userId)>.<hmac>`，服务端用同一把密钥验回 userId，因此不需要落库、也不需要迁移。
 * 换密钥即全部失效，正好是"吊销全部令牌"的语义。
 */
function secret(): string {
  return (
    process.env.MCP_SIGNING_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    'craft-mcp-signing-dev'
  );
}

function sign(userId: string): string {
  return createHmac('sha256', secret()).update(`mcp|${userId}`).digest('base64url');
}

export function issueMcpToken(userId: string): string {
  return `mcp_${Buffer.from(userId, 'utf8').toString('base64url')}.${sign(userId)}`;
}

export function verifyMcpToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const match = /^mcp_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token.trim());
  if (!match) return null;
  const userId = Buffer.from(match[1], 'base64url').toString('utf8');
  const expected = sign(userId);
  const provided = match[2];
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'))) return null;
  return userId;
}
