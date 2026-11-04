'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { requestViewAccess, type RequestEditAccessStatus } from '@/actions/document/access-requests';
import { REQUEST_ACCESS_FAILED, REQUEST_ACCESS_TITLE, REQUEST_SENT } from '@/lib/share/request-access-copy';

/**
 * G75：查看者侧的「想要查看」入口。与编辑请求同一条待处理队列（role `requested_view`），
 * 批准后落 `viewer`。这里只在"链接不给任何角色"的分享档位下出现——能看的人不需要请求。
 */
export function RequestViewAccess({ identifier }: { identifier: string }) {
  const [status, setStatus] = useState<RequestEditAccessStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestViewAccess(identifier);
        setStatus(result.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : REQUEST_ACCESS_FAILED);
      }
    });
  };

  if (status === 'requested' || status === 'pending') {
    return <span className="text-meta text-foreground/40">{REQUEST_SENT}</span>;
  }
  if (status === 'already-member') {
    return <span className="text-meta text-foreground/40">你已有查看权限</span>;
  }
  if (status === 'already-editor') {
    return <span className="text-meta text-foreground/40">你已有编辑权限</span>;
  }
  if (status === 'owner' || status === 'unavailable' || status === 'signed-out') {
    return null;
  }

  return (
    <span className="flex items-center gap-2">
      {error && <span role="status" className="text-meta text-destructive">{error}</span>}
      <Button size="sm" variant="outline" onClick={submit} disabled={pending} data-testid="request-view-access">
        {pending ? '发送中…' : REQUEST_ACCESS_TITLE}
      </Button>
    </span>
  );
}
