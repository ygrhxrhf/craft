import { describe, expect, it } from 'vitest';

import {
  DISCONNECT_DESC,
  DNS_STATES,
  DOMAIN_TIERS,
  EMAIL_REVERT_TO_CRAFT,
  EXTERNAL_DOMAIN_EMAIL_CONFLICT,
  hostAfterDisconnect,
  tierEmailConflict,
} from './domain-lifecycle';

/**
 * Custom-domain lifecycle (G168): three tiers, four states, and the reasons a combination is
 * unavailable attached as text rather than as a disabled control.
 */
describe('the three tiers', () => {
  it('maps each to its host and plan', () => {
    expect(DOMAIN_TIERS.defaultCraft).toEqual({ id: 'default-craft', host: 'craft.me' });
    expect(DOMAIN_TIERS.customCraft.plan).toBe('plus');
    expect(DOMAIN_TIERS.external.plan).toBe('business');
  });
});

describe('the DNS states', () => {
  it('carries the two visible sentences', () => {
    expect(DNS_STATES.verifying).toBe('正在验证 DNS…');
    expect(DNS_STATES.verified).toBe('已验证 DNS');
  });
});

describe('unavailable combinations are explained, not disabled', () => {
  it('refuses an external domain with email access', () => {
    expect(tierEmailConflict('external', true)).toBe(EXTERNAL_DOMAIN_EMAIL_CONFLICT);
  });

  it('allows the other tiers with email access', () => {
    expect(tierEmailConflict('defaultCraft', true)).toBeNull();
    expect(tierEmailConflict('customCraft', true)).toBeNull();
    expect(tierEmailConflict('external', false)).toBeNull();
  });

  it('keeps the two reason sentences verbatim', () => {
    expect(EXTERNAL_DOMAIN_EMAIL_CONFLICT).toBe('外部域名不能与邮箱访问限制同时使用。');
    expect(EMAIL_REVERT_TO_CRAFT).toBe(
      '要启用电子邮件访问，你必须恢复到此特定文档的默认 craft.me 链接。',
    );
  });
});

describe('disconnecting', () => {
  it('falls back to the default craft.me host', () => {
    expect(hostAfterDisconnect()).toBe('craft.me');
  });

  it('keeps the disconnect description verbatim', () => {
    expect(DISCONNECT_DESC).toBe('断开后，共享页面将在 craft.me 域上可用，但你可以设置一个新的自定义域。');
  });
});
