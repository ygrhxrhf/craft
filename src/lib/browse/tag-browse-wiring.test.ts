import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const listPage = read('../../app/(app)/tags/page.tsx');
const tagTreeList = read('../../components/browse/TagTreeList.tsx');
const detailPage = read('../../app/(app)/tags/[id]/page.tsx');
const sidebar = read('../../components/sidebar/SidebarNav.tsx');
const header = read('../../components/app/AppPageHeader.tsx');
const editorTags = read('../../components/editor/tabs/TagsSection.tsx');

describe('the tags collection is wired to the official copy (G47)', () => {
  it('lists every tag with its document count through the shared tree', () => {
    expect(listPage).toContain('buildTagTree(tags, links, documents)');
    expect(tagTreeList).toContain('{formatDocCount(group.documentCount)}');
    expect(listPage).toContain('{ALL_TAGS}');
    expect(listPage).toContain('title={TAGS_TITLE}');
  });

  it('shows the official empty line when nothing is tagged yet', () => {
    expect(listPage).toContain('{TAGS_EMPTY}');
  });

  it('names the no-documents state on a tag page', () => {
    expect(detailPage).toContain('{NO_DOCS_FOUND}');
    expect(detailPage).toContain('buildTagTree(tags, links, documents).byId.get(id)');
  });

  it('reaches the collection from the sidebar and keeps its own header', () => {
    // 侧栏那张表已改成 `Record<SidebarSectionId, {label, icon}>`（G176/G600 的排序/隐藏需要 id 键），
    // 旧断言还停在"数组 + href"的形态。
    expect(sidebar).toContain("'/tags': { label: TAGS_TITLE");
    expect(header).toContain("'/tags',");
  });

  it('points the editor chips at the collection instead of the search box', () => {
    expect(editorTags).toContain('href={`/tags/${tag.id}`}');
    expect(editorTags).not.toContain('/search?tag=');
    expect(editorTags).toContain('{formatTagCount(tags.length)}');
  });
});
