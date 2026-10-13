import { describe, expect, it } from 'vitest';

import { changeCountLabel, versionBucket, versionChangeCount } from './version-groups';

const now = new Date(2026, 9, 14, 10, 0);

describe('which group a version falls in', () => {
  it('is today for one saved today', () => {
    expect(versionBucket(new Date(2026, 9, 14, 1, 0).toISOString(), now)).toBe('today');
  });

  it('is yesterday for one saved the day before', () => {
    expect(versionBucket(new Date(2026, 9, 13, 23, 0).toISOString(), now)).toBe('yesterday');
  });

  it('is earlier for anything older', () => {
    expect(versionBucket(new Date(2026, 9, 12).toISOString(), now)).toBe('earlier');
  });
});

describe('the change count', () => {
  it('counts every word of the first version', () => {
    expect(versionChangeCount(120, null)).toBe(120);
  });

  it('counts the words moved either way since the previous version', () => {
    expect(versionChangeCount(130, 120)).toBe(10);
    expect(versionChangeCount(100, 120)).toBe(20);
  });

  it('reads as the catalog sentence', () => {
    expect(changeCountLabel(2)).toBe('2 项变更');
  });
});
