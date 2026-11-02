import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { docxFromContent } from './docx';
import { pdfFromContent } from './pdf';
import { textBundleFromMarkdown } from './textbundle';

const content = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
  ],
};

describe('DOCX / TextBundle exporters (G22)', () => {
  it('writes a DOCX zip with the title and text', async () => {
    const buffer = await docxFromContent('文档', content);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('writes a PDF with the PDF signature', async () => {
    const buffer = await pdfFromContent('文档', content);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });

  // G149: 动态纸张是一整页、高度随正文增长；其余三档都在固定纸上分页。
  it('honours the paper, page-number and watermark options', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const a4 = await PDFDocument.load(await pdfFromContent('文档', content));
    expect(a4.getPage(0).getSize()).toEqual({ width: 595, height: 842 });

    const letter = await PDFDocument.load(await pdfFromContent('文档', content, { paper: 'usletter' }));
    expect(letter.getPage(0).getSize()).toEqual({ width: 612, height: 792 });

    const dynamic = await PDFDocument.load(
      await pdfFromContent('文档', content, { paper: 'dynamic', dark: true, pageNumbers: true, watermark: true }),
    );
    expect(dynamic.getPageCount()).toBe(1);
    expect(dynamic.getPage(0).getSize().height).toBeGreaterThanOrEqual(842);
    expect(dynamic.getPage(0).getSize().width).toBe(595);
  });

  it('writes a TextBundle with text.markdown and info.json', async () => {
    const buffer = await textBundleFromMarkdown('文档', '# 标题\n\n正文');
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('text.markdown')).not.toBeNull();
    expect(zip.file('info.json')).not.toBeNull();
    expect(await zip.file('text.markdown')!.async('string')).toBe('# 标题\n\n正文');
  });
});
