/**
 * The official filter vocabulary, transcribed from `docs/craft-ref/features/protocol.md` §九:
 * the 19 line values with their display labels, the `TKe` per-column-type permission table, the
 * `xw` operand rules, and the evaluation semantics column (「求值语义」, written as a direct
 * translation of the official source).
 *
 * Three local column types do not exist officially (`formula`, `created_at`, `updated_at`) and
 * three official ones do not exist locally (`person`, `phone`, `linkToBlock`); two are renamed
 * (`multi_select`↔`multiSelect`, `file`↔`media`). The *permitted sets* below are official; the
 * type-name mapping is local and is declared here rather than in the ledger.
 */

export type LocalColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'file'
  | 'relation'
  | 'formula'
  | 'created_at'
  | 'updated_at';

export interface OperatorDef {
  /** Verbatim from the ledger: protocol.md §九 「显示」, cross-checked against feature-catalog.md. */
  readonly label: string;
  /** `isEmpty`/`isNotEmpty` are the only two with no operand (`xw`). */
  readonly takesValue: boolean;
}

export const OPERATORS = {
  isEmpty: { label: '为空', takesValue: false },
  isNotEmpty: { label: '不为空', takesValue: false },
  equals: { label: '是', takesValue: true },
  doesNotEqual: { label: '不是', takesValue: true },
  string_contains: { label: '包含', takesValue: true },
  string_doesNotContain: { label: '不包含', takesValue: true },
  select_isAnyOf: { label: '任何', takesValue: true },
  select_isNoneOf: { label: '无', takesValue: true },
  // The relation trio's labels disagree between two ledger faces: protocol.md §九 shows
  // 拥有任一/拥有全部/都不含, feature-catalog.md's i18n table (collections.has.*) shows
  // 有任何/拥有全部/没有. protocol.md is the operator's own display column, so it wins here;
  // the conflict stays declared instead of silently picking one.
  relation_hasAnyOf: { label: '拥有任一', takesValue: true },
  relation_hasAllOf: { label: '拥有全部', takesValue: true },
  relation_hasNoneOf: { label: '都不含', takesValue: true },
  date_isBefore: { label: '早于', takesValue: true },
  date_isAfter: { label: '晚于', takesValue: true },
  // Numbers and dates print their operator as a literal, not through i18n.
  number_equal: { label: '=', takesValue: true },
  number_notEqual: { label: '≠', takesValue: true },
  number_smaller: { label: '<', takesValue: true },
  number_smallerOrEqual: { label: '≤', takesValue: true },
  number_greater: { label: '>', takesValue: true },
  number_greaterOrEqual: { label: '≥', takesValue: true },
} as const satisfies Record<string, OperatorDef>;

export type OperatorId = keyof typeof OPERATORS;

const TEXT_TIER: readonly string[] = [
  'string_contains',
  'string_doesNotContain',
  'isEmpty',
  'isNotEmpty',
  'equals',
  'doesNotEqual',
];
const MEDIA_TIER: readonly string[] = ['string_contains', 'string_doesNotContain', 'isEmpty', 'isNotEmpty'];
const NUMBER_TIER: readonly string[] = [
  'number_equal',
  'number_notEqual',
  'number_smaller',
  'number_smallerOrEqual',
  'number_greater',
  'number_greaterOrEqual',
  'isEmpty',
  'isNotEmpty',
];
const SELECT_TIER: readonly string[] = [
  'equals',
  'doesNotEqual',
  'select_isAnyOf',
  'select_isNoneOf',
  'isEmpty',
  'isNotEmpty',
];
const RELATION_TIER: readonly string[] = [
  'relation_hasAnyOf',
  'relation_hasAllOf',
  'relation_hasNoneOf',
  'isEmpty',
  'isNotEmpty',
];
const DATE_TIER: readonly string[] = ['equals', 'doesNotEqual', 'date_isBefore', 'date_isAfter', 'isEmpty', 'isNotEmpty'];

/**
 * `TKe`: which operators a column type may offer. Official `TKe` has no default branch, so an
 * unlisted type yields `undefined` → no operators at all; the three locally-only types below
 * therefore get an empty list rather than a guessed tier.
 */
export const OPERATORS_BY_TYPE: Record<LocalColumnType, readonly string[]> = {
  text: TEXT_TIER,
  url: TEXT_TIER,
  email: TEXT_TIER,
  file: MEDIA_TIER,
  number: NUMBER_TIER,
  select: SELECT_TIER,
  multi_select: SELECT_TIER,
  relation: RELATION_TIER,
  date: DATE_TIER,
  checkbox: ['equals'],
  formula: [],
  created_at: [],
  updated_at: [],
};

export function operatorsFor(type: string): readonly string[] {
  return OPERATORS_BY_TYPE[type as LocalColumnType] ?? [];
}

/**
 * The 14 line values this build used before the official vocabulary landed. They are persisted
 * inside `view.config`, so they are mapped on read — official Craft never stored them and has no
 * migration to follow. The mapping is local; nothing here may be quoted as official behaviour.
 */
const LEGACY_LINE_VALUES: Record<string, string> = {
  contains: 'string_contains',
  not_contains: 'string_doesNotContain',
  is: 'equals',
  is_not: 'doesNotEqual',
  is_empty: 'isEmpty',
  is_not_empty: 'isNotEmpty',
  before: 'date_isBefore',
  after: 'date_isAfter',
};

/**
 * Resolve a stored line value to one this column type is actually allowed to ask, or `null` when
 * the filter cannot be answered (unknown line value, or a legal one on the wrong column type).
 * `null` means inert, which is the `xw` rule: an invalid filter is dropped, not turned into a
 * silent pass and not an error.
 */
export function resolveOperator(stored: string, columnType: string): string | null {
  const official =
    stored in OPERATORS
      ? stored
      : stored in LEGACY_LINE_VALUES
        ? LEGACY_LINE_VALUES[stored]
        : stored === 'eq'
          ? columnType === 'number'
            ? 'number_equal'
            : 'equals'
          : stored === 'ne'
            ? columnType === 'number'
              ? 'number_notEqual'
              : 'doesNotEqual'
            : stored === 'gt'
              ? 'number_greater'
              : stored === 'gte'
                ? 'number_greaterOrEqual'
                : stored === 'lt'
                  ? 'number_smaller'
                  : stored === 'lte'
                    ? 'number_smallerOrEqual'
                    : null;
  if (!official) return null;
  return operatorsFor(columnType).includes(official) ? official : null;
}

function isBlank(value: unknown): boolean {
  // Official `isEmpty`: `value == null || value === ""`.
  return value == null || value === '';
}

/** Multi-values reach the filter as one string; the official SELECT serializer joins with ", ". */
function toOperandArray(operand: unknown): string[] | null {
  if (Array.isArray(operand)) return operand.map(String);
  if (typeof operand !== 'string') return null;
  return operand.split(', ');
}

function toValueArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return [String(value)];
}

function compareNumbers(value: unknown, operand: unknown, op: string): boolean {
  const a = Number(value);
  const b = Number(operand);
  // Neither official source says what a NaN cell does; answering `false` keeps an unparsable row
  // out of every number filter instead of letting `≠` collect it.
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  switch (op) {
    case 'number_equal':
      return a === b;
    case 'number_notEqual':
      return a !== b;
    case 'number_smaller':
      return a < b;
    case 'number_smallerOrEqual':
      return a <= b;
    case 'number_greater':
      return a > b;
    default:
      return a >= b;
  }
}

function compareDates(value: unknown, operand: unknown, op: string): boolean {
  const a = new Date(String(value)).getTime();
  const b = new Date(String(operand)).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return op === 'date_isBefore' ? a < b : a > b;
}

/**
 * Evaluate one official line value. The caller resolves the stored line value first, so this
 * only ever sees an operator this column type is allowed to ask.
 */
export function evaluateOperator(op: string, value: unknown, operand: unknown, columnType: string): boolean {
  switch (op) {
    case 'isEmpty':
      return isBlank(value);
    case 'isNotEmpty':
      return !isBlank(value);
    case 'string_contains':
    case 'string_doesNotContain': {
      // Official edge: an empty value or an empty operand answers `false` for both directions.
      if (isBlank(value) || operand === '' || operand == null) return false;
      const hit = String(value).toLowerCase().includes(String(operand).toLowerCase());
      return op === 'string_contains' ? hit : !hit;
    }
    case 'equals':
    case 'doesNotEqual': {
      const left = Array.isArray(value) && value.length === 1 ? value[0] : value;
      const equal =
        columnType === 'checkbox'
          ? String(left).toLowerCase() === String(operand).toLowerCase()
          : String(left ?? '') === String(operand ?? '');
      return op === 'equals' ? equal : !equal;
    }
    case 'select_isAnyOf': {
      const right = toOperandArray(operand);
      if (!right) return false;
      return toValueArray(value).some((v) => right.includes(v));
    }
    case 'select_isNoneOf': {
      // Official: a null value answers `true` without consulting the operand.
      if (value == null) return true;
      const right = toOperandArray(operand);
      if (!right) return false;
      return toValueArray(value).every((v) => !right.includes(v));
    }
    case 'relation_hasAnyOf':
    case 'relation_hasAllOf':
    case 'relation_hasNoneOf': {
      const right = toOperandArray(operand);
      if (!right) return false;
      const left = toValueArray(value);
      if (op === 'relation_hasAnyOf') return left.some((v) => right.includes(v));
      if (op === 'relation_hasAllOf') return left.length > 0 && left.every((v) => right.includes(v));
      return left.every((v) => !right.includes(v));
    }
    case 'date_isBefore':
    case 'date_isAfter':
      return compareDates(value, operand, op);
    case 'number_equal':
    case 'number_notEqual':
    case 'number_smaller':
    case 'number_smallerOrEqual':
    case 'number_greater':
    case 'number_greaterOrEqual':
      return compareNumbers(value, operand, op);
    default:
      // Unreachable through `resolveOperator`; kept as inert rather than a throw so a stale stored
      // line value can never make a whole table view unrenderable.
      return true;
  }
}

/**
 * One call for the whole filter: resolve, then evaluate. `true` (inert) when the line value is
 * unknown or not permitted on this column type.
 */
export function applyFilter(
  filter: { propertyId: string; operator: string; value: unknown },
  value: unknown,
  columnType: string,
): boolean {
  const op = resolveOperator(filter.operator, columnType);
  if (!op) return true;
  return evaluateOperator(op, value, filter.value, columnType);
}
