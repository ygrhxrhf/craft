'use client';

import { useMemo } from 'react';
import { Editor } from '@/components/editor/Editor';
import { normalizePageStyle, getFontStack, getThemeColor, getWashiGradient, showsDocumentTitle } from '@/components/editor/themes/page-style';

interface SharedDocViewProps {
  documentId: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
  coverType: string | null;
  content: any;
  pageStyle?: unknown;
  styled?: boolean;
  collaborative?: boolean;
  /** G38：发布页作者署名（`showAuthor` 关掉时调用方传 null，这里不渲染）。 */
  authorByline?: string | null;
  /** G1534：`showPageTitle` 关掉时不渲染标题块（与 pageStyle.showTitle 取与）。 */
  showPageTitle?: boolean;
  header?: React.ReactNode;
}

export function SharedDocView({
  documentId,
  title,
  icon,
  coverImage,
  coverType,
  content,
  pageStyle,
  styled = false,
  collaborative = false,
  authorByline = null,
  showPageTitle = true,
  header,
}: SharedDocViewProps) {
  const style = useMemo(() => normalizePageStyle(pageStyle), [pageStyle]);
  const isColorCover = coverType === 'color' && coverImage;
  const isImageCover = coverType === 'image' && coverImage;
  const washiGradient = getWashiGradient(style.washi);

  return (
    <div
      className="relative min-h-full"
      style={
        styled
          ? {
              backgroundColor: getThemeColor(style.theme),
              fontFamily: getFontStack(style.fontPack),
            }
          : undefined
      }
    >
      {styled && washiGradient && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm opacity-80 shadow-sm"
          style={{ background: washiGradient }}
        />
      )}
      <div className="mx-auto max-w-[720px] px-5 pb-32 pt-12 md:px-12">
        {isColorCover && (
          <div className="mb-6 h-48 w-full rounded-lg" style={{ backgroundColor: coverImage! }} />
        )}
        {isImageCover && (
          <div className="mb-6 h-48 w-full overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage!} alt="Cover" className="h-full w-full object-cover" />
          </div>
        )}
        {showPageTitle && showsDocumentTitle(style) && (
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-md text-2xl transition-colors duration-150 ease-craft hover:bg-foreground/4">
                {icon || '📄'}
              </span>
              <h1 className="flex-1 text-doctitle font-bold text-[#1F2225] dark:text-[#F9F9F9]">{title}</h1>
            </div>
            {authorByline && (
              <p className="mt-2 text-meta text-foreground/40">{authorByline}</p>
            )}
          </div>
        )}
        <Editor
          documentId={documentId}
          initialContent={content}
          collaborative={collaborative}
          readOnly={!collaborative}
          spelling={style.spelling === true}
          spellingLang={style.spellingLang}
        />
      </div>
      {header}
    </div>
  );
}
