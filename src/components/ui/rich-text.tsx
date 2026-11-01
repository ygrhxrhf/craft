'use client';

import { Fragment } from 'react';

import { parseEmbeddedTags, type EmbeddedSegment } from '@/lib/i18n/embedded-tags';
import { cn } from 'cn';

/**
 * G320: a translation value is not plain text — 53 collected keys carry 17 kinds of tag. This
 * renders the segments `parseEmbeddedTags` produces, so a `<strong>[0]</strong>` key shows bold
 * text instead of leaking the markup into the UI. Unknown tags keep their text and drop the tag.
 *
 * Link tags become `<a>` elements; the destination is the caller's (`hrefFor`), because the tag
 * name alone (`toclink`, `privacylink`, …) does not say where it points.
 */
export function RichText({
  value,
  hrefFor,
  className,
}: {
  value: string;
  /** Where a link tag should point; a `null` return renders the link text without an anchor. */
  hrefFor?: (tag: string) => string | null;
  className?: string;
}) {
  const segments = parseEmbeddedTags(value);
  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <Fragment key={index}>{renderSegment(segment, hrefFor)}</Fragment>
      ))}
    </span>
  );
}

function renderSegment(
  segment: EmbeddedSegment,
  hrefFor?: (tag: string) => string | null,
) {
  if (segment.kind === 'break') return <br />;
  if (segment.kind === 'link') {
    const href = hrefFor?.(segment.tag) ?? null;
    if (!href) return <>{segment.text}</>;
    return (
      <a href={href} className="text-(--craft-accent) underline underline-offset-2">
        {segment.text}
      </a>
    );
  }
  const classNames = segment.styles.map(styleClassOf).filter(Boolean) as string[];
  if (!classNames.length) return <>{segment.text}</>;
  return <span className={cn(...classNames)}>{segment.text}</span>;
}

function styleClassOf(style: string): string | null {
  switch (style) {
    case 'bold':
      return 'font-semibold';
    case 'italic':
      return 'italic';
    case 'code':
      return 'rounded bg-foreground/8 px-1 font-mono text-[0.92em]';
    case 'highlight':
      return 'rounded bg-amber-200/60 px-0.5 dark:bg-amber-400/25';
    default:
      return null;
  }
}
