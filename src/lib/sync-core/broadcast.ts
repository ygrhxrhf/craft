// src/lib/sync-core/broadcast.ts
export interface EventSourceLike {
  close(): void;
  onopen: null | (() => void);
  onmessage: null | ((ev: { data: string }) => void);
  onerror: null | (() => void);
}

export interface Broadcaster {
  start(): void;
  stop(): void;
  isLive(): boolean;
}

export function createBroadcaster(opts: {
  onMeta: () => void;
  pollMs?: number;      // 30_000（spec）
  debounceMs?: number;  // 500（spec）
  eventSourceFactory?: () => EventSourceLike;
}): Broadcaster {
  const pollMs = opts.pollMs ?? 30_000;
  const debounceMs = opts.debounceMs ?? 500;
  const factory =
    opts.eventSourceFactory ??
    (() => new EventSource('/api/v1/events') as unknown as EventSourceLike);

  let es: EventSourceLike | null = null;
  let live = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const trigger = () => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      opts.onMeta();
    }, debounceMs);
  };
  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => opts.onMeta(), pollMs);
  };
  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
  const connect = () => {
    es = factory();
    es.onopen = () => {
      live = true;
      stopPolling();
    };
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.t === 'meta') trigger();
      } catch {
        /* 心跳/坏帧忽略 */
      }
    };
    es.onerror = () => {
      live = false;
      startPolling();
    };
  };

  return {
    start: connect,
    stop() {
      es?.close();
      es = null;
      stopPolling();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },
    isLive: () => live,
  };
}
