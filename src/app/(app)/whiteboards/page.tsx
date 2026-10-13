import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getWhiteboards } from '@/actions/whiteboard/whiteboard';
import { CreateWhiteboardButton } from './CreateWhiteboardButton';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';

export default async function WhiteboardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const boards = await getWhiteboards();

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="白板" actions={<CreateWhiteboardButton />} />
      <AppPageContainer>
        {boards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              还没有白板，点击右上角按钮创建第一个
            </p>
          </div>
        ) : (
          <BrowseGrid>
            {boards.map((board) => (
              <a
                key={board.id}
                href={`/whiteboards/${board.id}`}
                className="group flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl leading-none">{board.icon ?? '🎨'}</span>
                  <h3 className="flex-1 truncate font-medium">{board.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(board.updatedAt).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </a>
            ))}
          </BrowseGrid>
        )}
      </AppPageContainer>
    </div>
  );
}
