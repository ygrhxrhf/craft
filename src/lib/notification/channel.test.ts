import { describe, expect, it } from 'vitest';
import { isNotificationMessage } from './channel';

describe('notification channel filter (G42)', () => {
  it('keeps batches that touch notification', () => {
    expect(isNotificationMessage({ tables: ['notification'] })).toBe(true);
    expect(isNotificationMessage({ tables: ['document', 'notification'] })).toBe(true);
  });

  it('drops other batches and malformed payloads', () => {
    expect(isNotificationMessage({ tables: ['document'] })).toBe(false);
    expect(isNotificationMessage({ tables: 'notification' })).toBe(false);
    expect(isNotificationMessage({})).toBe(false);
  });
});
