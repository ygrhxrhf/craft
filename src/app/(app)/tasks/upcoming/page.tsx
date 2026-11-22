import { getDocumentsWithTasks } from '@/actions/task/task';
import { TasksView } from '../TasksView';

/** The label 「即将进行」 is official (`tasks.upcoming`); this path is a local choice. */
export default async function TasksUpcomingPage() {
  return <TasksView group="upcoming" docsWithTasksServer={await getDocumentsWithTasks()} />;
}
