// src/components/sync/create-local.ts
// 新建文档/文件夹的本地创建通道（brief 映射：本地先生成 id + applyLocal）。
// 与 local-records.ts 分文件：本模块静态引 Server Action，而 local-records 的
// 纯逻辑测试（mergePending 等）不该把 next-auth/next/server 拖进测试模块图。
import { getSyncManager } from '@/lib/sync-core';
import { createDocument } from '@/actions/document/create';
import { createFolder } from '@/actions/folder/create';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';

/**
 * 新建文档（brief 映射：本地先生成 crypto.randomUUID()，applyLocal 全字段）。
 * flushNow 让服务端在跳转前可见（离线时 flush 短路，op 留在队列，离线可用）。
 * 仅建元数据；模板/副本等带正文的创建仍走服务端 action（正文不在 P1 同步通道）。
 * session 尚未就绪时退回服务端 create（与迁移前行为一致，避免点击无响应）。
 */
export async function createDocumentLocal(input: {
  userId?: string;
  title?: string;
  parentId?: string | null;
  folderId?: string | null;
}): Promise<string> {
  if (!input.userId) {
    const doc = await createDocument({
      title: input.title ?? '',
      parentId: input.parentId ?? null,
      folderId: input.folderId ?? null,
    });
    return doc.id;
  }
  const id = crypto.randomUUID();
  const manager = getSyncManager();
  // G151：新建文档套用「设为文档默认」的自定义样式。从本地镜像取（customStyle 是同步表），
  // 不能调 listCustomStyles 服务端 action——Next 按页面串行执行客户端 action，它会排在编辑器
  // 自身的 POST 后面十几秒，把「点击→跳转」整条关键路径拖过 20 s（第 535 批实测）。
  let defaultPageStyle: Record<string, unknown> | null = null;
  try {
    const store = await manager.readyStore();
    const styles = await store.all('customStyle');
    const candidates = styles
      .filter((s) => s.op !== 'delete' && (s.data as Record<string, unknown> | undefined)?.isDefault === true)
      .sort((a, b) => {
        const orderA = Number(a.data?.order ?? 0);
        const orderB = Number(b.data?.order ?? 0);
        return orderA - orderB || String(a.data?.createdAt ?? '').localeCompare(String(b.data?.createdAt ?? ''));
      });
    const style = candidates.pop()?.data?.style;
    defaultPageStyle = style && typeof style === 'object' ? (style as Record<string, unknown>) : null;
  } catch {
    defaultPageStyle = null;
  }
  await manager.applyLocal({
    table: 'document',
    id,
    patch: {
      // userId 不在 document 的同步列里（服务端按会话强制），带上只会吃 G1492 告警。
      title: input.title ?? '',
      parentId: input.parentId ?? null,
      folderId: input.folderId ?? null,
      icon: null,
      coverImage: null,
      coverType: null,
      width: null,
      pageStyle: defaultPageStyle,
      isTemplate: false,
      isDailyNote: false,
      dailyNoteDate: null,
    },
  });
  await manager.flushNow();
  return id;
}

/** 新建文件夹（同上；router.refresh 前先推服务端）。 */
export async function createFolderLocal(input: {
  userId?: string;
  name?: string;
  parentId?: string | null;
}): Promise<string> {
  if (!input.userId) {
    const folder = await createFolder({
      name: input.name ?? UNTITLED_FOLDER,
      parentId: input.parentId ?? null,
    });
    return folder.id;
  }
  const userId = input.userId;
  const id = crypto.randomUUID();
  const manager = getSyncManager();
  const parentId = input.parentId ?? null;
  // 与服务端 createFolder 同一条落点规则（同层末尾）：本地行若固定写 0，在已拖动重排过
  // 的层里会先插到前面、ack 后再跳到末尾。读不到镜像时退回 0（仍由 createdAt 兜到末尾）。
  let order = 0;
  try {
    const store = await manager.readyStore();
    const siblings = await store.all('folder');
    const maxOrder = siblings
      .filter(
        (s) =>
          s.op !== 'delete' &&
          (((s.data?.parentId as string | null | undefined) ?? null) === parentId),
      )
      .reduce((max, s) => Math.max(max, (s.data?.order as number | undefined) ?? 0), -1);
    order = maxOrder + 1;
  } catch {
    order = 0;
  }
  await manager.applyLocal({
    table: 'folder',
    id,
    patch: {
      userId,
      name: input.name ?? UNTITLED_FOLDER,
      parentId,
      icon: null,
      order,
      isDeleted: false,
      deletedAt: null,
    },
  });
  await manager.flushNow();
  return id;
}
