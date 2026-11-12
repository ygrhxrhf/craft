// src/components/document/TrashList.test.ts
// R-18：回收站列表在 store 变化后要重取服务端权威行，再盖本地 pending overlay——
// 只把旧 prop 行再 overlay 一遍会让 ack+pull 后恢复的文档回流、新删的文档丢真实标题。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeletedDocuments } from '@/actions/document/get';
import { readPendingRows } from '@/components/sync/local-records';

vi.mock('@/actions/document/get', () => ({ getDeletedDocuments: vi.fn() }));
vi.mock('@/actions/document/delete', () => ({ permanentDeleteDocument: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('@/components/sync/local-records', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/sync/local-records')>();
  return { ...actual, readPendingRows: vi.fn(async () => new Map()) };
});
// 卡片右键菜单不在本测试范围内；它会牵进 next-auth 根导出（`next/server` 在 vitest 下解析不到）。
vi.mock('./DocumentCardMenu', () => ({ DocumentCardMenu: () => null }));

import { overlayTrashRows, loadTrashRows } from './TrashList';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRASH_DISCLAIMER, TRASH_EMPTY, TRASH_TITLE } from '@/lib/browse/trash-copy';
import { EMPTY_TRASH_ACTION, EMPTY_TRASH_CONFIRM } from '@/lib/browse/trash-subcopy';

const serverRow = (id: string, title: string, deletedAt: string) =>
  ({ id, title, icon: null, deletedAt, updatedAt: '2026-09-28T08:00:00.000Z' });

describe('R-18 回收站：重取新鲜行 + pending overlay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loadTrashRows：视图由重取的服务端行驱动（恢复的不回流、新删的带真实标题）', async () => {
    (getDeletedDocuments as any).mockResolvedValue([
      serverRow('b', '恢复后的真标题', '2026-09-28T12:00:00.000Z'),
    ]);
    (readPendingRows as any).mockResolvedValue(new Map());

    const rows = await loadTrashRows();

    expect(getDeletedDocuments).toHaveBeenCalled(); // 不是拿旧 prop 行再 overlay
    expect(rows).toEqual([serverRow('b', '恢复后的真标题', '2026-09-28T12:00:00.000Z')]);
  });

  it('loadTrashRows：pending overlay 盖在新鲜行上（恢复意图不回流、刚移入未推送的行出现）', async () => {
    (getDeletedDocuments as any).mockResolvedValue([
      serverRow('x', '服务端还标着删除', '2026-09-28T09:00:00.000Z'),
    ]);
    (readPendingRows as any).mockResolvedValue(new Map([
      // 本地已恢复（未 ack）→ deletedAt:null 让行从视图消失
      ['x', { op: 'upsert' as const, data: { isDeleted: false, deletedAt: null }, syncTs: 't' }],
      // 本地刚移入回收站（未推送）→ 行出现且带真实标题
      ['n', {
        op: 'upsert' as const,
        data: { title: '刚移入的文档', isDeleted: true, deletedAt: '2026-09-28T12:30:00.000Z' },
        syncTs: '2026-09-28T12:30:00.000Z',
      }],
    ]));

    const rows = await loadTrashRows();

    expect(rows.map((r) => r.id)).toEqual(['n']);
    expect(rows[0].title).toBe('刚移入的文档');
    // 删除 patch 不带 updatedAt，用同步时钟补——否则卡片副行只剩「最近删除 •」
    expect(rows[0].updatedAt).toBe('2026-09-28T12:30:00.000Z');
  });

  it('overlayTrashRows：delete 墓碑丢行；非删除行按 getDeletedDocuments 同条件过滤', () => {
    const pending = new Map([
      ['gone', { op: 'delete' as const, syncTs: 't' }],
    ]);
    const out = overlayTrashRows(
      [
        serverRow('gone', '已物理删除', '2026-09-28T09:00:00.000Z'),
        { ...serverRow('restored', '恢复', '2026-09-28T09:00:00.000Z'), deletedAt: null },
        serverRow('del', '删除中', '2026-09-28T10:00:00.000Z'),
      ],
      pending,
    );
    expect(out.map((r) => r.id)).toEqual(['del']);
  });
});

describe('the trash copy is the official text, and the disclaimer is conditional', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./TrashList.tsx', import.meta.url)),
    'utf8',
  );

  it('uses the official empty-state sentence rather than a local one', () => {
    expect(TRASH_EMPTY).toBe('你删除的文档将显示在此处');
    expect(source).toContain('{TRASH_EMPTY}');
    expect(source).not.toContain('回收站是空的');
  });

  it('shows the 30-day line only on the populated branch', () => {
    expect(TRASH_DISCLAIMER).toBe('文档将保留 30 天。之后，文档将被永久删除。');
    // The empty-state early return happens above the disclaimer, so the line cannot render there.
    const emptyReturn = source.indexOf('rows.length === 0');
    const disclaimer = source.indexOf('{TRASH_DISCLAIMER}');
    expect(emptyReturn).toBeGreaterThanOrEqual(0);
    expect(disclaimer).toBeGreaterThan(emptyReturn);
  });
});

/**
 * G20：官方「最近删除」是卡片网格，和浏览列表同一张卡。删除的页没有路由（G991），所以卡片是
 * 静态磁贴：位置行写「最近删除」，预览是删除时落库的纯文本快照（G997），悬停动作是「恢复」。
 */
describe('G20 回收站是卡片网格', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./TrashList.tsx', import.meta.url)),
    'utf8',
  );

  it('renders the shared card inside the browse grid, not a hand-rolled row list', () => {
    expect(source).toMatch(/import\s*\{[^}]*BrowseGrid[^}]*\}\s*from\s*'@\/components\/app\/BrowseGrid'/);
    expect(source).toMatch(/import\s*\{[^}]*DocumentCard[^}]*\}\s*from\s*'\.\/DocumentCard'/);
    expect(source).toContain('<BrowseGrid>');
    expect(source).toContain('<DocumentCard');
    // 旧行布局的痕迹不该回来：行高、删除日期列、行列表测试钩子。
    expect(source).not.toContain('删除于 {deletedDate}');
    expect(source).not.toContain('data-testid="trash-rows"');
    expect(source).not.toMatch(/className="flex h-10 items-center gap-3 rounded-md px-2/);
  });

  it('writes the 最近删除 location on the card and leaves the page as a static tile', () => {
    expect(TRASH_TITLE).toBe('最近删除');
    expect(source).toContain('breadcrumb: TRASH_TITLE');
    // G991：删掉的页没有路由 ⇒ href 为 null，卡片不导航也不开卡片菜单。
    expect(source).toContain('href={null}');
  });

  it('offers 恢复 on hover instead of 打开, and drops it in selection mode', () => {
    expect(source).toContain('onRestore={selecting');
  });

  it('drops row virtualization — a card grid has no fixed row height', () => {
    expect(source).not.toContain('visibleRowWindow');
    expect(source).not.toContain('TRASH_VIRTUAL_THRESHOLD');
    expect(source).not.toContain('scheduleScrollUpdate');
  });
});

describe('G997 回收站卡片预览带已存快照的内容摘要', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./TrashList.tsx', import.meta.url)),
    'utf8',
  );

  it('renders the summary from the stored plainText through the shared fallback chain', () => {
    // 官方卡片预览＝服务端最后落库态；本地回收站同一条回退链（正文预览/空文档/「/」）。
    expect(source).toContain('rowSubtitle({ plainText: doc.plainText })');
    expect(source).toMatch(/import\s*\{[^}]*rowSubtitle[^}]*\}\s*from\s*'@\/lib\/browse\/row-subtitle'/);
    // 没有快照的 pending 行不渲染这一层，避免把「空文档」当成本地新建删除的真相。
    expect(source).toContain("typeof doc.plainText === 'string'");
  });

  it('never re-renders the deleted document body inside the trash', () => {
    expect(source).not.toContain('doc.content');
    expect(source).not.toContain('serializeDocument');
  });
});

describe('G233 清空最近删除', () => {  const source = readFileSync(
    fileURLToPath(new URL('./TrashList.tsx', import.meta.url)),
    'utf8',
  );

  it('offers the official command behind its own confirmation', () => {
    expect(EMPTY_TRASH_ACTION).toBe('清空最近删除');
    expect(EMPTY_TRASH_CONFIRM).toBe('你确定要永久删除这些项目吗？');
    // 菜单项与确认框都用官方常量，而不是各自写一份字面量
    expect(source).toContain('{EMPTY_TRASH_ACTION}');
    expect(source).toContain('{EMPTY_TRASH_CONFIRM}');
    expect(source).not.toContain('清空回收站');
  });

  it('routes the action through the server action rather than a local delete', () => {
    expect(source).toContain('emptyTrash');
    expect(source).toMatch(/import\s*\{[^}]*emptyTrash[^}]*\}\s*from\s*'@\/actions\/document\/delete'/);
  });
});
