'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useDialogStore,
  type DialogConfig,
  type DialogSubmission,
} from '@/lib/store/use-dialog-store';

/**
 * 所有命令式弹层唯一的宿主：`showDialog()` 的 Promise 由这里的 `submitResult`/`cancel` 结算，
 * 调用方不再各自持有一份 open 状态。
 *
 * Esc 与遮罩点击也走 `cancel` —— 关闭却不结算的 Promise 正是官方桥形禁止的悬挂态。
 */
export function DialogHost() {
  const open = useDialogStore((state) => state.open);
  const config = useDialogStore((state) => state.config);
  const cancel = useDialogStore((state) => state.cancel);
  const submitResult = useDialogStore((state) => state.submitResult);

  // 关掉即整棵子树卸载 ⇒ 草稿不跨次残留，初值由 `useState` 从 config 取，无需 effect 补水。
  if (!config) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <DialogContent data-testid="imperative-dialog" showCloseButton={false} className="sm:max-w-md">
        <DialogForm config={config} cancel={cancel} submit={submitResult} />
      </DialogContent>
    </Dialog>
  );
}

function DialogForm({
  config,
  cancel,
  submit,
}: {
  config: DialogConfig;
  cancel: () => void;
  submit: (submission: DialogSubmission) => void;
}) {
  const [value, setValue] = useState(config.kind === 'prompt' ? (config.defaultValue ?? '') : '');
  const isPrompt = config.kind === 'prompt';

  return (
    <>
      <DialogHeader>
        <DialogTitle>{config.title}</DialogTitle>
        {config.message && <DialogDescription>{config.message}</DialogDescription>}
      </DialogHeader>
      {isPrompt && (
        <Input
          aria-label={config.title}
          placeholder={config.placeholder}
          value={value}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit({ kind: 'prompt', value });
          }}
        />
      )}
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={cancel}>
          取消
        </Button>
        <Button
          size="sm"
          onClick={() => submit(isPrompt ? { kind: 'prompt', value } : { kind: 'confirm' })}
        >
          {config.confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
