import { auth } from '@/lib/auth/auth';
import { listConnections } from '@/actions/connection/connection';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { issueMcpToken } from '@/lib/mcp/token';
import { ConnectionsPanel } from './ConnectionsPanel';

export default async function ConnectionsPage() {
  const connections = await listConnections();
  // G1674：官方这一屏第一段第一张卡就是「所有文档的 MCP」——把本空间当成 MCP 服务暴露出去。
  // 令牌自证（见 `lib/mcp/token`），不落库；换密钥即全部失效。
  const session = await auth();
  const mcp = session?.user?.id ? { url: '/api/mcp', token: issueMcpToken(session.user.id) } : null;
  // xsxz 联动：同一套自证令牌的写入档，推读书笔记用（`POST /api/v1/import/markdown`）。
  const notes = session?.user?.id
    ? { url: '/api/v1/import/markdown', token: issueMcpToken(session.user.id, 'write') }
    : null;
  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="连接" />
      <ConnectionsPanel initial={connections} mcp={mcp} notes={notes} />
    </div>
  );
}
