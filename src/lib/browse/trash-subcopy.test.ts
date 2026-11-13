import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  COULD_NOT_DELETE_DOCUMENT,
  COULD_NOT_RESTORE_FROM_TRASH,
  EMPTY_TRASH_CONFIRM,
  MOVE_ITEMS_TO_TRASH,
  MOVE_ITEM_TO_TRASH,
  MOVED_TO_RECENTLY_DELETED,
  TRASH_RETENTION_DAYS,
  isWithinRetention,
  moveToTrashConfirm,
  moveToTrashMenuTitle,
} from './trash-subcopy';

/**
 * The 「最近删除」 subsystem (G233): 30-day retention, a permanent-delete confirmation, and two
 * distinct failure sentences.
 */
describe('retention', () => {
  it('is 30 days', () => {
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });

  it('keeps a document inside the window and drops it past the edge', () => {
    const now = Date.parse('2026-10-14T00:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;
    expect(isWithinRetention(new Date(now - 29 * dayMs).toISOString(), now)).toBe(true);
    expect(isWithinRetention(new Date(now - 31 * dayMs).toISOString(), now)).toBe(false);
  });

  it('treats a missing or unparsable date as not retained', () => {
    expect(isWithinRetention(null)).toBe(false);
    expect(isWithinRetention('不是时间')).toBe(false);
  });
});

describe('the empty-trash confirmation', () => {
  it('is a permanent-delete question, verbatim', () => {
    expect(EMPTY_TRASH_CONFIRM).toBe('你确定要永久删除这些项目吗？');
  });
});

describe('the two failure sentences are distinct', () => {
  it('has one for delete and one for restore', () => {
    expect(COULD_NOT_DELETE_DOCUMENT).toBe('无法删除文档');
    expect(COULD_NOT_RESTORE_FROM_TRASH).toBe('无法从最近删除中恢复文档');
    expect(COULD_NOT_DELETE_DOCUMENT).not.toBe(COULD_NOT_RESTORE_FROM_TRASH);
  });
});

describe('the move confirmation splits by count', () => {
  it('uses the singular line for one and the plural otherwise', () => {
    expect(moveToTrashConfirm(1)).toBe(MOVE_ITEM_TO_TRASH);
    expect(moveToTrashConfirm(2)).toBe(MOVE_ITEMS_TO_TRASH);
    expect(moveToTrashConfirm(0)).toBe(MOVE_ITEMS_TO_TRASH);
  });
});

/**
 * G245: the delete menu entry names the item it will move, and a completion sentence follows the
 * move. Both are verbatim from the pack (`move.x.to.recently.deleted`, `moved.to.recently.deleted`).
 */
describe('the delete menu entry is dynamic', () => {
  it('quotes the document title, verbatim', () => {
    expect(moveToTrashMenuTitle('周报')).toBe('将"周报"移至最近删除');
  });

  it('keeps the official quotes and spacing around the title', () => {
    expect(moveToTrashMenuTitle('')).toBe('将""移至最近删除');
  });
});

describe('the completion sentence', () => {
  it('is the past-tense line, verbatim', () => {
    expect(MOVED_TO_RECENTLY_DELETED).toBe('已移至最近删除');
  });
});

/**
 * G233's fourth piece: the confirmation pair had no production consumer until the sidebar started
 * routing its delete through it. Pin the wiring, not just the strings — the whole defect class this
 * ledger keeps recording is "the copy exists, nothing calls it".
 */
describe('the move confirmation is actually wired', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../../components/sidebar/DocumentTreeItem.tsx', import.meta.url)),
    'utf8',
  );

  it('asks before moving, and bails when the user declines', () => {
    expect(source).toContain('moveToTrashConfirm');
    expect(source).toMatch(/if\s*\(!ok\)\s*return/);
  });

  it('asks through the shared confirm dialog rather than window.confirm', () => {
    expect(source).toContain("from '@/lib/dialog/show'");
    expect(source).not.toContain('window.confirm');
  });
});

/**
 * applyLocal only enqueues; the push is debounced two seconds. Re-reading the tree before that
 * push acks races the ack: a slow pre-write snapshot landing after the queue drains finds no
 * pending intent to overlay and the old row sticks with no further bump to take it away. Every
 * tree write that immediately re-reads must await flushNow first.
 */
describe('a tree row write waits for the push ack before re-reading', () => {
  const read = (name: string) =>
    readFileSync(
      fileURLToPath(new URL(`../../components/sidebar/${name}`, import.meta.url)),
      'utf8',
    );

  // 从 `function name(` 切到下一个同缩进（两格）的函数声明，免得这一条靠后一个函数的 flushNow 蒙混过关。
  const body = (source: string, name: string) => {
    const start = source.indexOf(`function ${name}(`);
    expect(start, `${name} missing`).toBeGreaterThan(-1);
    const rest = source.slice(start + 1);
    const next = rest.search(/\n {2}(?:async )?function /);
    return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
  };

  const cases = [
    { file: 'DocumentTreeItem.tsx', fn: 'commitRename' },
    { file: 'DocumentTreeItem.tsx', fn: 'moveToTrash' },
    { file: 'DocumentTreeItem.tsx', fn: 'handleDrop' },
    { file: 'FolderTreeItem.tsx', fn: 'editIcon' },
    { file: 'FolderTreeItem.tsx', fn: 'editDescription' },
    { file: 'FolderTreeItem.tsx', fn: 'commitRename' },
    { file: 'FolderTreeItem.tsx', fn: 'moveToTrash' },
    { file: 'FolderTreeItem.tsx', fn: 'handleDrop' },
  ];

  for (const { file, fn } of cases) {
    it(`${file} ${fn}: applyLocal → flushNow → bumpTree`, () => {
      const source = body(read(file), fn);
      const apply = source.indexOf('applyLocal(');
      const flush = source.indexOf('flushNow()');
      const bump = source.indexOf('bumpTree()');
      expect(apply).toBeGreaterThan(-1);
      expect(flush).toBeGreaterThan(apply);
      expect(bump).toBeGreaterThan(flush);
    });
  }
});
