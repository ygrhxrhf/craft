import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COMMENT_LEVELS,
  COMMENT_LEVEL_COPY,
  DEFAULT_COMMENT_LEVEL,
  nextCommentLevel,
  normalizeCommentLevel,
  visitorInteractionShown,
} from './comment-level';

/** G64：私密链接的访客评论权限三档（`publishing.md:13` 的 commentLevel）。 */
describe('the visitor comment level (G64)', () => {
  it('has the official three levels with the harvested copy', () => {
    expect(COMMENT_LEVELS).toEqual(['add', 'view', 'none']);
    expect(COMMENT_LEVEL_COPY.add).toEqual({
      label: '访客可以添加评论',
      key: 'toolbar.visitors.add.comments',
    });
    expect(COMMENT_LEVEL_COPY.view).toEqual({
      label: '访客可以查看评论',
      key: 'toolbar.visitors.view.comments',
    });
    // 第三档语言包里没有专句（本地自拟，键位记 null）。
    expect(COMMENT_LEVEL_COPY.none.key).toBeNull();
  });

  it('defaults to add, like the official commentLevel', () => {
    expect(DEFAULT_COMMENT_LEVEL).toBe('add');
    expect(normalizeCommentLevel(undefined)).toBe('add');
    expect(normalizeCommentLevel('garbage')).toBe('add');
    expect(normalizeCommentLevel('view')).toBe('view');
  });

  it('shows the visitor-interaction block only for view and add', () => {
    // 官方判定 `level==="view" || level==="add"`。
    expect(visitorInteractionShown('add')).toBe(true);
    expect(visitorInteractionShown('view')).toBe(true);
    expect(visitorInteractionShown('none')).toBe(false);
  });

  it('cycles through the three levels', () => {
    expect(nextCommentLevel('add')).toBe('view');
    expect(nextCommentLevel('view')).toBe('none');
    expect(nextCommentLevel('none')).toBe('add');
  });
});

describe('the share dialog exposes the level (G64)', () => {
  const dialog = readFileSync(join(process.cwd(), 'src/components/share/ShareDialog.tsx'), 'utf8');

  it('reads it back and writes it through the offline kernel', () => {
    expect(dialog).toContain('normalizeCommentLevel(view.commentLevel)');
    expect(dialog).toContain('patch: { commentLevel: next }');
    expect(dialog).toContain('setShareCommentLevel(documentId, next)');
  });

  it('renders the two comment switches that share the one three-state level', () => {
    // 官方两枚（查看／添加）在独立子页；本地放在同一分区，各自是真开关，共用 `commentLevel`。
    expect(dialog).toContain('COMMENT_LEVEL_COPY.view.label');
    expect(dialog).toContain('COMMENT_LEVEL_COPY.add.label');
    expect(dialog).toContain("handleCommentLevel(next ? 'view' : 'none')");
    expect(dialog).toContain("handleCommentLevel(next ? 'add' : 'view')");
  });
});
