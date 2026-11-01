/**
 * G280/G590 —— 落点寻址是一族**具名地址**，不是一个下标。
 *
 * 官方那张 action 表列了九族落点（`model.md` §一之三十二／§一之十三）：表格四族
 * （上/下/左/右，构造时即带 `maxRow`/`maxCol` 钳制）、锚点两族（`afterAnchor`/`beforeAnchor`）
 * 加上它们的 **Visible 孪生**、`indexInParent`、`intoObjectList`。
 *
 * 本模块只做**寻址**这一件事：把具名地址解析成一个落点。它不认识 ProseMirror，也不搬块——
 * 移动单位归 `indent-run.ts`，落点归这里，两者分开后各自的判据才能单测。
 *
 * 落点分两类：兄弟序上的一个位置（`sibling`），或表格内某个已被钳制的行/列（`tableCell`）。
 * 表格地址**构造时就带 `maxRow`/`maxCol`**，所以越界的行号在解析期就被夹回界内——这正是官方
 * 把 `maxRow`/`maxCol` 放进构造器参数而不是运行期校验的原因。
 *
 * ☆ `…Anchor` 与 `…AnchorVisible` 的区别＝**是否越过折叠/隐藏的块**：
 *   - 非 Visible：按**真实兄弟序**数（折叠内部的块也在序里）；
 *   - Visible：按**可见序**数（折叠内部的块被跳过，落点落在折叠块的外侧边界）。
 */

export type DropAddress =
  | { kind: 'afterAnchor'; anchorBlockId: string }
  | { kind: 'beforeAnchor'; anchorBlockId: string }
  | { kind: 'afterAnchorVisible'; anchorBlockId: string }
  | { kind: 'beforeAnchorVisible'; anchorBlockId: string }
  | { kind: 'indexInParent'; index: number; parentId: string }
  | { kind: 'intoObjectList'; objectListId: string }
  | { kind: 'aboveTableRow'; tableId: string; row: number; maxRow: number }
  | { kind: 'belowTableRow'; tableId: string; row: number; maxRow: number }
  | { kind: 'afterTableColumn'; tableId: string; column: number; maxCol: number }
  | { kind: 'beforeTableColumn'; tableId: string; column: number; maxCol: number };

export type DropLanding =
  | { at: 'sibling'; index: number }
  | { at: 'tableCell'; tableId: string; row: number; column: number };

/** 地址解析所需的一行：id、是否可见（折叠块内部的块不可见）、它的父 id。 */
export interface AddressRow {
  blockId: string;
  visible: boolean;
  parentId: string;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.trunc(value)), max);
}

/**
 * 把具名地址解析成落点；无法解析（锚点不在集合里、父容器找不到）返回 `null`——
 * **宁可拒绝，也不要落一个猜出来的位置**。
 */
export function resolveDropAddress(address: DropAddress, rows: AddressRow[]): DropLanding | null {
  switch (address.kind) {
    case 'indexInParent': {
      const siblings = rows.filter((row) => row.parentId === address.parentId);
      if (siblings.length === 0) return null;
      return { at: 'sibling', index: clamp(address.index, siblings.length) };
    }

    case 'intoObjectList': {
      const target = rows.findIndex((row) => row.blockId === address.objectListId);
      if (target < 0) return null;
      // 「放进」＝落在该容器之后的第一位（容器内部的成员由调用方另行插入）。
      return { at: 'sibling', index: target + 1 };
    }

    case 'afterAnchor':
    case 'beforeAnchor':
    case 'afterAnchorVisible':
    case 'beforeAnchorVisible': {
      const index = rows.findIndex((row) => row.blockId === address.anchorBlockId);
      if (index < 0) return null;
      const after = address.kind.startsWith('after');
      if (!address.kind.endsWith('Visible')) return { at: 'sibling', index: after ? index + 1 : index };
      // Visible 支：越过折叠/隐藏的块——落在可见序里该锚点的紧邻侧。
      let position = after ? index + 1 : index;
      if (after) {
        while (position < rows.length && !rows[position].visible) position += 1;
      } else {
        while (position > 0 && !rows[position - 1].visible) position -= 1;
      }
      return { at: 'sibling', index: position };
    }

    case 'aboveTableRow':
    case 'belowTableRow':
    case 'afterTableColumn':
    case 'beforeTableColumn': {
      const tableIndex = rows.findIndex((row) => row.blockId === address.tableId);
      if (tableIndex < 0) return null;
      if (address.kind === 'aboveTableRow' || address.kind === 'belowTableRow') {
        const row = clamp(address.row, address.maxRow);
        // 表上行落在该行之上、表下行落在该行之下；兄弟序上表现为表格块的哪一侧。
        return {
          at: 'tableCell',
          tableId: address.tableId,
          row,
          column: address.kind === 'belowTableRow' ? 1 : 0,
        };
      }
      const column = clamp(address.column, address.maxCol);
      return {
        at: 'tableCell',
        tableId: address.tableId,
        row: address.kind === 'afterTableColumn' ? 1 : 0,
        column,
      };
    }
  }
}

/**
 * 两套寻址在同一锚点上的差异（G280 判据）：折叠内部块的锚点在非 Visible 支上给出**折叠内部**
 * 的落点，在 Visible 支上给出**折叠块外侧**的落点。调用方可据此断言"折叠区边界处落点会越过"。
 */
export function addressesDivergeAt(rows: AddressRow[], anchorBlockId: string): boolean {
  const plain = resolveDropAddress({ kind: 'afterAnchor', anchorBlockId }, rows);
  const visible = resolveDropAddress({ kind: 'afterAnchorVisible', anchorBlockId }, rows);
  if (!plain || !visible) return false;
  return plain.at === 'sibling' && visible.at === 'sibling' && plain.index !== visible.index;
}
