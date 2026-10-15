'use client';

import { TasksView } from './TasksView';

/** `/tasks` is the inbox group. The official ref is `/tasks/inbox`; this build keeps the existing path.
 *  It is also the screen's entry route, so a stored 「设置为默认视图」 preference redirects from here. */
export default function TasksPage() {
  return <TasksView group="inbox" entryRoute />;
}
