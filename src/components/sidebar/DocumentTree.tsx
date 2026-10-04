'use client';

import { useSidebarSnapshot } from '@/lib/sidebar/use-sidebar-snapshot';
import { DocumentTreeItem } from './DocumentTreeItem';

export interface Document {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  folderId: string | null;
  isDeleted: boolean;
  isDailyNote: boolean;
  updatedAt: string;
  order: number;
}

interface DocumentTreeProps {
  folderId?: string | null;
}

export function DocumentTree({ folderId = null }: DocumentTreeProps) {
  const snapshot = useSidebarSnapshot();

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

  const documents = snapshot.documents as Document[];
  const rootDocuments = documents
    .filter(d => d.folderId === folderId && d.parentId === null)
    .sort((a, b) => a.order - b.order);

  if (rootDocuments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {rootDocuments.map(doc => (
        <DocumentTreeItem
          key={doc.id}
          document={doc}
          allDocuments={documents}
          level={0}
        />
      ))}
    </div>
  );
}
