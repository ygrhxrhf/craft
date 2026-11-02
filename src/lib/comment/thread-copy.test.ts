import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { THREAD_RESOLVED_TOAST, THREAD_UNRESOLVED_TOAST, TYPE_TO_UNRESOLVE } from './thread-copy';

// G134: resolve/unresolve toasts and the "type to reopen" placeholder.
describe('thread resolve copy (G134)', () => {
  it('keeps the three sentences verbatim', () => {
    expect(THREAD_RESOLVED_TOAST).toBe('讨论串已标记为已解决');
    expect(THREAD_UNRESOLVED_TOAST).toBe('讨论串已标记为未解决');
    expect(TYPE_TO_UNRESOLVE).toBe('输入你的评论以重新打开');
  });

  it('wires them into the comment section', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'editor', 'comments', 'CommentSection.tsx'),
      'utf8',
    );
    expect(source).toContain('THREAD_RESOLVED_TOAST');
    expect(source).toContain('THREAD_UNRESOLVED_TOAST');
    expect(source).toContain('TYPE_TO_UNRESOLVE');
    // Replying to a resolved thread flips it back open in the same write path.
    expect(source).toMatch(/wasResolved[\s\S]{0,400}resolved: false/);
  });
});
