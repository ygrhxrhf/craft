import { getDocumentsWithTasks } from '@/actions/task/task';
import { TasksView } from '../TasksView';

/** `/tasks/all` is the observed official path for 「所有任务」. */
export default async function TasksAllPage() {
  return <TasksView group="all" docsWithTasksServer={await getDocumentsWithTasks()} />;
}
