import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_TITLE_COLUMN, normalizeTitleColumn, titleColumnLabel } from './title-column';

describe('the collection title column name (G691)', () => {
  it('defaults to the collected `Title`', () => {
    expect(DEFAULT_TITLE_COLUMN).toBe('Title');
    expect(normalizeTitleColumn('')).toBe('Title');
    expect(normalizeTitleColumn('   ')).toBe('Title');
    expect(normalizeTitleColumn(null)).toBe('Title');
    expect(normalizeTitleColumn(' 负责人 ')).toBe('负责人');
  });

  it('labels only the first text property, never a normal column', () => {
    expect(titleColumnLabel('Story', 'text')).toBe('Story');
    expect(titleColumnLabel(undefined, 'text')).toBe('Title');
    expect(titleColumnLabel('Story', 'number')).toBe('');
  });

  it('is wired into the header menu, the table header and the sync whitelist', () => {
    const header = readFileSync(
      new URL('../../app/(app)/collections/[id]/CollectionHeader.tsx', import.meta.url),
      'utf8',
    );
    const table = readFileSync(
      new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url),
      'utf8',
    );
    const tables = readFileSync(new URL('../sync/tables.ts', import.meta.url), 'utf8');
    expect(header).toContain('重命名标题列');
    expect(header).toContain("patch: { titleColumn: trimmed }");
    expect(table.match(/titleColumnLabel\(collection\.titleColumn/g)).toHaveLength(2);
    const collectionRow = tables.split('\n').find((line) => line.includes("{ table: 'collection',"));
    expect(collectionRow).toContain("'titleColumn'");
  });
});
