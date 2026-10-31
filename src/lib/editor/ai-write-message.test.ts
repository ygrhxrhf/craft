import { describe, expect, it } from 'vitest';
import { aiWriteMessage } from './ai-write-message';

describe('aiWriteMessage (G50)', () => {
  it('names the replaced action', () => {
    expect(aiWriteMessage('rewrite', 'replace')).toBe('已改写所选文本');
    expect(aiWriteMessage('translate', 'replace')).toBe('已翻译所选文本');
    expect(aiWriteMessage('summarize', 'replace')).toBe('已用摘要替换所选文本');
  });

  it('names the inserted action', () => {
    expect(aiWriteMessage('continue', 'insert-below')).toBe('已插入续写内容');
    expect(aiWriteMessage('rewrite', 'insert-below')).toBe('已插入改写结果');
  });
});
