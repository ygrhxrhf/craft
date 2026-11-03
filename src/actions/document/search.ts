'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { extractBlocks } from '@/lib/search/extract';
import { snippetAround, type Snippet } from '@/lib/search/highlight';

export interface SearchResultDoc {
  id: string;
  title: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultBlock {
  documentId: string;
  documentTitle: string;
  text: string;
  /** G1286: the match is marked inside the snippet. */
  snippet: Snippet;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultRow {
  collectionId: string;
  collectionName: string;
  itemId: string;
  text: string;
}

export interface SearchResultFolder {
  id: string;
  title: string;
}

export interface SearchResult {
  documents: SearchResultDoc[];
  /** G387: folder hits are their own kind in the official result list. */
  folders: SearchResultFolder[];
  blocks: SearchResultBlock[];
  rows: SearchResultRow[];
  nextOffset: number | null;
}

const PAGE_SIZE = 20;

export interface LinkCandidate {
  id: string;
  title: string;
  icon: string | null;
}

export async function searchDocumentsForLink(query: string): Promise<LinkCandidate[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const q = query.trim();
  const db = await getDb();

  const base = db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false });

  if (!q) {
    const recent = await base
      .orderBy((d: any) => d.updatedAt.desc())
      .limit(5)
      .all();
    return recent.map((d: any) => ({ id: d.id, title: d.title, icon: d.icon }));
  }

  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const matches = await base
    .where((d: any) => d.title.ilike(pattern))
    .orderBy((d: any) => d.updatedAt.desc())
    .limit(8)
    .all();

  return matches.map((d: any) => ({ id: d.id, title: d.title, icon: d.icon }));
}

export async function searchAll(query: string, offset = 0): Promise<SearchResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const q = query.trim();
  if (!q) return { documents: [], folders: [], blocks: [], rows: [], nextOffset: null };

  const db = await getDb();
  const uid = session.user.id;
  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const titleMatches = await db.orm.public.Document
    .where({ userId: uid, isDeleted: false })
    .where((d: any) => d.title.ilike(pattern))
    .orderBy((d: any) => d.updatedAt.desc())
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  const contentMatches = await db.orm.public.Document
    .where({ userId: uid, isDeleted: false })
    .where((d: any) => d.plainText.ilike(pattern))
    .orderBy((d: any) => d.updatedAt.desc())
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  // Tag hits are document matches too — Craft folds them into the same list.
  const taggedDocs: SearchResultDoc[] = [];
  const tagMatches = await db.orm.public.Tag
    .where({ userId: uid, deletedAt: null })
    .where((t: any) => t.name.ilike(pattern))
    .limit(5)
    .all();
  for (const tag of tagMatches) {
    const links = await db.orm.public.DocumentTag
      .where({ tagId: (tag as any).id, deletedAt: null })
      .all();
    for (const link of links) {
      // `first()` with a boolean in the filter silently misses, so the flag is
      // checked after loading.
      const doc = await db.orm.public.Document.first({
        id: (link as any).documentId,
        userId: uid,
      });
      if (doc && doc.isDeleted !== true) {
        taggedDocs.push({
          id: (doc as any).id,
          title: (doc as any).title,
          icon: (doc as any).icon,
          createdAt: (doc as any).createdAt,
          updatedAt: (doc as any).updatedAt,
        });
      }
    }
  }

  const seen = new Set<string>();
  const documents: SearchResultDoc[] = [
    ...titleMatches.map((d: any) => ({
      id: d.id,
      title: d.title,
      icon: d.icon,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    ...taggedDocs,
  ].filter((doc) => (seen.has(doc.id) ? false : (seen.add(doc.id), true)));

  const matchedIds = new Set(documents.map((d) => d.id));

  const blocks: SearchResultBlock[] = [];
  for (const doc of contentMatches) {
    const d = doc as any;
    const docBlocks = extractBlocks(d.content);
    const lowerQ = q.toLowerCase();
    const hits = docBlocks
      .filter((b) => b.text.toLowerCase().includes(lowerQ))
      .slice(0, 3);
    for (const hit of hits) {
      blocks.push({
        documentId: d.id,
        documentTitle: d.title,
        text: hit.text.length > 120 ? hit.text.slice(0, 120) + '…' : hit.text,
        snippet: snippetAround(hit.text, q),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
      if (blocks.length >= 12) break;
    }
    if (!matchedIds.has(d.id) && documents.length < 20 && hits.length > 0) {
      documents.push({
        id: d.id,
        title: d.title,
        icon: d.icon,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
      matchedIds.add(d.id);
    }
    if (blocks.length >= 12) break;
  }

  const rows = offset === 0 ? await searchCollectionRows(db, uid, q) : [];

  const hasMore = titleMatches.length === PAGE_SIZE || contentMatches.length === PAGE_SIZE;

  const folderRows = await db.orm.public.Folder
    .where({ userId: uid, deletedAt: null })
    .where((f: any) => f.name.ilike(pattern))
    .limit(5)
    .all();
  const folders: SearchResultFolder[] = folderRows.map((f: any) => ({ id: f.id, title: f.name }));

  return { documents, folders, blocks, rows, nextOffset: hasMore ? offset + PAGE_SIZE : null };
}

/** Collection rows are searched by their stored cell text. */
async function searchCollectionRows(
  db: any,
  userId: string,
  query: string
): Promise<SearchResultRow[]> {
  // The Json field proxy has no `ilike` -- measured `TypeError: v.value.ilike is not a
  // function`, which threw on every call: the palette's try/finally has no catch, so a user
  // just got no rows back and no error. Scope is resolved first, then the text is matched here.
  const collections = (await db.orm.public.Collection
    .where({ userId, isDeleted: false })
    .all()) as Record<string, unknown>[];
  if (collections.length === 0) return [];

  const collectionIds: string[] = [];
  const byCollection = new Map<string, Record<string, unknown>>();
  for (const c of collections) {
    collectionIds.push(String(c.id));
    byCollection.set(String(c.id), c);
  }

  const items = (await db.orm.public.CollectionItem
    .where((m: any) => m.collectionId.in(collectionIds))
    .where({ deletedAt: null })
    .all()) as Record<string, unknown>[];
  if (items.length === 0) return [];

  const itemIds: string[] = [];
  const byItem = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    itemIds.push(String(item.id));
    byItem.set(String(item.id), item);
  }

  const values = (await db.orm.public.CollectionValue
    .where((v: any) => v.itemId.in(itemIds))
    .where({ deletedAt: null })
    .all()) as Record<string, unknown>[];

  const needle = query.toLowerCase();
  const rows: SearchResultRow[] = [];
  const seen = new Set<string>();
  for (const entry of values) {
    const itemId = String(entry.itemId);
    if (seen.has(itemId)) continue;

    let text: unknown = entry.value;
    if (typeof text === 'string') {
      try {
        text = JSON.parse(text);
      } catch {
        /* keep the raw string */
      }
    }
    const rendered = Array.isArray(text) ? text.join(', ') : String(text ?? '');
    if (!rendered.toLowerCase().includes(needle)) continue;

    const item = byItem.get(itemId);
    const collection = item ? byCollection.get(String(item.collectionId)) : undefined;
    if (!collection) continue;

    seen.add(itemId);
    rows.push({
      collectionId: String(collection.id),
      collectionName: String(collection.name ?? ''),
      itemId,
      text: rendered,
    });
    if (rows.length >= 6) break;
  }
  return rows;
}
