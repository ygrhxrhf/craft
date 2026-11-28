import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDocuments } from '@/actions/document/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { InboxList } from '@/components/document/InboxList';
import { buildPreviewSrc } from '@/lib/preview/signature';
import { UNSORTED_TITLE } from '@/lib/browse/official-copy';
import { requestNow } from '@/lib/app/request-clock';

/** `/inbox` (G45): the unsorted collection — documents that belong to no folder. */
export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // G19：官方收件箱的文档是卡片（带预览），所以这里要发签名 URL —— 与「所有文档」同一口径。
  // 页头说明句去掉：craft 的收件箱只有标题 + 卡片网格。
  const documents = (await getDocuments()).map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }));

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={UNSORTED_TITLE} plus="document" />
      <AppPageContainer>
        <InboxList documents={documents} now={requestNow()} />
      </AppPageContainer>
    </div>
  );
}
