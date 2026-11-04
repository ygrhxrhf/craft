'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { tagAtomHref } from '@/lib/editor/inline-atoms';

/** G580：`tag` 原子——点它进入那个标签的浏览页。 */
export function TagAtomView({ node }: NodeViewProps) {
  const router = useRouter();
  const name = node.attrs.name as string | null;
  const tagId = node.attrs.tagId as string | null;

  return (
    <NodeViewWrapper as="span" className="inline" data-type="tag" data-tag-name={name ?? undefined} data-tag-id={tagId ?? undefined}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          router.push(tagAtomHref(tagId));
        }}
        className="inline-flex items-center rounded-md bg-foreground/4 px-1.5 py-0.5 text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/8"
      >
        #{name}
      </button>
    </NodeViewWrapper>
  );
}
