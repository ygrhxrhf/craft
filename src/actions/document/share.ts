'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { normalizeShareSlug } from '@/lib/share/slug';
import { isSharePermission, normalizeSharePermission, tierOpensToLink, type DocumentSharePermission } from '@/lib/share/permission';
import { findShare, isOpenableShare } from '@/lib/share/resolve';
import { isExpired } from '@/lib/share/publishing-options';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export interface ShareState {
  /**
   * 那一枚 `document_share` 行的 id。面板要靠它把档位写进离线内核——行是这边刚建的、
   * 本地镜像里可能还没有，没有 id 就只剩"退回服务端 action"这一条路（G1491）。
   */
  id: string;
  token: string;
  slug: string | null;
  isPublished: boolean;
  hasPasscode: boolean;
  permission: DocumentSharePermission;
  /** G38：发布页是否显示作者（官方 showAuthor 默认 true）。 */
  showAuthor: boolean;
  /** G1534：visual.options 其余四组（官方默认值见 `publishing.md:17`）。 */
  showPageTitle: boolean;
  hideTableOfContents: boolean;
  hidePresentationMode: boolean;
  showWatermark: boolean;
  /** G143：搜索引擎索引（官方默认 false；与口令互斥）。 */
  enableSeo: boolean;
  /** G1535：链接到期（ISO 日期或 null＝永不过期）。 */
  expiresAt: string | null;
  /** G141: the remaining publish settings of the official 13. */
  commentLevel: string;
  enableObjectLinks: boolean;
  showDuplicateAsTemplate: boolean;
  emailBasedAccessEnabled: boolean;
  hideHashTagWords: boolean;
  defaultDomain: string | null;
  /**
   * 档位每改一次就 +1，访客那条按旧档授权的连接据此被判为过期。客户端改档走 `applyLocal`，
   * 它拿得到这一枚才可能算出「比服务端已知的那次更大」的下一个数（G1491）。
   */
  shareVersion: number;
}

function stateOf(s: any): ShareState {
  return {
    id: s.id,
    token: s.token,
    slug: s.slug ?? null,
    isPublished: s.isPublished,
    hasPasscode: !!s.passcode,
    // G131：旧行存的是三档（view/edit/collaborators）⇒ 读侧归一到五档（view→linkView、edit→linkEdit）。
    permission: normalizeSharePermission(s.permission) ?? 'collaborators',
    showAuthor: s.showAuthor !== false,
    showPageTitle: s.showPageTitle !== false,
    hideTableOfContents: s.hideTableOfContents === true,
    hidePresentationMode: s.hidePresentationMode === true,
    showWatermark: s.showWatermark !== false,
    enableSeo: s.enableSeo === true,
    expiresAt: s.expiresAt ? String(s.expiresAt) : null,
    // G141: the remaining publish settings.
    commentLevel: typeof s.commentLevel === 'string' ? s.commentLevel : 'add',
    enableObjectLinks: s.enableObjectLinks === true,
    showDuplicateAsTemplate: s.showDuplicateAsTemplate === true,
    emailBasedAccessEnabled: s.emailBasedAccessEnabled === true,
    hideHashTagWords: s.hideHashTagWords === true,
    defaultDomain: typeof s.defaultDomain === 'string' && s.defaultDomain ? s.defaultDomain : null,
    shareVersion: s.shareVersion ?? 0,
  };
}

async function emitShare(db: any, userId: string, documentId: string): Promise<void> {
  await emitSyncEventSafe(db, userId, ['document_share'], documentId);
}

export async function getOrCreateShare(documentId: string): Promise<ShareState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  const existing = await db.orm.public.DocumentShare
    .where({ documentId })
    .limit(1)
    .all();

  if (existing.length > 0) return stateOf(existing[0]);

  await db.orm.public.DocumentShare.create({
    id: crypto.randomUUID(),
    documentId,
    token: crypto.randomUUID(),
  });
  await emitShare(db, session.user.id, documentId);

  const created = await db.orm.public.DocumentShare
    .where({ documentId })
    .limit(1)
    .all();

  return stateOf(created[0]);
}

export async function setSharePublished(documentId: string, isPublished: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.DocumentShare.where({ documentId }).update({ isPublished });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

/**
 * Picks the tier of the public link. Every change counts a new share version, so a
 * connection authorized under the previous tier can be recognized as stale;
 * re-picking the live tier must not count, or a visitor mid-edit would be dropped
 * for no reason.
 */
export async function setSharePermission(documentId: string, permission: unknown): Promise<ShareState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  // G131：写入归一到五档——旧三档（view/edit）也接受并落成规范值（linkView/linkEdit），
  // 免得一枚陈旧镜像回放时整批 400。
  const tier = normalizeSharePermission(permission);
  if (!tier) throw new Error('无效的分享权限');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || doc.userId !== session.user.id) throw new Error('未授权');

  const state = await getOrCreateShare(documentId);
  if (state.permission === tier) return state;

  const rows = await db.orm.public.DocumentShare.where({ documentId }).limit(1).all();
  const shareVersion = (rows[0]?.shareVersion ?? 0) + 1;
  await db.orm.public.DocumentShare.where({ documentId }).update({ permission: tier, shareVersion });
  // ☆ 这一枚此前没有（其余三处都有）＝他端不会被通知这次改档，只能等下一次自己进面板时重读
  //   （G1491）。它现在只服务"本地镜像里还没有这一行"那一档回退，走的就是同一条广播。
  await emitShare(db, session.user.id, documentId);

  return await getOrCreateShare(documentId);
}

/** G1535：链接到期（ISO 日期或 null＝永不过期；镜像缺行时的回退路）。 */
export async function setShareExpiry(documentId: string, expiresAt: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.DocumentShare.where({ documentId }).update({ expiresAt });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

/** G1534：visual.options 四组的开关（镜像没有那一行时的回退路；有行走 `applyLocal`）。 */
export async function setShareVisualOption(
  documentId: string,
  key:
    | 'showPageTitle'
    | 'hideTableOfContents'
    | 'hidePresentationMode'
    | 'showWatermark'
    | 'enableSeo'
    // G141: the boolean publish settings added later.
    | 'enableObjectLinks'
    | 'showDuplicateAsTemplate'
    | 'emailBasedAccessEnabled'
    | 'hideHashTagWords',
  value: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.DocumentShare.where({ documentId }).update({ [key]: value });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

/** G38：发布页「显示作者」开关（镜像没有那一行时的回退路；有行走 `applyLocal`）。 */
export async function setShareShowAuthor(documentId: string, showAuthor: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.DocumentShare.where({ documentId }).update({ showAuthor });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

export async function setSharePasscode(documentId: string, passcode: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.DocumentShare.where({ documentId }).update({
    passcode: passcode && passcode.trim() ? passcode.trim() : null,
  });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

export async function setShareSlug(documentId: string, rawSlug: string | null): Promise<ShareState & { error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');

  const trimmed = rawSlug?.trim() ?? '';
  if (!trimmed) {
    await db.orm.public.DocumentShare.where({ documentId }).update({ slug: null });
    await emitShare(db, session.user.id, documentId);
    return await getOrCreateShare(documentId);
  }

  const normalized = normalizeShareSlug(trimmed);
  if (!normalized.ok) return { ...(await getOrCreateShare(documentId)), error: normalized.error };

  const taken = await db.orm.public.DocumentShare.first({ slug: normalized.slug });
  if (taken && (taken as any).documentId !== documentId) {
    return { ...(await getOrCreateShare(documentId)), error: '该地址已被其它文档使用' };
  }

  await db.orm.public.DocumentShare.where({ documentId }).update({ slug: normalized.slug });
  await emitShare(db, session.user.id, documentId);
  return await getOrCreateShare(documentId);
}

/** Accepts either the human slug or the share token. */
export async function getSharedDocument(identifier: string) {
  const db = await getDb();
  const share = await findShare(identifier);
  // The gate lives here rather than in the page because this module is
  // `'use server'`: a client can call the action without going through any route.
  if (!isOpenableShare(share)) return null;
  const s = share as any;

  // G04：第三档「仅限有访问权限的协作者」**不给链接任何角色** ⇒ 链接本身打不开文档（打开它要靠
  //   ownership／membership）。判据与 `resolveShareAccess` 同一枚纯函数，避免两处各写一遍。
  if (!tierOpensToLink(s.permission)) return null;

  // G1535：链接到期是独立一轴 ⇒ 到期后与"未发布"同档（两条形状都打不开）。
  if (isExpired(s.expiresAt ? String(s.expiresAt) : null)) return null;

  const doc = await db.orm.public.Document.first({ id: s.documentId });
  if (!doc || (doc as any).isDeleted) return null;

  const d = doc as any;
  // G38：署名要显示作者名 ⇒ 公开页得拿到它。作者就是文档所有者，取 name（缺则退邮箱）。
  // ☆ 关掉「显示作者」时**不查、不回传**：隐藏了却把名字照样发给客户端，等于没隐藏。
  const showAuthor = s.showAuthor !== false;
  let authorName: string | null = null;
  if (showAuthor) {
    const owner = await db.orm.public.User.first({ id: d.userId });
    authorName = (owner as any)?.name?.trim() || (owner as any)?.email || null;
  }

  return {
    id: d.id,
    title: d.title,
    icon: d.icon,
    coverImage: d.coverImage,
    coverType: d.coverType,
    content: d.content,
    pageStyle: d.pageStyle,
    updatedAt: d.updatedAt,
    plainText: d.plainText,
    isPublished: s.isPublished,
    // G131：同上——公开页读到的也是归一后的五档。
    permission: normalizeSharePermission(s.permission) ?? 'collaborators',
    passcodeProtected: !!s.passcode,
    showAuthor: s.showAuthor !== false,
    authorName,
    showPageTitle: s.showPageTitle !== false,
    showWatermark: s.showWatermark !== false,
    hideTableOfContents: s.hideTableOfContents === true,
    hidePresentationMode: s.hidePresentationMode === true,
    enableSeo: s.enableSeo === true,
    expiresAt: s.expiresAt ? String(s.expiresAt) : null,
  };
}
