'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, X } from 'lucide-react';
import {
  attachTag,
  getDocumentTags,
  getTags,
  type TagRecord,
} from '@/actions/tag/tag';
import { getSyncManager } from '@/lib/sync-core';
import { normalizeTagName } from '@/lib/tag/normalize';
import { findTagViolation, tagFeedback } from '@/lib/tag/rules';
import { EDIT_TAG, ENTER_VALID_TAG } from '@/lib/tag/official-copy';
import { TAGS_TITLE, formatTagCount } from '@/lib/browse/official-copy';
import { toast } from '@/components/ui/toast';
import { TagEditDialog } from './TagEditDialog';

interface TagsSectionProps {
  documentId: string;
}

export function TagsSection({ documentId }: TagsSectionProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [all, setAll] = useState<TagRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // G1540：正在编辑的标签（null＝对话框关着）
  const [editing, setEditing] = useState<TagRecord | null>(null);

  const applyLoadedTags = useCallback((mine: TagRecord[], every: TagRecord[]) => {
    setTags(mine);
    setAll(every);
  }, []);

  /**
   * 正在读的文档 id。切文档时 `DocumentEditor` 只换 prop 不重挂载，旧文档在途的读取
   * （订阅回调、add、编辑保存触发的那些）resolve 后会把旧文档的标签写进新文档的 state
   * ⇒ 每次读都带上发起时的 id，回来时对不上就整批丢弃。
   */
  const documentIdRef = useRef(documentId);
  useEffect(() => {
    documentIdRef.current = documentId;
  }, [documentId]);

  /**
   * 本地写入纪元。`applyLocal` 会在返回前同步广播 store 变更（`sync-core` 的 `emitTouched`），
   * 于是订阅里的那次 `load()` 是在**推送发生之前**发出的、读到的还是旧值；它若晚于本地乐观
   * 更新落地，屏上就会"改完名又闪回旧名"。每次本地写入后自增纪元，读回来对不上纪元就整批丢弃。
   */
  const writeEpochRef = useRef(0);

  const load = useCallback(async () => {
    const requestedFor = documentId;
    const epoch = writeEpochRef.current;
    const [mine, every] = await Promise.all([getDocumentTags(requestedFor), getTags()]);
    if (documentIdRef.current !== requestedFor) return;
    if (writeEpochRef.current !== epoch) return;
    applyLoadedTags(mine, every);
  }, [applyLoadedTags, documentId]);

  useEffect(() => {
    let cancelled = false;
    const epoch = writeEpochRef.current;
    void Promise.all([getDocumentTags(documentId), getTags()]).then(([mine, every]) => {
      if (cancelled) return;
      if (writeEpochRef.current !== epoch) return;
      applyLoadedTags(mine, every);
    });
    return () => {
      cancelled = true;
    };
  }, [applyLoadedTags, documentId]);

  // 远端（另一台设备）改了标签 → 重载；本地写走 applyLocal，由下面的乐观更新覆盖
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'tag' || table === 'document_tag') void load();
  }), [load]);

  /**
   * G1506：服务端拒收时权威值会被盖回本地镜像（改名"看起来自己变回去了"）。
   * 本面板只认 tag 表的拒绝：`stale` 是同名撞车/并发改名，`not_found` 是这行不属于本账户，
   * 两件事分开说，别混成一句「保存失败」。
   */
  useEffect(() => getSyncManager().onRejected((rejected) => {
    const tagRejection = rejected.find((record) => record.table === 'tag');
    if (!tagRejection) return;
    toast.add({
      id: 'tag-rejected',
      type: 'warning',
      title: tagRejection.reason === 'not_found' ? '该标签不存在或不属于你' : '标签已被其他设备的改动覆盖',
    });
  }), []);

  const add = async (name: string) => {
    if (!name.trim() || busy) return;
    // G170：官方规则表在任何写入之前跑一遍，非法草稿不会落到服务端
    const violation = findTagViolation(name);
    if (violation) {
      toast.add({ id: 'tag-invalid', type: 'warning', title: violation.message });
      return;
    }
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
        writeEpochRef.current += 1;
        setTags((prev) => (prev.some((t) => t.id === existing.id) ? prev : [...prev, existing]));
      } else {
        // 新标签名 → 服务端 find-or-create（同名墓碑复用/唯一键在服务端收敛，安全）
        await attachTag(documentId, name);
        setDraft('');
        await load();
      }
    } catch {
      // spec D7-④ 离线提示：新标签走服务端 action，失败（多为离线）给反馈
      toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
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
      writeEpochRef.current += 1;
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } finally {
      setBusy(false);
    }
  };

  const unused = all.filter((tag) => !tags.some((own) => own.id === tag.id));

  /**
   * G1540：改名／换色成功后先把两条本地列表就地更新（屏上即时）。
   *
   * ☆ 这里**不再**用 `load()` 收口：`TagEditDialog` 已经 `applyLocal` 过，本地镜像是权威；
   *   而 `applyLocal` 会在推送前就广播 store 变更，那次读回的是**旧名**，收口反而会把刚改好的
   *   名字改回去。写入纪元自增后，在途的旧读结果会被丢弃；服务端权威行由后续 pull/刷新收敛。
   */
  const handleEdited = (tagId: string, next: { name: string; color: string }) => {
    setEditing(null);
    const apply = (list: TagRecord[]) =>
      list.map((item) => (item.id === tagId ? { ...item, name: next.name, color: next.color } : item));
    writeEpochRef.current += 1;
    setTags(apply);
    setAll(apply);
  };

  // 输入过程中的官方四态反馈（valid / current / typing / invalid）
  const feedback = useMemo(
    () => tagFeedback(draft, { existing: tags.map((tag) => tag.name) }),
    [draft, tags],
  );
  const canSubmit = feedback.kind === 'valid';

  return (
    <section>
      <h4 className="mb-2 flex items-baseline gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {TAGS_TITLE}
        <span className="text-[10px] normal-case tracking-normal">{formatTagCount(tags.length)}</span>
      </h4>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-white"
            style={{ backgroundColor: tag.color }}
          >
            <Link href={`/tags/${tag.id}`} className="hover:underline">
              {tag.name}
            </Link>
            {/* G1540：官方 `tags.edit.tag`「编辑标签」——改名有官方 key，换色落在本地 tag.color 列 */}
            <button
              type="button"
              aria-label={`${EDIT_TAG} ${tag.name}`}
              onClick={() => setEditing(tag)}
              className="opacity-70 hover:opacity-100"
            >
              <Pencil className="size-3" />
            </button>
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
          placeholder={ENTER_VALID_TAG}
          aria-label="添加标签"
          aria-describedby="tag-feedback"
          className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-[13px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          aria-label="添加"
          disabled={busy || !canSubmit}
          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </form>

      <p
        id="tag-feedback"
        data-tag-feedback={feedback.kind}
        className={
          feedback.kind === 'invalid'
            ? 'mt-1.5 text-[11px] text-destructive'
            : 'mt-1.5 text-[11px] text-muted-foreground'
        }
      >
        {feedback.message}
        {feedback.kind === 'invalid' && feedback.rule ? (
          <span className="text-muted-foreground"> {feedback.rule.message}</span>
        ) : null}
      </p>

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

      {editing && (
        <TagEditDialog
          tag={editing}
          others={all.filter((item) => item.id !== editing.id)}
          onClose={() => setEditing(null)}
          onSaved={(next) => handleEdited(editing.id, next)}
        />
      )}
    </section>
  );
}
