import { NextRequest } from 'next/server';
import { exchangeOAuthCode } from '@/actions/auth/oauth';

export const dynamic = 'force-dynamic';

/**
 * G227 —— 外部站点拿授权码换身份：`POST /api/v1/oauth/token`
 * body `{ code, client_id, redirect_uri }` ⇒ `{ user }` 或失败句。
 * 码一次性（换过即失效），且必须与注册时的回调地址一致。
 */
export async function POST(req: NextRequest) {
  let body: { code?: string; client_id?: string; redirect_uri?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  if (!body.code || !body.client_id || !body.redirect_uri) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const result = await exchangeOAuthCode({
    code: body.code,
    clientId: body.client_id,
    redirectUri: body.redirect_uri,
  });
  if (result.outcome === 'failure') {
    return Response.json({ error: result.reason, greeting: result.greeting }, { status: 400 });
  }
  return Response.json({ user: result.user, greeting: result.greeting }, { headers: { 'Cache-Control': 'no-store' } });
}
