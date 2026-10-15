import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MEMBER_CAN_EDIT_BY_LINK,
  MEMBER_CAN_EDIT_BY_TEAM,
  MEMBER_WILL_STILL_ACCESS,
  memberRemovalNote,
} from './member-access-notes';

/**
 * `gap.md` G85 —— 移除某人权限前的解释性提示。官方逐字（`i18n-zh.tsv:192-194`／`dialogs.md:28-40`）。
 */
describe('移除协作者时的链接权限解释（G85）', () => {
  it('官方三句逐字', () => {
    expect(MEMBER_CAN_EDIT_BY_LINK).toBe('此人仍然可以编辑，因为该文件设置为任何有链接的人都可以编辑。');
    expect(MEMBER_CAN_EDIT_BY_TEAM).toBe('此人仍然可以编辑，因为他们在文档所在团队中拥有编辑权限。');
    expect(MEMBER_WILL_STILL_ACCESS).toBe('此人仍然能够访问该文档，因为他们是该文档所在团队的成员。');
  });

  it('链接档是 edit ⇒ 给出那句解释（移除个人条目不代表他失去编辑权）', () => {
    expect(memberRemovalNote('edit')).toBe(MEMBER_CAN_EDIT_BY_LINK);
  });

  it('链接档是 view ⇒ 不解释（此时移除个人条目确实收回了编辑权）', () => {
    expect(memberRemovalNote('view')).toBeNull();
  });

  it('缺列／空值／怪值 ⇒ 不解释（旧行与未加载都别乱说话）', () => {
    expect(memberRemovalNote(undefined)).toBeNull();
    expect(memberRemovalNote(null)).toBeNull();
    expect(memberRemovalNote('')).toBeNull();
    expect(memberRemovalNote('owner')).toBeNull();
  });

  it('接线：移除协作者那一路确实先读链接档、命中才弹确认（不是只定义了常量）', () => {
    const src = readFileSync(
      path.resolve('src/components/editor/tabs/MembersSection.tsx'),
      'utf8',
    );
    expect(src, 'MembersSection 没有用判据').toContain('memberRemovalNote(share?.permission)');
    expect(src, 'MembersSection 没有弹确认框').toContain('confirmDialog(');
    expect(src, '确认后没有 return（等于没拦）').toMatch(/if \(!confirmed\) return;/);
  });
});
