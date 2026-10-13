'use client';

import { TasksView } from './TasksView';

/** `/tasks` is the inbox group. The official ref is `/tasks/inbox`; this build keeps the existing path. */
export default function TasksPage() {
  return <TasksView group="inbox" />;
}
