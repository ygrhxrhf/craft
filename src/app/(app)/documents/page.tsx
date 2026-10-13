import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getRecentDocuments } from '@/actions/document/get';
import { getFavoriteDocuments } from '@/actions/document/get';
import { DocumentCard } from '@/components/document/DocumentCard';
import { QuickActions } from '@/components/document/QuickActions';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [recentDocs, favoriteDocs] = await Promise.all([
    getRecentDocuments(8),
    getFavoriteDocuments()
  ]);

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="文档" />
      <AppPageContainer>
        <QuickActions />

        {favoriteDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">收藏</h2>
            <BrowseGrid>
              {favoriteDocs.slice(0, 6).map(doc => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </BrowseGrid>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium">最近编辑</h2>
          {recentDocs.length > 0 ? (
            <BrowseGrid>
              {recentDocs.map(doc => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </BrowseGrid>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                还没有文档，点击左上角 + 创建第一个文档
              </p>
            </div>
          )}
        </section>
      </AppPageContainer>
    </div>
  );
}
