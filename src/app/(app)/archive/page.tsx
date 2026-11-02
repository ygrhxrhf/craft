import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/auth';
import { getArchivedDocuments } from '@/actions/document/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { ArchiveList } from '@/components/document/ArchiveList';

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const documents = await getArchivedDocuments();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="归档" />
      <AppPageContainer>
        <ArchiveList documents={documents} />
      </AppPageContainer>
    </div>
  );
}
