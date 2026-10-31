export interface SummaryProperty {
  type: string;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * G41: the summary row's default per-column calculation. Numbers add up;
 * everything else counts non-empty values. A column with nothing to show is
 * blank rather than a misleading zero.
 */
export function summarizeColumn(property: SummaryProperty, values: unknown[]): string {
  if (property.type === 'number') {
    const numbers = values.map(numeric).filter((value): value is number => value !== null);
    if (numbers.length === 0) return '';
    return String(numbers.reduce((total, value) => total + value, 0));
  }
  const filled = values.filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
  if (filled.length === 0) return '';
  if (property.type === 'checkbox') {
    return `${filled.filter((value) => value === true || value === 'true').length}`;
  }
  return `${filled.length}`;
}
