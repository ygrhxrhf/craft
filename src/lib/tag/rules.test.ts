import { describe, expect, it } from 'vitest';

import {
  LENGTH_LIMIT,
  containsEmoji,
  findTagViolation,
  isHexColorLiteral,
  isValidTag,
  rejectTag,
  splitTagLevels,
  tagFeedback,
} from './rules';

describe('tag hierarchy is exactly two levels (G169)', () => {
  it('splits parent and child, and stops at two', () => {
    expect(splitTagLevels('工作')).toEqual({ parent: '工作', child: null });
    expect(splitTagLevels('工作/紧急')).toEqual({ parent: '工作', child: '紧急' });
    expect(splitTagLevels('工作/紧急/今天')).toBeNull();
  });

  it('a third level is the only-one-child rule, not a generic failure', () => {
    expect(rejectTag('#父/子/孙')?.rule).toBe('depth');
    expect(rejectTag('#父/子/孙')?.message).toBe('仅允许一个“/”');
  });

  it('a slash with nothing on one side is the bare delimiter rule', () => {
    expect(rejectTag('工作/')?.rule).toBe('delimiter');
    expect(rejectTag('/紧急')?.rule).toBe('delimiter');
    expect(rejectTag('工作//紧急')?.rule).toBe('depth');
  });

  it('accepts the ledger example forms', () => {
    expect(rejectTag('#标签')).toBeNull();
    expect(rejectTag('#父级/子级')).toBeNull();
  });
});

describe('the six character rules (G170)', () => {
  it('rejects spaces and punctuation with its own message', () => {
    expect(rejectTag('阅读 清单')?.rule).toBe('spaceOrPunctuation');
    expect(rejectTag('阅读 清单')?.message).toBe('标签中不允许使用空格和标点符号。');
    expect(rejectTag('a,b')?.rule).toBe('spaceOrPunctuation');
    expect(rejectTag('急!')?.rule).toBe('spaceOrPunctuation');
  });

  it('tolerates the word separators the ledger leaves unspecified', () => {
    expect(rejectTag('reading-list')).toBeNull();
    expect(rejectTag('reading_list')).toBeNull();
  });

  it('rejects emojis', () => {
    expect(rejectTag('紧急🚀')?.rule).toBe('emoji');
    expect(rejectTag('紧急🚀')?.message).toBe('标签不能包含表情符号');
    expect(containsEmoji('👍')).toBe(true);
    expect(containsEmoji('紧急')).toBe(false);
  });

  it('rejects a numbers-only tag unless the switch is on', () => {
    expect(rejectTag('#1')?.rule).toBe('numbers');
    expect(rejectTag('#1')?.message).toBe('仅包含数字的标签，例如#1');
    expect(rejectTag('#1', { allowNumbers: true })).toBeNull();
    // digits mixed with letters are an ordinary tag
    expect(rejectTag('v2')).toBeNull();
  });

  it('never lets a hex colour literal become a tag', () => {
    expect(isHexColorLiteral('#ff0000')).toBe(true);
    expect(isHexColorLiteral('#ccc')).toBe(true);
    expect(isHexColorLiteral('#ccddee99')).toBe(false);
    expect(isHexColorLiteral('#gg0000')).toBe(false);
    expect(rejectTag('#ff0000')?.rule).toBe('hexColor');
    expect(rejectTag('#ccc')?.rule).toBe('hexColor');
    expect(rejectTag('#ccc')?.message).toBe('十六进制格式的颜色值，如 #ff0000 或 #ccc');
    // checked before the '#' is stripped, so a colour cannot sneak past the normalizer
    expect(rejectTag('  #CCC  ')?.rule).toBe('hexColor');
    expect(rejectTag('#c3cc')).toBeNull();
  });

  it('reports the local length cap instead of silently truncating', () => {
    expect(rejectTag('a'.repeat(33))?.rule).toBe('length');
    expect(rejectTag('a'.repeat(33))?.key).toBeNull();
    expect(rejectTag('a'.repeat(33))?.message).toBe(LENGTH_LIMIT);
    expect(rejectTag('a'.repeat(32))).toBeNull();
  });

  it('has no opinion on an empty draft', () => {
    expect(findTagViolation('')).toBeNull();
    expect(findTagViolation('   ')).toBeNull();
    expect(findTagViolation('#')).toBeNull();
  });

  it('isValidTag asks the two questions separately', () => {
    expect(isValidTag('工作')).toBe(true);
    expect(isValidTag('')).toBe(false);
    expect(isValidTag('#')).toBe(false);
  });
});

describe('the four live feedback states (G170)', () => {
  it('asks for typing before anything is there', () => {
    expect(tagFeedback('')).toEqual({
      kind: 'empty',
      key: 'tags.continue.typing.to.create.tag',
      message: '继续输入以创建标签',
    });
  });

  it('keeps a draft that cannot stand alone yet in the typing state', () => {
    expect(tagFeedback('#').kind).toBe('typing');
    expect(tagFeedback('工作/').kind).toBe('typing');
    expect(tagFeedback('工作/').message).toBe('继续输入以创建有效标签');
  });

  it('confirms a good tag', () => {
    expect(tagFeedback('#父级/子级')).toEqual({
      kind: 'valid',
      key: 'tags.tag.is.valid',
      message: '标签有效',
    });
  });

  it('names a tag the document already carries as the current one', () => {
    expect(tagFeedback('工作', { existing: ['工作'] }).kind).toBe('current');
    expect(tagFeedback('#工作', { existing: ['工作'], current: '工作' }).message).toBe(
      '你已输入当前标签。',
    );
  });

  it('says which tag is invalid and carries the rule behind it', () => {
    const feedback = tagFeedback('#ff0000');
    expect(feedback.kind).toBe('invalid');
    if (feedback.kind !== 'invalid') return;
    expect(feedback.message).toBe('无效标签：#ff0000');
    expect(feedback.detail).toBe('你输入了无效的标签。');
    expect(feedback.rule?.rule).toBe('hexColor');
  });

  it('respects the numbers switch in the feedback path too', () => {
    expect(tagFeedback('#1').kind).toBe('invalid');
    expect(tagFeedback('#1', { allowNumbers: true }).kind).toBe('valid');
  });
});
