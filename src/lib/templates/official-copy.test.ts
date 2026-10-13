import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FROM_TEMPLATE,
  FROM_TEMPLATE_KEY,
  NEW_DOC_FROM_TEMPLATE,
  NEW_DOC_FROM_TEMPLATE_KEY,
  TEMPLATES_CANNOT_CREATE,
  TEMPLATES_CANNOT_CREATE_KEY,
  TEMPLATES_CREATING,
  TEMPLATES_CREATING_KEY,
  TEMPLATES_DOC_TOO_LARGE,
  TEMPLATES_DOC_TOO_LARGE_KEY,
  TEMPLATES_FOLDER_DESC,
  TEMPLATES_FOLDER_DESC_KEY,
  TEMPLATES_INSERTING,
  TEMPLATES_INSERTING_KEY,
  TEMPLATE_ACTIONS,
  TEMPLATE_NOT_SUPPORTED_ON_MOBILE,
  TEMPLATE_NOT_SUPPORTED_ON_MOBILE_KEY,
} from './official-copy';

/**
 * The template subsystem's strings (G236). Each is compared against the ledger, so a
 * mistranscription fails on the catalog rather than on a second copy.
 */
const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

const PAIRS: [string, string][] = [
  [TEMPLATES_FOLDER_DESC_KEY, TEMPLATES_FOLDER_DESC],
  [NEW_DOC_FROM_TEMPLATE_KEY, NEW_DOC_FROM_TEMPLATE],
  [TEMPLATES_CREATING_KEY, TEMPLATES_CREATING],
  [TEMPLATES_INSERTING_KEY, TEMPLATES_INSERTING],
  [TEMPLATES_DOC_TOO_LARGE_KEY, TEMPLATES_DOC_TOO_LARGE],
  [TEMPLATES_CANNOT_CREATE_KEY, TEMPLATES_CANNOT_CREATE],
  [FROM_TEMPLATE_KEY, FROM_TEMPLATE],
  [TEMPLATE_NOT_SUPPORTED_ON_MOBILE_KEY, TEMPLATE_NOT_SUPPORTED_ON_MOBILE],
];

describe('the template copy is the collected text', () => {
  it.each(PAIRS)('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('reads a missing key as null', () => {
    expect(ledgerValue('browse.templates.definitely.not.a.key')).toBeNull();
  });
});

describe('the two action families', () => {
  it('names create-from-template and insert-into-document separately', () => {
    expect(TEMPLATE_ACTIONS.createFromTemplate.label).toBe('从此模板新建文档');
    expect(TEMPLATE_ACTIONS.insertIntoDocument.label).toBe('将模板插入文档');
    expect(TEMPLATE_ACTIONS.createFromTemplate.label).not.toBe(TEMPLATE_ACTIONS.insertIntoDocument.label);
  });
});
