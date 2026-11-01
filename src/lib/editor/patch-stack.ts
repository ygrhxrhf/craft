/**
 * G586 —— 撤销栈的实现体是「补丁双栈」：正向 `patches` **顺序拼接**、逆向 `inversePatches`
 * **反序前置**拼接（`model.md` §一之三十一）。配套三支：`undo` / `redo`，以及
 * `mergePatchesFromOtherTabs`（★ 官方有「同一浏览器跨标签页补丁合并」这个动作类型）。
 *
 * 本地撤销交给 ProseMirror 的 history（单机）与 Yjs 的 UndoManager（协同），没有补丁栈——
 * 于是"跨标签页补丁合并"这一支在本地无对应。本模块把官方的双栈语义写成纯核：它是
 * LIFO 生效的唯一实现处，也是"为什么 undo 自身不进栈"（G655）的同一层。
 */

/** 一条补丁：官方那套是 JSON-Patch 形状，这里只用到它的两个端点值。 */
export interface Patch {
  /** 目标路径（块 id / 属性名）。 */
  path: string;
  /** 改后的值。 */
  value?: unknown;
  /** 改前的值（逆补丁用）。 */
  oldValue?: unknown;
}

export interface PatchStack {
  /** 正向补丁，顺序拼接（apply 时从前往后）。 */
  patches: Patch[];
  /** 逆向补丁，**反序前置**拼接（apply 时从后往前）。 */
  inversePatches: Patch[];
}

export function emptyStack(): PatchStack {
  return { patches: [], inversePatches: [] };
}

/**
 * 记一步：正向补丁**追加**到 `patches` 末尾；逆向补丁**前置**到 `inversePatches` 头部。
 * 这个不对称正是 LIFO 生效的唯一实现处——撤销时从头取逆向补丁，恰好是最后一步的逆。
 */
export function pushStep(stack: PatchStack, step: { patches: Patch[]; inversePatches: Patch[] }): PatchStack {
  return {
    patches: [...stack.patches, ...step.patches],
    inversePatches: [...step.inversePatches, ...stack.inversePatches],
  };
}

/** 撤销一步：弹出 `inversePatches` 的头部（最后一步的逆）返回，并把它从栈里去掉。 */
export function popUndo(stack: PatchStack): { step: Patch[]; rest: PatchStack } | null {
  if (!stack.inversePatches.length) return null;
  const [step, ...restInverse] = stack.inversePatches;
  return { step: [step], rest: { patches: stack.patches, inversePatches: restInverse } };
}

/** 重做一步：弹出 `patches` 的尾部（对应那一步的正向补丁）返回。 */
export function popRedo(stack: PatchStack): { step: Patch[]; rest: PatchStack } | null {
  if (!stack.patches.length) return null;
  const step = stack.patches[stack.patches.length - 1];
  return { step: [step], rest: { patches: stack.patches.slice(0, -1), inversePatches: stack.inversePatches } };
}

/**
 * G655：撤销/重做自身**不进步骤表**——一次动作若整体就是 `undo`/`redo`，`undoable` 记 false。
 * 官方那句：`h = actions.length===1 && (type==='undo'||'redo')` ⇒ `undoable: u && !h`。
 */
export function isUndoableAction(action: { type: string }[]): boolean {
  if (action.length !== 1) return true;
  return action[0].type !== 'undo' && action[0].type !== 'redo';
}

/**
 * G655：`canUndo = undoRedoPatches.hasOwnProperty(patchIndex)` ⇒ **索引空洞处 Ctrl+Z 静默无效**
 * （不是跳过空洞，是就地停）。本地没有这一形态，但把判据写出来，好让"空洞即停"可被单测钉住。
 */
export function canUndoAt(patches: Record<number, unknown>, patchIndex: number): boolean {
  return Object.prototype.hasOwnProperty.call(patches, patchIndex);
}

export function canRedoAt(patches: Record<number, unknown>, patchIndex: number): boolean {
  return Object.prototype.hasOwnProperty.call(patches, patchIndex + 1);
}

/**
 * G586：`mergePatchesFromOtherTabs` —— 同一浏览器跨标签页的补丁合并。
 * 本地跨标签页靠 Hocuspocus/IndexeddbPersistence 同步，没有补丁合并语义；本函数是那一支的形状：
 * 把另一个标签页来的补丁**按序并入**当前栈（正向追加、逆向前置），与 `pushStep` 同规。
 */
export function mergePatchesFromOtherTabs(stack: PatchStack, incoming: PatchStack): PatchStack {
  return pushStep(stack, { patches: incoming.patches, inversePatches: incoming.inversePatches });
}

/**
 * G593: `group(t, e) { actions }` — the official build wraps several actions into one. It is the
 * mechanism layer behind the undo granularity the ledger measures ("3 actions need 4 Ctrl+Z"): the
 * group is one step on the stack, so undoing it walks its sub-steps in reverse.
 */
export interface ActionGroup {
  /** The sub-steps, in the order they were applied. */
  steps: { patches: Patch[]; inversePatches: Patch[] }[];
}

/**
 * Collapse a group into one step. Forward patches concatenate in order; inverse patches concatenate
 * in **reverse** (so undoing the group undoes its last sub-step first) — the same asymmetry
 * `pushStep` uses, applied across the group's members.
 */
export function groupActions(group: ActionGroup): { patches: Patch[]; inversePatches: Patch[] } {
  const patches: Patch[] = [];
  const inversePatches: Patch[] = [];
  for (const step of group.steps) patches.push(...step.patches);
  for (let index = group.steps.length - 1; index >= 0; index -= 1) {
    inversePatches.push(...group.steps[index].inversePatches);
  }
  return { patches, inversePatches };
}

/** Push a whole group as **one** undo step. */
export function pushGroup(stack: PatchStack, group: ActionGroup): PatchStack {
  return pushStep(stack, groupActions(group));
}
