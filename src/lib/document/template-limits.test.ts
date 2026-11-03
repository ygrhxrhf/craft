import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FROM_TEMPLATE_KEY,
  FROM_TEMPLATE_LABEL,
  MAX_TEMPLATE_BYTES,
  TEMPLATE_TOO_LARGE,
  TEMPLATE_TOO_LARGE_KEY,
  templateByteSize,
  templateTooLarge,
} from './template-limits';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');
const source = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('template limits and the from-template marker (G236)', () => {
  it('takes both sentences from the catalog', () => {
    expect(ledgerValue(TEMPLATE_TOO_LARGE_KEY)).toBe(TEMPLATE_TOO_LARGE);
    expect(ledgerValue(FROM_TEMPLATE_KEY)).toBe(FROM_TEMPLATE_LABEL);
  });

  it('measures the serialised body against the declared cap', () => {
    const small = { type: 'doc', content: [{ type: 'paragraph' }] };
    expect(templateByteSize(small, 'hello')).toBeGreaterThan(0);
    expect(templateTooLarge(small, 'hello')).toBe(false);

    const huge = 'x'.repeat(MAX_TEMPLATE_BYTES + 1);
    expect(templateTooLarge(small, huge)).toBe(true);
  });

  it('refuses to save an oversized template with the official sentence', () => {
    expect(source('actions/document/template.ts')).toContain('throw new Error(TEMPLATE_TOO_LARGE)');
  });

  it('stamps the source template and shows the marker', () => {
    expect(source('actions/document/create.ts')).toContain('fromTemplate: input.useTemplateId');
    expect(source('components/editor/tabs/InfoTab.tsx')).toContain('data-testid="from-template"');
  });
});
