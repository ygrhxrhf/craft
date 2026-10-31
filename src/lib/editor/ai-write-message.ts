export type AiWriteAction = 'rewrite' | 'continue' | 'translate' | 'summarize';
export type AiWriteMode = 'replace' | 'insert-below';

const REPLACED: Record<AiWriteAction, string> = {
  rewrite: '已改写所选文本',
  continue: '已用续写替换所选文本',
  translate: '已翻译所选文本',
  summarize: '已用摘要替换所选文本',
};

const INSERTED: Record<AiWriteAction, string> = {
  rewrite: '已插入改写结果',
  continue: '已插入续写内容',
  translate: '已插入翻译结果',
  summarize: '已插入摘要结果',
};

/** G50: the one-line action description shown after an AI write. */
export function aiWriteMessage(action: AiWriteAction, mode: AiWriteMode): string {
  return mode === 'replace' ? REPLACED[action] : INSERTED[action];
}
