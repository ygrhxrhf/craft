import { listConnections } from '@/actions/connection/connection';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { ConnectionsPanel } from './ConnectionsPanel';

export default async function ConnectionsPage() {
  const connections = await listConnections();
  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="连接" />
      <ConnectionsPanel initial={connections} />
    </div>
  );
}
