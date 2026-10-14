/**
 * Shaping for the tags collection (`/tags`, G47's remaining half).
 *
 * The page reads three tables — tags, the document↔tag links, and the documents the actor may
 * actually see — and this module is the only place that joins them, so a deleted or template page
 * can never inflate a count. Tag names carry the 2-level hierarchy from G169 (`父级/子级`), which is
 * what turns the flat list into the tree the official page shows.
 */
import { HIERARCHY_SEPARATOR } from '@/lib/tag/rules';

export interface TagBrowseTag {
  id: string;
  name: string;
  color: string;
}

export interface TagBrowseLink {
  tagId: string;
  documentId: string;
}

export interface TagBrowseDocument {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
}

export interface TagBrowseGroup extends TagBrowseTag {
  documents: TagBrowseDocument[];
  /** Only the documents carrying this exact tag — a parent row does not absorb its children's. */
  documentCount: number;
  children: TagBrowseGroup[];
}

export interface TagBrowseTree {
  groups: TagBrowseGroup[];
  /** Every group including nested ones, so a page can look a tag up by id in one pass. */
  byId: Map<string, TagBrowseGroup>;
  tagCount: number;
}

/** A tag name is either `父级` or `父级/子级`; anything else is read as a flat name. */
export function tagLevel(name: string): { parent: string | null; leaf: string } {
  const at = name.indexOf(HIERARCHY_SEPARATOR);
  if (at <= 0 || at === name.length - 1) return { parent: null, leaf: name };
  return { parent: name.slice(0, at), leaf: name.slice(at + 1) };
}

function byCountThenName(a: TagBrowseGroup, b: TagBrowseGroup): number {
  if (b.documentCount !== a.documentCount) return b.documentCount - a.documentCount;
  return a.name.localeCompare(b.name, 'zh-CN');
}

function sortGroup(group: TagBrowseGroup): TagBrowseGroup {
  return { ...group, children: group.children.slice().sort(byCountThenName) };
}

export function buildTagTree(
  tags: readonly TagBrowseTag[],
  links: readonly TagBrowseLink[],
  documents: readonly TagBrowseDocument[],
): TagBrowseTree {
  const visible = new Map(documents.map((doc) => [doc.id, doc]));
  const docsByTag = new Map<string, TagBrowseDocument[]>();
  for (const link of links) {
    const doc = visible.get(link.documentId);
    if (!doc) continue;
    const bucket = docsByTag.get(link.tagId) ?? [];
    bucket.push(doc);
    docsByTag.set(link.tagId, bucket);
  }

  const toGroup = (tag: TagBrowseTag): TagBrowseGroup => ({
    ...tag,
    documents: (docsByTag.get(tag.id) ?? []).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    documentCount: (docsByTag.get(tag.id) ?? []).length,
    children: [],
  });

  const groups = tags.map(toGroup);
  const byName = new Map<string, TagBrowseGroup>();
  for (const group of groups) {
    // Two tags cannot share a name per user, so the first sighting is the only one.
    if (!byName.has(group.name)) byName.set(group.name, group);
  }

  const roots: TagBrowseGroup[] = [];
  for (const group of groups) {
    const { parent, leaf } = tagLevel(group.name);
    const parentGroup = parent === null ? undefined : byName.get(parent);
    if (parentGroup && parentGroup !== group && leaf) {
      parentGroup.children.push(group);
      continue;
    }
    roots.push(group);
  }

  const sortedRoots = roots.map(sortGroup).sort(byCountThenName);
  const byId = new Map<string, TagBrowseGroup>();
  for (const group of sortedRoots) {
    byId.set(group.id, group);
    for (const child of group.children) byId.set(child.id, child);
  }

  return { groups: sortedRoots, byId, tagCount: tags.length };
}
