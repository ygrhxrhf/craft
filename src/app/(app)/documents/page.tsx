import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getRecentDocuments } from '@/actions/document/get';
import { getFolders } from '@/actions/folder/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { SortableDocGrid } from '@/components/document/SortableDocGrid';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { RichText } from '@/components/ui/rich-text';
import { ONBOARDING_DESC, ONBOARDING_DESC2, ONBOARDING_WELCOME } from '@/lib/i18n/onboarding-copy';

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [recentDocs, folders] = await Promise.all([getRecentDocuments(8), getFolders()]);

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

  // 卡片副行的「已更新 N」必须在服务端只取一次时钟：SSR 与 hydration 各取一次会撞 Hydration failed。
  const now = Date.now();

  return (
    <div className="flex-1 overflow-y-auto">
      {/* G1649：官方该屏标题是「所有文档」，不是「文档」。 */}
      <AppPageHeader title="所有文档" plus="document" />
      <AppPageContainer>
        {/* G1649/G1662：官方 /all 的标题下**直接**就是卡片网格 —— 既没有「最近编辑」小标题，
            也没有「收藏」分区（收藏在 /starred 单独成页）。此前本地这两层把网格从 y=116 推到
            y=200，首屏因此少一整行卡片。 */}
        <section>
          {recentDocs.length > 0 ? (
            <SortableDocGrid documents={recentDocs.map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }))} folders={folderNodes} now={now} />
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
