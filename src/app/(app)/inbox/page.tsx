import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDocuments } from '@/actions/document/get';
import { getFolders } from '@/actions/folder/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { InboxList } from '@/components/document/InboxList';
import { INBOX_DESC, UNSORTED_TITLE } from '@/lib/browse/official-copy';

/** `/inbox` (G45): the unsorted collection — documents that belong to no folder. */
export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [documents, folders] = await Promise.all([getDocuments(), getFolders()]);

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={UNSORTED_TITLE} />
      <AppPageContainer>
        <p className="mb-4 text-sm text-muted-foreground">{INBOX_DESC}</p>
        <InboxList documents={documents} folders={folders} />
      </AppPageContainer>
    </div>
  );
}
