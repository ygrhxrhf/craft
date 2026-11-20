import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CONTINUE_TYPING, ENTER_VALID_TAG, TAG_IS_VALID } from './official-copy';

const section = readFileSync(
  new URL('../../components/editor/tabs/TagsSection.tsx', import.meta.url),
  'utf8',
);

describe('the tag rules are wired into the editor input (G169/G170)', () => {
  it('shows the official placeholder while the field is empty', () => {
    expect(section).toContain('placeholder={ENTER_VALID_TAG}');
  });

  it('renders the live feedback state, not just the rules', () => {
    expect(section).toContain('tagFeedback(draft, {');
    expect(section).toContain('data-tag-feedback={feedback.kind}');
    expect(section).toContain('{feedback.message}');
  });

  it('gates both submit paths on the rule table', () => {
    expect(section).toContain('const violation = findTagViolation(name)');
    expect(section).toContain("feedback.kind === 'valid'");
    // ☆ 提交按钮只看「草稿有效」，**不再挂 busy**：一枚标签落库要几秒，这期间把按钮
    //   变灰会让下一枚被静默吞掉（连着打 `父/子` 就丢后一个）。落库改成排队（addQueueRef）。
    expect(section).toContain('disabled={!canSubmit}');
    expect(section).toContain('addQueueRef');
  });

  it('takes the old generic strings out of the component', () => {
    expect(section).not.toContain('placeholder="添加标签"');
    expect(section).not.toContain('disabled={busy || !draft.trim()}');
    // The field and its submit button used to share one accessible name, which made the input
    // unaddressable by label in the browser.
    expect(section.match(/aria-label="添加标签"/g)).toHaveLength(1);
  });

  it('keeps the feedback copy on the ledger text', () => {
    // The three strings the user actually sees on a normal path.
    expect(ENTER_VALID_TAG).toBe('输入有效标签（例如 #标签 或 #父级/子级）');
    expect(TAG_IS_VALID).toBe('标签有效');
    expect(CONTINUE_TYPING).toBe('继续输入以创建标签');
  });
});
