import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  BACKUP_DAY_SENTENCE,
  backupWindowDays,
  backupWindowSentence,
  CURRENT_BACKUP_PLAN,
  versionsInWindow,
} from './backup-retention';

describe('the backup retention window (G360)', () => {
  it('gives Free 30 days and paid plans 180', () => {
    expect(backupWindowDays('free')).toBe(30);
    expect(backupWindowDays('plus')).toBe(180);
    expect(backupWindowDays('family')).toBe(180);
    expect(CURRENT_BACKUP_PLAN).toBe('free');
  });

  it('fills the collected day sentence', () => {
    expect(BACKUP_DAY_SENTENCE).toBe('目前显示 [0] 天。');
    expect(backupWindowSentence('free')).toBe('目前显示 30 天。');
    expect(backupWindowSentence('plus')).toBe('目前显示 180 天。');
  });

  it('hides versions older than the window and keeps unparsable ones', () => {
    const now = Date.parse('2026-11-03T00:00:00.000Z');
    const day = 24 * 60 * 60 * 1000;
    const versions = [
      { id: 'new', createdAt: new Date(now - 2 * day).toISOString() },
      { id: 'edge', createdAt: new Date(now - 30 * day).toISOString() },
      { id: 'old', createdAt: new Date(now - 31 * day).toISOString() },
      { id: 'unknown', createdAt: 'not-a-date' },
    ];
    expect(versionsInWindow(versions, 'free', now).map((version) => version.id)).toEqual([
      'new',
      'edge',
      'unknown',
    ]);
    expect(versionsInWindow(versions, 'plus', now).map((version) => version.id)).toEqual([
      'new',
      'edge',
      'old',
      'unknown',
    ]);
  });

  it('is wired into the version dialog', () => {
    const source = readFileSync(
      new URL('../../components/editor/tabs/VersionDialog.tsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('versionsInWindow(');
    expect(source).toContain('backupWindowSentence(CURRENT_BACKUP_PLAN)');
    expect(source).toContain('data-testid="backup-window"');
  });
});
