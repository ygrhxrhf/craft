'use client';

import { useMemo } from 'react';
import { Editor } from '@/components/editor/Editor';
import {
  normalizePageStyle,
  getFontStack,
  getThemeColor,
  getWashiGradient,
  showsDocumentTitle,
  colorChannelCss,
  colorPairCss,
  separatorStyleOf,
} from '@/components/editor/themes/page-style';
import { backdropBackground, parseBackdrop } from '@/lib/editor/themes/backdrop';
import { parseSeparatorExpression } from '@/lib/editor/separator-expression';
import { washiPatternBackground } from '@/lib/editor/washi-patterns';

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
  /**
   * G145：访客可否跟随**跨文档**区块链接（官方 `enableObjectLinks`，默认关）。公开页传进来，
   * 关着时点跨文档链接不动作；同文档锚点不受影响。编辑视图不传 ⇒ 按允许处理。
   */
  followBlockLinks?: boolean;
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
  followBlockLinks = true,
  header,
}: SharedDocViewProps) {
  const style = useMemo(() => normalizePageStyle(pageStyle), [pageStyle]);
  const isColorCover = coverType === 'color' && coverImage;
  const isImageCover = coverType === 'image' && coverImage;
  // G708/G706：与编辑器同一条读法——双值色写成 `light-dark()` 交给 `color-scheme` 取半，
  // 原始分隔线表达式优先于三档回推。JS 不判明暗，服务端与首帧客户端的字符串才一致。
  const backgroundChannel =
    colorChannelCss(style.backgroundColor) ?? getThemeColor(style.theme, style.themeColor);
  const textColorChannel = colorChannelCss(style.textColor);
  const backdropCss = backdropBackground(parseBackdrop(style.backdrop));
  const separatorStyle = separatorStyleOf(style);
  const separatorExpr = parseSeparatorExpression(style.separatorStyleRaw);
  const washiGradient = getWashiGradient(style.washi);

  return (
    <div
      className="relative min-h-full"
      style={
        styled
          ? {
              backgroundColor: backgroundChannel,
              color: textColorChannel,
              fontFamily: getFontStack(style.fontPack),
            }
          : undefined
      }
    >
      {styled && backdropCss && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: backdropCss }}
        />
      )}
      {styled && separatorStyle === 'washi' && separatorExpr?.kind === 'washi-image' && (
        <img
          aria-hidden
          src={separatorExpr.url}
          alt=""
          className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm object-cover opacity-80 shadow-sm"
        />
      )}
      {styled && separatorStyle === 'washi' && separatorExpr?.kind === 'washi-pattern' && (
        <div
          aria-hidden
          data-testid="page-washi-pattern"
          data-washi-pattern={separatorExpr.pattern}
          className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm opacity-80 shadow-sm"
          style={washiPatternBackground(
            separatorExpr.pattern,
            colorPairCss(separatorExpr.light, separatorExpr.dark),
          )}
        />
      )}
      {styled && separatorStyle === 'washi' && !separatorExpr?.kind.startsWith('washi') && washiGradient && (
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
          followBlockLinks={followBlockLinks}
          spelling={style.spelling === true}
          spellingLang={style.spellingLang}
        />
      </div>
      {header}
    </div>
  );
}
