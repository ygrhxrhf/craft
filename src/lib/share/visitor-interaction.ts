/**
 * G145 —— 发布面板的「用户互动」分区（`publishing.md` §四）。官方这一区的开关**两侧都有
 * 说明**：开关名 + 一句描述 + 开/关各自一句状态文案，不是只有 tooltip。逐字取自
 * `_harvest/i18n-zh.tsv`：
 *
 *   可复制（`showDuplicateAsTemplate`）
 *     名   `toolbar.visitors.can.duplicate`「访客可以复制」
 *     述   `toolbar.visitors.can.duplicate.desc`「启用后，访问此链接的用户可以将内容复制到他们的空间中。」
 *     开   `toolbar.visitor.page.duplicate.allowed`「访客可以将此页面用作模板」
 *     关   `toolbar.visitor.page.duplicate.not.allowed`「访客无法将此页面用作模板」
 *   跳转区块链接（`enableObjectLinks`，**跨文档权限**）
 *     名   `toolbar.visitors.follow.block.links`「访客可以跳转区块链接」
 *     述   `toolbar.visitors.follow.block.links.desc`「启用后，访客可以跳转此文档中的区块链接，即使它们指向其他文档」
 *     开   `toolbar.visitors.follow.block.links.allowed`「访客可以查看链接的页面」
 *     关   `toolbar.visitors.follow.block.links.not.allowed`「访客无法访问链接的页面」
 *
 * 评论那两组（`visitors.view.comments` / `visitors.add.comments`）是三档 `commentLevel`
 * 的两端，见 `comment-level.ts`；本模块不重复表达。
 */

export interface VisitorSwitchCopy {
  /** 面板行标签（官方开关名）。 */
  label: string;
  labelKey: string;
  description: string;
  descriptionKey: string;
  /** 开着时右侧那句。 */
  allowed: string;
  allowedKey: string;
  /** 关着时右侧那句。 */
  notAllowed: string;
  notAllowedKey: string;
  /** 官方默认值（`publishing.md` §一）。 */
  defaultOn: boolean;
}

export const DUPLICATE_SWITCH: VisitorSwitchCopy = {
  label: '访客可以复制',
  labelKey: 'toolbar.visitors.can.duplicate',
  description: '启用后，访问此链接的用户可以将内容复制到他们的空间中。',
  descriptionKey: 'toolbar.visitors.can.duplicate.desc',
  allowed: '访客可以将此页面用作模板',
  allowedKey: 'toolbar.visitor.page.duplicate.allowed',
  notAllowed: '访客无法将此页面用作模板',
  notAllowedKey: 'toolbar.visitor.page.duplicate.not.allowed',
  defaultOn: false,
};

export const BLOCK_LINKS_SWITCH: VisitorSwitchCopy = {
  label: '访客可以跳转区块链接',
  labelKey: 'toolbar.visitors.follow.block.links',
  description: '启用后，访客可以跳转此文档中的区块链接，即使它们指向其他文档',
  descriptionKey: 'toolbar.visitors.follow.block.links.desc',
  allowed: '访客可以查看链接的页面',
  allowedKey: 'toolbar.visitors.follow.block.links.allowed',
  notAllowed: '访客无法访问链接的页面',
  notAllowedKey: 'toolbar.visitors.follow.block.links.not.allowed',
  defaultOn: false,
};

/** 分区标题（官方 `toolbar.user.interactivity`「用户互动」）。 */
export const USER_INTERACTIVITY_TITLE = '用户互动';
export const USER_INTERACTIVITY_KEY = 'toolbar.user.interactivity';

/** 开关右侧那句（成对句，不是同一句加「不」）。 */
export function visitorSwitchStatus(copy: VisitorSwitchCopy, on: boolean): string {
  return on ? copy.allowed : copy.notAllowed;
}

export interface VisitorCapabilities {
  /** 公开页上的区块链接能不能点（跨文档跳转）。 */
  followBlockLinks: boolean;
  /** 访客能不能把这一页复制成自己空间里的模板。 */
  duplicateAsTemplate: boolean;
}

/** 从分享行解出公开页能力；缺列按官方默认（都关）。 */
export function visitorCapabilities(share: {
  enableObjectLinks?: unknown;
  showDuplicateAsTemplate?: unknown;
}): VisitorCapabilities {
  return {
    followBlockLinks: share.enableObjectLinks === true,
    duplicateAsTemplate: share.showDuplicateAsTemplate === true,
  };
}
