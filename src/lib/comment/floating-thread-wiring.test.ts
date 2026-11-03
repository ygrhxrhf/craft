import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

describe('the floating comment thread (G58)', () => {
  it('anchors on the comment mark the editor renders', () => {
    const mark = read('components/editor/extensions/comment-mark.ts');
    expect(mark).toContain("'data-thread-id'");
    const window = read('components/editor/comments/FloatingThreadWindow.tsx');
    expect(window).toContain("closest?.('[data-thread-id]')");
    expect(window).toContain('useThreadWindowStore.getState().open(');
  });

  it('is mounted next to the editor, and closes one layer on Escape', () => {
    expect(read('components/editor/DocumentEditor.tsx')).toContain('<FloatingThreadWindow documentId={doc.id} />');
    const window = read('components/editor/comments/FloatingThreadWindow.tsx');
    expect(window).toContain("event.key === 'Escape'");
    expect(window).toContain('setThreadResolved(thread.id, !thread.resolved)');
    expect(window).toContain('data-testid="floating-thread-window"');
  });
});
