/**
 * 附件离线队列（spec ch.7）：浏览器端排队、指数退避重试、按 name+size+type 去重。
 *
 * 退避阶梯与 P1 sync-core 逐字一致（[2s..300s] 封顶）。两处保持独立常量而不是抽公共模块：
 * 附件队列与同步队列的失败语义不同（前者是单文件传输，后者是批量 LWW 推送），
 * 共用一个可变数组反而会让两边的重试节奏被隐式绑在一起。同步测试断言两边数值相同。
 */
export const BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000];
export const MAX_TRIES = 3;   // spec 12：连续 3 次失败转 error

export type AttachmentJob = {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  tries: number;
  nextRetryAt: string | null;
  createdAt: string;
};

export interface AttachmentStore {
  init(): Promise<void>;
  enqueue(job: AttachmentJob): Promise<void>;
  dueJobs(nowIso: string): Promise<AttachmentJob[]>;
  ack(id: string): Promise<void>;
  bumpTry(id: string, nextRetryAt: string): Promise<void>;
  count(): Promise<number>;
  manifestHas(key: string): Promise<boolean>;
  manifestPut(key: string): Promise<void>;
}

export function manifestKey(name: string, size: number, type: string): string {
  return `${name}:${size}:${type}`;
}

function delayFor(attempt: number): number {
  return BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
}

export function createAttachmentQueue(deps: {
  store: AttachmentStore;
  upload: (job: AttachmentJob) => Promise<{ key: string }>;
  onError?: (jobs: AttachmentJob[]) => void;
}) {
  const { store, upload, onError } = deps;

  return {
    async enqueue(job: Omit<AttachmentJob, 'tries' | 'nextRetryAt' | 'createdAt'>) {
      await store.enqueue({ ...job, tries: 0, nextRetryAt: null, createdAt: new Date().toISOString() });
    },

    async flush(nowIso: string = new Date().toISOString()) {
      let uploaded = 0;
      for (;;) {
        const [job] = await store.dueJobs(nowIso);
        if (!job) return { uploaded, status: 'ok' as const };

        // 已传过的同名同尺寸同类型：直接出队，不重传也不计数。
        if (await store.manifestHas(manifestKey(job.name, job.size, job.type))) {
          await store.ack(job.id);
          continue;
        }

        try {
          await upload(job);
        } catch {
          const attempt = job.tries + 1;
          // 攒到上限就放弃这条，onError 交给上层提示用户；continue 让同批剩下的任务继续跑。
          if (attempt >= MAX_TRIES) {
            await store.ack(job.id);
            onError?.([job]);
            continue;
          }
          const at = new Date(Date.parse(nowIso) + delayFor(attempt)).toISOString();
          await store.bumpTry(job.id, at);
          // 只推迟这一条：同批其它任务不该被一条坏文件拖住。
          return { uploaded, status: 'network' as const };
        }

        // 清单只在传输成功后写 —— 失败时写会让下次 flush 误判为已传，把文件永远丢掉。
        await store.manifestPut(manifestKey(job.name, job.size, job.type));
        await store.ack(job.id);
        uploaded += 1;
      }
    },

    pendingCount: () => store.count(),
    markUploaded: (key: string) => store.manifestPut(key),
    isUploaded: (key: string) => store.manifestHas(key),
  };
}

export function createMemoryAttachmentStore(): Promise<AttachmentStore> {
  const jobs = new Map<string, AttachmentJob>();
  const manifest = new Set<string>();
  return Promise.resolve({
    async init() {},
    async enqueue(job) { jobs.set(job.id, job); },
    async dueJobs(nowIso) {
      return [...jobs.values()]
        .filter(j => j.nextRetryAt === null || j.nextRetryAt <= nowIso)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async ack(id) { jobs.delete(id); },
    async bumpTry(id, nextRetryAt) {
      const j = jobs.get(id);
      if (j) jobs.set(id, { ...j, tries: j.tries + 1, nextRetryAt });
    },
    async count() { return jobs.size; },
    async manifestHas(key) { return manifest.has(key); },
    async manifestPut(key) { manifest.add(key); },
  });
}
