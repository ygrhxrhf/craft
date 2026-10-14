/**
 * The official tag-validation rule set (G169 + G170), as pure logic.
 *
 * `docs/craft-ref/features/tags-browse.md` §二 records six rules plus four feedback states; this
 * module is the only place that decides whether a tag is legal, so the editor input, the submit
 * handler and any future settings screen all agree.
 *
 * Two deliberate readings of the ledger:
 * - Hierarchy is fixed at 2 (`#父级/子级`), so `/` is simultaneously the delimiter and the one
 *   character the delimiter rule tolerates. More than one `/` is the *depth* violation
 *   (`only.one.child.allowed`); a `/` that leaves either side empty is the bare *delimiter*
 *   violation, since an empty parent or child is not a level.
 * - `#ccc` / `#ff0000` must not become tags, and the normalizer strips a leading `#` before
 *   anybody looks at the text — so the hex-colour check runs on the **raw** input, first.
 */
import { MAX_TAG_LENGTH } from './normalize';
import {
  DELIMITER_KEY,
  DELIMITER_RULE,
  EMOJI_KEY,
  EMOJI_RULE,
  ENTERED_CURRENT_TAG,
  ENTERED_CURRENT_TAG_KEY,
  ENTERED_INVALID_TAG,
  ENTERED_INVALID_TAG_KEY,
  HEX_COLOR_DESC,
  HEX_COLOR_DESC_KEY,
  INVALID_TAG_X_KEY,
  NUMBERS_DESC,
  NUMBERS_DESC_KEY,
  ONLY_ONE_CHILD,
  ONLY_ONE_CHILD_KEY,
  SPACE_AND_PUNCTUATION,
  SPACE_AND_PUNCTUATION_KEY,
  TAG_IS_VALID,
  TAG_IS_VALID_KEY,
  CONTINUE_TYPING,
  CONTINUE_TYPING_KEY,
  CONTINUE_TYPING_VALID,
  CONTINUE_TYPING_VALID_KEY,
  formatInvalidTag,
} from './official-copy';

export const HIERARCHY_SEPARATOR = '/';

/**
 * Local cap, not one of the six rules: the ledger has no length message, and
 * `normalizeTagName` truncates instead of complaining. Rejecting here keeps a 60-character
 * draft from silently becoming a different tag.
 */
export const LENGTH_LIMIT = `标签最长 ${MAX_TAG_LENGTH} 个字符`;

/**
 * Punctuation that is *not* a violation. The ledger names the rule but never enumerates the
 * characters, so this list is the narrow, documented-from-below set: link-ish and word-ish
 * separators that existing tags already rely on.
 */
const ALLOWED_PUNCTUATION = new Set(['-', '_']);

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export type TagRuleId =
  | 'hexColor'
  | 'length'
  | 'emoji'
  | 'depth'
  | 'delimiter'
  | 'spaceOrPunctuation'
  | 'numbers';

export interface TagRejection {
  rule: TagRuleId;
  /**
   * The i18n key the message came from; keeps the UI and the ledger tied together. `null` marks
   * the one local rule (length) that has no official string.
   */
  key: string | null;
  message: string;
}

export interface TagRuleOptions {
  /** `number.descriptionkey` is an official switchable rule: off by default. */
  allowNumbers?: boolean;
}

/** Leading `#`, `:` and `@` are input habits, not content; `normalizeTagName` agrees. */
function stripPrefixes(raw: string): string {
  return raw.replace(/^[#:@\s]+/, '').replace(/\s+/g, ' ').trim();
}

export function isHexColorLiteral(raw: string): boolean {
  return HEX_COLOR_PATTERN.test(raw.trim());
}

export function containsEmoji(value: string): boolean {
  return EMOJI_PATTERN.test(value);
}

export interface TagLevels {
  parent: string;
  child: string | null;
}

/** The 2-level tree `enter.a.valid.tag` describes: `父级` or `父级/子级`, never deeper. */
export function splitTagLevels(body: string): TagLevels | null {
  const parts = body.split(HIERARCHY_SEPARATOR);
  if (parts.length === 1) return { parent: parts[0], child: null };
  if (parts.length === 2) return { parent: parts[0], child: parts[1] };
  return null;
}

/**
 * The six rules against a draft, in the order the checks have to happen. Returns the first
 * violation, or `null` when the draft is a legal tag (`''` after cleaning means "nothing yet",
 * which is not a violation — see `tagFeedback`).
 */
export function findTagViolation(raw: string, options: TagRuleOptions = {}): TagRejection | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isHexColorLiteral(trimmed)) {
    return { rule: 'hexColor', key: HEX_COLOR_DESC_KEY, message: HEX_COLOR_DESC };
  }

  const body = stripPrefixes(trimmed);
  if (!body) return null;

  if (body.length > MAX_TAG_LENGTH) {
    return { rule: 'length', key: null, message: LENGTH_LIMIT };
  }

  if (containsEmoji(body)) {
    return { rule: 'emoji', key: EMOJI_KEY, message: EMOJI_RULE };
  }

  const slashCount = body.split(HIERARCHY_SEPARATOR).length - 1;
  if (slashCount > 1) {
    return { rule: 'depth', key: ONLY_ONE_CHILD_KEY, message: ONLY_ONE_CHILD };
  }

  const levels = splitTagLevels(body);
  if (levels && (levels.parent === '' || (body.includes(HIERARCHY_SEPARATOR) && levels.child === ''))) {
    return { rule: 'delimiter', key: DELIMITER_KEY, message: DELIMITER_RULE };
  }

  for (const char of body) {
    if (char === HIERARCHY_SEPARATOR) continue;
    if (/\p{L}|\p{N}/u.test(char)) continue;
    if (ALLOWED_PUNCTUATION.has(char)) continue;
    return { rule: 'spaceOrPunctuation', key: SPACE_AND_PUNCTUATION_KEY, message: SPACE_AND_PUNCTUATION };
  }

  if (!options.allowNumbers && /^\p{N}+$/u.test(body)) {
    return { rule: 'numbers', key: NUMBERS_DESC_KEY, message: NUMBERS_DESC };
  }

  return null;
}

/** Convenience alias used by callers that only want the yes/no answer. */
export function rejectTag(raw: string, options: TagRuleOptions = {}): TagRejection | null {
  return findTagViolation(raw, options);
}

export function isValidTag(raw: string, options: TagRuleOptions = {}): boolean {
  return findTagViolation(raw, options) === null && stripPrefixes(raw) !== '';
}

/**
 * The live sentence under the input. Official has four states plus the two "keep typing"
 * prompts; `typing` covers drafts that cannot stand alone yet (`#`, `父级/`) but are not
 * mistakes — telling the user "invalid tag" there would be wrong.
 */
export type TagFeedback =
  | { kind: 'empty'; key: string; message: string }
  | { kind: 'typing'; key: string; message: string }
  | { kind: 'valid'; key: string; message: string }
  | { kind: 'current'; key: string; message: string }
  | { kind: 'invalid'; key: string; message: string; detail: string; rule: TagRejection | null };

export interface TagFeedbackContext {
  /** Tags already attached to the document, compared case-insensitively like the matcher does. */
  existing?: readonly string[];
  /** The tag currently focused/being edited, if any. */
  current?: string | null;
  allowNumbers?: boolean;
}

export function tagFeedback(raw: string, context: TagFeedbackContext = {}): TagFeedback {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: 'empty', key: CONTINUE_TYPING_KEY, message: CONTINUE_TYPING };
  }

  const body = stripPrefixes(trimmed);
  const taken = new Set(
    [context.current, ...(context.existing ?? [])]
      .filter((name): name is string => Boolean(name))
      .map((name) => stripPrefixes(name).toLowerCase()),
  );
  if (body && taken.has(body.toLowerCase())) {
    return { kind: 'current', key: ENTERED_CURRENT_TAG_KEY, message: ENTERED_CURRENT_TAG };
  }

  if (body === '' || trimmed.endsWith(':') || trimmed.endsWith('@')) {
    return { kind: 'typing', key: CONTINUE_TYPING_VALID_KEY, message: CONTINUE_TYPING_VALID };
  }

  if (body.endsWith(HIERARCHY_SEPARATOR)) {
    return { kind: 'typing', key: CONTINUE_TYPING_VALID_KEY, message: CONTINUE_TYPING_VALID };
  }

  const violation = findTagViolation(trimmed, { allowNumbers: context.allowNumbers });
  if (violation) {
    return {
      kind: 'invalid',
      key: INVALID_TAG_X_KEY,
      message: formatInvalidTag(trimmed),
      detail: ENTERED_INVALID_TAG,
      rule: violation,
    };
  }

  return { kind: 'valid', key: TAG_IS_VALID_KEY, message: TAG_IS_VALID };
}

