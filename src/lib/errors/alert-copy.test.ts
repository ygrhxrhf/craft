import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COPY_LINK_FAILED,
  COPY_LINK_FAILED_KEY,
  OPERATION_FAILED_KEY,
  OPERATION_FAILED_TEMPLATE,
  PASTE_FAILED,
  PASTE_FAILED_KEY,
  operationFailed,
} from './alert-copy';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('fallback alert copy (G303)', () => {
  it('takes all three sentences from the catalog', () => {
    expect(ledgerValue(COPY_LINK_FAILED_KEY)).toBe(COPY_LINK_FAILED);
    expect(ledgerValue(PASTE_FAILED_KEY)).toBe(PASTE_FAILED);
    expect(ledgerValue(OPERATION_FAILED_KEY)).toBe(OPERATION_FAILED_TEMPLATE);
  });

  it('fills the reason slot instead of printing it', () => {
    expect(operationFailed('网络不可用')).toBe('操作失败 网络不可用');
    expect(operationFailed(null)).toBe('操作失败');
    expect(operationFailed('')).not.toContain('[0]');
  });
});
