import { describe, expect, it } from 'vitest';

import {
  CLEAR_HISTORY_CONFIRM,
  CLEAR_HISTORY_CONFIRM_KEY,
  CLEAR_HISTORY_LABEL,
} from './conversation-copy';

describe('G123 — clearing the AI history is confirmed as irreversible', () => {
  it('uses the official action label and warning', () => {
    expect(CLEAR_HISTORY_LABEL).toBe('清除历史');
    expect(CLEAR_HISTORY_CONFIRM).toBe('你确定吗？此操作无法撤销。');
  });

  it('keeps each string parked next to its i18n key', () => {
    expect(CLEAR_HISTORY_CONFIRM_KEY).toBe('alert.warning.delete');
  });
});