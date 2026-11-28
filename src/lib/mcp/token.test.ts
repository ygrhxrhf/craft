import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';

import { issueMcpToken, verifyMcpToken } from './token';

const SECRET = 'token-test-secret';

function legacyToken(userId: string): string {
  const id = Buffer.from(userId, 'utf8').toString('base64url');
  const mac = createHmac('sha256', SECRET).update(`mcp|${userId}`).digest('base64url');
  return `mcp_${id}.${mac}`;
}

describe('MCP 令牌档位', () => {
  beforeEach(() => {
    process.env.MCP_SIGNING_SECRET = SECRET;
  });

  it('读令牌验回 read', () => {
    expect(verifyMcpToken(issueMcpToken('u1'))).toEqual({ userId: 'u1', scope: 'read' });
  });

  it('写令牌验回 write', () => {
    expect(verifyMcpToken(issueMcpToken('u1', 'write'))).toEqual({ userId: 'u1', scope: 'write' });
  });

  it('旧格式没有档位，只按只读认', () => {
    expect(verifyMcpToken(legacyToken('u1'))).toEqual({ userId: 'u1', scope: 'read' });
  });

  it('把读令牌的档位改成 write 验不过（档位签进了 HMAC）', () => {
    const parts = issueMcpToken('u1').split('.');
    expect(verifyMcpToken(`${parts[0]}.write.${parts[2]}`)).toBeNull();
  });

  it('换密钥后旧令牌全部失效', () => {
    const token = issueMcpToken('u1', 'write');
    process.env.MCP_SIGNING_SECRET = 'rotated';
    expect(verifyMcpToken(token)).toBeNull();
  });

  it('空值、乱串、段数不对一律 null', () => {
    expect(verifyMcpToken('')).toBeNull();
    expect(verifyMcpToken(undefined)).toBeNull();
    expect(verifyMcpToken('mcp_')).toBeNull();
    expect(verifyMcpToken('mcp_dTE.read')).toBeNull();
    expect(verifyMcpToken('mcp_dTE.admin.abc')).toBeNull();
    expect(verifyMcpToken('bearer mcp_dTE.read.abc')).toBeNull();
  });
});
