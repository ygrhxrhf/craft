import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { getSharedDocument } from '@/actions/document/share';
import { SharedDocView } from '@/components/share/SharedDocView';
import { PublicDocBanner } from '@/components/share/PublicDocBanner';
import { PasscodeGate } from '@/components/share/PasscodeGate';
import { shareCookieName, verifyShareCookie } from '@/lib/share-passcode';
import { findShare } from '@/lib/share/resolve';
import { authorByline } from '@/lib/share/author-visibility';
import { normalizeSharePermission } from '@/lib/share/permission';

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedPage({ params }: SharedPageProps) {
  const { token } = await params;
  const doc = await getSharedDocument(token);

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-ui text-foreground/40">链接无效或文档已删除</p>
      </div>
    );
  }

  if (doc.passcodeProtected) {
    const share = await findShare(token);
    const passcode = (share as any)?.passcode ?? null;
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(shareCookieName(token))?.value;
    if (!verifyShareCookie(token, passcode, cookieValue)) {
      return (
        <PasscodeGate token={token} path={`/s/${token}`} title={doc.title} icon={doc.icon} />
      );
    }
  }

  // Opening the document in collaborative mode is only an intent: the server decides the
  // role when the editor asks for a connection claim, so a visitor the link does not
  // authorize stays read-only no matter what this branch renders.
  const session = await auth();
  // G131：可协作编辑的档是 linkEdit（旧值 edit 归一而来）与 editAndComment——两者都给登录访客
  // 编辑权；linkView/viewAndComment 只读。角色最终由服务端在连接声明时裁定，这里只是意图。
  const tier = normalizeSharePermission(doc.permission);
  const collaborative = (tier === 'linkEdit' || tier === 'editAndComment') && Boolean(session?.user?.id);

  return (
    <SharedDocView
      documentId={doc.id}
      title={doc.title}
      icon={doc.icon}
      coverImage={doc.coverImage}
      coverType={doc.coverType}
      content={doc.content}
      collaborative={collaborative}
      authorByline={doc.showAuthor ? authorByline(doc.authorName) : null}
      showPageTitle={doc.showPageTitle}
      followBlockLinks={doc.enableObjectLinks}
      header={
        <PublicDocBanner
          collaborative={collaborative}
          showWatermark={doc.showWatermark}
          identifier={token}
          signedIn={Boolean(session?.user?.id)}
          permission={doc.permission}
          loginNext={`/s/${token}`}
          duplicateAsTemplate={doc.showDuplicateAsTemplate}
        />
      }
    />
  );
}
