/**
 * G299: changing a field's type converts the values it can, and clears only what it cannot.
 * Official copy: `alert.field.type.changing.desc.updated`
 * 「如果可以转换，修改字段类型将会转换当前值。」
 *
 * Values arrive as whatever the cell editor stored (JSON-decoded). `null` means "this value
 * cannot survive the change".
 */
export function convertCellValue(value: unknown, to: string): unknown {
  if (value === null || value === undefined || value === '') return null;

  switch (to) {
    case 'text':
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(String).join('、');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);

    case 'number': {
      const numeric = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }

    case 'checkbox':
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (typeof value === 'number') return value !== 0;
      return null;

    case 'date': {
      if (typeof value !== 'string' && !(value instanceof Date)) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    case 'url':
    case 'email':
    case 'phone':
    case 'person':
      return typeof value === 'string' ? value : null;

    case 'select':
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      return null;

    case 'multi_select':
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === 'string') return [value];
      return null;

    case 'relation':
      return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : null;

    case 'file':
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;

    default:
      return null;
  }
}
