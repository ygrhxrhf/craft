import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * G215 recorded the split as missing because the copy module existed without being used. These
 * assertions read the real sources, so the split cannot silently fall back to one placeholder.
 */
const source = (relative: string) =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');

describe('the untitled split is wired', () => {
  it('the top bar shows the page wording for the title itself', () => {
    const header = source('components/editor/EditorHeader.tsx');
    expect(header).toContain("untitledFor('topBar')");
    // ...while the empty input keeps its own collected placeholder (V15).
    expect(header).toContain('placeholder="页面标题"');
  });

  it('the sidebar row shows the document wording for an empty title', () => {
    expect(source('components/sidebar/DocumentTreeItem.tsx')).toContain("untitledFor('list')");
  });

  it('a new document stores no title, which is what lets each surface pick its own placeholder', () => {
    expect(source('components/sync/create-local.ts')).toContain("input.title ?? ''");
  });

  it('the folder placeholder uses the collected wording', () => {
    expect(source('components/sync/create-local.ts')).toContain('UNTITLED_FOLDER');
    expect(source('components/sidebar/FolderTree.tsx')).toContain('UNTITLED_FOLDER');
  });

  it('no document title surface keeps the invented 未命名 fallback', () => {
    for (const file of [
      'components/editor/extensions/mention-view.tsx',
      'components/editor/extensions/block-link-view.tsx',
      'components/editor/tabs/InfoTab.tsx',
      'components/document/TrashList.tsx',
      'lib/document/location-path.ts',
    ]) {
      expect(source(file), file).not.toContain("'未命名'");
    }
  });
});
