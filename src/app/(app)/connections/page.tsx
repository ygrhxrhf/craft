import { listConnections } from '@/actions/connection/connection';
import { ConnectionsPanel } from './ConnectionsPanel';

export default async function ConnectionsPage() {
  const connections = await listConnections();
  return <ConnectionsPanel initial={connections} />;
}
