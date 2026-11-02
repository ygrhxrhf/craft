import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PASSWORD_XOR_EMAIL, PREVIOUS_LINK_INACTIVE, SHARE_ERROR } from './share-guards';

describe('share guards (G1530)', () => {
  it('keeps the three sentences verbatim', () => {
    expect(PASSWORD_XOR_EMAIL).toBe('启用邮件访问权限后，无法同时启用密码保护。');
    expect(PREVIOUS_LINK_INACTIVE).toBe('先前的链接将不再有效。');
    expect(SHARE_ERROR.changePermission).toBe('更改用户权限失败');
    expect(SHARE_ERROR.deletePermission).toBe('删除用户权限失败');
    expect(SHARE_ERROR.addPermission).toBe('无法添加文档权限');
    expect(SHARE_ERROR.removeShareAccess).toBe('无法移除所有共享访问权限');
  });

  it('wires XOR, reset-link and failure titles into the panel', () => {
    const dialog = readFileSync(
      join(process.cwd(), 'src', 'components', 'share', 'ShareDialog.tsx'),
      'utf8',
    );
    expect(dialog).toContain('PASSWORD_XOR_EMAIL');
    expect(dialog).toContain('data-testid="password-xor-notice"');
    expect(dialog).toContain('PREVIOUS_LINK_INACTIVE');
    expect(dialog).toContain('handleResetLink');

    const members = readFileSync(
      join(process.cwd(), 'src', 'components', 'editor', 'tabs', 'MembersSection.tsx'),
      'utf8',
    );
    expect(members).toContain('SHARE_ERROR.addPermission');
    expect(members).toContain('SHARE_ERROR.changePermission');
    expect(members).toContain('SHARE_ERROR.deletePermission');
  });
});
