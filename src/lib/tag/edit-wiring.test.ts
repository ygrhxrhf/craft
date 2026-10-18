import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { EDIT_TAG, EDIT_TAG_KEY } from './official-copy';

const section = readFileSync(
  new URL('../../components/editor/tabs/TagsSection.tsx', import.meta.url),
  'utf8',
);
const dialog = readFileSync(
  new URL('../../components/editor/tabs/TagEditDialog.tsx', import.meta.url),
  'utf8',
);

/**
 * G1540 的接线闸：`tags.edit.tag` 是官方给标签编辑的唯一 key，改名那一半必须落在它上面；
 * 换色那一半没有官方 key，只能走本地 `tag.color` 列与既有调色板。
 *
 * ☆ 两条反面断言（本目录反复吃过的亏）：① 组件里不许再手抄一份「编辑标签」字面量（双声明漂移）；
 *   ② 不许拿 `tags.hexcolor.*` 当颜色文案——那两个 key 属于「十六进制颜色词不算标签」的忽略规则
 *   （`tags-browse.md:19`），与标签颜色编辑器无关。
 */
describe('the tag edit entry is wired to the official key (G1540)', () => {
  it('takes the entry name from the ledger constant, not a second literal', () => {
    expect(section).toContain('aria-label={`${EDIT_TAG} ${tag.name}`}');
    expect(section).not.toContain('aria-label="编辑标签');
    expect(section).toContain("from '@/lib/tag/official-copy'");
  });

  it('uses the official key verbatim as the dialog title', () => {
    expect(dialog).toContain('<DialogTitle>{EDIT_TAG}</DialogTitle>');
    expect(EDIT_TAG).toBe('编辑标签');
    expect(EDIT_TAG_KEY).toBe('tags.edit.tag');
  });

  it('writes through the offline kernel, not the superseded server action', () => {
    expect(dialog).toContain("table: 'tag'");
    expect(dialog).toContain('patch: { name: normalized, color: nextColor }');
    expect(dialog).toContain('await manager.flushNow()');
    // 只允许 `import type` 取 TagRecord；写入通路不许出现 server action 的调用
    expect(dialog).not.toContain('renameTag(');
    expect(dialog).toContain("import type { TagRecord } from '@/actions/tag/tag'");
  });

  it('keeps the colour half on the local column and palette, not on the ignore-rule copy', () => {
    expect(dialog).toContain('TAG_COLORS');
    expect(dialog).toContain('normalizeTagColor');
    expect(dialog).not.toContain('HEX_COLOR');
  });

  it('runs the rule table before any write, like the create path does', () => {
    expect(dialog).toContain('findTagViolation(name)');
    expect(dialog).toContain('normalizeTagName(name)');
  });

  it('keeps initial loading cancellable and preserves remote-store reload wiring', () => {
    expect(section).toContain('Promise.all([getDocumentTags(documentId), getTags()])');
    expect(section).toContain('let cancelled = false');
    expect(section).toContain('if (cancelled) return');
    expect(section).toContain('cancelled = true');
    expect(section).toContain("table === 'tag' || table === 'document_tag'");
    expect(section).toContain('void load()');
  });

  it('drops reads that belong to another document or predate a local write', () => {
    // 切文档不重挂载 ⇒ 旧文档在途的读取必须整批丢弃
    expect(section).toContain('const documentIdRef = useRef(documentId)');
    expect(section).toContain('if (documentIdRef.current !== requestedFor) return');
    // applyLocal 在推送前就广播 store 变更 ⇒ 那次读回的是旧值，必须按写入纪元丢弃
    expect(section).toContain('const writeEpochRef = useRef(0)');
    expect(section).toContain('writeEpochRef.current += 1');
    expect(section).toContain('if (writeEpochRef.current !== epoch) return');
  });

  it('settles an edit from the optimistic patch instead of re-reading the pre-push server', () => {
    const handleEditedBody = section.slice(
      section.indexOf('const handleEdited'),
      section.indexOf('const feedback'),
    );
    expect(handleEditedBody).toContain('setTags(apply)');
    expect(handleEditedBody).toContain('setAll(apply)');
    expect(handleEditedBody).not.toContain('await load()');
  });

  it('surfaces a rejected tag write instead of letting the rename silently revert', () => {
    expect(section).toContain('onRejected(');
    expect(section).toContain("record.table === 'tag'");
    expect(section).toContain('tag-rejected');
  });
});
