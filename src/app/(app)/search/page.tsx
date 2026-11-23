import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { searchAll } from '@/actions/document/search';
import { DocumentCard } from '@/components/document/DocumentCard';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { searchResultsTitle, noResultsFor } from '@/lib/search/official-copy';
import SearchLauncher from './SearchLauncher';
import { requestNow } from '@/lib/app/request-clock';

/**
 * G1419 — the full results page (第 419 批采样：单一标题＋文档卡列表，每卡带命中数；
 * 不渲染 `document／pages／blocks` 三档分组）。官方入口是快速打开面板里的
 * 「查看更多结果 + 按 Enter 键」行 ⇒ URL `…?q=…&scope=ALL`；`scope` 的取值空间未穷举，
 * 本地接受但不区分。无查询词时回退到面板启动页（旧行为：`?tag=` 仍喂给面板）。
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; tag?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  const q = (params.q ?? '').trim();
  if (!q) {
    return <SearchLauncher />;
  }

  const result = await searchAll(q);
  // 卡片副行的「已更新 N」必须在服务端只取一次时钟：SSR 与 hydration 各取一次会撞 Hydration failed。
  const now = requestNow();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={searchResultsTitle(q)} />
      <AppPageContainer>
        {result.documents.length > 0 ? (
          <BrowseGrid>
            {result.documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={{ ...doc, previewSrc: buildPreviewSrc(doc) }}
                now={now}
              />
            ))}
          </BrowseGrid>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {noResultsFor(q)}
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
