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
          // G22：craft 的空态是 1120×72、radius 10、bg rgba(26,28,30,.03)、无虚线边框。
          <div className="flex min-h-[72px] flex-col items-center justify-center rounded-[10px] bg-foreground/[0.03] px-4 text-center">
            <LayoutTemplate className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-ui leading-[15.6px] text-foreground/55">{FOLDER_EMPTY}</p>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
