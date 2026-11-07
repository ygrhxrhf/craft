import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseEmbeddedTags, stripEmbeddedTags } from '@/lib/i18n/embedded-tags';

const bell = readFileSync(new URL('./NotificationBell.tsx', import.meta.url), 'utf8');

/**
 * G76: a notification title is not plain text. The official build parses the collected tag
 * vocabulary (`<username>`, `<highlight>`, …) into styled runs on the client; the local bell used
 * to drop `{item.title}` in as a bare text node. This is the wiring gate: the row must go through
 * the shared renderer, and the renderer must actually produce runs for a composed title.
 */
describe('notification titles render through the embedded-tag renderer (G76)', () => {
  it('imports the shared RichText renderer', () => {
    expect(bell).toContain("import { RichText } from '@/components/ui/rich-text'");
  });

  it('renders the title through it instead of a bare text node', () => {
    expect(bell).toContain('<RichText value={item.title} />');
    expect(bell).not.toMatch(/>\s*\{item\.title\}\s*</);
  });

  it('turns a composed title into styled runs, not leaked markup', () => {
    const title = '<username>甲</username> 评论了<highlight>「乙」</highlight>';
    expect(stripEmbeddedTags(title)).toBe('甲 评论了「乙」');
    const segments = parseEmbeddedTags(title);
    expect(segments.some((segment) => segment.kind !== 'break' && segment.text.includes('<'))).toBe(false);
    expect(segments[segments.length - 1]).toMatchObject({ kind: 'text', styles: ['highlight'] });
  });
});