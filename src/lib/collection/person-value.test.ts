import { describe, expect, it } from 'vitest';

import {
  PERSON_ALLOW_MULTIPLE_DEFAULT,
  parsePersonSnapshot,
  personLabel,
  personSnapshot,
} from './person-value';

/** G454：`person` 值是四字段快照，且 `allowMultiple` 默认 false。 */
describe('the person cell snapshot (G454)', () => {
  it('carries the four official fields, with the optional three dropped when absent', () => {
    expect(personSnapshot({ userId: 'u1', name: 'Ada Lovelace', image: 'https://x/a.png' })).toEqual({
      userId: 'u1',
      profileImgUrl: 'https://x/a.png',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    // 只有一段名字：整段进 firstName，不编造 lastName。
    expect(personSnapshot({ userId: 'u2', name: 'Plato' })).toEqual({
      userId: 'u2',
      firstName: 'Plato',
    });
    // 没有名字也没有头像：只剩 userId。
    expect(personSnapshot({ userId: 'u3' })).toEqual({ userId: 'u3' });
  });

  it('refuses a snapshot without a user id', () => {
    expect(personSnapshot({ userId: '  ' })).toBeNull();
  });

  it('is single-select by default, like the official allowMultiple', () => {
    expect(PERSON_ALLOW_MULTIPLE_DEFAULT).toBe(false);
  });

  it('reads the stored JSON and drops unknown keys', () => {
    expect(parsePersonSnapshot('{"userId":"u1","firstName":"Ada","extra":1}')).toEqual({
      userId: 'u1',
      firstName: 'Ada',
    });
    expect(parsePersonSnapshot({ userId: 'u2', lastName: 'L' })).toEqual({
      userId: 'u2',
      lastName: 'L',
    });
  });

  it('treats legacy bare text and garbage as "nobody picked"', () => {
    expect(parsePersonSnapshot('张三')).toBeNull();
    expect(parsePersonSnapshot('{"firstName":"Ada"}')).toBeNull();
    expect(parsePersonSnapshot(null)).toBeNull();
  });

  it('labels with 名 + 姓, falling back to the id prefix when the snapshot has no name', () => {
    expect(personLabel({ userId: 'u1', firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(personLabel({ userId: 'u1', firstName: 'Plato' })).toBe('Plato');
    expect(personLabel({ userId: 'abcdef123456' })).toBe('abcdef12');
  });
});
