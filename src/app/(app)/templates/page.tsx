import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getTemplates } from '@/actions/document/get';
import { TemplateCard } from '@/components/document/TemplateCard';
import { FOLDER_EMPTY } from '@/lib/browse/official-copy';
import { LayoutTemplate } from 'lucide-react';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const templates = await getTemplates();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="我的模板" />
      <AppPageContainer>
        {templates.length > 0 ? (
          <BrowseGrid>
            {templates.map(doc => (
              <TemplateCard key={doc.id} document={doc} />
            ))}
          </BrowseGrid>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <LayoutTemplate className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{FOLDER_EMPTY}</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
