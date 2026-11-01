import { describe, expect, it } from 'vitest';

import { shellShortcutAllowed } from './shell-scope';

// G624: the shortcut panel chord is editor-only; the other shell chords stay global.
describe('the shell chord scope', () => {
  it('blocks the shortcut panel outside a document editor', () => {
    expect(shellShortcutAllowed('TOGGLE_KEY_SHORTCUTS', '/documents')).toBe(false);
    expect(shellShortcutAllowed('TOGGLE_KEY_SHORTCUTS', '/tasks/all')).toBe(false);
    expect(shellShortcutAllowed('TOGGLE_KEY_SHORTCUTS', null)).toBe(false);
  });

  it('allows it inside a document editor', () => {
    expect(shellShortcutAllowed('TOGGLE_KEY_SHORTCUTS', '/documents/abc-123')).toBe(true);
    expect(shellShortcutAllowed('TOGGLE_KEY_SHORTCUTS', '/documents/abc-123/sub')).toBe(true);
  });

  it('leaves the other shell chords global', () => {
    expect(shellShortcutAllowed('TOGGLE_LEFT_SIDEBAR', '/tasks')).toBe(true);
    expect(shellShortcutAllowed('TOGGLE_FOCUS_MODE', '/documents')).toBe(true);
    expect(shellShortcutAllowed('OPEN_DAILY_NOTE', '/')).toBe(true);
  });
});
