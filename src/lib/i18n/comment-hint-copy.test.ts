import { describe, expect, it } from 'vitest';

import {
  COMMENT_HINTS,
  COMMENT_HINT_MENTION,
  COMMENT_HINT_NEW_LINE,
  COMMENT_HINT_SEND,
  commentHintEmoji,
} from './comment-hint-copy';
import { parseEmbeddedTags } from './embedded-tags';
import { hasHarvest, readHarvest } from '@/lib/craft-ref/harvest';

/**
 * G320: the four comment hints carry `<highlight>` tags, so they render through the tag parser.
 */
describe.skipIf(!hasHarvest())('the comment hint copy (G320)', () => {
  it('matches the harvest verbatim', () => {
    for (const hint of COMMENT_HINTS) {
      const line = readHarvest().split(/\r?\n/).find((l) => l.startsWith(`${hint.key}\t`));
      expect(line, hint.key).toBeTruthy();
      expect(line!.split('\t')[1]).toBe(hint.template);
    }
  });

  it('fills the emoji trigger into the template', () => {
    expect(commentHintEmoji(':')).toBe('输入<highlight>:</highlight>或其他字符即可快速获取表情符号');
  });

  it('parses each into a highlight segment, not a leaked tag', () => {
    for (const value of [
      commentHintEmoji(':'),
      COMMENT_HINT_MENTION.template,
      COMMENT_HINT_NEW_LINE.template,
      COMMENT_HINT_SEND.template,
    ]) {
      const segments = parseEmbeddedTags(value);
      expect(segments.some((s) => s.kind === 'text' && s.styles.includes('highlight')), value).toBe(true);
      expect(segments.every((s) => s.kind !== 'text' || !s.text.includes('<')), value).toBe(true);
    }
  });
});
