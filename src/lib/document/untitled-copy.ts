/**
 * The two untitled placeholders (G215). One entity, two strings: the top bar prints 「无标题页面」
 * and the list and tag views print 「无标题文档」. They are not interchangeable — the collected
 * keys are `untitled.page` and `untitled.document`.
 */
export type UntitledSurface = 'topBar' | 'list';

export const UNTITLED_PAGE = '无标题页面';
export const UNTITLED_PAGE_KEY = 'untitled.page';

export const UNTITLED_DOCUMENT = '无标题文档';
export const UNTITLED_DOCUMENT_KEY = 'untitled.document';

/** The placeholder for a surface: the top bar says 「页面」, everywhere else says 「文档」. */
export function untitledFor(surface: UntitledSurface): string {
  return surface === 'topBar' ? UNTITLED_PAGE : UNTITLED_DOCUMENT;
}

/** The i18n key backing a surface's placeholder. */
export function untitledKeyFor(surface: UntitledSurface): string {
  return surface === 'topBar' ? UNTITLED_PAGE_KEY : UNTITLED_DOCUMENT_KEY;
}

/**
 * The title a brand-new document is stored with. It uses the list wording, since the top bar is a
 * display surface rather than a stored value.
 */
export const NEW_DOCUMENT_TITLE = UNTITLED_DOCUMENT;
