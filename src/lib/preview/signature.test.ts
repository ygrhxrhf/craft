import { describe, expect, it } from 'vitest';

import { buildPreviewSrc, previewSignature, verifyPreviewSignature } from './signature';

const DOC = '11111111-2222-3333-4444-555555555555';

describe('预览 URL 签名（G216）', () => {
  it('verifies a signature it produced', () => {
    const signature = previewSignature(DOC, '1700000000000', 'm', true);
    expect(verifyPreviewSignature(DOC, '1700000000000', 'm', true, signature)).toBe(true);
  });

  it('rejects a tampered document, ts, size, or theming', () => {
    const signature = previewSignature(DOC, '1700000000000', 'm', true);
    expect(verifyPreviewSignature(`${DOC}x`, '1700000000000', 'm', true, signature)).toBe(false);
    expect(verifyPreviewSignature(DOC, '1700000000001', 'm', true, signature)).toBe(false);
    expect(verifyPreviewSignature(DOC, '1700000000000', 'l', true, signature)).toBe(false);
    expect(verifyPreviewSignature(DOC, '1700000000000', 'm', false, signature)).toBe(false);
  });

  it('builds the official URL shape: v1 path, ts, v=1, s, size, theming', () => {
    const src = buildPreviewSrc({ id: DOC, updatedAt: '2026-11-06T10:00:00.000Z' });
    expect(src.startsWith(`/api/render/document_preview/v1/${DOC}/t/${Date.parse('2026-11-06T10:00:00.000Z')}?`)).toBe(true);
    expect(src).toContain('v=1');
    expect(src).toContain('&s=');
    expect(src).toContain('&size=m');
    expect(src).toContain('&theming=true');
  });

  it('changes the URL when the document timestamp changes (cache busting)', () => {
    const a = buildPreviewSrc({ id: DOC, updatedAt: '2026-11-06T10:00:00.000Z' });
    const b = buildPreviewSrc({ id: DOC, updatedAt: '2026-11-06T10:00:01.000Z' });
    expect(a).not.toBe(b);
  });
});