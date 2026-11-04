import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/**
 * G288 第 4 项「目录」——官方 `table.of.contents` 的宿主是**文档级 `⋯` 菜单**
 * （G1451 逐字读到 `navigationSection → tableOfContents`），行为是在正文里插一张目录块。
 * 此前本地把它接到「切右侧信息页」，是接错而不是缺失。
 */
describe('the 目录 item inserts a TOC block (G288)', () => {
  it('wires the document menu item to insertTableOfContents', () => {
    const editor = read('components/editor/DocumentEditor.tsx');
    expect(editor).toContain('onTableOfContents={() => editor?.chain().focus().insertTableOfContents().run()}');
    // 不许再退回到"切面板"那条旧接线。
    expect(editor).not.toContain("onTableOfContents={() => setActiveTab('info')}");
  });

  it('keeps the menu roster verbatim (table.of.contents stays under navigationSection)', () => {
    const menu = read('lib/editor/document-menu.ts');
    expect(menu).toContain("{ id: 'tableOfContents', label: '目录', key: 'table.of.contents' }");
  });

  it('has a real TOC node behind the command', () => {
    const toc = read('components/editor/extensions/toc.ts');
    expect(toc).toContain("name: 'tableOfContents'");
    expect(toc).toContain('insertTableOfContents:');
    expect(read('components/editor/Editor.tsx')).toContain('TableOfContents,');
  });
});
