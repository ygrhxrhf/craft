import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getRecentDocuments } from '@/actions/document/get';
import { getFavoriteDocuments } from '@/actions/document/get';
import { getFolders } from '@/actions/folder/get';
import { locationPathLabel } from '@/lib/document/location-path';
import { DocumentCard } from '@/components/document/DocumentCard';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { SortableDocGrid } from '@/components/document/SortableDocGrid';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { RichText } from '@/components/ui/rich-text';
import { ONBOARDING_DESC, ONBOARDING_DESC2, ONBOARDING_WELCOME } from '@/lib/i18n/onboarding-copy';

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [recentDocs, favoriteDocs, folders] = await Promise.all([
    getRecentDocuments(8),
    getFavoriteDocuments(),
    getFolders(),
  ]);

  // G250：卡片头第二行是**位置面包屑**（📁 日记 •）。这里按每篇文档解出祖先链（无祖先退到它所在
  //   文件夹、再退到「未分类」），卡片只负责渲染，不自己查库。
  const nodes = recentDocs.map((d) => ({
    id: d.id,
    title: d.title,
    icon: d.icon,
    parentId: d.parentId ?? null,
    folderId: d.folderId ?? null,
  }));
  const folderNodes = folders.map((f) => ({ id: f.id, name: f.name, icon: f.icon }));
  const breadcrumbFor = (doc: { id: string; folderId?: string | null }) =>
    locationPathLabel(nodes, doc.id, folderNodes);

  const favoriteCards = favoriteDocs.map((doc) => ({
    ...doc,
    breadcrumb: breadcrumbFor(doc),
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="文档" />
      <AppPageContainer>
        {/* G15：craft 的 /all 首屏只有卡片网格；本地那条五按钮快捷条已撤（入口改挂侧栏与顶栏）。 */}
        {favoriteDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">收藏</h2>
            <BrowseGrid>
              {favoriteCards.slice(0, 6).map(doc => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </BrowseGrid>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium">最近编辑</h2>
          {recentDocs.length > 0 ? (
            <SortableDocGrid documents={recentDocs.map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }))} folders={folderNodes} />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              {/* G320：官方那句带 `<br/>`（`onboarding.welcome.to.craft.desc`），走 RichText
                  渲染而不是把标签原样打印出来。 */}
              <p className="text-lg font-medium">{ONBOARDING_WELCOME}</p>
              <RichText
                value={ONBOARDING_DESC}
                className="mt-1 block text-sm text-foreground/55"
              />
              <p className="mt-1 text-xs text-foreground/55">{ONBOARDING_DESC2}</p>
            </div>
          )}
        </section>
      </AppPageContainer>
    </div>
  );
}
