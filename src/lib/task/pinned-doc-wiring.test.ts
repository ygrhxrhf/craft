import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/** G604：任务页固定区的相对插入——拖侧栏文档进来、按锚点插、整份顺序落到 `favorite.order`。 */
describe('the tasks pinned-doc wiring (G604)', () => {
  const view = () => read('app/(app)/tasks/TasksView.tsx');

  it('takes the doc payload from the sidebar drag', () => {
    expect(view()).toContain('parseSidebarDragPayload(event.dataTransfer.getData(SIDEBAR_DOC_MIME))');
    expect(view()).toContain("candidate.type === 'doc'");
    expect(view()).toContain('sidebarDragState.payload = null');
  });

  it('resolves the relative anchor and delegates to the official-shaped insertion', () => {
    expect(view()).toContain('pinAfter(rows, documentId, afterDocumentId)');
    expect(view()).toContain('unpinPinned(pinned, documentId)');
  });

  it('writes only favorite.order — pinning never moves the document row', () => {
    const source = view();
    expect(source).toContain("table: 'favorite'");
    expect(source).toContain('patch: { order: row.order }');
    expect(source).not.toContain("table: 'document'");
  });

  it('shows the official pin-cap copy and an unpin control', () => {
    const source = view();
    expect(source).toContain('PIN_LIMIT_COPY.title');
    expect(source).toContain('PIN_LIMIT_COPY.description');
    expect(source).toContain('aria-label={PIN_COPY.unpin.label}');
  });
});
