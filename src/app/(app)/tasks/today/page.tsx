import { TasksView } from '../TasksView';

/** The label 「今天」 is official (`tasks.today`); this path is a local choice. */
export default function TasksTodayPage() {
  return <TasksView group="today" />;
}
