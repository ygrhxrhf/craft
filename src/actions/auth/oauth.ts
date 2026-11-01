'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import {
  SIGN_IN_SUCCESS_CLOSE,
  signInGreeting,
} from '@/lib/auth/sign-in-copy';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AuthorizeRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  /** 发起授权的站点名（弹窗标题用）。 */
  state: string | null;
}

/**
 * G227 —— **Sign in with Craft**：Craft 作为外部站点的身份提供方。
 * 第一步：外部站点把用户带到 `/authorize?client_id=…&redirect_uri=…`；这里校验该 client
 * 已注册且回调地址在白名单里，返回给授权页渲染"某某要使用你的 Craft 账号"。
 */
export async function loadAuthorizeRequest(input: {
  clientId: string;
  redirectUri: string;
  state?: string | null;
}): Promise<AuthorizeRequest | null> {
  const db = await getDb();
  const client = await db.orm.public.OAuthClient.first({ clientId: input.clientId });
  if (!client) return null;
  const uris = Array.isArray((client as any).redirectUris) ? ((client as any).redirectUris as string[]) : [];
  if (!uris.includes(input.redirectUri)) return null;
  return {
    clientId: input.clientId,
    clientName: String((client as any).name ?? input.clientId),
    redirectUri: input.redirectUri,
    state: input.state ?? null,
  };
}

/**
 * G227 —— 用户点「授权」：铸一枚**一次性**授权码落库，返回带 `code` 的回调地址。
 * 站点拿 `code` 调 `exchangeOAuthCode` 换身份。取消授权则返回 null（不回跳）。
 */
export async function approveAuthorization(input: {
  clientId: string;
  redirectUri: string;
  state?: string | null;
}): Promise<{ redirectTo: string; greeting: string | null } | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const client = await db.orm.public.OAuthClient.first({ clientId: input.clientId });
  if (!client) throw new Error('未知的站点');
  const uris = Array.isArray((client as any).redirectUris) ? ((client as any).redirectUris as string[]) : [];
  if (!uris.includes(input.redirectUri)) throw new Error('回调地址不在白名单');

  const code = crypto.randomUUID().replace(/-/g, '');
  await db.orm.public.OAuthCode.create({
    id: crypto.randomUUID(),
    code,
    clientId: input.clientId,
    userId: session.user.id,
    redirectUri: input.redirectUri,
  });

  const url = new URL(input.redirectUri);
  url.searchParams.set('code', code);
  if (input.state) url.searchParams.set('state', input.state);
  return {
    redirectTo: url.toString(),
    // G227：授权成功打招呼（`login.auth.greeting.welcome`「欢迎，[0]」）。
    greeting: signInGreeting('success', session.user.name),
  };
}

/** G227 完成态那句固定文案（授权页成功后展示）。 */
export async function signInCompletion(): Promise<string> {
  return SIGN_IN_SUCCESS_CLOSE;
}

/**
 * G227 —— 站点拿授权码换身份。码**一次性**（换过就失效），且必须与注册时的回调地址一致。
 * 失败返回 `{ outcome: 'failure', greeting }`（`login.auth.greeting.sorry`「很抱歉，[0]」）。
 */
export async function exchangeOAuthCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
}): Promise<
  | { outcome: 'success'; user: { id: string; name: string | null; email: string }; greeting: string | null }
  | { outcome: 'failure'; greeting: string | null; reason: string }
> {
  const db = await getDb();
  const row = await db.orm.public.OAuthCode.first({ code: input.code });
  if (!row) {
    return { outcome: 'failure', greeting: signInGreeting('failure', null), reason: 'invalid_code' };
  }
  const user = await db.orm.public.User.first({ id: String((row as any).userId) });
  const name = (user as any)?.name ?? null;
  if (
    (row as any).consumedAt ||
    (row as any).clientId !== input.clientId ||
    (row as any).redirectUri !== input.redirectUri
  ) {
    return { outcome: 'failure', greeting: signInGreeting('failure', name), reason: 'code_reused_or_mismatch' };
  }

  await db.orm.public.OAuthCode.where({ id: String((row as any).id) }).update({
    consumedAt: new Date().toISOString(),
  });
  return {
    outcome: 'success',
    user: { id: String((user as any).id), name, email: String((user as any).email) },
    greeting: signInGreeting('success', name),
  };
}

/** 注册一个外部站点（clientId 与允许的回调地址）。 */
export async function registerOAuthClient(input: {
  clientId: string;
  name: string;
  redirectUris: string[];
}): Promise<void> {
  const db = await getDb();
  const existing = await db.orm.public.OAuthClient.first({ clientId: input.clientId });
  if (existing) throw new Error('clientId 已被占用');
  await db.orm.public.OAuthClient.create({
    id: crypto.randomUUID(),
    clientId: input.clientId,
    name: input.name,
    redirectUris: input.redirectUris,
  });
}
