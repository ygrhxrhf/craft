import { config } from 'dotenv';

// The actions write through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '', name: '张三' as string | null }));
vi.mock('@/lib/auth/auth', () => ({
  auth: async () => ({ user: { id: session.userId, name: session.name } }),
}));

const { getDb } = await import('@/prisma/db');
const {
  registerOAuthClient,
  loadAuthorizeRequest,
  approveAuthorization,
  exchangeOAuthCode,
} = await import('./oauth');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let email = '';
const CLIENT = `site-${crypto.randomUUID().slice(0, 8)}`;
const REDIRECT = 'https://example.com/callback';

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  email = `g227-${userId.slice(0, 8)}@example.com`;
  await db.orm.public.User.create({
    id: userId,
    email,
    name: '张三',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  await registerOAuthClient({ clientId: CLIENT, name: '示例站点', redirectUris: [REDIRECT] });
});

afterAll(async () => {
  const codes = await db.orm.public.OAuthCode.where({ userId }).all();
  for (const c of codes) await db.orm.public.OAuthCode.where({ id: String((c as any).id) }).delete();
  const clients = await db.orm.public.OAuthClient.where({ clientId: CLIENT }).all();
  for (const c of clients) await db.orm.public.OAuthClient.where({ id: String((c as any).id) }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('Sign in with Craft (G227)', () => {
  it('loads a registered client and its whitelisted redirect', async () => {
    const req = await loadAuthorizeRequest({ clientId: CLIENT, redirectUri: REDIRECT, state: 'xyz' });
    expect(req).toMatchObject({ clientId: CLIENT, clientName: '示例站点', state: 'xyz' });
  });

  it('refuses an unregistered client or a redirect not on the whitelist', async () => {
    expect(await loadAuthorizeRequest({ clientId: 'nope', redirectUri: REDIRECT })).toBeNull();
    expect(await loadAuthorizeRequest({ clientId: CLIENT, redirectUri: 'https://evil.example/cb' })).toBeNull();
  });

  it('approving mints a code and returns the redirect with it, plus the welcome greeting', async () => {
    session.userId = userId;
    session.name = '张三';
    const result = await approveAuthorization({ clientId: CLIENT, redirectUri: REDIRECT, state: 'xyz' });
    expect(result).not.toBeNull();
    const url = new URL(result!.redirectTo);
    expect(url.searchParams.get('code')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe('xyz');
    // `login.auth.greeting.welcome`「欢迎，[0]」。
    expect(result!.greeting).toBe('欢迎，张三');
  });

  it('exchanges the code once for the identity, then refuses reuse', async () => {
    session.userId = userId;
    const approved = await approveAuthorization({ clientId: CLIENT, redirectUri: REDIRECT });
    const code = new URL(approved!.redirectTo).searchParams.get('code')!;

    const first = await exchangeOAuthCode({ code, clientId: CLIENT, redirectUri: REDIRECT });
    expect(first.outcome).toBe('success');
    if (first.outcome !== 'success') return;
    expect(first.user).toMatchObject({ id: userId, name: '张三', email });

    // 一次性：同一枚码再换就失败（`login.auth.greeting.sorry`）。
    const second = await exchangeOAuthCode({ code, clientId: CLIENT, redirectUri: REDIRECT });
    expect(second.outcome).toBe('failure');
    if (second.outcome !== 'failure') return;
    expect(second.reason).toBe('code_reused_or_mismatch');
    expect(second.greeting).toBe('很抱歉，张三');
  });

  it('refuses a code presented with a different redirect_uri', async () => {
    session.userId = userId;
    const approved = await approveAuthorization({ clientId: CLIENT, redirectUri: REDIRECT });
    const code = new URL(approved!.redirectTo).searchParams.get('code')!;
    const bad = await exchangeOAuthCode({ code, clientId: CLIENT, redirectUri: 'https://example.com/other' });
    expect(bad.outcome).toBe('failure');
  });

  it('refuses an unknown code', async () => {
    const result = await exchangeOAuthCode({ code: 'nope', clientId: CLIENT, redirectUri: REDIRECT });
    expect(result.outcome).toBe('failure');
  });
});
