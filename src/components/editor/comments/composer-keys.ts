/**
 * The comment composer's keys (G74): Enter sends, Shift+Enter inserts a newline. Anything else —
 * a held modifier, or Enter on an empty draft — is left to the field.
 */
export type ComposerKey = 'send' | 'newline' | 'ignore';

export function composerKey(input: {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  draft: string;
}): ComposerKey {
  if (input.key !== 'Enter') return 'ignore';
  if (input.metaKey || input.ctrlKey || input.altKey) return 'ignore';
  if (input.shiftKey) return 'newline';
  return input.draft.trim() ? 'send' : 'ignore';
}
