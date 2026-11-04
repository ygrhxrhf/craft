'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { requestEditAccess, type RequestEditAccessStatus } from '@/actions/document/access-requests';
import { REQUEST_SENT } from '@/lib/share/request-access-copy';

/**
 * Viewer-side entry for the approval flow (G04). The link is view-only, so the
 * only thing this button does is create a pending request; it never widens the
 * visitor's role locally.
 */
export function RequestEditAccess({ identifier }: { identifier: string }) {
  const [status, setStatus] = useState<RequestEditAccessStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestEditAccess(identifier);
        setStatus(result.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求没有发出，请重试');
      }
    });
  };

  if (status === 'requested' || status === 'pending') {
    return <span className="text-meta text-foreground/40">{REQUEST_SENT}</span>;
  }
  if (status === 'already-member') {
    return <span className="text-meta text-foreground/40">你已是协作者</span>;
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
      <Button size="sm" variant="outline" onClick={submit} disabled={pending}>
        {pending ? '发送中…' : '请求编辑'}
      </Button>
    </span>
  );
}
