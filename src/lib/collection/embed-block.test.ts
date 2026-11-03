import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  COLLECTION_EMBED_LABELS,
  COLLECTION_EMBED_VIEWS,
  normalizeCollectionEmbedView,
} from './embed-block';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/** G214：三条「插入集合」建的是同一个集合对象，只在初始视图上分档。 */
describe('the collection embed block (G214)', () => {
  it('names the three initial views', () => {
    expect([...COLLECTION_EMBED_VIEWS]).toEqual(['table', 'gallery', 'kanban']);
    expect(COLLECTION_EMBED_LABELS).toEqual({ table: '表格', gallery: '画廊', kanban: '看板' });
  });

  it('falls back to the table view for anything off the roster', () => {
    expect(normalizeCollectionEmbedView('kanban')).toBe('kanban');
    expect(normalizeCollectionEmbedView('calendar')).toBe('table');
    expect(normalizeCollectionEmbedView(null)).toBe('table');
  });

  it('offers the three slash inserts and creates the collection first', () => {
    const slash = read('../../components/editor/slash-menu/slash-commands.ts');
    for (const name of ['插入表格集合', '插入画廊集合', '插入看板集合']) {
      expect(slash, name).toContain(`name: '${name}'`);
    }
    expect(slash).toContain('createCollection({ name, viewType: view })');
    expect(slash).toContain('setCollectionBlock({ collectionId: created.id, title: created.name, view })');
  });

  it('enables the three insert-panel rows under 合集', () => {
    const panel = read('../../components/editor/tabs/InsertTab.tsx');
    expect(panel).toContain("{ label: '表格', command: '插入表格集合' }");
    expect(panel).toContain("{ label: '图库', command: '插入画廊集合' }");
    expect(panel).toContain("{ label: 'Kanban', command: '插入看板集合' }");
  });

  it('is registered by the editor and exported by the codec', () => {
    expect(read('../../components/editor/Editor.tsx')).toContain('CollectionBlock,');
    const codec = read('../document-codec/index.ts');
    expect(codec).toContain("case 'collectionBlock':");
    expect(codec).toContain('/collections/${node.attrs?.collectionId ?? \'\'}');
  });
});
