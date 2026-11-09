import { beforeEach, describe, expect, it, vi } from 'vitest';

/* A small table that filters the way the ORM does: a mutation restricted to
 * `{ id, userId }` simply matches zero rows when the caller is not the owner. */
const store = vi.hoisted(() => ({
  userId: 'user-1',
  rows: [] as Record<string, unknown>[],
  tasks: [] as Record<string, unknown>[],
}));

function matches(row: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, value]) => row[key] === value);
}

/* The ORM only accepts field proxies in lambdas (`r.id.in([...])`); object
 * shorthand supports `=` / IS NULL alone, so comparisons arrive here. */
function matchesLambda(row: Record<string, unknown>, predicate: (r: any) => boolean): boolean {
  const proxy = new Proxy({}, {
    get: (_target, field: string) => ({
      in: (values: unknown[]) => values.includes(row[field]),
      eq: (value: unknown) => row[field] === value,
      lt: (value: unknown) => String(row[field]) < String(value),
    }),
  });
  return Boolean(predicate(proxy));
}

const matchesFilter = (row: Record<string, unknown>, filter: Record<string, unknown> | ((r: any) => boolean)) =>
  typeof filter === 'function' ? matchesLambda(row, filter) : matches(row, filter);

vi.mock('@/lib/auth/auth', () => ({
  auth: async () => ({ user: { id: store.userId } }),
}));

vi.mock('@/prisma/db', () => ({
  getDb: async () => ({
    orm: {
      public: {
        Document: {
          first: async (filter: Record<string, unknown> = {}) =>
            store.rows.find((row) => matches(row, filter)) ?? null,
          where: (filter: Record<string, unknown> | ((r: any) => boolean)) => ({
            update: async (data: Record<string, unknown>) => {
              const hit = store.rows.filter((row) => matchesFilter(row, filter));
              hit.forEach((row) => Object.assign(row, data));
              return hit;
            },
            delete: async () => {
              const kept = store.rows.filter((row) => !matchesFilter(row, filter));
              const removed = store.rows.length - kept.length;
              store.rows = kept;
              return { removed };
            },
            select: (...cols: string[]) => ({
              all: async () => store.rows
                .filter((row) => matchesFilter(row, filter))
                .map((row) => Object.fromEntries(cols.map((c) => [c, row[c]]))),
            }),
            deleteAndCount: async () => {
              const kept = store.rows.filter((row) => !matchesFilter(row, filter));
              const removed = store.rows.length - kept.length;
              store.rows = kept;
              return { removed };
            },
          }),
        },
        Task: {
          where: (filter: Record<string, unknown> | ((r: any) => boolean)) => ({
            select: (...cols: string[]) => ({
              all: async () => store.tasks
                .filter((row) => matchesFilter(row, filter))
                .map((row) => Object.fromEntries(cols.map((c) => [c, row[c]]))),
            }),
            deleteAndCount: async () => {
              const kept = store.tasks.filter((row) => !matchesFilter(row, filter));
              const removed = store.tasks.length - kept.length;
              store.tasks = kept;
              return { removed };
            },
          }),
        },
      },
    },
  }),
}));

const { deleteDocument, emptyTrash, permanentDeleteDocument, restoreDocument } = await import('@/actions/document/delete');
const { AuthorizationError } = await import('@/lib/authz/guard');

const freshRows = () => [
  { id: 'mine', userId: 'user-1', title: 'Mine', isDeleted: false, deletedAt: null },
  { id: 'theirs', userId: 'user-2', title: 'Theirs', isDeleted: false, deletedAt: null },
  { id: 'mine-trashed', userId: 'user-1', title: 'Mine trashed', isDeleted: true, deletedAt: '2026-10-01T00:00:00.000Z' },
];

/* G1001：官方永久删除文档时，文档里的任务行一并消失（实测 tasks 14→9）。 */
const freshTasks = () => [
  { id: 'task-of-mine', userId: 'user-1', documentId: 'mine', title: 'mine 里的任务' },
  { id: 'task-of-mine-trashed', userId: 'user-1', documentId: 'mine-trashed', title: '回收站文档里的任务' },
  { id: 'task-of-theirs', userId: 'user-2', documentId: 'theirs', title: 'theirs 里的任务' },
  { id: 'inbox-task', userId: 'user-1', documentId: null, title: '收件箱任务' },
];

beforeEach(() => {
  store.userId = 'user-1';
  store.rows = freshRows();
  store.tasks = freshTasks();
});

describe('deleteDocument', () => {
  it('moves your own document to the trash', async () => {
    await deleteDocument('mine');
    expect(store.rows[0].isDeleted).toBe(true);
  });

  it('refuses a document that belongs to someone else and leaves it untouched', async () => {
    await expect(deleteDocument('theirs')).rejects.toBeInstanceOf(AuthorizationError);
    expect(store.rows[1].isDeleted).toBe(false);
  });

  it('refuses a document that does not exist', async () => {
    await expect(deleteDocument('ghost')).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('restoreDocument', () => {
  it('refuses to restore someone else’s document', async () => {
    store.rows[1].isDeleted = true;
    await expect(restoreDocument('theirs')).rejects.toBeInstanceOf(AuthorizationError);
    expect(store.rows[1].isDeleted).toBe(true);
  });

  it('restores your own document', async () => {
    store.rows[0].isDeleted = true;
    await restoreDocument('mine');
    expect(store.rows[0].isDeleted).toBe(false);
  });
});

describe('permanentDeleteDocument', () => {
  it('refuses to delete someone else’s document and keeps the row', async () => {
    await expect(permanentDeleteDocument('theirs')).rejects.toBeInstanceOf(AuthorizationError);
    expect(store.rows.map((row) => row.id)).toEqual(['mine', 'theirs', 'mine-trashed']);
    expect(store.tasks).toHaveLength(4);
  });

  it('deletes your own document', async () => {
    await permanentDeleteDocument('mine');
    expect(store.rows.map((row) => row.id)).toEqual(['theirs', 'mine-trashed']);
  });

  it('takes the tasks that lived in the document with it', async () => {
    await permanentDeleteDocument('mine');
    expect(store.tasks.map((row) => row.id)).toEqual([
      'task-of-mine-trashed',
      'task-of-theirs',
      'inbox-task',
    ]);
  });

  it('leaves trashed documents alone — only the named document goes', async () => {
    await permanentDeleteDocument('mine');
    expect(store.rows.some((row) => row.id === 'mine-trashed')).toBe(true);
    expect(store.tasks.some((row) => row.id === 'task-of-mine-trashed')).toBe(true);
  });
});

describe('emptyTrash', () => {
  it('deletes every trashed document of the caller and nothing else', async () => {
    const removed = await emptyTrash();
    expect(removed).toBe(1);
    expect(store.rows.map((row) => row.id)).toEqual(['mine', 'theirs']);
  });

  it('takes the tasks of every emptied document with them', async () => {
    await emptyTrash();
    expect(store.tasks.map((row) => row.id)).toEqual([
      'task-of-mine',
      'task-of-theirs',
      'inbox-task',
    ]);
  });

  it('reports zero and touches nothing when the trash is empty', async () => {
    store.rows = store.rows.filter((row) => !row.isDeleted);
    await expect(emptyTrash()).resolves.toBe(0);
    expect(store.tasks).toHaveLength(4);
  });
});
