'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { RequestEditAccess } from './RequestEditAccess';
import { normalizeSharePermission } from '@/lib/share/permission';

export function PublicDocBanner({
  collaborative = false,
  showWatermark = true,
  identifier,
  signedIn = false,
  permission,
  loginNext,
}: {
  collaborative?: boolean;
  /** G1534：官方 `showWatermark`（页脚是否提及 Craft），默认显示。 */
  showWatermark?: boolean;
  /** G04：分享 token／slug，查看档访客用它发编辑请求。 */
  identifier?: string;
  signedIn?: boolean;
  permission?: string;
  loginNext?: string;
}) {
  // G131：五档里只有 linkView（旧值 view 归一而来）是"可看不可编"的链接档，请求编辑那枚才对；
  // linkEdit 已是可编辑，其余档（协作者/可评论）走登录提示。
  const tier = normalizeSharePermission(permission);
  return (
    <footer className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background/90 px-6 py-3 backdrop-blur-sm">
      {showWatermark ? (
        <span className="text-meta text-foreground/40">
          由 <Link href="/" className="font-medium text-foreground/55 transition-colors duration-150 ease-craft hover:text-foreground/85">Crafty</Link>
          {' '}生成 · {collaborative ? '可编辑视图' : '只读视图'}
        </span>
      ) : (
        <span className="text-meta text-foreground/40">{collaborative ? '可编辑视图' : '只读视图'}</span>
      )}
      {!collaborative && (
        tier === 'linkView' && signedIn && identifier ? (
          <RequestEditAccess identifier={identifier} />
        ) : (
          <Link
            href={loginNext ? `/login?next=${encodeURIComponent(loginNext)}` : '/login'}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-meta text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
          >
            <LogIn className="size-3.5" />
            {tier === 'linkView' ? '登录后请求编辑' : '登录后编辑'}
          </Link>
        )
      )}
    </footer>
  );
}
