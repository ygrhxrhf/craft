import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Folder as FolderIcon } from 'lucide-react';

import { auth } from '@/lib/auth/auth';
import { getFolderPage } from '@/actions/folder/get';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from '@/components/document/DocumentCard';
import { FolderPinnedSection } from '@/components/folder/FolderPinnedSection';

interface FolderRouteProps {
  params: Promise<{ id: string }>;
}

/** G121：`craft://folder/{id}` 的真实落点 —— 文件夹自身、直属子文件夹与文档。 */
export default async function FolderRoute({ params }: FolderRouteProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const page = await getFolderPage(id);
  if (!page) notFound();

  const { folder, children, documents, pinned } = page;

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title={folder.name} />
      <AppPageContainer>
        {/* G338：官方 `Folder pinned doc` 事件的落点——一个槽位，拖放即固定。 */}
        <FolderPinnedSection folderId={folder.id} pinned={pinned} />

        {children.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">文件夹</h2>
            <BrowseGrid>
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/folders/${child.id}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-body transition-colors hover:bg-foreground/[0.03]"
                >
                  {child.icon ? (
                    <span>{child.icon}</span>
                  ) : (
                    <FolderIcon className="size-4 text-foreground/40" />
                  )}
                  <span className="truncate">{child.name}</span>
                </Link>
              ))}
            </BrowseGrid>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium">{folder.name}</h2>
          {documents.length > 0 ? (
            <BrowseGrid>
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </BrowseGrid>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              此文件夹中没有文档。
            </div>
          )}
        </section>
      </AppPageContainer>
    </div>
  );
}
