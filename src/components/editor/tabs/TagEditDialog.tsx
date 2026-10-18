'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { getSyncManager } from '@/lib/sync-core';
import { TAG_COLORS, normalizeTagColor, normalizeTagName } from '@/lib/tag/normalize';
import { findTagViolation } from '@/lib/tag/rules';
import { EDIT_TAG } from '@/lib/tag/official-copy';
import type { TagRecord } from '@/actions/tag/tag';

interface TagEditDialogProps {
  /** 正在编辑的标签（当前值预填）。 */
  tag: TagRecord;
  /** 同一账号的其它标签，用于同名检查（不含自己）。 */
  others: TagRecord[];
  onClose: () => void;
  /** 写入成功后的乐观更新；服务端权威行由后续 pull/刷新收敛（不再由调用方 load 收口）。 */
  onSaved: (next: { name: string; color: string }) => void;
}

/**
 * G1540：标签改名／换色。
 *
 * 官方只给了 `tags.edit.tag`「编辑标签」一个 key，所以对话框标题与入口可及名都用它；
 * 颜色那一半没有官方 key，落在本地既有的 `tag.color` 列与 `TAG_COLORS` 色板上。
 * ☆ 不拿 `tags.hexcolor.*` 当颜色文案：那两个 key 属于「十六进制颜色词不算标签」的忽略规则。
 *
 * 写入走离线内核（`tag` 在 `src/lib/sync/tables.ts` 白名单内，含 `name`／`color`），
 * 不走 `src/actions/tag/tag.ts` 的 `renameTag`——那条 server action 已属被 applyLocal 取代的写路径。
 */
export function TagEditDialog({ tag, others, onClose, onSaved }: TagEditDialogProps) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(normalizeTagColor(tag.color));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    // 与新增标签同一条规则表：非法草稿不落库（G170）
    const violation = findTagViolation(name);
    if (violation) {
      toast.add({ id: 'tag-invalid', type: 'warning', title: violation.message });
      return;
    }
    const normalized = normalizeTagName(name);
    if (!normalized) return;
    // 同名检查与 renameTag 同语义（标签名按账号唯一）
    if (others.some((other) => other.name === normalized)) {
      toast.add({ id: 'tag-clash', type: 'warning', title: '同名标签已存在' });
      return;
    }
    const nextColor = normalizeTagColor(color);
    if (normalized === tag.name && nextColor === normalizeTagColor(tag.color)) {
      onClose();
      return;
    }

    setBusy(true);
    try {
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'tag',
        id: tag.id,
        patch: { name: normalized, color: nextColor },
      });
      // 标签列表读服务端权威行（getTags），去抖 2s 内会读到旧名 ⇒ 先 flushNow
      await manager.flushNow();
      onSaved({ name: normalized, color: nextColor });
    } catch {
      // 开库/推送失败（多为离线）：dialog 保持打开，输入还在，用户可原样重试
      toast.add({ id: 'tag-edit-offline', type: 'warning', title: '需要网络' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{EDIT_TAG}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="标签名称"
            placeholder={tag.name}
          />

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="颜色">
            {TAG_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`颜色 ${option}`}
                aria-pressed={normalizeTagColor(color) === option}
                onClick={() => setColor(option)}
                className={
                  normalizeTagColor(color) === option
                    ? 'size-6 rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-popover'
                    : 'size-6 rounded-full ring-1 ring-border'
                }
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button disabled={busy || !name.trim()} onClick={() => void submit()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
