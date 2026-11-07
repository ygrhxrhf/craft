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
  /** G94 `tag_reorder`：整批写入的 0…n-1 顺序；缺省按 0 处理。 */
  order?: number;
  /** G607 `tag_pin`：置顶标签排在整批顺序之前。 */
  pinned?: boolean;
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

/**
 * G175 —— 标签名的**大小写两档显示**。只换显示，不换存下来的名字（同一条标签在两种档下仍指同一行）。
 * 官方这两档的标签文案未采集到逐字，`TAG_CASE_LABELS` 是本地措辞。
 */
export type TagCaseMode = 'asTyped' | 'lowercase';

export const TAG_CASE_MODES: readonly TagCaseMode[] = ['asTyped', 'lowercase'] as const;

export const TAG_CASE_LABELS: Record<TagCaseMode, string> = {
  asTyped: '按原样',
  lowercase: '全部小写',
};

export function formatTagLabel(name: string, mode: TagCaseMode): string {
  return mode === 'lowercase' ? name.toLocaleLowerCase('zh-CN') : name;
}

export const TAG_CASE_STORAGE_KEY = 'craft.tags.case';

let cachedCaseMode: TagCaseMode | null = null;
const caseListeners = new Set<() => void>();

/** 两档存本机：这是显示偏好，不是标签数据。 */
export function readTagCaseMode(storage: { getItem(key: string): string | null }): TagCaseMode {
  const raw = storage.getItem(TAG_CASE_STORAGE_KEY);
  return raw === 'lowercase' ? 'lowercase' : 'asTyped';
}

export function writeTagCaseMode(
  storage: { setItem(key: string, value: string): void },
  mode: TagCaseMode,
): boolean {
  cachedCaseMode = mode;
  let saved = true;
  try {
    storage.setItem(TAG_CASE_STORAGE_KEY, mode);
  } catch {
    saved = false;
  }
  for (const listener of caseListeners) listener();
  return saved;
}

/** 客户端快照；服务端按「按原样」渲染，水合才对得上（与侧栏那面旗同一套形态）。 */
export function readTagCaseModeNow(): TagCaseMode {
  if (typeof localStorage === 'undefined') return 'asTyped';
  if (!cachedCaseMode) cachedCaseMode = readTagCaseMode(localStorage);
  return cachedCaseMode;
}

export function subscribeTagCaseMode(listener: () => void): () => void {
  caseListeners.add(listener);
  return () => {
    caseListeners.delete(listener);
  };
}

export function serverTagCaseMode(): TagCaseMode {
  return 'asTyped';
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

/** G94：拖过的标签按 `order` 排；全是默认 0 时退回原来的篇数/名称序。G607：置顶永远在前。 */
function byOrderThenCount(a: TagBrowseGroup, b: TagBrowseGroup): number {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
  const ao = a.order ?? 0;
  const bo = b.order ?? 0;
  if (ao !== bo) return ao - bo;
  return byCountThenName(a, b);
}

function sortGroup(group: TagBrowseGroup): TagBrowseGroup {
  return { ...group, children: group.children.slice().sort(byOrderThenCount) };
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

  const sortedRoots = roots.map(sortGroup).sort(byOrderThenCount);
  const byId = new Map<string, TagBrowseGroup>();
  for (const group of sortedRoots) {
    byId.set(group.id, group);
    for (const child of group.children) byId.set(child.id, child);
  }

  return { groups: sortedRoots, byId, tagCount: tags.length };
}
