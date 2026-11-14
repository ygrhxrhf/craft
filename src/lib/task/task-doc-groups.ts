import type { TaskItem } from '@/actions/task/task';
import { TASK_GROUP_LABELS } from './official-copy';
import { sortTasksForView, type DocumentSort, type TaskSort } from './task-view-settings';

/**
 * 任务按**来源文档**分组，逐字移植官方 `TaskViews-CxB6Qe1s.js` 的 `ke`／今天视图的 `$d`：
 *
 *   - 每个文档一组，组内任务按 `任务排序`（安排／截止日期）排；
 *   - 文档组按 `文档排序`（名称／更新日期／创建日期）排，官方 `$` 三个比较器**一律降序**取新；
 *   - 未归档文档（官方 `INBOX_DOCUMENT_ID`）钉在最前，不参与文档排序。
 *
 * 本地两处已声明差异：页面新建的任务没有文档（`documentId === null`），官方那枚收件箱文档在本地
 * 没有对应行 ⇒ `null` 直接当作未归档组，而不是把行丢掉（官方 `if (r == null) continue`）。
 * 组的展示标题取 `documentTitle`；文档行缺失时退回「无标题文档」。
 */

export type TaskSection = {
  key: string;
  title: string;
  /** 未完成数（完成与取消都不算）——与「即将进行」节头同一口径。 */
  undone: number;
  blocks: TaskItem[];
};

export type DocumentGroup = {
  /** 官方 `documentInfo.id`；无文档的一组用空串（它被钉在最前，从不参与比较）。 */
  id: string;
  documentId: string | null;
  title: string;
  created: string | null;
  modified: string | null;
  blocks: TaskItem[];
};

const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;

const timeOf = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

/** 官方 `w`：**降序**且空值排在后（`(t ?? MIN) - (e ?? MIN)`）。 */
function descending(left: number | null, right: number | null): number {
  return (right ?? MIN_SAFE_INTEGER) - (left ?? MIN_SAFE_INTEGER);
}

/** 官方 `F`：id 降序——与 `L`（升序）方向相反，别混用。 */
function idDesc(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

const idAsc = (a: { id: string }, b: { id: string }): number => a.id.localeCompare(b.id);

/** 官方 `$`：`title` / `modified` / `created` 三个文档比较器。 */
export function compareDocuments(a: DocumentGroup, b: DocumentGroup, sort: DocumentSort): number {
  const aCreated = timeOf(a.created);
  const bCreated = timeOf(b.created);
  const aModified = timeOf(a.modified);
  const bModified = timeOf(b.modified);
  if (sort === 'title') {
    return (
      a.title.localeCompare(b.title, undefined, { sensitivity: 'accent' }) || idAsc(a, b)
    );
  }
  if (sort === 'created') {
    return (
      descending(aCreated ?? aModified, bCreated ?? bModified) ||
      descending(aModified ?? aCreated, bModified ?? bCreated) ||
      idDesc(a, b)
    );
  }
  return (
    descending(aModified ?? aCreated, bModified ?? bCreated) ||
    descending(aCreated ?? aModified, bCreated ?? bCreated) ||
    idDesc(a, b)
  );
}

/**
 * `ke(tasks, documentSort, taskSort)`: groups the rows by source document, pins the inbox group
 * first, sorts the rest by the document comparator, and orders each group's rows by the task sort.
 */
export function documentGroups<T extends TaskItem>(
  tasks: readonly T[],
  documentSort: DocumentSort,
  taskSort: TaskSort,
): { sections: TaskSection[]; hasAny: boolean } {
  const groups = new Map<string | null, DocumentGroup>();

  for (const task of tasks) {
    const documentId = task.documentId ?? null;
    let group = groups.get(documentId);
    if (!group) {
      group = {
        id: documentId ?? '',
        documentId,
        title: documentId
          ? (task.documentTitle ?? '无标题文档')
          : TASK_GROUP_LABELS.inbox,
        created: task.documentCreatedAt ?? null,
        modified: task.documentUpdatedAt ?? null,
        blocks: [],
      };
      groups.set(documentId, group);
    }
    group.blocks.push(task);
  }

  const all = [...groups.values()];
  const inbox = all.find((group) => group.documentId === null) ?? null;
  const rest = all
    .filter((group) => group.documentId !== null)
    .sort((a, b) => compareDocuments(a, b, documentSort));
  const ordered = inbox ? [inbox, ...rest] : rest;

  const sections = ordered
    .map((group) => ({
      key: `doc:${group.documentId ?? 'inbox'}`,
      title: group.title,
      undone: group.blocks.filter((task) => !task.isCompleted && task.status !== 'cancelled')
        .length,
      blocks: sortTasksForView(group.blocks, taskSort),
    }))
    .filter((section) => section.blocks.length > 0);

  return { sections, hasAny: sections.length > 0 };
}
