import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const table = readFileSync(
  new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url),
  'utf8',
);

/**
 * G677：集合行＝页面。行没有文档时，「打开页面」新建一篇文档并把行指过去；
 * 正文走文档/块编辑通路，而不是集合值。
 */
describe('the collection row opens a page (G677)', () => {
  it('creates a document for a row without one and points the row at it', () => {
    expect(table).toContain('const openRowPage = async (item: any) => {');
    expect(table).toContain('const doc = await createDocument({ title });');
    expect(table).toContain("table: 'collection_item'");
    expect(table).toContain('patch: { documentId: doc.id }');
    expect(table).toContain('router.push(`/documents/${doc.id}`)');
  });

  it('navigates straight to an existing document', () => {
    expect(table).toContain('if (item.documentId) {');
    expect(table).toContain('router.push(`/documents/${item.documentId}`)');
  });

  it('is reachable from every row', () => {
    expect(table).toContain('aria-label="打开页面" title="打开页面"');
    expect(table).not.toContain('{item.documentId && (');
  });
});
