import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  officialFieldName,
  PUBLISH_DEFAULTS,
  PUBLISH_FIELDS,
  readPublishSettings,
  unwiredPublishFields,
  WIRED_PUBLISH_FIELDS,
} from './publish-settings';

const PUBLISHING = readFileSync(join(process.cwd(), 'docs', 'craft-ref', 'features', 'publishing.md'), 'utf8');

/**
 * G141: the 13-field publish settings object with authoritative defaults. Each field's default has
 * to match the harvested table, and the module has to say which ones the local schema already has.
 */
describe('the 13 publish settings (G141)', () => {
  it('has exactly thirteen fields', () => {
    expect(PUBLISH_FIELDS).toHaveLength(13);
  });

  it('carries the authoritative defaults', () => {
    expect(PUBLISH_DEFAULTS.commentLevel).toBe('add');
    expect(PUBLISH_DEFAULTS.enableObjectLinks).toBe(false);
    expect(PUBLISH_DEFAULTS.hideTableOfContents).toBe(false);
    expect(PUBLISH_DEFAULTS.hidePresentationMode).toBe(false);
    expect(PUBLISH_DEFAULTS.showAuthor).toBe(true);
    expect(PUBLISH_DEFAULTS.showTitle).toBe(true);
    expect(PUBLISH_DEFAULTS.showWatermark).toBe(true);
    expect(PUBLISH_DEFAULTS.enableSeo).toBe(false);
    expect(PUBLISH_DEFAULTS.passwordProtected).toBe(false);
    expect(PUBLISH_DEFAULTS.showDuplicateAsTemplate).toBe(false);
    expect(PUBLISH_DEFAULTS.emailBasedAccessEnabled).toBe(false);
    expect(PUBLISH_DEFAULTS.defaultDomain).toBeUndefined();
    expect(PUBLISH_DEFAULTS.hideHashTagWords).toBe(false);
  });

  it('matches the harvested field list and defaults', () => {
    for (const field of PUBLISH_FIELDS) {
      expect(PUBLISHING, `${field} not in publishing.md`).toContain(`\`${field}\``);
    }
    expect(PUBLISHING).toContain('`commentLevel` | `"add"`');
    expect(PUBLISHING).toContain('`defaultDomain` | `undefined`');
  });

  it('splits the wired seven from the six without a column', () => {
    expect(WIRED_PUBLISH_FIELDS).toHaveLength(7);
    expect(unwiredPublishFields()).toHaveLength(6);
    expect(unwiredPublishFields()).toContain('commentLevel');
    expect(unwiredPublishFields()).toContain('defaultDomain');
    expect(unwiredPublishFields()).not.toContain('showAuthor');
  });

  it('fills missing fields with defaults when reading a partial record', () => {
    const settings = readPublishSettings({ showAuthor: false });
    expect(settings.showAuthor).toBe(false);
    expect(settings.showTitle).toBe(true); // filled from the default
  });

  it('maps the two local column names onto official field names', () => {
    expect(officialFieldName('showPageTitle')).toBe('showTitle');
    expect(officialFieldName('passcode')).toBe('passwordProtected');
    expect(officialFieldName('showAuthor')).toBe('showAuthor');
    expect(officialFieldName('nope')).toBeNull();
  });
});
