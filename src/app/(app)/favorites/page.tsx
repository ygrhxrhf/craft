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
          <StarredGrid
            documents={favoriteDocs.map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }))}
            now={Date.now()}
          />
        ) : (
          // G22/G33：craft 空态是 1120×72、radius 10、bg rgba(26,28,30,.03)、无虚线边框，文案 13/15.6/α0.55。
          <div className="flex min-h-[72px] flex-col items-center justify-center rounded-[10px] bg-foreground/[0.03] px-4 text-center">
            <Star className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-ui leading-[15.6px] text-foreground/55">{STARRED_EMPTY}</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
