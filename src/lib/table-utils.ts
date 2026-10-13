'use client';

import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { evaluateCellFormula } from '@/lib/editor/table-formula';

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

function rowSortKey(row: PMNode): string {
  const firstCell = row.content.content[0];
  return firstCell ? firstCell.textContent : '';
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

  const sorted = [...bodyRows].sort((a: PMNode, b: PMNode) => {
    const ka = rowSortKey(a);
    const kb = rowSortKey(b);
    const na = parseFloat(ka.replace(/[^\d.-]/g, ''));
    const nb = parseFloat(kb.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      return dir === 'asc' ? na - nb : nb - na;
    }
    const cmp = ka.localeCompare(kb, 'zh-CN');
    return dir === 'asc' ? cmp : -cmp;
  });

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
