/**
 * G92: a pasted/imported string column can be typed by looking at its values. The official
 * classes are empty / number / boolean / URL / email / date / phone; a column that mixes them
 * stays text. Dates reuse the strict parser from `coerce.ts` (2026-02-31 is not a date).
 */
import { parseCheckboxText, parseDateText } from './coerce';

export type InferredColumnType = 'text' | 'number' | 'checkbox' | 'date' | 'url' | 'email' | 'phone';

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const URL_VALUE = /^(?:https?:\/\/|www\.)\S+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^\+?[\d\s().-]+$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function inferValueType(raw: string): InferredColumnType {
  const value = raw.trim();
  if (!value) return 'text';
  if (parseCheckboxText(value) !== null) return 'checkbox';
  if (NUMBER.test(value)) return 'number';
  if (DATE_ONLY.test(value)) return parseDateText(value) !== null ? 'date' : 'text';
  if (URL_VALUE.test(value)) return 'url';
  if (EMAIL.test(value)) return 'email';
  if (PHONE_CHARS.test(value) && (value.match(/\d/g)?.length ?? 0) >= 7) return 'phone';
  return 'text';
}

/** A column is typed only when every non-empty value agrees; anything else is text. */
export function inferColumnType(values: string[]): InferredColumnType {
  const present = values.map((value) => value.trim()).filter(Boolean);
  if (present.length === 0) return 'text';
  const [first, ...rest] = present;
  const type = inferValueType(first);
  return rest.every((value) => inferValueType(value) === type) ? type : 'text';
}

export type InferredCell = { ok: true; value: unknown } | { ok: false };

export function coerceInferredCell(type: InferredColumnType, raw: string): InferredCell {
  const value = raw.trim();
  if (!value) return { ok: false };
  switch (type) {
    case 'number': {
      const number = Number(value);
      return Number.isFinite(number) ? { ok: true, value: number } : { ok: false };
    }
    case 'checkbox': {
      const flag = parseCheckboxText(value);
      return flag === null ? { ok: false } : { ok: true, value: flag };
    }
    case 'date': {
      const date = parseDateText(value);
      return date === null ? { ok: false } : { ok: true, value: date };
    }
    default:
      return { ok: true, value };
  }
}
