import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_EMOJI,
  FEEDBACK_EMOJI_ROWS,
  FEEDBACK_KEYS,
  FEEDBACK_SUBJECT_PLACEHOLDER,
  FEEDBACK_SUBMIT_LABEL,
  canSubmitFeedback,
  rateAppInStore,
  showFeedbackEmail,
  storeRatingAvailable,
} from './feedback';

/**
 * G1414：官方中文包里这一族正好 13 条键，逐字。第 416 批的屏上真值（两行共 10 枚 emoji）也
 * 一并钉在常量里，任何改写都要过这张表。
 */
describe('the 13 feedback keys', () => {
  it('holds exactly the collected family, verbatim', () => {
    expect(Object.keys(FEEDBACK_KEYS)).toHaveLength(13);
    expect(FEEDBACK_KEYS).toEqual({
      'feedback.email.optional': '电子邮件（可选）',
      'feedback.feel.about.craft': '你对 Craft 有什么感想？',
      'feedback.form.subtitle': '选择你喜欢的（可多选）',
      'feedback.input.like.or.not': '告诉我们你喜欢什么或不喜欢什么……',
      'feedback.input.subtitle': '每一条反馈都很重要！',
      'feedback.join.the.community':
        '加入 Craft 社区，了解最新的功能、技巧和窍门，甚至可能影响我们的路线图！',
      'feedback.rate.craft': '评价 Craft',
      'feedback.rate.in.store': '你介意花几秒钟在商店中为 Craft 评分吗？',
      'feedback.table.missing.function': '缺少功能？告诉我们！',
      'feedback.thanks.secondarybutton': '以后再说',
      'feedback.thanks.subtitle': '我们期待了解更多',
      'feedback.thanks.support': '感谢你的支持！',
      'feedback.thanks.title': '谢谢！',
    });
  });

  it('keeps the screen-read subject placeholder and primary label', () => {
    expect(FEEDBACK_SUBJECT_PLACEHOLDER).toBe('主题');
    expect(FEEDBACK_SUBMIT_LABEL).toBe('意见反馈');
  });
});

describe('the emoji rows', () => {
  it('has the two rows in the collected order, ten emoji total', () => {
    expect(FEEDBACK_EMOJI_ROWS).toEqual([
      ['😠', '😕', '😐', '😄', '🤩'],
      ['✌️', '🎉', '🤯', '🔥', '🚀'],
    ]);
    expect(FEEDBACK_EMOJI).toHaveLength(10);
    expect(new Set(FEEDBACK_EMOJI).size).toBe(10);
  });
});

describe('the submit gate', () => {
  it('starts disabled on an empty draft and enables on any expression', () => {
    const empty = { moods: [], subject: '', message: '' };
    expect(canSubmitFeedback(empty)).toBe(false);
    expect(canSubmitFeedback({ ...empty, subject: '   ' })).toBe(false);
    expect(canSubmitFeedback({ ...empty, message: '\n\t ' })).toBe(false);
    expect(canSubmitFeedback({ ...empty, moods: ['😐'] })).toBe(true);
    expect(canSubmitFeedback({ ...empty, subject: '想法' })).toBe(true);
    expect(canSubmitFeedback({ ...empty, message: '一句话' })).toBe(true);
  });

  it('asks for the email only when the user is anonymous', () => {
    expect(showFeedbackEmail(true)).toBe(true);
    expect(showFeedbackEmail(false)).toBe(false);
  });
});

describe('the store-rating bridge', () => {
  it('does not pretend to succeed without a desktop host', () => {
    expect(rateAppInStore(null)).toEqual({ hosted: false, invoked: false });
    expect(storeRatingAvailable(null)).toBe(false);
    expect(storeRatingAvailable({})).toBe(false);
  });

  it('calls the official topApi.rateAppInStore when hosted', () => {
    let called = 0;
    const host = { rateAppInStore: () => { called += 1; } };
    expect(storeRatingAvailable(host)).toBe(true);
    expect(rateAppInStore(host)).toEqual({ hosted: true, invoked: true });
    expect(called).toBe(1);
  });
});

/**
 * 接线面：弹窗、挂载点、两个入口（帮助菜单、关于面板）与 G1415 的两处宿主。
 */
describe('G1414 wiring', () => {
  const dialog = readFileSync(
    fileURLToPath(new URL('../../components/app/FeedbackDialog.tsx', import.meta.url)),
    'utf8',
  );
  const layout = readFileSync(
    fileURLToPath(new URL('../../app/(app)/layout.tsx', import.meta.url)),
    'utf8',
  );
  const helpMenu = readFileSync(
    fileURLToPath(new URL('../../components/app/HelpMenu.tsx', import.meta.url)),
    'utf8',
  );

  it('draws a backdrop overlay without a role=dialog, per the screen truth', () => {
    expect(dialog).toContain('data-feedback-dialog');
    expect(dialog).toMatch(/bg-black\/16/);
    // 官方读数 popup-backdrop=1、role=dialog=0 ⇒ 面板不能挂 dialog 角色。
    expect(dialog).not.toContain('role="dialog"');
  });

  it('renders the emoji rows, both inputs, the primary button and the thanks screen', () => {
    expect(dialog).toContain('FEEDBACK_EMOJI_ROWS');
    expect(dialog).toContain('FEEDBACK_SUBJECT_PLACEHOLDER');
    expect(dialog).toContain('FEEDBACK_KEYS[\'feedback.input.like.or.not\']');
    expect(dialog).toContain('disabled={!canSubmitFeedback(');
    expect(dialog).toContain("setView('thanks')");
    expect(dialog).toContain("FEEDBACK_KEYS['feedback.thanks.title']");
  });

  it('registers Escape on the global focus stack', () => {
    expect(dialog).toContain("focusStack.push({ id: 'feedback'");
    expect(dialog).toContain("focusStack.remove('feedback')");
  });

  it('is mounted in the app layout', () => {
    expect(layout).toContain("import { FeedbackDialog } from '@/components/app/FeedbackDialog'");
    expect(layout).toContain('<FeedbackDialog />');
  });

  it('opens from the help menu instead of landing in settings', () => {
    expect(helpMenu).toContain("if (entry.id === 'feedback')");
    expect(helpMenu).toContain('useFeedbackStore.getState().openFeedback()');
  });
});

describe('G1415 missing-function hosts', () => {
  const missing = readFileSync(
    fileURLToPath(new URL('../../components/app/MissingFunctionFeedback.tsx', import.meta.url)),
    'utf8',
  );
  const addProperty = readFileSync(
    fileURLToPath(new URL('../../components/collection/AddPropertyMenu.tsx', import.meta.url)),
    'utf8',
  );
  const toolbar = readFileSync(
    fileURLToPath(new URL('../../components/editor/table/TableToolbar.tsx', import.meta.url)),
    'utf8',
  );

  it('uses the official sentence and the 意见反馈 action, with no error tone', () => {
    expect(missing).toContain("FEEDBACK_KEYS['feedback.table.missing.function']");
    expect(missing).toContain('FEEDBACK_SUBMIT_LABEL');
    expect(missing).not.toMatch(/text-destructive|bg-destructive/);
    expect(missing).toContain('onClick={openFeedback}');
  });

  it('hosts the entry in both formula surfaces (the two same-shaped spots)', () => {
    expect(addProperty).toContain("import { MissingFunctionFeedback } from '@/components/app/MissingFunctionFeedback'");
    expect(addProperty).toContain('<MissingFunctionFeedback />');
    expect(toolbar).toContain("import { MissingFunctionFeedback } from '@/components/app/MissingFunctionFeedback'");
    expect(toolbar).toContain('<MissingFunctionFeedback');
    // 第二处宿主只在公式算不出结果时出现，不是把缺口当报错弹。
    expect(toolbar).toContain('if (!evalFormulas(editor))');
    expect(toolbar).toContain("kind: 'formula'");
  });
});
