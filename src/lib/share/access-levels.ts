/**
 * G131 —— 访问级别有**五档**，且「可评论」是**独立一档**而非评论开关（`collab.md` §一）。
 *
 * 官方那五条键（`_harvest/i18n-zh.tsv:843-850`）：
 *   - `collab.access.only.collaborators`「仅限有访问权限的协作者」；
 *   - `collab.access.view.and.comment`「可以查看和评论」；
 *   - `collab.access.edit.and.comment`「可以编辑和评论」；
 *   - `collab.access.link.view`「知道链接的人都可以查看」；
 *   - `collab.access.link.edit`「知道链接的任何人都可以编辑」。
 *
 * 本地 `DocumentShare.permission` 只有三档（`view`/`edit`/`collaborators`，见 `permission.ts`），
 * 「可评论」塌进了 `view`。本模块把五档与"档位 → 三键（看/评/编）"的映射写出来，供分享面板使用。
 */

export type AccessLevel =
  | 'collaborators'
  | 'viewAndComment'
  | 'editAndComment'
  | 'linkView'
  | 'linkEdit';

/** 五档，按官方顺序（从最闭到最开）。 */
export const ACCESS_LEVELS: readonly AccessLevel[] = [
  'collaborators',
  'viewAndComment',
  'editAndComment',
  'linkView',
  'linkEdit',
] as const;

/** 五档的官方键与中文，逐字取自 harvest。 */
export const ACCESS_LEVEL_COPY: Record<AccessLevel, { key: string; label: string }> = {
  collaborators: { key: 'collab.access.only.collaborators', label: '仅限有访问权限的协作者' },
  viewAndComment: { key: 'collab.access.view.and.comment', label: '可以查看和评论' },
  editAndComment: { key: 'collab.access.edit.and.comment', label: '可以编辑和评论' },
  linkView: { key: 'collab.access.link.view', label: '知道链接的人都可以查看' },
  linkEdit: { key: 'collab.access.link.edit', label: '知道链接的任何人都可以编辑' },
};

/** 一档给的三键——「可评论」在这里是独立格，不是从"可编辑"里减出来的。 */
export interface AccessCapabilities {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  /** 这一档是否靠**链接**授予（后两档是）。 */
  viaLink: boolean;
}

export function capabilitiesForAccessLevel(level: AccessLevel): AccessCapabilities {
  switch (level) {
    case 'collaborators':
      // The closed tier grants nothing by itself — access comes from the collaborator list.
      return { canView: false, canComment: false, canEdit: false, viaLink: false };
    case 'viewAndComment':
      return { canView: true, canComment: true, canEdit: false, viaLink: false };
    case 'editAndComment':
      return { canView: true, canComment: true, canEdit: true, viaLink: false };
    case 'linkView':
      return { canView: true, canComment: false, canEdit: false, viaLink: true };
    case 'linkEdit':
      return { canView: true, canComment: false, canEdit: true, viaLink: true };
  }
}

export function isAccessLevel(value: unknown): value is AccessLevel {
  return typeof value === 'string' && (ACCESS_LEVELS as readonly string[]).includes(value);
}
