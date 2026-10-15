import { listMentionCandidates, type MentionCandidate } from '@/actions/document/members';
import { readPendingRows, type PendingRow } from './local-records';
import { userDisplayOf } from './user-display';
import { hydrateUserDisplay } from './user-display-persist';

interface Display {
  name: string | null;
  email: string;
}

/**
 * G1507（纯函数）：把人加进协作者的那一瞬间，正文里的 `@` 就该点名得到那枚人——
 * 名单是这台设备上刚做的那笔动作的直接后果，而成员行此刻还躺在 2s 去抖队列里，
 * 服务端那一次 fetch 读不到它。叠法与 R-18 的回收站同源（`TrashList.tsx` 的 `overlayTrashRows`）：
 * 本机意图即时可见，服务端权威行随后收敛。
 *
 * 只认 `data.documentId === documentId` 的 upsert 行：改权限那种 patch 只带 `{role}`，
 * 天然落在这一筛之外（那个人本来就在服务端名单里）；别篇文档的成员不会被端进这一篇。
 *
 * ☆ 显示名学不到的那一枚**不收**：mention 落进正文是一枚 chip，标不出名字就是一枚隐形 chip，
 * 那比"名单里暂时还没有他"更糟。
 */
export function overlayMentionCandidates(
  server: MentionCandidate[],
  pending: Map<string, PendingRow>,
  documentId: string,
  displayOf: (userId: string) => Display | null,
): MentionCandidate[] {
  const known = new Set(server.map((c) => c.userId));
  const out = [...server];
  for (const row of pending.values()) {
    if (row.op !== 'upsert') continue;
    const data = row.data as { documentId?: unknown; userId?: unknown } | undefined;
    if (!data || data.documentId !== documentId) continue;
    const userId = typeof data.userId === 'string' ? data.userId : '';
    if (!userId || known.has(userId)) continue;
    const display = displayOf(userId);
    if (!display) continue;
    known.add(userId);
    out.push({ userId, name: display.name, email: display.email });
  }
  return out;
}

/** 服务端候选 ＋ 本机 pending 成员行。两处 `@`（正文与评论）都走这一枚。 */
export async function loadMentionCandidates(documentId: string): Promise<MentionCandidate[]> {
  // G1520：先把落库的显示名并回内存缓存，pending 行才标得出名字（刷新后仍在）。
  await hydrateUserDisplay();
  const server = await listMentionCandidates(documentId);
  const pending = await readPendingRows('document_member');
  return overlayMentionCandidates(server, pending, documentId, userDisplayOf);
}
