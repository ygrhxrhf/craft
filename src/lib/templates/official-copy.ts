/**
 * The template subsystem's strings (G236). Two action families — create a document *from* a
 * template, and insert a template *into* the current document — plus a size guard and a
 * provenance marker. The template source is a special folder rather than a separate store.
 */

/** The template source is a folder, described in the browse UI. */
export const TEMPLATES_FOLDER_DESC =
  '创建新文档或页面时，添加到此文件夹的文档可用作模板';
export const TEMPLATES_FOLDER_DESC_KEY = 'browse.custom.templates.desc';

/** Create a document from a template. */
export const NEW_DOC_FROM_TEMPLATE = '从此模板新建文档';
export const NEW_DOC_FROM_TEMPLATE_KEY = 'browse.new.document.from.template';

export const TEMPLATES_CREATING = '从模板创建文档';
export const TEMPLATES_CREATING_KEY = 'browse.templates.creating';

/** Insert a template into the current document. */
export const TEMPLATES_INSERTING = '将模板插入文档';
export const TEMPLATES_INSERTING_KEY = 'browse.templates.inserting';

/** The size guard, and the failure sentence beside it. */
export const TEMPLATES_DOC_TOO_LARGE = '文档太大，无法用作模板';
export const TEMPLATES_DOC_TOO_LARGE_KEY = 'browse.templates.doc.too.large';

export const TEMPLATES_CANNOT_CREATE = '无法创建模板';
export const TEMPLATES_CANNOT_CREATE_KEY = 'browse.templates.cannot.create';

/** The provenance marker a document carries when it came from a template. */
export const FROM_TEMPLATE = '来自模板';
export const FROM_TEMPLATE_KEY = 'browse.from.template';

/** The mobile guard. */
export const TEMPLATE_NOT_SUPPORTED_ON_MOBILE = '目前不支持在移动设备上通过模板创建文档。';
export const TEMPLATE_NOT_SUPPORTED_ON_MOBILE_KEY = 'alert.template.not.supported.on.mobile';

/** The two action families, named so a caller picks one deliberately. */
export type TemplateAction = 'createFromTemplate' | 'insertIntoDocument';

export const TEMPLATE_ACTIONS: Record<TemplateAction, { label: string; key: string }> = {
  createFromTemplate: { label: NEW_DOC_FROM_TEMPLATE, key: NEW_DOC_FROM_TEMPLATE_KEY },
  insertIntoDocument: { label: TEMPLATES_INSERTING, key: TEMPLATES_INSERTING_KEY },
};
