/**
 * G624: the shortcut panel's chord only fires **inside the editor**. On the browse screens
 * (`/documents`, `/tasks`, …) the official build reads the key as a no-op — measured as a
 * zero-delta on the all-documents screen with the key press acknowledged.
 *
 * The other shell chords (sidebar, focus mode, daily note) stay global: their official scope was
 * not measured to be editor-only, and narrowing an unmeasured binding would be a guess.
 */

const EDITOR_ONLY = new Set(['TOGGLE_KEY_SHORTCUTS']);

/** A document editor route: `/documents/<id>`, with optional sub-path. */
const EDITOR_ROUTE = /^\/documents\/[^/]+/;

export function shellShortcutAllowed(id: string, pathname: string | null | undefined): boolean {
  if (!EDITOR_ONLY.has(id)) return true;
  return typeof pathname === 'string' && EDITOR_ROUTE.test(pathname);
}
