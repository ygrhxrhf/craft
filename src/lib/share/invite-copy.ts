import type { DocumentSharePermission } from './permission';

/**
 * G931/G932/G933 —— 分享浮层的标题、说明、邀请占位与状态口径，逐字取自官方读数：
 *
 *   - 标题「邀请协作」＋说明「即使没有 Craft 帐户，也能轻松与任何人协作」；
 *   - `input[placeholder="添加邮箱以邀请"]`（官方 `type=text`）；
 *   - 「复制链接」按钮与帮助文字「共享功能如何使用？」；
 *   - 档位说明「将链接设置为"查看"或"编辑"以方便协作，无需 Craft 帐户。」；
 *   - 选档后的状态显示**就是所选档名本身**（没有额外的"已分享"标记）。
 */

/** G931：官方顶栏分享入口的可见文案是「共享」（不是「分享」），且没有 `aria-label`。 */
export const SHARE_TRIGGER_LABEL = '共享';
export const INVITE_TITLE = '邀请协作';
export const INVITE_DESCRIPTION = '即使没有 Craft 帐户，也能轻松与任何人协作';
export const INVITE_EMAIL_PLACEHOLDER = '添加邮箱以邀请';
export const INVITE_SEND_LABEL = '邀请';
export const COPY_LINK_LABEL = '复制链接';
export const COPY_LINK_DONE = '已复制';
export const SHARE_HELP_LABEL = '共享功能如何使用？';
export const SHARE_HELP_HREF = 'https://support.craft.do';
export const SHARE_TIER_DESCRIPTION = '将链接设置为"查看"或"编辑"以方便协作，无需 Craft 帐户。';

export type InviteMemberRole = 'editor' | 'commenter' | 'viewer';

/**
 * 邀请一枚邮箱时落进协作者名册的角色。档位本身管的是链接放行，名册角色是另一轴；
 * 这里按"档位越开、名册角色越高"对齐，免得邀请来的人比链接档还低。
 */
export function memberRoleForTier(tier: DocumentSharePermission | null): InviteMemberRole {
  switch (tier) {
    case 'editAndComment':
    case 'linkEdit':
      return 'editor';
    case 'viewAndComment':
      return 'commenter';
    default:
      return 'viewer';
  }
}
