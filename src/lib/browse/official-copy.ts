/**
 * Browse-page strings for G47 (document-count badges and empty states), each parked next to the
 * i18n key it must match in `feature-catalog.md` so a ledger-as-source test can compare them.
 *
 * `browse.one.document` is the singular form and `browse.x.documents` the plural one with a
 * `[0]` slot — the split is official, not a stylistic choice.
 */
export const DOC_COUNT_ONE_KEY = 'browse.one.document';
export const DOC_COUNT_ONE = '1 个文档';

export const DOC_COUNT_MANY_KEY = 'browse.x.documents';
/** `[0]` is where the number goes; `formatDocCount` substitutes it. */
export const DOC_COUNT_MANY = '[0] 个文档';

export const FOLDER_EMPTY_KEY = 'browse.folder.empty';
export const FOLDER_EMPTY = '这个文件夹是空的';

export const STARRED_EMPTY_KEY = 'browse.star.doc.you.want.to.easily.find.later';
export const STARRED_EMPTY = '收藏你想要稍后轻松找到的文档';

export const NO_DOCUMENTS_KEY = 'browse.no.documents.yet';
export const NO_DOCUMENTS = '你还没有任何文档';

export const NO_RESULTS_KEY = 'browse.no.results.found';
export const NO_RESULTS = '未找到结果';

export const TAGS_EMPTY_KEY = 'tags.all.tags.placeholder';
export const TAGS_EMPTY =
  '尚无已加标签的文档。从添加 #工作、#想法 或 #学校 等标签开始，为你的笔记建立条理。';

export const GET_CRAFT_PLUS_KEY = 'subscription.get.craft.plus';
export const GET_CRAFT_PLUS = '获得 Craft Plus';

/** The unsorted collection (`/inbox`, G45). Its page title is the entity word, not a phrase. */
export const UNSORTED_TITLE_KEY = 'unsorted';
export const UNSORTED_TITLE = '未分类';

export const INBOX_DESC_KEY = 'browse.inbox.desc';
export const INBOX_DESC = '不在任何文件夹中的文档都会收集在这里';

export const INBOX_EMPTY_KEY = 'browse.doc.not.in.folder.will.appear.here';
export const INBOX_EMPTY = '不在任何文件夹中的文档将显示在此处';

/** The archive control on an inbox document. */
export const MOVE_TO_KEY = 'moveto';
export const MOVE_TO = '移动到…';

/** The tree/panel placeholder while its rows load. Official uses the single `…` glyph. */
export const LOADING_KEY = 'loading';
export const LOADING = '加载中…';

/** 1 takes the singular line, everything else fills the `[0]` slot of the plural one. */
export function formatDocCount(count: number): string {
  return count === 1 ? DOC_COUNT_ONE : DOC_COUNT_MANY.replace('[0]', String(count));
}
