/**
 * G637 —— `repeat.type` 的两档语义**由文案向用户解释**（`tasks.md` §一之四十一）：
 *
 *   - `fixed`  ⇒ `tasks.complete.task.decs`「当你完成任务时，下一个任务将根据原始计划日期进行安排。」
 *   - `flexible` ⇒ `tasks.task.rescheduled.to.x.later`「当你完成任务后，下一个任务将被安排在 [0] 之后。」
 *     （`[0]` 是「一周」「1 天」这类 interval 短语）
 *
 * 官方把这段解释做成**强调色横幅**（`background: var(--accent-200); color: var(--accent-500)`），
 * 紧挨着重复面板。文案逐字取自 `feature-catalog.md`。
 */
import { fillPositional } from '@/lib/i18n/interpolation';

import { parseRecurrence, repeatAfterPhrase } from './recurrence';

export const REPEAT_FIXED_NOTE_KEY = 'tasks.complete.task.decs';
export const REPEAT_FIXED_NOTE = '当你完成任务时，下一个任务将根据原始计划日期进行安排。';

export const REPEAT_FLEXIBLE_NOTE_KEY = 'tasks.task.rescheduled.to.x.later';
export const REPEAT_FLEXIBLE_NOTE_TEMPLATE = '当你完成任务后，下一个任务将被安排在 [0] 之后。';

/** The two anchor rows, verbatim (`tasks.relative.to.completion` is the flexible one). */
export const REPEAT_ANCHOR_FIXED_LABEL = '按计划日';
export const REPEAT_ANCHOR_FLEXIBLE_LABEL = '相对于完成';
export const REPEAT_ANCHOR_FLEXIBLE_KEY = 'tasks.relative.to.completion';

export interface RepeatAnchorNote {
  key: string;
  text: string;
}

/** The banner sentence for the rule's anchor; `null` when there is no rule to explain. */
export function repeatAnchorNote(raw: string | null | undefined): RepeatAnchorNote | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;
  if (rule.type !== 'flexible') return { key: REPEAT_FIXED_NOTE_KEY, text: REPEAT_FIXED_NOTE };
  // 「一周后」 → 「一周」: the template already supplies 「之后」.
  const intervalPhrase = repeatAfterPhrase(rule).replace(/后$/, '');
  return {
    key: REPEAT_FLEXIBLE_NOTE_KEY,
    text: fillPositional(REPEAT_FLEXIBLE_NOTE_TEMPLATE, [intervalPhrase]),
  };
}