import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/auth';
import { getSharedDocument, getShareGate } from '@/actions/document/share';
import { findShare } from '@/lib/share/resolve';
import { SharedDocView } from '@/components/share/SharedDocView';
import { PublicDocBanner } from '@/components/share/PublicDocBanner';
import { PasscodeGate } from '@/components/share/PasscodeGate';
import { RequestViewAccess } from '@/components/share/RequestViewAccess';
import { REQUEST_ACCESS_SUBTITLE, REQUEST_ACCESS_TITLE } from '@/lib/share/request-access-copy';
import { shareCookieName, verifyShareCookie } from '@/lib/share-passcode';
import { seoEffective } from '@/lib/share/publishing-options';
import { UNTITLED_DOCUMENT } from '@/lib/document/untitled-copy';
import { authorByline } from '@/lib/share/author-visibility';

interface PublishPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublishPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getSharedDocument(slug);
  if (!doc || !doc.isPublished) return { title: '页面不存在' };

  const title = `${doc.icon ? `${doc.icon} ` : ''}${doc.title || UNTITLED_DOCUMENT}`;

  // G143：官方 enableSeo 默认关、且**与口令互斥**（口令一设即失效）。此前这里无条件输出完整
  // 标题/描述/OG ⇒ 开关在服务端完全无效。关掉索引时只留标题（浏览器标签仍要可读），
  // 并显式 noindex，别让搜索引擎拿到本不该出现的内容。
  const indexable = seoEffective({
    passcode: doc.passcodeProtected ? 'set' : null,
    enableSeo: doc.enableSeo === true,
  });
  if (!indexable) {
    return { title, robots: { index: false, follow: false } };
  }

  const description = (doc.plainText ?? '').slice(0, 160) || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: doc.coverImage ? [doc.coverImage] : undefined,
    },
    alternates: { canonical: `/p/${slug}` },
  };
}

export default async function PublishPage({ params }: PublishPageProps) {
  const { slug } = await params;
  const doc = await getSharedDocument(slug);

  if (!doc || !doc.isPublished) {
    // G75：链接本身不给角色时（仅限协作者等），仍把标题露出来，并给一枚「想要查看」。
    const gate = await getShareGate(slug);
    if (gate?.requiresRequest) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm rounded-xl border border-border p-6 text-center">
            <div className="text-3xl leading-none">{gate.icon ?? '📄'}</div>
            <h1 className="mt-3 text-lg font-medium text-foreground">{REQUEST_ACCESS_TITLE}</h1>
            <p className="mt-1 text-ui text-foreground/70">{gate.title || '无标题文档'}</p>
            <p className="mt-1 text-meta text-foreground/50">{REQUEST_ACCESS_SUBTITLE}</p>
            <div className="mt-4 flex justify-center">
              <RequestViewAccess identifier={slug} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-ui text-foreground/40">页面不存在或未发布</p>
      </div>
    );
  }

  if (doc.passcodeProtected) {
    const share = await findShare(slug);
    const passcode = (share as any)?.passcode ?? null;
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(shareCookieName(slug))?.value;
    if (!verifyShareCookie(slug, passcode, cookieValue)) {
      return (
        <PasscodeGate token={slug} path={`/p/${slug}`} title={doc.title} icon={doc.icon} />
      );
    }
  }

  const session = await auth();

  return (
    <SharedDocView
      documentId={slug}
      title={doc.title}
      icon={doc.icon}
      coverImage={doc.coverImage}
      coverType={doc.coverType}
      content={doc.content}
      pageStyle={doc.pageStyle}
      styled
      authorByline={doc.showAuthor ? authorByline(doc.authorName) : null}
      showPageTitle={doc.showPageTitle}
      header={
        <PublicDocBanner
          showWatermark={doc.showWatermark}
          identifier={slug}
          signedIn={Boolean(session?.user?.id)}
          permission={doc.permission}
          loginNext={`/p/${slug}`}
        />
      }
    />
  );
}
