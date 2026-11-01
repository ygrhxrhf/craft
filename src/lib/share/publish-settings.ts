/**
 * G141 —— 发布设置是一个 **13 字段对象且有权威默认值**（`publishing.md` §一）。
 *
 * 官方那 13 项与默认值（逐字）：`commentLevel:"add"` / `enableObjectLinks:false` /
 * `hideTableOfContents:false` / `hidePresentationMode:false` / `showAuthor:true` / `showTitle:true` /
 * `showWatermark:true` / `enableSeo:false` / `passwordProtected:false` /
 * `showDuplicateAsTemplate:false` / `emailBasedAccessEnabled:false` / `defaultDomain:undefined` /
 * `hideHashTagWords:false`。
 *
 * 本地 `DocumentShare` 落了其中 7 项（showAuthor / showTitle(＝showPageTitle) /
 * hideTableOfContents / hidePresentationMode / showWatermark / enableSeo / 口令），
 * 其余 6 项（commentLevel / enableObjectLinks / showDuplicateAsTemplate / emailBasedAccessEnabled /
 * defaultDomain / hideHashTagWords）**无列**。本模块把 13 项与默认值集中一处，并标出哪些已落库。
 */

/** 访客评论权限三档（`publishing.md:13`）：可添加 / 可查看 / 不可见。 */
export type CommentLevel = 'add' | 'view' | 'none';

/** 13 项发布设置，键名照官方。 */
export interface PublishSettings {
  commentLevel: CommentLevel;
  enableObjectLinks: boolean;
  hideTableOfContents: boolean;
  hidePresentationMode: boolean;
  showAuthor: boolean;
  showTitle: boolean;
  showWatermark: boolean;
  enableSeo: boolean;
  passwordProtected: boolean;
  showDuplicateAsTemplate: boolean;
  emailBasedAccessEnabled: boolean;
  /** 未设置即 `undefined`（官方那格的默认值就是 undefined，不是空串）。 */
  defaultDomain: string | undefined;
  hideHashTagWords: boolean;
}

/** 权威默认值，逐字取自 `publishing.md` §一。 */
export const PUBLISH_DEFAULTS: PublishSettings = {
  commentLevel: 'add',
  enableObjectLinks: false,
  hideTableOfContents: false,
  hidePresentationMode: false,
  showAuthor: true,
  showTitle: true,
  showWatermark: true,
  enableSeo: false,
  passwordProtected: false,
  showDuplicateAsTemplate: false,
  emailBasedAccessEnabled: false,
  defaultDomain: undefined,
  hideHashTagWords: false,
};

export const PUBLISH_FIELDS = Object.keys(PUBLISH_DEFAULTS) as (keyof PublishSettings)[];

/** 已落库的 7 项：本地 `DocumentShare` 有对应列（口令一项落在 `passcode`）。 */
export const WIRED_PUBLISH_FIELDS: (keyof PublishSettings)[] = [
  'hideTableOfContents',
  'hidePresentationMode',
  'showAuthor',
  'showTitle',
  'showWatermark',
  'enableSeo',
  'passwordProtected',
];

/** 尚无落点的 6 项。 */
export function unwiredPublishFields(): (keyof PublishSettings)[] {
  return PUBLISH_FIELDS.filter((field) => !WIRED_PUBLISH_FIELDS.includes(field));
}

/**
 * 从一份（可能残缺的）记录里读设置：缺格补权威默认值。`showTitle` 在本地列名是 `showPageTitle`，
 * 由调用方先映射（本函数只认官方名）。
 */
export function readPublishSettings(record: Partial<PublishSettings> | null | undefined): PublishSettings {
  const out = { ...PUBLISH_DEFAULTS };
  if (!record) return out;
  for (const field of PUBLISH_FIELDS) {
    const value = record[field];
    if (value !== undefined) (out as Record<string, unknown>)[field] = value;
  }
  return out;
}

/** 本地列名 ↔ 官方字段名的两处差异（`showPageTitle` ↔ `showTitle`）。 */
export const LOCAL_TO_OFFICIAL_FIELD: Record<string, keyof PublishSettings> = {
  showPageTitle: 'showTitle',
  passcode: 'passwordProtected',
};

export function officialFieldName(local: string): keyof PublishSettings | null {
  if (local in LOCAL_TO_OFFICIAL_FIELD) return LOCAL_TO_OFFICIAL_FIELD[local];
  return (PUBLISH_FIELDS as string[]).includes(local) ? (local as keyof PublishSettings) : null;
}
