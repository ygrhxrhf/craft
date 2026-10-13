import { describe, expect, it } from 'vitest';

import {
  SETTINGS_SECTIONS,
  settingsSection,
  unwiredSections,
} from './settings-sections';

/**
 * Settings sections and their wiring (G24). The ledger forbids a section that looks real but is
 * not, so the unwired ones are listed rather than left implicit.
 */
describe('the sections', () => {
  it('names every panel the settings modal has', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      'space',
      'published',
      'tags',
      'appearance',
      'language',
      'advanced',
      'account',
      'subscription',
      'team',
      'integrations',
      'assistant',
      'notifications',
      'shortcuts',
      'about',
    ]);
  });

  it('marks the wired ones', () => {
    for (const id of ['space', 'appearance', 'advanced', 'account', 'notifications', 'shortcuts', 'about'] as const) {
      expect(settingsSection(id)?.wired, id).toBe(true);
    }
  });

  it('lists the shells the ledger names', () => {
    const unwired = unwiredSections().map((s) => s.id);
    // These five are the ones the ledger records as static.
    for (const id of ['published', 'tags', 'language', 'subscription', 'team', 'integrations', 'assistant'] as const) {
      expect(unwired, id).toContain(id);
    }
  });

  it('returns null for an unknown section', () => {
    expect(settingsSection('nope' as never)).toBeNull();
  });
});
