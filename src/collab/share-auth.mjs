// Server-side revalidation of a document link that was authorized by a share row.
// Lives next to `server.mjs` so the rule can be tested without a database, the way
// `tldraw-auth.mjs` does for whiteboard claims.

/**
 * 链接档里**能编辑**的那几档。G131 把三档（view/edit）扩成五档并归一写入之后，
 * 可编辑的链接档是 `linkEdit`；`edit` 留着兼容没跑过迁移的老行。
 * ☆ 这一格曾经只认 `edit`，五档上线后**编辑链接的协作整条被拒**
 * （`onAuthenticate` 抛「未授权」——页面看着可编辑，写进去谁都收不到）。
 */
const EDIT_LINK_TIERS = new Set(['edit', 'linkEdit']);

/**
 * Whether a share-derived connection is still authorized by the live share row.
 * Grants that came from ownership or a member row are never scoped by a share, so
 * this must not be able to refuse them — revoking a link may not lock out the owner.
 */
export function shareGrantStillValid(claims, liveShare) {
  if (!claims?.viaShare) return true;
  if (!liveShare) return false;
  return (
    liveShare.isPublished === true
    && EDIT_LINK_TIERS.has(liveShare.permission)
    && liveShare.shareVersion === claims.shareVersion
  );
}
