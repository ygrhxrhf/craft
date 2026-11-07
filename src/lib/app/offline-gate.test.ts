import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * G1608: offline the New Document / New Folder buttons do nothing observable — no navigation, no
 * disabled state, no toast. The gate is a silent early return.
 *
 * G15 撤掉首页快捷条后，两个入口分别落在侧栏的空间行（新建文档 ＋）与「文件夹」分区头。
 */
describe('offline create gate (G1608)', () => {
  const header = readFileSync(
    join(process.cwd(), 'src', 'components', 'sidebar', 'SidebarHeader.tsx'),
    'utf8',
  );
  const folder = readFileSync(
    join(process.cwd(), 'src', 'components', 'sidebar', 'NewFolderButton.tsx'),
    'utf8',
  );

  it('returns silently when offline in both handlers', () => {
    expect(header).toMatch(/handleNewDoc\(\)\s*\{[\s\S]{0,200}!navigator\.onLine\) return;/);
    expect(folder).toMatch(/handleNewFolder\(\)\s*\{[\s\S]{0,200}!navigator\.onLine\) return;/);
  });
});
