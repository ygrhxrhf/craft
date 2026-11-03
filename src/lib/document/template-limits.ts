/**
 * G236 的模板体积上限。官方错误句 `browse.templates.doc.too.large`「文档太大，无法用作模板」，
 * 上限值在远端（`templates.doc.too.large` 判定处只拿到这一句），本地取 512 KiB 作为**声明过的
 * 本地上限**：既给用户一个可预期的界，也不假装知道远端那个数。
 */

export const TEMPLATE_TOO_LARGE = '文档太大，无法用作模板';
export const TEMPLATE_TOO_LARGE_KEY = 'browse.templates.doc.too.large';

/** G236：文档上的来源标记（`browse.from.template`）。 */
export const FROM_TEMPLATE_LABEL = '来自模板';
export const FROM_TEMPLATE_KEY = 'browse.from.template';

export const MAX_TEMPLATE_BYTES = 512 * 1024;

/** 序列化后的正文字节数（`content` + `plainText`），超过上限即不可当模板。 */
export function templateByteSize(content: unknown, plainText: string): number {
  const body = JSON.stringify(content ?? null) ?? 'null';
  return Buffer.byteLength(body, 'utf8') + Buffer.byteLength(plainText ?? '', 'utf8');
}

export function templateTooLarge(content: unknown, plainText: string): boolean {
  return templateByteSize(content, plainText) > MAX_TEMPLATE_BYTES;
}
