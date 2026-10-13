import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A settings section that is not wired must not appear in the navigation (G24). The ledger's rule is
 * that a section is either backed by real state or its entry is removed, so the modal filters on
 * the wiring table instead of listing every section.
 */
const source = readFileSync(fileURLToPath(new URL('./SettingsModal.tsx', import.meta.url)), 'utf8');

describe('the settings navigation', () => {
  it('drops the sections the wiring table marks as shells', () => {
    expect(source).toContain('settingsSection(key)?.wired !== false');
  });

  it('hides a group once every item in it is a shell', () => {
    expect(source).toContain('if (visible.length === 0) return null');
  });
});
