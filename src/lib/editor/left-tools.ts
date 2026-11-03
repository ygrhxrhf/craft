/**
 * G100 —— 左侧工具栏的四个常驻 tab：附件 / 查找和替换 / 目录 / 任务（官方 `LeftSidebarTab`）。
 * 标签逐字取语言包（`attachments` / `find.and.replace` / `table.of.contents` / `tasks`）。
 *
 * 这一层只做"从文档里收集什么"的纯逻辑；面板怎么排是组件的事，便于单测。
 */

export type LeftToolTabId = 'attachments' | 'findReplace' | 'toc' | 'tasks';

export const LEFT_TOOL_TABS: readonly { id: LeftToolTabId; label: string; key: string }[] = [
  { id: 'attachments', label: '附件', key: 'attachments' },
  { id: 'findReplace', label: '查找和替换', key: 'find.and.replace' },
  { id: 'toc', label: '目录', key: 'table.of.contents' },
  { id: 'tasks', label: '任务', key: 'tasks' },
] as const;

interface NodeLike {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent?: string;
  descendants?: (visit: (node: NodeLike, pos: number) => void) => void;
}

export interface AttachmentEntry {
  pos: number;
  kind: 'attachment' | 'image';
  name: string;
}

export interface TaskEntry {
  pos: number;
  text: string;
  checked: boolean;
}

function walk(doc: NodeLike): Array<{ node: NodeLike; pos: number }> {
  const out: Array<{ node: NodeLike; pos: number }> = [];
  doc.descendants?.((node, pos) => {
    out.push({ node, pos });
  });
  return out;
}

/** 文档里的附件与图片块（点击可定位）；名字缺失时给一枚本地兜底名。 */
export function collectAttachments(doc: NodeLike | null | undefined): AttachmentEntry[] {
  if (!doc) return [];
  const entries: AttachmentEntry[] = [];
  for (const { node, pos } of walk(doc)) {
    const name = node.type.name;
    if (name === 'attachment') {
      entries.push({ pos, kind: 'attachment', name: String(node.attrs?.name ?? '附件') });
    } else if (name === 'imageBlock') {
      entries.push({ pos, kind: 'image', name: String(node.attrs?.alt ?? '图片') });
    }
  }
  return entries;
}

/** 文档里的任务行（含勾选态），按出现顺序。 */
export function collectTasks(doc: NodeLike | null | undefined): TaskEntry[] {
  if (!doc) return [];
  const entries: TaskEntry[] = [];
  for (const { node, pos } of walk(doc)) {
    if (node.type.name !== 'taskItem') continue;
    entries.push({
      pos,
      text: String(node.textContent ?? '').trim() || '未命名任务',
      checked: node.attrs?.checked === true,
    });
  }
  return entries;
}
