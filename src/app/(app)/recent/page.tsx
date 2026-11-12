import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getRecentDocuments } from '@/actions/document/get';
import { DocumentCard } from '@/components/document/DocumentCard';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { Clock } from 'lucide-react';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';

export default async function RecentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const recentDocs = await getRecentDocuments(50);
  // 卡片副行的「已更新 N」必须在服务端只取一次时钟：SSR 与 hydration 各取一次会撞 Hydration failed。
  const now = Date.now();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="最近编辑" />
      <AppPageContainer>
        {recentDocs.length > 0 ? (
          <BrowseGrid>
            {recentDocs.map(doc => (
              <DocumentCard key={doc.id} document={{ ...doc, previewSrc: buildPreviewSrc(doc) }} now={now} />
            ))}
          </BrowseGrid>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Clock className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">还没有最近编辑的文档</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
