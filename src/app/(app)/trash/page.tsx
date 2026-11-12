import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDeletedDocuments } from '@/actions/document/get';
import { TrashList } from '@/components/document/TrashList';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { TRASH_TITLE } from '@/lib/browse/trash-copy';

export default async function TrashPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const deletedDocs = await getDeletedDocuments();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={TRASH_TITLE} />
      <AppPageContainer>
        <TrashList documents={deletedDocs} now={Date.now()} />
      </AppPageContainer>
    </div>
  );
}
