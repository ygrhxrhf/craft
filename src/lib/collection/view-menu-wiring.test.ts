import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DELETE_VIEW, DELETE_VIEW_KEY } from './view-menu-copy';

const menu = readFileSync(
  new URL('../../components/collection/ViewActionsMenu.tsx', import.meta.url),
  'utf8',
);
const header = readFileSync(
  new URL('../../app/(app)/collections/[id]/CollectionHeader.tsx', import.meta.url),
  'utf8',
);

/**
 * G1538 的接线闸：官方 key 只有一处声明（`view-menu-copy.ts`），组件消费常量而不是再抄一遍；
 * 写入必须走离线内核，不许回退到被取代的两条 server action。
 */
describe('the collection view delete entry is wired to the official key (G1538)', () => {
  it('renders the menu from the ledger constant, not a second literal', () => {
    expect(menu).toContain('{DELETE_VIEW}');
    expect(menu).not.toContain('>删除视图<');
    expect(menu).toContain("from '@/lib/collection/view-menu-copy'");
    expect(DELETE_VIEW).toBe('删除视图');
    expect(DELETE_VIEW_KEY).toBe('collections.delete.view');
  });

  it('is actually mounted on the collection header', () => {
    expect(header).toContain('<ViewActionsMenu');
    expect(header).toContain("from '@/components/collection/ViewActionsMenu'");
  });

  it('writes through the offline kernel, not the superseded server actions', () => {
    expect(menu).toContain("table: 'collection_view'");
    expect(menu).toContain('patch: { deletedAt: now, isActive: false }');
    expect(menu).toContain('await manager.flushNow()');
    expect(menu).not.toContain('deleteView(');
    expect(menu).not.toContain('setActiveView(');
  });

  it('keeps the last view undeletable so the collection page cannot lose its view', () => {
    expect(menu).toContain('const onlyView = views.length <= 1');
    expect(menu).toContain('disabled={onlyView}');
  });

  it('names the view being deleted in the confirmation', () => {
    expect(menu).toContain('message: `你确定要删除“${activeView.name}”吗？`');
  });
});
