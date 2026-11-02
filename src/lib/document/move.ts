/**
 * G679 的落点模型。官方 `documents move` 有三条约束，本地此前一处都没有：
 *
 * - `--folder` 与 `--destination`（`unsorted`／`templates`）**互斥且必选一**；
 * - 删除与还原都不在 move 语义里（删＝`documents delete`，还原＝`move --destination unsorted`）；
 * - **每日笔记不能被移动**；
 * - 还有一条官方自证式要求：**动手前先记下当前位置，好回退**。
 *
 * 落点因此不是"一个随便 patch"，而是先解析成三选一的请求，再算出该写哪几列。
 */

export type MoveVirtualTarget = 'unsorted' | 'templates';

export interface MoveCurrent {
  folderId: string | null;
  parentId: string | null;
  isDailyNote: boolean;
  isTemplate?: boolean;
}

export type MoveRequest =
  | { kind: 'folder'; folderId: string | null }
  | { kind: 'parent'; parentId: string | null }
  | { kind: 'destination'; target: MoveVirtualTarget };

export interface MovePlan {
  patch: Partial<MoveCurrent> & Record<string, unknown>;
  /** 官方要求先记当前位置：写失败时照这份还原。 */
  previous: MoveCurrent;
}

export type MoveFailure = 'conflicting-targets' | 'no-target' | 'unknown-destination' | 'daily-note';
export type MoveResult = { ok: true; plan: MovePlan } | { ok: false; reason: MoveFailure };

/** 命令行三枚开关的互斥解析：同时给、或一个都不给，都不成立。 */
export function parseMoveRequest(args: {
  folder?: string | null;
  destination?: string | null;
  parent?: string | null;
}): MoveRequest | { ok: false; reason: Exclude<MoveFailure, 'daily-note'> } {
  const given = [args.folder, args.destination, args.parent].filter((value) => value !== undefined && value !== null);
  if (given.length === 0) return { ok: false, reason: 'no-target' };
  if (given.length > 1) return { ok: false, reason: 'conflicting-targets' };
  if (args.destination != null) {
    if (args.destination !== 'unsorted' && args.destination !== 'templates') {
      return { ok: false, reason: 'unknown-destination' };
    }
    return { kind: 'destination', target: args.destination };
  }
  if (args.parent != null) return { kind: 'parent', parentId: args.parent || null };
  return { kind: 'folder', folderId: args.folder || null };
}

export function planMove(current: MoveCurrent, request: MoveRequest): MoveResult {
  // 日记的位置由日期决定，挪它等于把日期改了 ⇒ 官方直接拒绝。
  if (current.isDailyNote) return { ok: false, reason: 'daily-note' };
  const previous: MoveCurrent = {
    folderId: current.folderId,
    parentId: current.parentId,
    isDailyNote: current.isDailyNote,
    isTemplate: current.isTemplate,
  };
  switch (request.kind) {
    case 'folder':
      return { ok: true, plan: { patch: { folderId: request.folderId }, previous } };
    case 'parent':
      return { ok: true, plan: { patch: { parentId: request.parentId }, previous } };
    case 'destination':
      return request.target === 'templates'
        ? { ok: true, plan: { patch: { isTemplate: true }, previous } }
        : {
            ok: true,
            plan: {
              // 还原与「未分类」是同一枚落点：清掉归属，也清掉模板身份。
              patch: { folderId: null, parentId: null, isTemplate: false },
              previous,
            },
          };
    default:
      return { ok: false, reason: 'no-target' };
  }
}

export interface MoveWriter {
  applyLocal(patch: { table: 'document'; id: string; patch: Record<string, unknown> }): Promise<unknown>;
}

export type MoveOutcome = 'moved' | 'daily-note' | 'failed';

/** 一次「移到某文件夹」的整链：算落点 → 写 → 失败还原；日记直接被挡下。 */
export async function applyMoveRow(
  writer: MoveWriter,
  input: { id: string; current: MoveCurrent; folderId: string | null },
): Promise<MoveOutcome> {
  const result = planMove(input.current, { kind: 'folder', folderId: input.folderId });
  if (!result.ok) return result.reason === 'daily-note' ? 'daily-note' : 'failed';
  const applied = await applyMove(writer, input.id, result.plan);
  return applied.ok ? 'moved' : 'failed';
}

/**
 * 写一次移动，失败就按 `previous` 还原——官方那句「移动前先记录当前位置，以便回退」的落点。
 * 返回是否成功，调用方不必自己记快照。
 */
export async function applyMove(
  writer: MoveWriter,
  documentId: string,
  plan: MovePlan,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    await writer.applyLocal({ table: 'document', id: documentId, patch: plan.patch });
    return { ok: true };
  } catch (error) {
    try {
      await writer.applyLocal({
        table: 'document',
        id: documentId,
        patch: {
          folderId: plan.previous.folderId,
          parentId: plan.previous.parentId,
          isTemplate: plan.previous.isTemplate ?? false,
        },
      });
    } catch {
      // 还原也失败：留原始错误给调用方，不再叠一层。
    }
    return { ok: false, error };
  }
}
