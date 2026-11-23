import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getSharedWithMeDocuments } from '@/actions/document/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { SharedWithMeView } from '@/components/document/SharedWithMeView';
import { requestNow } from '@/lib/app/request-clock';

export default async function SharedWithMePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const documents = await getSharedWithMeDocuments(50);

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="与我共享" />
      <AppPageContainer>
        <SharedWithMeView documents={documents} now={requestNow()} />
      </AppPageContainer>
    </div>
  );
}
