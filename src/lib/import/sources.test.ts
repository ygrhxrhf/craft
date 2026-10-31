import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { htmlToMarkdown, parseArchiveZip, parseEnex, parseReadwiseCsv } from './sources';

describe('import sources (G22)', () => {
  it('converts HTML exports to Markdown', () => {
    expect(htmlToMarkdown('<h1>标题</h1><p>正文</p>')).toContain('# 标题');
  });

  it('splits Evernote notes and keeps their titles', () => {
    const enex = `<?xml version="1.0"?><en-export>
      <note><title>第一条</title><content><![CDATA[<en-note><div>你好</div></en-note>]]></content></note>
      <note><title>第二条</title><content><![CDATA[<en-note><div>再见</div></en-note>]]></content></note>
    </en-export>`;
    expect(parseEnex(enex).map((file) => file.name)).toEqual(['第一条.md', '第二条.md']);
  });

  it('groups Readwise highlights by title', () => {
    const csv = 'Title,Highlight,Note\nBook A,"第一条","备注"\nBook A,"第二条",\n';
    const files = parseReadwiseCsv(csv);
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe('Book A.md');
    expect(files[0]!.text).toContain('> 第一条');
    expect(files[0]!.text).toContain('备注');
  });

  it('reads Markdown and HTML entries from a Notion archive', async () => {
    const zip = new JSZip();
    zip.file('Page.md', '# 页面');
    zip.file('Other.html', '<h2>另一页</h2>');
    const base64 = await zip.generateAsync({ type: 'base64' });
    const files = await parseArchiveZip(base64);
    expect(files.map((file) => file.name).sort()).toEqual(['Other.md', 'Page.md']);
  });
});
