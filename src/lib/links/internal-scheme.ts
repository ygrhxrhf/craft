/**
 * G121：内部 URL scheme `craft://` 的本地可寻址层。
 *
 * 官方形态：`doc/{id}`、`folder/{id}`、三个保留字 `folder/{unsorted,starred,all-docs}`、
 * `tasks/{inbox,today,upcoming,all}`、`tags`、`calendar`、`credit`。本地没有计费页，
 * `credit` 回 `null`（不假装能跳）；文件夹目前没有独立路由，落到所有文档屏。
 */

export type InternalTarget =
  | { kind: 'doc'; id: string }
  | { kind: 'folder'; id: string }
  | { kind: 'folder-reserved'; name: 'unsorted' | 'starred' | 'all-docs' }
  | { kind: 'tasks'; view: 'inbox' | 'today' | 'upcoming' | 'all' }
  | { kind: 'tags' }
  | { kind: 'calendar' }
  | { kind: 'credit' };

const TASK_VIEWS = ['inbox', 'today', 'upcoming', 'all'] as const;

export function parseCraftScheme(raw: string): InternalTarget | null {
  const match = /^craft:\/\/([^/?#]+)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/i.exec(raw.trim());
  if (!match) return null;
  const head = match[1].toLowerCase();
  const tail = match[2] ?? null;
  if (head === 'doc' && tail) return { kind: 'doc', id: tail };
  if (head === 'folder') {
    if (tail === 'unsorted' || tail === 'starred' || tail === 'all-docs') {
      return { kind: 'folder-reserved', name: tail };
    }
    return tail ? { kind: 'folder', id: tail } : null;
  }
  if (head === 'tasks') {
    const view = tail && (TASK_VIEWS as readonly string[]).includes(tail) ? tail : 'inbox';
    return { kind: 'tasks', view: view as (typeof TASK_VIEWS)[number] };
  }
  if (head === 'tags') return { kind: 'tags' };
  if (head === 'calendar') return { kind: 'calendar' };
  if (head === 'credit') return { kind: 'credit' };
  return null;
}

/** scheme → 本地路由；没有落点的目标回 `null`（调用方不该吞掉这次点击）。 */
export function internalRoute(target: InternalTarget): string | null {
  switch (target.kind) {
    case 'doc':
      return `/documents/${target.id}`;
    case 'folder':
      return '/documents';
    case 'folder-reserved':
      return target.name === 'starred' ? '/favorites' : '/documents';
    case 'tasks':
      return target.view === 'inbox' ? '/tasks' : `/tasks/${target.view}`;
    case 'tags':
      return '/tags';
    case 'calendar':
      return '/calendar';
    case 'credit':
      return null;
  }
}

export function craftSchemeRoute(raw: string): string | null {
  const target = parseCraftScheme(raw);
  return target ? internalRoute(target) : null;
}
