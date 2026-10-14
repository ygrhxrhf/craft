import {
  useDialogStore,
  type ConfirmDialogConfig,
  type DialogConfig,
  type PromptDialogConfig,
} from '@/lib/store/use-dialog-store';

export function showDialog(config: DialogConfig) {
  return useDialogStore.getState().show(config);
}

/** 用户是否点了那个动作按钮（Esc／遮罩／取消都算 false）。 */
export async function confirmDialog(config: Omit<ConfirmDialogConfig, 'kind'>): Promise<boolean> {
  const result = await showDialog({ kind: 'confirm', ...config });
  return result.type === 'submitted';
}

/**
 * 提交的内容，或 `null` 表示取消。
 * `window.prompt` 给不出这一档：它把"取消"和"提交了空串"都回成 falsy，
 * 于是清空链接、清空 URL 这类"提交空值"的通路在浏览器弹层里根本写不出来。
 */
export async function promptDialog(config: Omit<PromptDialogConfig, 'kind'>): Promise<string | null> {
  const result = await showDialog({ kind: 'prompt', ...config });
  return result.type === 'submitted' && result.config.kind === 'prompt' ? result.config.value : null;
}
