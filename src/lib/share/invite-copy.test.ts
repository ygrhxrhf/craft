import { describe, expect, it } from 'vitest';
import {
  COPY_LINK_DONE,
  COPY_LINK_LABEL,
  INVITE_DESCRIPTION,
  INVITE_EMAIL_PLACEHOLDER,
  INVITE_SEND_LABEL,
  INVITE_TITLE,
  SHARE_HELP_HREF,
  SHARE_HELP_LABEL,
  SHARE_TIER_DESCRIPTION,
  memberRoleForTier,
} from './invite-copy';

/**
 * G931/G932/G933 的官方读数逐字钉在这里：标题、说明、邀请占位、复制按钮、帮助文字、
 * 档位说明句，以及「状态显示＝所选档名本身」用的角色映射。
 */
describe('分享浮层官方文案（G931/G932）', () => {
  it('标题＋说明逐字', () => {
    expect(INVITE_TITLE).toBe('邀请协作');
    expect(INVITE_DESCRIPTION).toBe('即使没有 Craft 帐户，也能轻松与任何人协作');
  });

  it('邀请占位、复制按钮与帮助文字逐字', () => {
    expect(INVITE_EMAIL_PLACEHOLDER).toBe('添加邮箱以邀请');
    expect(INVITE_SEND_LABEL).toBe('邀请');
    expect(COPY_LINK_LABEL).toBe('复制链接');
    expect(COPY_LINK_DONE).toBe('已复制');
    expect(SHARE_HELP_LABEL).toBe('共享功能如何使用？');
    expect(SHARE_HELP_HREF).toBe('https://support.craft.do');
  });

  it('档位说明句逐字（官方把后两档定义为"无需账户"）', () => {
    expect(SHARE_TIER_DESCRIPTION).toBe(
      '将链接设置为"查看"或"编辑"以方便协作，无需 Craft 帐户。',
    );
  });
});

describe('邀请角色随档位收敛（G933）', () => {
  it('编辑档邀请进来就是 editor', () => {
    expect(memberRoleForTier('editAndComment')).toBe('editor');
    expect(memberRoleForTier('linkEdit')).toBe('editor');
  });

  it('查看评论档是 commenter，其余（闭档/查看）是 viewer，未读档回落 viewer', () => {
    expect(memberRoleForTier('viewAndComment')).toBe('commenter');
    expect(memberRoleForTier('collaborators')).toBe('viewer');
    expect(memberRoleForTier('linkView')).toBe('viewer');
    expect(memberRoleForTier(null)).toBe('viewer');
  });
});
