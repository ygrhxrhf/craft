// src/app/api/v1/events/route.ts
import { AuthorizationError, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { getSharedPoller } from '@/lib/sync/poller';

export const dynamic = 'force-dynamic';

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return Response.json({ error: 'unauthorized' }, {
      status: e instanceof AuthorizationError ? 401 : 500,
    });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));   // 立即触发 EventSource open
      const poller = getSharedPoller(getDb);
      poller.start();
      const off = poller.subscribe(userId, (msg) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)); }
        catch { off(); }
      });
      cleanup = off;
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    },
  });
}
