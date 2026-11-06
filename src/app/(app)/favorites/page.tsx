import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getFavoriteDocuments } from '@/actions/document/get';
import { StarredGrid } from '@/components/document/StarredGrid';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { STARRED_EMPTY, STARRED_PRIVACY } from '@/lib/browse/official-copy';
import { Star } from 'lucide-react';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const favoriteDocs = await getFavoriteDocuments();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="收藏" />
      <AppPageContainer>
        <p className="mb-4 text-sm text-foreground/55">{STARRED_PRIVACY}</p>
        {favoriteDocs.length > 0 ? (
          <StarredGrid documents={favoriteDocs.map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }))} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Star className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-ui leading-[15.6px] text-foreground/55">{STARRED_EMPTY}</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
