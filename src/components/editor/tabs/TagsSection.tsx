'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import {
  attachTag,
  getDocumentTags,
  getTags,
  type TagRecord,
} from '@/actions/tag/tag';
import { getSyncManager } from '@/lib/sync-core';
import { normalizeTagName } from '@/lib/tag/normalize';

interface TagsSectionProps {
  documentId: string;
}

export function TagsSection({ documentId }: TagsSectionProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [all, setAll] = useState<TagRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [mine, every] = await Promise.all([getDocumentTags(documentId), getTags()]);
    setTags(mine);
    setAll(every);
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (name: string) => {
    if (!name.trim() || busy) return;
    const normalized = normalizeTagName(name);
    if (!normalized) return;
    setBusy(true);
    try {
      const existing = all.find((tag) => normalizeTagName(tag.name) === normalized);
      if (existing) {
        // 已有标签挂链接 → applyLocal（复合键 id 与拉取一致；deletedAt:null 复用墓碑行）
        await getSyncManager().applyLocal({
          table: 'document_tag',
          id: `${documentId}__${existing.id}`,
          patch: { documentId, tagId: existing.id, deletedAt: null },
        });
        setDraft('');
        // 乐观挂上：服务端要等推送，load() 会把新链接读丢
        setTags((prev) => (prev.some((t) => t.id === existing.id) ? prev : [...prev, existing]));
      } else {
        // 新标签名 → 服务端 find-or-create（同名墓碑复用/唯一键在服务端收敛，安全）
        await attachTag(documentId, name);
        setDraft('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tagId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      // 解除打标 → applyLocal（DocumentTag 无独立 id，delete op 缺复合键会 400，
      // 故用 upsert + deletedAt 写墓碑，语义等价）
      await getSyncManager().applyLocal({
        table: 'document_tag',
        id: `${documentId}__${tagId}`,
        patch: { documentId, tagId, deletedAt: new Date().toISOString() },
      });
      // 乐观移除：load() 此刻仍会读到服务端未推送的旧行
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } finally {
      setBusy(false);
    }
  };

  const unused = all.filter((tag) => !tags.some((own) => own.id === tag.id));

  return (
    <section>
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        标签 ({tags.length})
      </h4>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-white"
            style={{ backgroundColor: tag.color }}
          >
            <Link href={`/search?tag=${encodeURIComponent(tag.name)}`} className="hover:underline">
              {tag.name}
            </Link>
            <button
              type="button"
              aria-label={`移除标签 ${tag.name}`}
              onClick={() => remove(tag.id)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <form
        className="mt-2 flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void add(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="添加标签"
          aria-label="添加标签"
          className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-[13px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          aria-label="添加标签"
          disabled={busy || !draft.trim()}
          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </form>

      {unused.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {unused.slice(0, 6).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => void add(tag.name)}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-[12px] text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
