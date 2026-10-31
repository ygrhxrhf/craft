import { AuthorizationError, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { getSharedPoller } from '@/lib/sync/poller';
import { isNotificationMessage } from '@/lib/notification/channel';

export const dynamic = 'force-dynamic';

/**
 * G42: the dedicated notification channel. It reads the same in-process poller as
 * `/api/v1/events` but forwards only batches that touch the `notification` table.
 * RTC is a separate concern and is not implemented here.
 */
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
      controller.enqueue(encoder.encode(': connected\n\n'));
      const poller = getSharedPoller(getDb);
      poller.start();
      const off = poller.subscribe(userId, (msg) => {
        if (!isNotificationMessage(msg)) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          off();
        }
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
