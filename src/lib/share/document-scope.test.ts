import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REMOVE_ALL_ACCESS,
  REVOKE_ACCESS_QUESTION,
  SHARE_SCOPE_CONFIRM,
  SHARE_SCOPE_WARNING,
  hasSubpages,
  revokeAcrossDocumentsPrompt,
  shareScopeConfirmation,
} from './document-scope';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * G138：分享面板是**整篇文档**的作用域；改档前把这件事写在警告句与确认按钮上。
 * 撤销访问是两问合一。
 */
describe('the share scope copy (G138)', () => {
  it('uses the official sentences verbatim', () => {
    expect(SHARE_SCOPE_WARNING).toBe(
      '分享适用于整个文档。你对查看或编辑权限所做的任何更改都将应用于整个文档。',
    );
    // 作用域写在**按钮**上，不是只写在说明里。
    expect(SHARE_SCOPE_CONFIRM).toBe('是的，更改整个文档');
    expect(REVOKE_ACCESS_QUESTION).toBe(
      '此人的访问权限将从所有文档中移除。你是否还想撤销他们对特别邀请的文档的访问权限？',
    );
    expect(REMOVE_ALL_ACCESS).toBe('移除所有访问权限');
  });

  it('only warns and confirms when the document actually has subpages', () => {
    expect(hasSubpages(0)).toBe(false);
    expect(hasSubpages(1)).toBe(true);
    expect(shareScopeConfirmation(0)).toBeNull();
    expect(shareScopeConfirmation(3)).toEqual({
      title: SHARE_SCOPE_WARNING,
      confirmLabel: SHARE_SCOPE_CONFIRM,
    });
  });

  it('asks the second revocation question only when grants exist elsewhere', () => {
    expect(revokeAcrossDocumentsPrompt(0)).toBeNull();
    expect(revokeAcrossDocumentsPrompt(2)).toEqual({
      title: REVOKE_ACCESS_QUESTION,
      confirmLabel: REMOVE_ALL_ACCESS,
    });
  });
});

describe('the dialog and the server are wired to it (G138)', () => {
  it('shows the scope warning above the tier list and confirms before changing it', () => {
    const dialog = read('src/components/share/ShareDialog.tsx');
    expect(dialog).toContain('data-testid="share-scope-warning"');
    expect(dialog).toContain('{SHARE_SCOPE_WARNING}');
    expect(dialog).toContain('const scope = shareScopeConfirmation(subpageCount);');
    expect(dialog).toContain('if (scope && !(await confirmDialog(scope))) return;');
    // 确认前不动选区（否则会先闪到新档再退回来）。
    expect(dialog.indexOf('if (scope && !(await confirmDialog(scope))) return;')).toBeLessThan(
      dialog.indexOf('setPermission(next);'),
    );
    expect(dialog).toContain('countSubpages(documentId)');
  });

  it('runs the two-in-one revocation after removing a collaborator', () => {
    const section = read('src/components/editor/tabs/MembersSection.tsx');
    expect(section).toContain('countMemberElsewhere(documentId, target.userId)');
    expect(section).toContain('revokeAcrossDocumentsPrompt(elsewhere)');
    expect(section).toContain('await revokeMemberEverywhere(target.userId)');
    const actions = read('src/actions/document/members.ts');
    expect(actions).toContain('export async function countMemberElsewhere');
    expect(actions).toContain('export async function revokeMemberEverywhere');
  });

  it('counts subpages on the server, scoped to the caller\'s own live documents', () => {
    const get = read('src/actions/document/get.ts');
    expect(get).toContain('export async function countSubpages');
    expect(get).toContain("select('id', 'parentId')");
  });
});
