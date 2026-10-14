/**
 * Tag-validation strings for G169/G170, each parked next to the i18n key it must match in
 * `feature-catalog.md` so a ledger-as-source test can compare them.
 *
 * Two of these are a title/description pair (`*.titlekey` / `*.descriptionkey`) rather than a
 * single message: the official rules editor shows the title in the rule list and the description
 * as the explanation, so both are kept.
 */
export const ENTER_VALID_TAG_KEY = 'tags.enter.a.valid.tag';
export const ENTER_VALID_TAG = '输入有效标签（例如 #标签 或 #父级/子级）';

export const SPACE_AND_PUNCTUATION_KEY = 'tags.space.and.punctuation.are.not.allowed';
export const SPACE_AND_PUNCTUATION = '标签中不允许使用空格和标点符号。';

export const EMOJI_KEY = 'tags.tags.cannot.contain.emojis';
export const EMOJI_RULE = '标签不能包含表情符号';

export const DELIMITER_KEY = 'tags.tags.cannot.contain.delimiter.char';
export const DELIMITER_RULE = '标签不能包含分隔符';

export const ONLY_ONE_CHILD_KEY = 'tags.only.one.child.allowed';
export const ONLY_ONE_CHILD = '仅允许一个“/”';

export const NUMBERS_TITLE_KEY = 'tags.number.titlekey';
export const NUMBERS_TITLE = '数字';

export const NUMBERS_DESC_KEY = 'tags.number.descriptionkey';
export const NUMBERS_DESC = '仅包含数字的标签，例如#1';

export const HEX_COLOR_TITLE_KEY = 'tags.hexcolor.titlekey';
export const HEX_COLOR_TITLE = '十六进制颜色值';

export const HEX_COLOR_DESC_KEY = 'tags.hexcolor.descriptionkey';
export const HEX_COLOR_DESC = '十六进制格式的颜色值，如 #ff0000 或 #ccc';

export const TAG_IS_VALID_KEY = 'tags.tag.is.valid';
export const TAG_IS_VALID = '标签有效';

/** `[0]` is where the offending text goes; `formatInvalidTag` substitutes it. */
export const INVALID_TAG_X_KEY = 'tags.invalid.tag.x';
export const INVALID_TAG_X = '无效标签：[0]';

export const ENTERED_CURRENT_TAG_KEY = 'tags.entered.current.tag';
export const ENTERED_CURRENT_TAG = '你已输入当前标签。';

export const ENTERED_INVALID_TAG_KEY = 'tags.entered.invalid.tag';
export const ENTERED_INVALID_TAG = '你输入了无效的标签。';

export const CONTINUE_TYPING_VALID_KEY = 'tags.continue.typing.to.create.a.valid.tag';
export const CONTINUE_TYPING_VALID = '继续输入以创建有效标签';

export const CONTINUE_TYPING_KEY = 'tags.continue.typing.to.create.tag';
export const CONTINUE_TYPING = '继续输入以创建标签';

export function formatInvalidTag(tag: string): string {
  return INVALID_TAG_X.replace('[0]', tag);
}
