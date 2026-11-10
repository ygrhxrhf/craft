'use client';

import { useState } from 'react';
import { approveAuthorization, type AuthorizeRequest } from '@/actions/auth/oauth';
import { SIGN_IN_SUCCESS_CLOSE } from '@/lib/auth/sign-in-copy';

/**
 * G227 —— 授权弹窗的两态：同意面（站点要访问你的 Craft 账号）与完成态
 * （`login.auth.success.close`「你现在可以关闭此窗口了。」）。
 * 同意后授权页把 `code` 带回外部站点，**这一屏**停在完成态——用户看到的是"可以关窗了"。
 */
export function AuthorizePanel({ request }: { request: AuthorizeRequest }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await approveAuthorization({
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        state: request.state,
      });
      if (!result) {
        setError('没有完成授权，请重试');
        return;
      }
      setDone(true);
      // 把 code 交回外部站点（弹窗里的跳转）。完成态文案留在本屏。
      window.location.href = result.redirectTo;
    } catch {
      setError('没有完成授权，请重试');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-[17px] font-semibold">{SIGN_IN_SUCCESS_CLOSE}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[17px] font-semibold">使用 Craft 登录</h1>
      <p className="text-[13px] text-foreground/55">
        「{request.clientName}」想要使用你的 Craft 账号。授权后它会拿到你的姓名与邮箱。
      </p>
      {error && (
        <p role="status" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void approve()}
          data-testid="authorize-approve"
          className="rounded-lg bg-(--craft-accent) px-4 py-2 text-[13px] font-medium text-white"
        >
          授权
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg px-4 py-2 text-[13px] text-foreground/55 hover:bg-foreground/4"
        >
          取消
        </button>
      </div>
    </div>
  );
}
