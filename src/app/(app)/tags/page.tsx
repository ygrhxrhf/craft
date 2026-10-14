import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { getDocuments } from '@/actions/document/get';
import { getTagBrowseRows } from '@/actions/tag/tag';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import {
  ALL_TAGS,
  TAGS_EMPTY,
  TAGS_TITLE,
  formatDocCount,
  formatTagCount,
} from '@/lib/browse/official-copy';
import { buildTagTree, tagLevel, type TagBrowseGroup } from '@/lib/browse/tag-browse';

function TagRow({ group, nested = false }: { group: TagBrowseGroup; nested?: boolean }) {
  return (
    <li>
      <Link
        href={`/tags/${group.id}`}
        className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors hover:bg-foreground/4"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: group.color }}
        />
        {/* A nested row sits under its parent already, so only its own level is repeated. */}
        <span className="min-w-0 flex-1 truncate">
          {nested ? tagLevel(group.name).leaf : group.name}
        </span>
        <span className="shrink-0 text-muted-foreground">{formatDocCount(group.documentCount)}</span>
      </Link>
      {group.children.length > 0 && (
        <ul className="ml-5 border-l border-border/60 pl-2">
          {group.children.map((child) => (
            <TagRow key={child.id} group={child} nested />
          ))}
        </ul>
      )}
    </li>
  );
}

/** `/tags` (G47): the tags collection — every tag with its document count, children nested. */
export default async function TagsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [{ tags, links }, documents] = await Promise.all([getTagBrowseRows(), getDocuments()]);
  const tree = buildTagTree(tags, links, documents);

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={TAGS_TITLE} />
      <AppPageContainer>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{TAGS_EMPTY}</p>
        ) : (
          <section>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {ALL_TAGS}
              </h2>
              <span className="text-[11px] text-muted-foreground">{formatTagCount(tree.tagCount)}</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {tree.groups.map((group) => (
                <TagRow key={group.id} group={group} />
              ))}
            </ul>
          </section>
        )}
      </AppPageContainer>
    </div>
  );
}
