import { describe, expect, it } from 'vitest';

import {
  editorForColumnType,
  EDITOR_BY_COLUMN_TYPE,
  everyColumnTypeHasEditor,
  NON_CELL_EDITORS,
  OFFICIAL_CELL_EDITORS,
  orphanEditorNames,
} from './cell-editors';
import { OFFICIAL_COLUMN_TYPES } from './property-types';
import { DNS_RECORD_TABLE, DOMAIN_PAGE_TITLES, nextDomainState } from '@/lib/share/domain-lifecycle';

/**
 * G41: every official column type has a named editor, and the roster has no orphan names.
 */
describe('the cell editor roster (G41)', () => {
  it('names the thirteen official editors', () => {
    expect(OFFICIAL_CELL_EDITORS).toHaveLength(13);
    for (const name of ['TextEditor', 'CalculationsRow', 'SidebarAttachments']) {
      expect(OFFICIAL_CELL_EDITORS).toContain(name);
    }
  });

  it('maps every official column type to an editor', () => {
    expect(everyColumnTypeHasEditor()).toBe(true);
    for (const type of OFFICIAL_COLUMN_TYPES) {
      expect(editorForColumnType(type), type).toBeTruthy();
    }
  });

  it('has no orphan names in the roster', () => {
    expect(orphanEditorNames()).toEqual([]);
  });

  it('returns null for an unknown type', () => {
    expect(editorForColumnType('nope')).toBeNull();
  });

  it('keeps the two non-cell entries out of the column map', () => {
    const mapped = new Set(Object.values(EDITOR_BY_COLUMN_TYPE));
    for (const name of NON_CELL_EDITORS) {
      // CalculationsRow is not a per-cell editor; SidebarAttachments backs the media column.
      if (name === 'CalculationsRow') expect(mapped.has(name)).toBe(false);
    }
  });
});

/**
 * G183: the DNS table headers and the four-state lifecycle.
 */
describe('the domain DNS table and lifecycle (G183)', () => {
  it('carries the harvested DNS table labels', () => {
    expect(DNS_RECORD_TABLE.title).toBe('DNS 记录');
    expect(DNS_RECORD_TABLE.nameColumn).toBe('名称 / 主机');
    expect(DNS_RECORD_TABLE.valueColumn).toBe('值 / 指向');
    expect(DNS_RECORD_TABLE.addedAction).toBe('我已添加 DNS 记录');
    expect(DOMAIN_PAGE_TITLES.modify.label).toBe('修改你的域名 DNS 设置');
  });

  it('walks the four-state lifecycle', () => {
    expect(nextDomainState('unset', 'declare')).toBe('declared');
    expect(nextDomainState('declared', 'verify-ok')).toBe('verified');
    // A failed probe returns to declared so the user can fix the records.
    expect(nextDomainState('declared', 'verify-fail')).toBe('declared');
    expect(nextDomainState('verified', 'disconnect')).toBe('disconnected');
    expect(nextDomainState('disconnected', 'declare')).toBe('declared');
  });

  it('ignores transitions that do not apply', () => {
    expect(nextDomainState('unset', 'verify-ok')).toBe('unset');
    expect(nextDomainState('unset', 'disconnect')).toBe('unset');
    expect(nextDomainState('verified', 'declare')).toBe('verified');
  });
});
