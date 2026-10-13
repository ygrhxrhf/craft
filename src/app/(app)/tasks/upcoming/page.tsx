import { TasksView } from '../TasksView';

/** The label 「即将进行」 is official (`tasks.upcoming`); this path is a local choice. */
export default function TasksUpcomingPage() {
  return <TasksView group="upcoming" />;
}
