import { describe, expect, it } from 'vitest';

import {
  allEmailAddresses,
  normalizeDomain,
  normalizeEmail,
  parseDomains,
  parseEmails,
  readAccessLists,
  splitAccessList,
} from './email-allowlist';

describe('email access lists (G144)', () => {
  it('splits comma/semicolon/newline lists and drops blanks', () => {
    expect(splitAccessList('a@x.com, b@y.com;\nc@z.com,, ')).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });

  it('normalizes emails and rejects entries without a domain', () => {
    expect(normalizeEmail(' Alice@Example.COM ')).toBe('alice@example.com');
    expect(normalizeEmail('alice')).toBeNull();
    expect(parseEmails('a@x.com, bad, A@X.com')).toEqual({ valid: ['a@x.com'], invalid: ['bad'] });
  });

  it('stores domains as bare suffixes', () => {
    expect(normalizeDomain('@Example.com')).toBe('example.com');
    expect(normalizeDomain('not a domain')).toBeNull();
    expect(parseDomains('craft.do, @example.com, bad!')).toEqual({
      valid: ['craft.do', 'example.com'],
      invalid: ['bad!'],
    });
  });

  it('keeps the official aggregate sentence', () => {
    expect(allEmailAddresses(3)).toBe('全部 3 个电子邮件地址');
  });

  it('reads the JSON columns defensively', () => {
    expect(readAccessLists({ allowedEmails: ['a@x.com', 1], allowedDomains: 'nope' })).toEqual({
      emails: ['a@x.com'],
      domains: [],
    });
  });
});