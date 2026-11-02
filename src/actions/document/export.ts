'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { serializeDocument } from '@/lib/document-codec';
import { untitledFor } from '@/lib/document/untitled-copy';
import { docxFromContent } from '@/lib/export/docx';
import { pdfFromContent } from '@/lib/export/pdf';
import type { PdfExportOptions } from '@/lib/export/pdf-options';
import { textBundleFromMarkdown } from '@/lib/export/textbundle';

export type ExportFormat = 'markdown' | 'html' | 'text' | 'json' | 'docx' | 'pdf' | 'textbundle';

const mimeByFormat: Record<ExportFormat, string> = {
  markdown: 'text/markdown;charset=utf-8',
  html: 'text/html;charset=utf-8',
  text: 'text/plain;charset=utf-8',
  json: 'application/json;charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  textbundle: 'application/zip',
};

const extensionByFormat: Record<ExportFormat, string> = {
  markdown: 'md',
  html: 'html',
  text: 'txt',
  json: 'json',
  docx: 'docx',
  pdf: 'pdf',
  textbundle: 'textbundle',
};

export async function exportDocument(
  documentId: string,
  format: ExportFormat,
  pdfOptions?: Partial<PdfExportOptions>,
) {
  const userId = await requireUserId();
  const access = await requireDocumentAccess(documentId, userId, 'viewer');
  const document = access.document;

  const doc = document as { title: string; content: unknown };
  const title = doc.title || untitledFor('list');
  const content = doc.content ?? { type: 'doc', content: [] };
  let body: string;
  let encoding: 'utf8' | 'base64' = 'utf8';

  if (format === 'docx') {
    body = (await docxFromContent(title, content)).toString('base64');
    encoding = 'base64';
  } else if (format === 'pdf') {
    body = (await pdfFromContent(title, content, pdfOptions)).toString('base64');
    encoding = 'base64';
  } else if (format === 'textbundle') {
    const markdown = serializeDocument(content, 'markdown');
    body = (await textBundleFromMarkdown(title, markdown)).toString('base64');
    encoding = 'base64';
  } else {
    body = serializeDocument(content, format);
  }

  return {
    filename: `${title}.${extensionByFormat[format]}`,
    mime: mimeByFormat[format],
    body,
    encoding,
  };
}
