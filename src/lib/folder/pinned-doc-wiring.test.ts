import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/** G338：`Folder pinned doc` 事件在本地是"读得到、拖得进、能摘掉"的一条通路。 */
describe('the folder pinned-doc wiring (G338)', () => {
  it('reads the field back into the folder screen', () => {
    const action = read('actions/folder/get.ts');
    expect(action).toContain('parsePinnedDocumentIds(');
    expect(action).toContain('pinnedDocumentIds');
    expect(action).toContain('return { folder, children, documents, pinned }');
  });

  it('mounts the section on the folder page', () => {
    const page = read('app/(app)/folders/[id]/page.tsx');
    expect(page).toContain('<FolderPinnedSection folderId={folder.id} pinned={pinned} />');
  });

  it('takes the doc payload from the sidebar drag and writes only the pin', () => {
    const section = read('components/folder/FolderPinnedSection.tsx');
    expect(section).toContain('parseSidebarDragPayload(e.dataTransfer.getData(SIDEBAR_DOC_MIME))');
    expect(section).toContain("payload.type !== 'doc'");
    expect(section).toContain('await write(payload.documentId)');
    // 固定 ≠ 移动：这一条通路不碰 document 行的 folderId/parentId。
    expect(section).not.toContain("table: 'document'");
  });

  it('shows the official sentence in the empty state and an unpin control once filled', () => {
    const section = read('components/folder/FolderPinnedSection.tsx');
    expect(section).toContain('FOLDER_PIN_COPY.dropHereToPin.label');
    expect(section).toContain('aria-label={FOLDER_PIN_COPY.unpin.label}');
    expect(section).toContain('void write(null)');
  });
});
