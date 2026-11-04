import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TABLE_GRID_COLS, TABLE_GRID_ROWS, cellInPreview, tableSizeAtCell } from './table-grid-picker';

/** G1430：插入面板末项「插入表格」＝官方的行列网格选择器（提示语逐字）。 */
describe('the insert panel row/column grid (G1430)', () => {
  it('turns a hovered cell into the table it would insert', () => {
    expect(tableSizeAtCell(0, 0)).toEqual({ rows: 1, cols: 1 });
    expect(tableSizeAtCell(2, 4)).toEqual({ rows: 3, cols: 5 });
    expect(tableSizeAtCell(TABLE_GRID_ROWS - 1, TABLE_GRID_COLS - 1)).toEqual({ rows: 10, cols: 10 });
  });

  it('lights the whole rectangle up to the hovered cell', () => {
    const hover = tableSizeAtCell(1, 2); // 2 × 3
    expect(cellInPreview({ row: 0, col: 0 }, hover)).toBe(true);
    expect(cellInPreview({ row: 1, col: 2 }, hover)).toBe(true);
    expect(cellInPreview({ row: 2, col: 0 }, hover)).toBe(false);
    expect(cellInPreview({ row: 0, col: 3 }, hover)).toBe(false);
    expect(cellInPreview({ row: 0, col: 0 }, null)).toBe(false);
  });

  it('stays inside the table limits (50 行 / 15 列)', () => {
    expect(TABLE_GRID_ROWS).toBeLessThanOrEqual(50);
    expect(TABLE_GRID_COLS).toBeLessThanOrEqual(15);
  });
});

describe('the insert panel wires the grid (G1430)', () => {
  const insertTab = readFileSync(
    join(process.cwd(), 'src/components/editor/tabs/InsertTab.tsx'),
    'utf8',
  );

  it('offers 插入表格 as a working grid instead of a disabled placeholder', () => {
    expect(insertTab).toContain("{ label: '插入表格', picker: 'tableGrid'");
    expect(insertTab).not.toContain("{ label: '插入表格', missing: true }");
    // 官方提示语逐字（V10 屏侧读回）。
    expect(insertTab).toContain('插入一个包含所选行数和列数的表格。');
  });

  it('renders the grid and inserts with the hovered size', () => {
    expect(insertTab).toContain('data-testid="table-grid-picker"');
    expect(insertTab).toContain('.insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })');
    expect(insertTab).toContain('onMouseEnter={() => setGridHover(size)}');
    expect(insertTab).toContain('cellInPreview({ row, col }, gridHover)');
  });

  it('keeps the only genuinely external entry disabled', () => {
    // Unsplash 要外部图库服务与密钥，本地没有 ⇒ 仍是禁用占位（其余 16 项都能真插）。
    expect(insertTab).toContain("{ label: '插入 Unsplash 图片', missing: true }");
  });
});
