// Server-side revalidation of a document link that was authorized by a share row.
// Lives next to `server.mjs` so the rule can be tested without a database, the way
// `tldraw-auth.mjs` does for whiteboard claims.

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
    && liveShare.permission === 'edit'
    && liveShare.shareVersion === claims.shareVersion
  );
}
