/**
 * `gap.md` G38 —— 发布页的「显示作者」一组（官方 `toolbar.visual.options` 五组之一）。
 *
 * 官方逐字（`_harvest/i18n-zh.tsv:3669-3670,3726`）：
 *   开关名「显示作者」`toolbar.show.author`；成对状态句「作者将显示」`toolbar.author.shown`
 *   ／「不显示作者」`toolbar.author.hidden`。默认**显示**（`publishing.md:17` 的默认值表
 *   `showAuthor: true`）。
 *
 * ☆ 落库列是 `document_share.showAuthor`（元数据，过离线内核）。公开页是服务端渲染，它按行上的
 *   这一列决定渲不渲染作者署名——署名本身用包里唯一那支"by <name>"模板 `collab.by.author.capital`
 *   「来自 [0]」（`i18n-zh.tsv:854`；小写那支 `collab.by.author`「由[0]」同源，页头取大写档）。
 */

/** 新建分享时作者的默认可见性：官方默认显示。 */
export const DEFAULT_SHOW_AUTHOR = true;

/** 开关名（分段控件/开关行的标签）。 */
export const SHOW_AUTHOR_LABEL = '显示作者';
export const SHOW_AUTHOR_KEY = 'toolbar.show.author';

/** 开关两侧的状态句，逐字。 */
export const AUTHOR_SHOWN_LABEL = '作者将显示';
export const AUTHOR_HIDDEN_LABEL = '不显示作者';
export const AUTHOR_SHOWN_KEY = 'toolbar.author.shown';
export const AUTHOR_HIDDEN_KEY = 'toolbar.author.hidden';

/** 署名模板：`[0]` 是作者名。官方页头用的是大写档。 */
export const BY_AUTHOR_TEMPLATE = '来自 [0]';
export const BY_AUTHOR_KEY = 'collab.by.author.capital';

/**
 * 落库值 → 布尔。**只有显式的 `false` 才隐藏**：`undefined`／`null`／旧行缺列都按默认档（显示），
 * 与 `publishing.md` 的默认值一致，也让"老分享行"不会因为新增一列突然把作者藏掉。
 */
export function showsAuthor(value: unknown): boolean {
  return value !== false;
}

/** 开关右侧那句状态文案（官方成对句）。 */
export function authorStatusLabel(showAuthor: boolean): string {
  return showAuthor ? AUTHOR_SHOWN_LABEL : AUTHOR_HIDDEN_LABEL;
}

/** 把作者名填进署名模板；作者名为空时返回空串（调用方据此不渲染署名）。 */
export function authorByline(authorName: string | null | undefined): string {
  const name = authorName?.trim();
  if (!name) return '';
  return BY_AUTHOR_TEMPLATE.replace('[0]', name);
}
