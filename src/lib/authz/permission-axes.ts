/**
 * G588 —— 权限权威契约＝**三键 + 两上下文 + 一独立只读位**（`model.md` §一之三十二）。
 *
 * 官方那支 `setDocumentAccess{documentAccess, canView, canComment, canEdit, subscription, sharedBy}`
 * 加上 `setForcedViewOnlyModeAction{isReadOnly}`，配 `mention{… role, documentRole …}` ⇒
 * **viewer 不是角色，而是 `role × can* × forcedReadOnly` 的乘积**。
 *
 * 本地此前只有一个派生布尔 `canEdit = role==='owner' || role==='editor'`，于是 `commenter` 与
 * `viewer` 在编辑器侧行为完全相同（都 `readOnly={!canEdit}`），且没有「强制只读」这一维。
 * 本模块把三键从角色推出来，并把强制只读作为**独立**一维叠加。
 */

export type DocumentRole = 'owner' | 'editor' | 'commenter' | 'viewer';

/** 三个能力键——它们是从角色推出的，但**各自独立**，不再塌成一个 `canEdit`。 */
export interface DocumentCapabilities {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
}

/**
 * 角色 → 三键。官方那张表：owner／editor 三键全真；commenter 可看可评不可编；viewer 只看。
 * 未知角色一律当作**无权限**（不是当 viewer——未知不该等价于"至少能看"）。
 */
export function capabilitiesFor(role: DocumentRole | null | undefined): DocumentCapabilities {
  switch (role) {
    case 'owner':
    case 'editor':
      return { canView: true, canComment: true, canEdit: true };
    case 'commenter':
      return { canView: true, canComment: true, canEdit: false };
    case 'viewer':
      return { canView: true, canComment: false, canEdit: false };
    default:
      return { canView: false, canComment: false, canEdit: false };
  }
}

export interface PermissionContext {
  /** 文档角色（文档级轴）。 */
  role: DocumentRole | null | undefined;
  /** 空间角色（空间级轴，G324）——与文档角色是两套独立的轴。 */
  spaceRole?: 'owner' | 'member' | 'guest' | null;
  /** `setForcedViewOnlyModeAction{isReadOnly}`：与角色无关的**独立只读位**。 */
  forcedReadOnly?: boolean;
}

export interface EffectivePermission extends DocumentCapabilities {
  /** 界面是否只读＝`!canEdit || forcedReadOnly`（官方那支的乘积）。 */
  readOnly: boolean;
}

/**
 * 把三键与强制只读合成最终权限。**强制只读只压 `readOnly`**，不改 `canView`／`canComment`——
 * 一个被强制只读的文档仍然能被查看与评论，这正是"只读位独立于能力键"的含义。
 */
export function effectivePermission(ctx: PermissionContext): EffectivePermission {
  const caps = capabilitiesFor(ctx.role);
  return { ...caps, readOnly: !caps.canEdit || Boolean(ctx.forcedReadOnly) };
}
