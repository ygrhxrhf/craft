import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const tableView = readFileSync(
  new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url),
  'utf8',
);
const syncTables = readFileSync(new URL('../sync/tables.ts', import.meta.url), 'utf8');

describe('the collection view config is wired to the offline kernel', () => {
  it('writes the view config through collection_view and refreshes after flushing', () => {
    expect(tableView).toContain('getSyncManager');
    expect(tableView).toContain("table: 'collection_view'");
    expect(tableView).toContain('patch: { config: key }');
    // G286/G81: the payload carries the calculation-row flag and the per-view field lists.
    expect(tableView).toContain('const key = JSON.stringify(');
    expect(tableView).toContain('withShowCalculationRow(');
    expect(tableView).toContain('hiddenProperties: [...fields.hidden]');
    expect(tableView).toContain('customPropertyOrder: [...fields.order]');
    expect(tableView).toContain('await manager.flushNow()');
    expect(tableView).toContain('router.refresh()');
  });

  it('does not fall back to the superseded view server action', () => {
    expect(tableView).not.toContain('updateView(');
    expect(tableView).not.toContain('@/actions/collection/views');
  });

  it('persists config changes from filtering, sorting, and grouping callbacks', () => {
    expect(tableView).toContain('void persistConfig({ filters: next, sorts, groupBy })');
    expect(tableView).toContain('void persistConfig({ filters, sorts: next, groupBy })');
    expect(tableView).toContain('void persistConfig({ filters, sorts, groupBy: next })');
  });

  it('keeps config in the collection_view sync whitelist', () => {
    expect(syncTables).toMatch(
      /table: 'collection_view',[\s\S]*?cols: \[[^\]]*'config'/,
    );
  });

  it('resyncs filters, sorts, and groupBy from the view config without a sync effect', () => {
    // 同步必须发生在渲染期的条件分支里（换视图、或同视图且没有未回显的本地写入），
    // 而不是 effect 里同步 setState：后者会被 react-hooks/set-state-in-effect 拦下，且会级联渲染。
    expect(tableView).toContain('const configKey = JSON.stringify((view as any).config ?? null)');
    expect(tableView).toContain('const viewChanged = syncedView.id !== view.id');
    expect(tableView).toContain('const staleEcho = writtenConfigKeys.includes(configKey) && configKey !== latestWrittenKey');
    expect(tableView).toContain('if (viewChanged || (configChanged && !staleEcho))');
    expect(tableView).toContain('setFilters(config.filters ?? [])');
    expect(tableView).toContain('setSorts(config.sorts ?? [])');
    expect(tableView).toContain('setGroupBy(config.groupBy ?? null)');
    // 这个文件本来一个 effect 都没有；第 275 批为"卸载时清掉两条挂起的滚动任务"加了一枚
    // 只读清理 effect（官方 G497 的 clearTimeout + cancelAnimationFrame 双清理）。守卫因此
    // 从"禁止 useEffect"改成"effect 里不得回灌 config 状态"——上面那几行渲染期同步才是本守卫保护的实质。
    expect(tableView.match(/\buseEffect\s*\(/g)).toHaveLength(1);
    const effectStart = tableView.indexOf('useEffect(');
    const effectBody = tableView.slice(effectStart, effectStart + 320);
    expect(effectBody).toContain('cancelScrollUpdate.current?.()');
    expect(effectBody).not.toMatch(/setFilters|setSorts|setGroupBy|persistConfig\(/);
  });

  it('reorders rows from the whole collection, never from the filtered subset', () => {
    expect(tableView).toContain('planReorder(rows, sourceId, targetId)');
    expect(tableView).toContain('const rows: OrderedRow[] = collection.items.map');
    // 旧写法拿 processedItems（筛选后的可见行）去 renumber ⇒ 可见行被压成 0..k-1，与隐藏行撞号
    expect(tableView).not.toMatch(/const rows: OrderedRow\[\] = processedItems\.map/);
  });
});
