import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const insertTab = readFileSync(
  new URL('../../components/editor/tabs/InsertTab.tsx', import.meta.url),
  'utf8',
);
const slash = readFileSync(
  new URL('../../components/editor/slash-menu/slash-commands.ts', import.meta.url),
  'utf8',
);

/**
 * G206/G1430：插入面板里 Mermaid 与分页符这两项本可建出（斜杠命令早已有），
 * 不应再画成禁用占位。
 */
describe('the insert panel enables buildable entries', () => {
  it('maps Mermaid to its slash command', () => {
    expect(insertTab).toContain("{ label: 'Mermaid 图表', command: 'Mermaid 图表' }");
    expect(slash).toContain("name: 'Mermaid 图表'");
  });

  it('maps the page break to its slash command', () => {
    expect(insertTab).toContain("{ label: '插入分页符', command: '插入分页符' }");
    expect(slash).toContain("name: '插入分页符'");
    expect(slash).toContain("setDivider('pageSeparator')");
  });

  it('inserts a page through the page block command', () => {
    expect(insertTab).toContain("setPageBlock()");
    expect(insertTab).toContain("{ label: '页面', icon: FileText");
    expect(insertTab).not.toContain("{ label: '页面', missing: true }");
  });

  it('keeps the genuinely unbuildable objects disabled', () => {
    for (const label of ['插入 Unsplash 图片']) {
      expect(insertTab, label).toContain(`{ label: '${label}', missing: true }`);
    }
  });
});
