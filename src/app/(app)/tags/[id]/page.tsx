import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDocuments } from '@/actions/document/get';
import { getTagBrowseRows } from '@/actions/tag/tag';
import { DocumentCard } from '@/components/document/DocumentCard';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { NO_DOCS_FOUND, formatDocCount } from '@/lib/browse/official-copy';
import { buildTagTree } from '@/lib/browse/tag-browse';
import { Tag } from 'lucide-react';
import { requestNow } from '@/lib/app/request-clock';

interface TagPageProps {
  params: Promise<{ id: string }>;
}

/** One tag's documents (G47): the count on `/tags` and the list here come from the same join. */
export default async function TagDetailPage({ params }: TagPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const [{ tags, links }, documents] = await Promise.all([getTagBrowseRows(), getDocuments()]);
  const group = buildTagTree(tags, links, documents).byId.get(id);
  if (!group) notFound();
  // 卡片副行的「已更新 N」必须在服务端只取一次时钟：SSR 与 hydration 各取一次会撞 Hydration failed。
  const now = requestNow();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={group.name} />
      <AppPageContainer>
        <p className="mb-4 text-[13px] text-muted-foreground">{formatDocCount(group.documents.length)}</p>
        {group.documents.length > 0 ? (
          <BrowseGrid>
            {group.documents.map((doc) => (
              <DocumentCard key={doc.id} document={{ ...doc, previewSrc: buildPreviewSrc(doc) }} now={now} />
            ))}
          </BrowseGrid>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Tag className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{NO_DOCS_FOUND}</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
