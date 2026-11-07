import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

/**
 * 侧栏这三条都是用源码接线钉住的（组件本身要真浏览器才能验）：折叠控件的无障碍状态 (G385)、
 * 分区折叠阈值与共用折叠行 (G391)、导入先问"从哪里导入" (G177)、文件夹说明入口 (G241)。
 */
describe('G385 — collapse controls declare their state', () => {
  it('puts aria-expanded on the document and folder rows', () => {
    expect(read('./DocumentTreeItem.tsx')).toContain('aria-expanded={hasChildren ? expanded : undefined}');
    expect(read('./FolderTreeItem.tsx')).toContain('aria-expanded={hasChildren ? expanded : undefined}');
  });

  it('gives the section toggle a state and a label', () => {
    const section = read('./SidebarSection.tsx');
    expect(section).toContain('aria-expanded={isOpen}');
    expect(section).toContain('aria-label={`${isOpen ? ');
  });

  it('gives the shared collapse row the same state', () => {
    expect(read('./CollapseRow.tsx')).toContain('aria-expanded={isExpanded}');
  });
});

describe('G391 — the sidebar sections collapse behind the hard-coded thresholds', () => {
  it('cuts both trees at the shared threshold with the shared row', () => {
    for (const path of ['./DocumentTree.tsx', './FolderTree.tsx']) {
      const source = read(path);
      expect(source).toContain('SECTION_COLLAPSE_THRESHOLD');
      expect(source).toContain('collapseSection(');
      expect(source).toContain('<CollapseRow');
      expect(source).toContain('remainingCount={section.remainingCount}');
    }
  });

  it('renders the row offset the official component passes', () => {
    const row = read('./CollapseRow.tsx');
    expect(row).toContain('COLLAPSE_ROW_TEXT_LEFT_OFFSET');
    expect(row).toContain('paddingLeft');
  });
});

describe('G177 — import asks where from first', () => {
  const button = read('./ImportButton.tsx');

  it('opens with the question instead of a format list', () => {
    expect(button).toContain('{IMPORT_WHERE}');
    expect(button).toContain('IMPORT_SOURCES.map');
    expect(button).not.toContain('Markdown / HTML / Evernote');
  });

  it('keeps the Text Bundle folder picker as its own exit', () => {
    expect(button).toContain('{IMPORT_BUNDLE_LABEL}');
    expect(button).toContain('openBundle');
  });
});

describe('G241 — the folder menu offers to add a description', () => {
  it('routes the row label through the official string while the folder has none', () => {
    const item = read('./FolderTreeItem.tsx');
    expect(item).toContain('folderDescriptionLabel(folder.description)');
    expect(item).toContain('void editDescription()');
  });
});