import JSZip from 'jszip';

/** G22: TextBundle v2 = a zip with `text.markdown` plus `info.json`. */
export async function textBundleFromMarkdown(title: string, markdown: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('text.markdown', markdown);
  zip.file('info.json', JSON.stringify({
    version: 2,
    type: 'net.daringfireball.markdown',
    title,
    transient: false,
  }));
  return zip.generateAsync({ type: 'nodebuffer' });
}
