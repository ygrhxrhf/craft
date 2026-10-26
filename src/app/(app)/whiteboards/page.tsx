import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDeletedWhiteboards, getWhiteboards } from '@/actions/whiteboard/whiteboard';
import { WhiteboardRestoreButton } from '@/components/whiteboard/WhiteboardLifecycleButtons';
import { CreateWhiteboardButton } from './CreateWhiteboardButton';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { BrowseGrid } from '@/components/app/BrowseGrid';

export default async function WhiteboardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [boards, deleted] = await Promise.all([getWhiteboards(), getDeletedWhiteboards()]);

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

        {/*
          白板不进回收站（回收站只认 Document 表），删除后的恢复入口就在这一档。
          ☆ 没有它，删掉的白板既打不开（getWhiteboard 返回 null）也无处恢复。
        */}
        {deleted.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              最近删除（{deleted.length}）
            </h2>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {deleted.map((board) => (
                <li key={board.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xl leading-none">{board.icon ?? '🎨'}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{board.name}</span>
                  {board.deletedAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(board.deletedAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  <WhiteboardRestoreButton id={board.id} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </AppPageContainer>
    </div>
  );
}
