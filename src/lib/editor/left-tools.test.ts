import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LEFT_TOOL_TABS, collectAttachments, collectTasks } from './left-tools';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

/** 一个最小的文档树：带 descendants 的假节点，免得为这层逻辑起真编辑器。 */
function fakeDoc(nodes: Array<{ name: string; attrs?: Record<string, unknown>; text?: string }>) {
  return {
    type: { name: 'doc' },
    descendants(visit: (node: unknown, pos: number) => void) {
      nodes.forEach((node, index) => visit({ type: { name: node.name }, attrs: node.attrs, textContent: node.text }, index + 1));
    },
  } as unknown as NonNullable<Parameters<typeof collectAttachments>[0]>;
}

describe('the left tool tabs (G100)', () => {
  it('offers the four collected tabs in order, with catalog labels', () => {
    expect(LEFT_TOOL_TABS.map((tab) => tab.id)).toEqual(['attachments', 'findReplace', 'toc', 'tasks']);
    for (const tab of LEFT_TOOL_TABS) {
      expect(ledgerValue(tab.key), tab.key).toBe(tab.label);
    }
  });

  it('collects attachments and images with their positions', () => {
    const doc = fakeDoc([
      { name: 'paragraph' },
      { name: 'attachment', attrs: { name: '合同.pdf' } },
      { name: 'imageBlock', attrs: { alt: '封面图' } },
      { name: 'imageBlock', attrs: {} },
    ]);
    expect(collectAttachments(doc)).toEqual([
      { pos: 2, kind: 'attachment', name: '合同.pdf' },
      { pos: 3, kind: 'image', name: '封面图' },
      { pos: 4, kind: 'image', name: '图片' },
    ]);
    expect(collectAttachments(null)).toEqual([]);
  });

  it('collects task rows with their checked state', () => {
    const doc = fakeDoc([
      { name: 'taskItem', attrs: { checked: true }, text: '写周报' },
      { name: 'taskItem', attrs: {}, text: '' },
    ]);
    expect(collectTasks(doc)).toEqual([
      { pos: 1, text: '写周报', checked: true },
      { pos: 2, text: '未命名任务', checked: false },
    ]);
  });

  it('is mounted on the editor, with 查找和替换 routed to the existing bar', () => {
    const editor = readFileSync(join(process.cwd(), 'src/components/editor/DocumentEditor.tsx'), 'utf8');
    expect(editor).toContain('<LeftToolRail editor={editor} />');
    const rail = readFileSync(join(process.cwd(), 'src/components/editor/LeftToolRail.tsx'), 'utf8');
    expect(rail).toContain('useFindReplaceStore.getState().openWith(false)');
    expect(rail).toContain("data-testid={`left-tool-${tab.id}`}");
    expect(rail).toContain('data-testid="left-tool-rail"');
  });
});
