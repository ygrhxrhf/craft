import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { loadAuthorizeRequest } from '@/actions/auth/oauth';
import { AuthorizePanel } from '@/components/auth/AuthorizePanel';

/**
 * G227 —— `Sign in with Craft` 的授权页（外部站点弹窗打开的那一屏）。
 * 未登录先送去登录并带回跳；client 未注册或回调不在白名单 ⇒ 一句拒绝，不给任何授权面。
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; redirect_uri?: string; state?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client_id ?? '';
  const redirectUri = params.redirect_uri ?? '';
  const state = params.state ?? null;

  const session = await auth();
  if (!session?.user?.id) {
    const next = `/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const request = await loadAuthorizeRequest({ clientId, redirectUri, state });
  if (!request) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-[17px] font-semibold">无法授权</h1>
        <p className="text-[13px] text-foreground/55">这个站点未注册，或回调地址不在允许列表里。</p>
      </div>
    );
  }

  return <AuthorizePanel request={request} />;
}
