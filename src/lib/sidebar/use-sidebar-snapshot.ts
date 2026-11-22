'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSidebarSnapshot } from '@/actions/sidebar/snapshot';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { readOfflineSidebarSnapshot } from './offline-snapshot';

type Snapshot = Awaited<ReturnType<typeof getSidebarSnapshot>>;

/**
 * One fetch shared by every sidebar section. The cache is module-level and keyed by
 * the reload signal plus the route: the four trees mount in the same commit, so the
 * first one starts the request and the rest read the same promise. Keyed on the
 * pathname as well as the version because collection and whiteboard creation does
 * not bump the tree -- navigating into the new entity is what surfaces it.
 */
let cached: { key: string; promise: Promise<Snapshot> } | null = null;

/** 首屏快照等这么久还没回来，就不再假装「还在加载」：挂住和失败在用户眼里是同一件事。 */
const SNAPSHOT_TIMEOUT_MS = 12_000;

export interface SidebarSnapshotState {
  snapshot: Snapshot | null;
  /** 这一版 key 没拿到数据（请求失败，或超时）——不是「还在路上」。 */
  failed: boolean;
  retry: () => void;
}

/**
 * 读侧唯一入口。失败以前是「什么都不做」：快照仍是 null，四个分区就永远停在「加载中…」，
 * 用户看到的是一个永远转不完的圈。而实际上请求**不一定 reject**——服务端 action 卡住、
 * 开发态编译排队、连接被中途断开，promise 就一直挂在那里。所以这里是两道闸：
 *   1) reject → 立刻标记这一版失败；
 *   2) 超时未回 → 同样标记失败（挂住和失败对用户是一回事）。
 * 重试就是 bump 一次 treeVersion：key 变了 ⇒ 重新发同一份请求，旧的 failed 自动对不上。
 */
export function useSidebarSnapshotState(): SidebarSnapshotState {
  const treeVersion = useSidebarStore((state) => state.treeVersion);
  const bumpTree = useSidebarStore((state) => state.bumpTree);
  const pathname = usePathname();
  const userId = useSession().data?.user?.id ?? null;
  const key = `${treeVersion}:${pathname}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  // 记的是"哪一版失败了"，不是布尔值：重试让 key 变掉，fail 就自动对不上而复位。
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 服务端快照回来后，镜像兜底不许再覆盖它。
    let serverDone = false;

    /**
     * 服务端快照拿不到时的底座：本地镜像。断网冷启动时本地库有全量元数据，
     * 树却停在「加载中…」——壳能开、能写，但从侧栏打不开任何东西。
     * 空账号与"从没同步过"靠 `pulled` 分开（见 offline-snapshot.ts）。
     */
    const fromMirror = async (): Promise<void> => {
      if (cancelled || serverDone) return;
      const mirror = await readOfflineSidebarSnapshot(userId).catch(() => null);
      if (cancelled || serverDone) return;
      if (mirror && (mirror.pulled || mirror.rowCount > 0)) {
        setSnapshot(mirror.snapshot as unknown as Snapshot);
        setFailedKey(null);
      } else {
        setFailedKey(key);
      }
    };

    // 离线不等 12 秒：navigator 已经说了没网，快照不可能回来。
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    // 超时与 reject 共用同一个标记；先落定的一方生效。
    const timer = setTimeout(() => {
      if (!cancelled) void fromMirror();
    }, offline ? 0 : SNAPSHOT_TIMEOUT_MS);
    if (cached?.key !== key) {
      const promise = getSidebarSnapshot();
      cached = { key, promise };
      promise.catch(() => {
        // A failed reload must not be replayed from the cache forever.
        if (cached?.key === key) cached = null;
      });
    }
    cached.promise.then(
      (value) => {
        serverDone = true;
        clearTimeout(timer);
        if (!cancelled) {
          setSnapshot(value);
          setFailedKey(null);
        }
      },
      () => {
        clearTimeout(timer);
        void fromMirror();
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, userId]);

  return { snapshot, failed: failedKey === key, retry: bumpTree };
}

export function useSidebarSnapshot(): Snapshot | null {
  return useSidebarSnapshotState().snapshot;
}
