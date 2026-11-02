/**
 * G149 PDF 导出的四项设置：纸张三档（A4 / 信纸 / 动态）、深色模式、页码、水印。
 * 标签逐字取自 `blockdetails.ios.export.pdf.*`；「纸张」这一组标题语言包里没有独立键。
 */

export type PdfPaper = 'a4' | 'usletter' | 'dynamic';

export interface PdfExportOptions {
  paper: PdfPaper;
  dark: boolean;
  pageNumbers: boolean;
  watermark: boolean;
}

export const DEFAULT_PDF_EXPORT_OPTIONS: PdfExportOptions = {
  paper: 'a4',
  dark: false,
  pageNumbers: false,
  watermark: false,
};

export const PDF_PAPER_OPTIONS = [
  { id: 'a4', label: 'A4', key: 'blockdetails.ios.export.pdf.paper.a4' },
  { id: 'usletter', label: '信纸', key: 'blockdetails.ios.export.pdf.paper.usletter' },
  { id: 'dynamic', label: '动态', key: 'blockdetailsios.export.pdf.paper.dynamic' },
] as const;

export const PDF_TOGGLE_OPTIONS = [
  { id: 'dark', label: '深色模式', key: 'blockdetails.ios.export.pdf.a.darkEnabled' },
  { id: 'pageNumbers', label: '显示页码', key: 'blockdetails.ios.export.pdf.a.pagenumbers' },
  { id: 'watermark', label: '显示水印', key: 'blockdetails.ios.export.pdf.a.watermark' },
] as const;

export const PDF_PAPER_LABEL = '纸张';

/** Points, not pixels: A4 and US Letter in PostScript points. Dynamic takes A4's width. */
export const PDF_PAPER_SIZES: Record<'a4' | 'usletter', { width: number; height: number }> = {
  a4: { width: 595, height: 842 },
  usletter: { width: 612, height: 792 },
};

export function normalizePdfOptions(value: unknown): PdfExportOptions {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PDF_EXPORT_OPTIONS };
  const v = value as Record<string, unknown>;
  const paper = PDF_PAPER_OPTIONS.some((option) => option.id === v.paper)
    ? (v.paper as PdfPaper)
    : DEFAULT_PDF_EXPORT_OPTIONS.paper;
  return {
    paper,
    dark: v.dark === true,
    pageNumbers: v.pageNumbers === true,
    watermark: v.watermark === true,
  };
}
