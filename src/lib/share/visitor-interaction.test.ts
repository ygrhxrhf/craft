import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BLOCK_LINKS_SWITCH,
  DUPLICATE_SWITCH,
  USER_INTERACTIVITY_KEY,
  USER_INTERACTIVITY_TITLE,
  visitorCapabilities,
  visitorSwitchStatus,
} from './visitor-interaction';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * G145：「用户互动」分区——官方 5 组开关，每组都有描述句与**成对**的允许/不允许两句；
 * `enableObjectLinks` 是跨文档权限；`showDuplicateAsTemplate` 默认关。
 */
describe('the visitor-interaction copy (G145)', () => {
  it('carries both sides of each switch, not one sentence plus a negation', () => {
    for (const copy of [DUPLICATE_SWITCH, BLOCK_LINKS_SWITCH]) {
      expect(copy.allowed).not.toBe(copy.notAllowed);
      expect(copy.notAllowed).not.toContain(`不${copy.allowed}`);
      expect(visitorSwitchStatus(copy, true)).toBe(copy.allowed);
      expect(visitorSwitchStatus(copy, false)).toBe(copy.notAllowed);
    }
  });

  it('uses the harvested keys verbatim', () => {
    expect(USER_INTERACTIVITY_TITLE).toBe('用户互动');
    expect(USER_INTERACTIVITY_KEY).toBe('toolbar.user.interactivity');
    expect(DUPLICATE_SWITCH).toMatchObject({
      labelKey: 'toolbar.visitors.can.duplicate',
      descriptionKey: 'toolbar.visitors.can.duplicate.desc',
      allowedKey: 'toolbar.visitor.page.duplicate.allowed',
      notAllowedKey: 'toolbar.visitor.page.duplicate.not.allowed',
    });
    expect(BLOCK_LINKS_SWITCH).toMatchObject({
      labelKey: 'toolbar.visitors.follow.block.links',
      descriptionKey: 'toolbar.visitors.follow.block.links.desc',
      allowedKey: 'toolbar.visitors.follow.block.links.allowed',
      notAllowedKey: 'toolbar.visitors.follow.block.links.not.allowed',
    });
    // 跨文档权限那句必须点明「即使它们指向其他文档」。
    expect(BLOCK_LINKS_SWITCH.description).toContain('即使它们指向其他文档');
  });

  it('defaults both switches off, like the official 13-field table', () => {
    expect(DUPLICATE_SWITCH.defaultOn).toBe(false);
    expect(BLOCK_LINKS_SWITCH.defaultOn).toBe(false);
  });

  it('reads the capabilities off a share row with the official defaults', () => {
    expect(visitorCapabilities({})).toEqual({ followBlockLinks: false, duplicateAsTemplate: false });
    expect(visitorCapabilities({ enableObjectLinks: true, showDuplicateAsTemplate: true })).toEqual({
      followBlockLinks: true,
      duplicateAsTemplate: true,
    });
  });
});

describe('the panel and the public page are wired to it (G145)', () => {
  it('renders the section with description and status lines', () => {
    const dialog = read('src/components/share/ShareDialog.tsx');
    expect(dialog).toContain('data-testid="visitor-interactivity"');
    expect(dialog).toContain('USER_INTERACTIVITY_TITLE');
    expect(dialog).toContain('[DUPLICATE_SWITCH, BLOCK_LINKS_SWITCH].map');
    expect(dialog).toContain('{copy.description}');
    expect(dialog).toContain('visitorSwitchStatus(copy, on)');
    expect(dialog).toContain("const key = copy === DUPLICATE_SWITCH ? 'showDuplicateAsTemplate' : 'enableObjectLinks'");
    // 本地偏差：官方 `commentLevel==="none"` 时整区隐藏（返回入口在评论子页），本地没有子页，
    // 整区隐藏会把「查看评论」开关一起藏掉、再也打不开 ⇒ 本地区块常驻（见该处注释）。
    expect(dialog).toContain('data-comment-switch="view"');
    expect(dialog).toContain('data-comment-switch="add"');
  });

  it('seeds both switches from the mirror rather than starting at a hardcoded false', () => {
    const dialog = read('src/components/share/ShareDialog.tsx');
    expect(dialog).toContain('enableObjectLinks: false,\n    showDuplicateAsTemplate: false,');
    expect(dialog).toContain("'showDuplicateAsTemplate', 'emailBasedAccessEnabled'");
  });

  it('lets the public page honour enableObjectLinks for cross-document links', () => {
    // 分享行 → 页面 → 编辑器 → 区块链接节点，一路都要有这条能力。
    expect(read('src/actions/document/share.ts')).toContain('enableObjectLinks: s.enableObjectLinks === true');
    expect(read('src/app/p/[slug]/page.tsx')).toContain('followBlockLinks={doc.enableObjectLinks}');
    expect(read('src/app/s/[token]/page.tsx')).toContain('followBlockLinks={doc.enableObjectLinks}');
    expect(read('src/components/share/SharedDocView.tsx')).toContain('followBlockLinks={followBlockLinks}');
    const editor = read('src/components/editor/Editor.tsx');
    expect(editor).toContain('followOtherDocuments: followBlockLinks');
    expect(editor).toContain('storage.followOtherDocuments = followBlockLinks');
    const view = read('src/components/editor/extensions/block-link-view.tsx');
    expect(view).toContain("editor.storage.blockLink?.hostDocumentId");
    expect(view).toContain("documentId !== hostDocumentId && !followOthers");
  });

  it('offers 「用作模板」 only when the switch is on', () => {
    expect(read('src/actions/document/share.ts')).toContain('export async function duplicateSharedDocument');
    expect(read('src/components/share/PublicDocBanner.tsx')).toContain('duplicateAsTemplate && identifier');
    expect(read('src/app/p/[slug]/page.tsx')).toContain('duplicateAsTemplate={doc.showDuplicateAsTemplate}');
  });
});
