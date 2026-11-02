/**
 * G1530 —— 分享面的三条守卫句 + 四态失败标题（逐字取自 `i18n-zh.tsv`／`feature-catalog.md`）。
 */

export const SHARE_PERMISSION_CHANGE_CONFIRM =
  '你确定吗？这将更改你的权限。你将无法再管理共享设置。';

export const PASSWORD_XOR_EMAIL = '启用邮件访问权限后，无法同时启用密码保护。';

export const PREVIOUS_LINK_INACTIVE = '先前的链接将不再有效。';

export const SHARE_ERROR = {
  addPermission: '无法添加文档权限',
  changePermission: '更改用户权限失败',
  deletePermission: '删除用户权限失败',
  removeShareAccess: '无法移除所有共享访问权限',
} as const;
