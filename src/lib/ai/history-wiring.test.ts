import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const panel = readFileSync(
  new URL('../../components/settings/AssistantPanel.tsx', import.meta.url),
  'utf8',
);

/** G39 `clear.history`：设置内的清除历史必须落到本地 AI 历史键。 */
describe('the assistant settings clear-history action (G39)', () => {
  it('clears the device-local AI history from the panel', () => {
    expect(panel).toContain("import { clearAiHistory } from '@/lib/ai/history';");
    expect(panel).toContain('clearAiHistory(window.localStorage)');
    expect(panel).toContain('清除历史');
  });
});
