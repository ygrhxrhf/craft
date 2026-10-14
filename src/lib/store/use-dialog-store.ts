import { create } from 'zustand';

import { createPromiseBridge, type DialogEvent, type DialogResult } from '@/lib/dialog/bridge';

/** 只有"要不要做"的弹层；`confirmLabel` 是动作本身（官方没有通用「确定」串）。 */
export interface ConfirmDialogConfig {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel: string;
}

/** 要"提交了什么"的弹层；空串与取消是两回事。 */
export interface PromptDialogConfig {
  kind: 'prompt';
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel: string;
}

export type DialogConfig = ConfirmDialogConfig | PromptDialogConfig;

export type DialogSubmission = { kind: 'confirm' } | { kind: 'prompt'; value: string };

interface DialogState {
  open: boolean;
  config: DialogConfig | null;
  show: (config: DialogConfig) => Promise<DialogResult<DialogSubmission>>;
  cancel: () => void;
  submitResult: (submission: DialogSubmission) => void;
}

export const useDialogStore = create<DialogState>((set) => {
  const bridge = createPromiseBridge<DialogConfig, DialogSubmission>((event: DialogEvent<DialogConfig>) => {
    if (event.type === 'open') set({ open: true, config: event.config });
    else set({ open: false, config: null });
  });

  return {
    open: false,
    config: null,
    show: bridge.show,
    cancel: bridge.cancel,
    submitResult: bridge.submitResult,
  };
});
