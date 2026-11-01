/**
 * G122 —— 连接（Imagine 接入中心）的**三维实体**（`assistant.md` §十）。
 *
 * 官方那三维：
 *   - 权限 `read-only | write-only | read-write`（落库形态是 `details.tools={type:"preset",presets:[…]}`）；
 *   - 保护 `public | key | password`；
 *   - 作用域 `全部文档 | 选定文档 | 每日笔记和任务`。
 *
 * 另两条硬规则：**密钥只显示一次**（创建响应里带，之后只回 `hasToken`）、**硬上限 10 个 API**。
 * 本地 `Connection` 只有 `kind/name/endpoint/token` ⇒ 三轴与上限都缺。本模块给出三轴的枚举、
 * 上限常量与"密钥只显示一次"的形状，上限判据接进真实创建路径。
 */

export type ConnectionPermission = 'read-only' | 'write-only' | 'read-write';
export type ConnectionProtection = 'public' | 'key' | 'password';
export type ConnectionScope = 'all-documents' | 'selected-documents' | 'daily-notes-and-tasks';

export const CONNECTION_PERMISSIONS: readonly ConnectionPermission[] = ['read-only', 'write-only', 'read-write'];
export const CONNECTION_PROTECTIONS: readonly ConnectionProtection[] = ['public', 'key', 'password'];
export const CONNECTION_SCOPES: readonly ConnectionScope[] = [
  'all-documents',
  'selected-documents',
  'daily-notes-and-tasks',
];

/** 硬上限：最多 10 个 API 连接（`assistant.md` §十）。 */
export const MAX_CONNECTIONS = 10;

/** 官方那三维的落库形态：权限写成 `details.tools` 的 preset 列表。 */
export interface ConnectionDetails {
  tools: { type: 'preset'; presets: ConnectionPermission[] };
  protection: ConnectionProtection;
  scope: ConnectionScope;
}

export function connectionDetails(input: {
  permission: ConnectionPermission;
  protection: ConnectionProtection;
  scope: ConnectionScope;
}): ConnectionDetails {
  return {
    tools: { type: 'preset', presets: [input.permission] },
    protection: input.protection,
    scope: input.scope,
  };
}

/** 上限判据：已有 10 个时不许再建（`kind === 'api'` 才计入——MCP 连接是另一族）。 */
export function canCreateConnection(existing: { kind: string }[], kind: string): boolean {
  if (kind !== 'api') return true;
  return existing.filter((row) => row.kind === 'api').length < MAX_CONNECTIONS;
}

/** 密钥只显示一次：创建响应带明文，之后任何读取只回 `hasToken`。 */
export function connectionForRead(row: { token?: string | null }): { hasToken: boolean } {
  return { hasToken: typeof row.token === 'string' && row.token.length > 0 };
}
