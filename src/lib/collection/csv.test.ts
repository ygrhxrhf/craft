import { describe, expect, it } from 'vitest';

import { columnsFromProperties, escapeCsvField, rowsFromItems, toCsv } from './csv';

/**
 * `gap.md` G290 —— 集合专属导出格式 `collections.download.as.csv`「下载为 CSV」。
 * 序列化按 RFC 4180 口径（引号/逗号/换行转义、`\r\n` 行尾）。
 */
describe('集合 CSV 序列化（G290）', () => {
  it('普通字段不加引号，含逗号/引号/换行的字段才转义', () => {
    expect(escapeCsvField('abc')).toBe('abc');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('表头用属性名、行尾是 CRLF', () => {
    const csv = toCsv(
      [
        { key: 'p1', label: '名称' },
        { key: 'p2', label: '备注' },
      ],
      [
        { p1: '甲', p2: 'a,b' },
        { p1: '乙', p2: '' },
      ],
    );
    expect(csv).toBe('名称,备注\r\n甲,"a,b"\r\n乙,\r\n');
  });

  it('null/undefined 记空串、数字与布尔转字符串', () => {
    const csv = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], [{ a: null, b: 42 }, { a: undefined, b: false }]);
    expect(csv).toBe('A,B\r\n,42\r\n,false\r\n');
  });

  it('列由属性行生成（保持调用方给的顺序）', () => {
    expect(columnsFromProperties([{ id: 'p2', name: '乙' }, { id: 'p1', name: '甲' }])).toEqual([
      { key: 'p2', label: '乙' },
      { key: 'p1', label: '甲' },
    ]);
  });

  it('同属性多值用 `; ` 连接（与集合单元格显示一致）', () => {
    const rows = rowsFromItems([
      { id: 'i1', values: [{ propertyId: 'p1', value: '红' }, { propertyId: 'p1', value: '蓝' }] },
    ]);
    expect(rows[0]).toEqual({ p1: '红; 蓝' });
  });

  /**
   * G451：库里存的是 `{type, theme, value}` 判别对象。导出要裸值，否则一格落成
   * `{"type":"text",...}`；但一段恰好是 JSON 的**文本**不能被当成判别对象改写。
   */
  it('判别对象（含 JSON 字符串形态）导出裸值', () => {
    const rows = rowsFromItems([
      {
        id: 'i1',
        values: [
          { propertyId: 'p1', value: { type: 'text', theme: null, value: '甲' } },
          { propertyId: 'p2', value: JSON.stringify({ type: 'number', theme: null, value: 7 }) },
          { propertyId: 'p3', value: JSON.stringify({ type: 'multi_select', theme: null, value: ['红', '蓝'] }) },
        ],
      },
    ]);
    expect(rows[0]).toEqual({ p1: '甲', p2: 7, p3: ['红', '蓝'] });
  });

  it('恰好是 JSON 的文本原样导出，不当判别对象改写', () => {
    const rows = rowsFromItems([
      {
        id: 'i1',
        values: [
          { propertyId: 'p1', value: '[1,2]' },
          { propertyId: 'p2', value: '{"a":1}' },
          { propertyId: 'p3', value: '{"type":"text"' },
        ],
      },
    ]);
    expect(rows[0]).toEqual({ p1: '[1,2]', p2: '{"a":1}', p3: '{"type":"text"' });
  });
});
