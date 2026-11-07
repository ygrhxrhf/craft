import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDocuments } from '@/actions/document/get';
import { getTagBrowseRows } from '@/actions/tag/tag';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { TagTreeList } from '@/components/browse/TagTreeList';
import {
  ALL_TAGS,
  TAGS_EMPTY,
  TAGS_TITLE,
  formatTagCount,
} from '@/lib/browse/official-copy';
import { buildTagTree } from '@/lib/browse/tag-browse';
import { TagsVisibilityGate } from './tags-visibility-gate';

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
        {/* G174：空间里关掉「使用标签」后，标签在所有位置隐藏（含本页）。 */}
        <TagsVisibilityGate>
          {tags.length === 0 ? (
            <p className="text-ui leading-[15.6px] text-foreground/55">{TAGS_EMPTY}</p>
          ) : (
            <section>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {ALL_TAGS}
                </h2>
                <span className="text-[11px] text-foreground/55">{formatTagCount(tree.tagCount)}</span>
              </div>
              <TagTreeList groups={tree.groups} />
            </section>
          )}
        </TagsVisibilityGate>
      </AppPageContainer>
    </div>
  );
}
