/**
 * G691: the row-title column has its own name, separate from the collection name
 * (`collections create --name` vs `--title <columnName>`, default `Title`).
 * The column is still the first text property (G105); only its label is configurable.
 */

export const DEFAULT_TITLE_COLUMN = 'Title';

export function normalizeTitleColumn(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  return trimmed || DEFAULT_TITLE_COLUMN;
}

export function titleColumnLabel(
  configured: string | null | undefined,
  firstPropertyType: string | null | undefined,
): string {
  return firstPropertyType === 'text' ? normalizeTitleColumn(configured) : '';
}
