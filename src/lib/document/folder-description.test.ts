import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SYNC_TABLES } from '@/lib/sync/tables';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/** G338：文件夹描述是独立字段与独立 mutation。 */
describe('the folder description column (G338)', () => {
  it('is whitelisted for sync', () => {
    const folder = SYNC_TABLES.find((table) => table.table === 'folder');
    expect(folder?.cols).toContain('description');
  });

  it('is written on its own, without touching name or icon', () => {
    const item = read('components/sidebar/FolderTreeItem.tsx');
    expect(item).toContain('patch: { description: next.trim() || null }');
    expect(item).toContain('编辑文件夹描述');
    // 描述通路里不该顺手写 name/icon。
    const start = item.indexOf('async function editDescription');
    const block = item.slice(start, item.indexOf('async function commitRename'));
    expect(block).not.toContain('name:');

    // 图标同样是独立 mutation：只写 icon 一列。
    const iconStart = item.indexOf('async function editIcon');
    const iconBlock = item.slice(iconStart, item.indexOf('async function editDescription'));
    expect(iconBlock).toContain('patch: { icon: next.trim() || null }');
    expect(iconBlock).not.toContain('name:');
    expect(iconBlock).not.toContain('description:');
  });

  it('is modelled and read back', () => {
    expect(read('prisma/contract.prisma')).toMatch(/model Folder \{[\s\S]{0,200}description String\?/);
    expect(read('actions/folder/get.ts')).toContain('description: string | null');
  });
});
