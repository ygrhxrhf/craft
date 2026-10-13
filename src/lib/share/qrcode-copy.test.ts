import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  QR_HOWTO_DESC,
  QR_HOWTO_DESC_KEY,
  QR_HOWTO_TITLE,
  QR_HOWTO_TITLE_KEY,
  SHARE_AS_QR,
  SHARE_AS_QR_KEY,
} from './qrcode-copy';

/**
 * The share QR code's copy (G231), compared against the ledger.
 */
const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the QR code copy is the collected text', () => {
  it.each([
    [QR_HOWTO_TITLE_KEY, QR_HOWTO_TITLE],
    [QR_HOWTO_DESC_KEY, QR_HOWTO_DESC],
    [SHARE_AS_QR_KEY, SHARE_AS_QR],
  ])('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('keeps the scenario sentence verbatim', () => {
    expect(QR_HOWTO_DESC).toBe('二维码在共享页面时非常方便 – 无论是贴在设备上还是实物表面上都可以。');
  });

  it('reads a missing key as null', () => {
    expect(ledgerValue('qrcode.definitely.not.a.key')).toBeNull();
  });
});
