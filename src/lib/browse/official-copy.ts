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

/** 1 takes the singular line, everything else fills the `[0]` slot of the plural one. */
export function formatDocCount(count: number): string {
  return count === 1 ? DOC_COUNT_ONE : DOC_COUNT_MANY.replace('[0]', String(count));
}
