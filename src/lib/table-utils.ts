'use client';

import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { evaluateCellFormula } from '@/lib/editor/table-formula';
import { gridIsUniform, movedOrder, type CellSpan } from '@/lib/editor/table-move';
import { planTableInsert } from '@/lib/editor/table-landing';
import { compareCells } from '@/lib/editor/table-sort';
import {
  TABLE_SIZE_LIMIT_DURATION,
  TABLE_SIZE_LIMIT_SUBTITLE,
  tableSizeAllowed,
  tableSizeLimitTitle,
} from '@/lib/collection/limits';
import { toast } from '@/components/ui/toast';

function findTable(
  editor: Editor
): { node: PMNode; pos: number } | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

/**
 * Move the row or column holding the caret by one step. A table with a merged cell is left alone,
 * because swapping across a span would make the grid invalid.
 */
export function moveTableAxis(editor: Editor, axis: 'row' | 'col', step: -1 | 1): boolean {
  const found = findTable(editor);
  if (!found) return false;

  const rows = found.node.content.content.filter((node: PMNode) => node.type.name === 'tableRow');
  // TEMP trace
  const grid: CellSpan[][] = rows.map((row: PMNode) =>
    row.content.content.map((cell: PMNode) => ({
      colspan: cell.attrs.colspan ?? 1,
      rowspan: cell.attrs.rowspan ?? 1,
    })),
  );
  if (!gridIsUniform(grid)) return false;

  const { $from } = editor.state.selection;
  let rowIndex = -1;
  let colIndex = -1;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    // The index is among the parent's children, so the row's place is read one level up.
    if (name === 'table') rowIndex = $from.index(depth);
    if (name === 'tableRow') colIndex = $from.index(depth);
  }
  if (rowIndex < 0 || colIndex < 0) return false;

  const index = axis === 'row' ? rowIndex : colIndex;
  const count = axis === 'row' ? rows.length : grid[0].length;
  const order = movedOrder(count, index, step);
  if (!order) return false;

  const rebuilt =
    axis === 'row'
      ? order.map((position) => rows[position])
      : rows.map((row: PMNode) =>
          row.type.create(
            row.attrs,
            order.map((position) => row.content.content[position]),
          ),
        );
  const table = found.node.type.create(found.node.attrs, rebuilt);
  editor.view.dispatch(
    editor.state.tr.replaceWith(found.pos, found.pos + found.node.nodeSize, table).scrollIntoView(),
  );
  return true;
}

/** Empty the cell holding the caret, leaving the cell itself in place. */
export function clearCellContents(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name !== 'tableCell' && name !== 'tableHeader') continue;
    const paragraph = editor.state.schema.nodes.paragraph.create();
    editor.view.dispatch(
      editor.state.tr.replaceWith($from.start(depth), $from.end(depth), paragraph).scrollIntoView(),
    );
    return true;
  }
  return false;
}

/** Drop the cell's own colours, leaving its text. */
export function clearCellStyle(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') continue;
    if (!node.attrs.backgroundColor && !node.attrs.color) return false;
    editor.view.dispatch(
      editor.state.tr
        .setNodeMarkup($from.before(depth), undefined, {
          ...node.attrs,
          backgroundColor: null,
          color: null,
        })
        .scrollIntoView(),
    );
    return true;
  }
  return false;
}

/** Drop every remembered column width, so the table sizes itself again. */
export function resetColumnSizes(editor: Editor): boolean {
  const found = findTable(editor);
  if (!found) return false;
  let tr = editor.state.tr;
  let changed = false;
  found.node.descendants((node, pos) => {
    if (
      (node.type.name === 'tableCell' || node.type.name === 'tableHeader') &&
      node.attrs.colwidth
    ) {
      tr = tr.setNodeMarkup(found.pos + 1 + pos, undefined, { ...node.attrs, colwidth: null });
      changed = true;
    }
  });
  if (!changed) return false;
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function sortTable(editor: Editor, dir: 'asc' | 'desc'): boolean {
  const found = findTable(editor);
  if (!found) return false;
  const { node: table, pos } = found;

  const rows = table.content.content.filter(
    (n: PMNode) => n.type.name === 'tableRow'
  );
  const headerRows = rows.filter(
    (r: PMNode) => r.content.content[0]?.type.name === 'tableHeader'
  );
  const bodyRows = rows.filter(
    (r: PMNode) => r.content.content[0]?.type.name !== 'tableHeader'
  );

  // Sort by the column the caret is in, falling back to the first column.
  let column = 0;
  for (let depth = editor.state.selection.$from.depth; depth > 0; depth--) {
    if (editor.state.selection.$from.node(depth).type.name === 'tableRow') {
      column = editor.state.selection.$from.index(depth);
    }
  }

  const sorted = [...bodyRows].sort((a: PMNode, b: PMNode) =>
    compareCells(a.content.content[column]?.textContent, b.content.content[column]?.textContent, dir),
  );

  const newContent = [...headerRows, ...sorted];
  const newTable = table.type.create(
    table.attrs,
    newContent.map((r: PMNode) => r.toJSON())
  );

  editor.view.dispatch(
    editor.state.tr
      .replaceWith(pos, pos + table.nodeSize, newTable)
      .scrollIntoView()
  );
  return true;
}

interface CellRef {
  node: PMNode;
  pos: number;
  row: number;
  col: number;
}

export function evalFormulas(editor: Editor): boolean {
  const state = editor.state;
  const replacements: { pos: number; cellType: string; text: string }[] = [];

  state.doc.descendants((table, tablePos) => {
    if (table.type.name !== 'table') return true;

    // 1-based grid (A1 = row 1, col A). Every cell is kept, empty ones included, because a
    // direction like ABOVE counts them.
    const cells = new Map<string, CellRef>();
    const grid: string[][] = [];
    let rowPos = tablePos + 1;
    let rowIndex = 0;
    table.content.content.forEach((row: PMNode) => {
      rowIndex++;
      const rowText: string[] = [];
      let colPos = rowPos + 1;
      let colIndex = 0;
      row.content.content.forEach((cell: PMNode) => {
        colIndex++;
        rowText.push(cell.textContent);
        if (
          (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader') &&
          cell.textContent.trim() !== ''
        ) {
          let colStr = '';
          let n = colIndex;
          while (n > 0) {
            colStr = String.fromCharCode(((n - 1) % 26) + 65) + colStr;
            n = Math.floor((n - 1) / 26);
          }
          cells.set(`${colStr}${rowIndex}`, {
            node: cell,
            pos: colPos,
            row: rowIndex,
            col: colIndex,
          });
        }
        colPos += cell.nodeSize;
      });
      grid.push(rowText);
      rowPos += row.nodeSize;
    });

    for (const ref of cells.values()) {
      const result = evaluateCellFormula(ref.node.textContent, grid, ref.row, ref.col);
      if (result === null) continue;
      replacements.push({ pos: ref.pos, cellType: ref.node.type.name, text: result });
    }
    return true;
  });

  if (replacements.length === 0) return false;

  // Replace from the end so earlier positions stay valid
  replacements.sort((a, b) => b.pos - a.pos);
  let tr = state.tr;
  for (const rep of replacements) {
    const paragraph = state.schema.nodes.paragraph.create(
      null,
      state.schema.text(rep.text)
    );
    const cellNode = state.schema.nodes[rep.cellType].create(
      null,
      paragraph
    );
    tr = tr.replaceWith(rep.pos, rep.pos + state.doc.nodeAt(rep.pos)!.nodeSize, cellNode);
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function tableDimensions(editor: Editor): { rows: number; columns: number } | null {
  const found = findTable(editor);
  if (!found) return null;
  const rows = found.node.content.content.filter((node: PMNode) => node.type.name === 'tableRow');
  return {
    rows: rows.length,
    columns: Math.max(0, ...rows.map((row: PMNode) => row.content.content.length)),
  };
}

/** G659：按轴加一格后是否会越过 50 行 / 15 列 / 750 格；超限时弹出官方那对文案。 */
function refuseIfTableWouldGrowPastLimit(editor: Editor, axis: 'row' | 'column'): boolean {
  const dimensions = tableDimensions(editor);
  if (!dimensions) return false;
  const rows = axis === 'row' ? dimensions.rows + 1 : dimensions.rows;
  const columns = axis === 'column' ? dimensions.columns + 1 : dimensions.columns;
  if (tableSizeAllowed(rows, columns)) return false;
  toast.add({
    id: 'table-size-limit',
    type: 'error',
    title: tableSizeLimitTitle(),
    description: TABLE_SIZE_LIMIT_SUBTITLE,
    timeout: TABLE_SIZE_LIMIT_DURATION,
  });
  return true;
}

/**
 * G590: the official table drop locations carry `maxRow`/`maxCol` **at construction time**, so an
 * out-of-range row/column is clamped before it can be used. This reads the table around the caret
 * (its row count = maxRow, its widest row = maxCol), asks `planTableInsert` for the clamped plan,
 * and runs the matching TipTap insert. Returns false when the caret is not in a table.
 */
export function insertTableAxis(editor: Editor, axis: 'row' | 'column', side: 'before' | 'after'): boolean {
  const dimensions = tableDimensions(editor);
  if (!dimensions) return false;
  // G659: the 50/15/750 ceiling is enforced before the insert, not after.
  if (refuseIfTableWouldGrowPastLimit(editor, axis)) return false;

  const maxRow = Math.max(0, dimensions.rows - 1);
  const maxCol = Math.max(0, dimensions.columns - 1);

  const { $from } = editor.state.selection;
  let rowIndex = 0;
  let colIndex = 0;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === 'table') rowIndex = $from.index(depth);
    if (name === 'tableRow') colIndex = $from.index(depth);
  }

  const address =
    axis === 'row'
      ? side === 'before'
        ? ({ kind: 'aboveTableRow', tableId: 't', row: rowIndex, maxRow } as const)
        : ({ kind: 'belowTableRow', tableId: 't', row: rowIndex, maxRow } as const)
      : side === 'before'
        ? ({ kind: 'beforeTableColumn', tableId: 't', column: colIndex, maxCol } as const)
        : ({ kind: 'afterTableColumn', tableId: 't', column: colIndex, maxCol } as const);

  const plan = planTableInsert(address);
  if (!plan) return false;

  const chain = editor.chain().focus();
  if (plan.axis === 'row') {
    return (plan.side === 'before' ? chain.addRowBefore() : chain.addRowAfter()).run();
  }
  return (plan.side === 'before' ? chain.addColumnBefore() : chain.addColumnAfter()).run();
}
