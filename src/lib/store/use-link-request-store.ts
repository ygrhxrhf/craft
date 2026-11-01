/**
 * G777: inside the editor `Mod+K` is 「样式 · 链接」 — it inserts a link, it does not open the
 * command palette. The palette keeps the same chord on the browse screens, so the two meanings
 * are separated by scope rather than by key.
 *
 * The editor side raises this request; the bubble menu owns the input box, so the store only
 * carries "please open the link box for this editor".
 */

export interface LinkRequest {
  at: number;
}

let pending: LinkRequest | null = null;
const listeners = new Set<(request: LinkRequest | null) => void>();

export function requestLink(): void {
  pending = { at: Date.now() };
  for (const listener of listeners) listener(pending);
}

export function consumeLinkRequest(): LinkRequest | null {
  const request = pending;
  pending = null;
  return request;
}

export function subscribeLinkRequests(listener: (request: LinkRequest | null) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function resetLinkRequestForTest(): void {
  pending = null;
  listeners.clear();
}
