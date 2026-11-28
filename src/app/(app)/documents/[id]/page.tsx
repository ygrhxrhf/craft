import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDocument } from '@/actions/document/get';
import { DocumentEditor } from '@/components/editor/DocumentEditor';

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const doc = await getDocument(id);

  // 读不到就不再静默退回列表：`redirect('/documents')` 让人以为「点了没反应」，
  // 而真实原因可能是这篇文档还没推到服务端（本地新建、上一轮同步失败）。
  // 停在这一页说清楚，并给一枚重试（整页重取，不走客户端缓存）。
  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-ui font-medium text-foreground">无法打开这篇文档</p>
        <p className="max-w-sm text-meta text-foreground/55">
          它可能已被删除，或者暂时还读不到服务端的数据。改动仍留在本机，同步恢复后可以再打开。
        </p>
        <div className="mt-1 flex items-center gap-2">
          <a
            href={`/documents/${id}`}
            className="rounded-md border border-border px-3 py-1.5 text-ui font-medium transition-colors hover:bg-foreground/[0.04]"
          >
            重试
          </a>
          <Link
            href="/documents"
            className="rounded-md px-3 py-1.5 text-ui text-foreground/60 transition-colors hover:bg-foreground/[0.04]"
          >
            返回所有文档
          </Link>
        </div>
      </div>
    );
  }

  // G1660：顶栏右侧那枚头像取账号首字（官方是同一枚）。
  return (
    <DocumentEditor
      document={doc}
      role={doc.role}
      userInitial={session.user?.name?.slice(0, 1) ?? '我'}
    />
  );
}
