/**
 * G408 —— 子任务是**服务端推导的关系**（`model.md` §一之九 4）。
 *
 * 官方那支：一条专门端点返回 `{subTasks: [{rootTaskBlockId, subTaskBlocks[]}]}`，客户端建 `Map`
 * 消费；任务对象上**没有 `parentTaskId`**（全 bundle 0 次），`rootTaskBlockId`/`subTaskBlocks`
 * 各 1 次。⇒ 子任务不是"任务自带父指针"，而是**按块序推导**出来的。
 *
 * 本地 `Task` 只有 `blockId`/`documentId`，无子任务关系。本模块给出推导与 Map 消费的形状：
 * 给定按文档序排好的任务块，缩进更深的后继块即上一条的**子任务**，直到缩进回到不更深为止
 * （与 `editor/indent-run.ts` 同一套"整块"边界）。
 */

export interface TaskBlockRow {
  blockId: string;
  documentId: string;
  /** 块在文档里的缩进层级（0 起）。 */
  indent: number;
}

export interface SubtaskGroup {
  rootTaskBlockId: string;
  subTaskBlocks: string[];
}

/**
 * 从按文档序排好的任务块推导子任务分组：一个块的**缩进更深的后继**（直到缩进不更深为止）
 * 是它的子任务。返回的每组的 `rootTaskBlockId` 是那条根任务块。
 */
export function deriveSubtasks(rows: TaskBlockRow[]): SubtaskGroup[] {
  const groups: SubtaskGroup[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const root = rows[index];
    const subTaskBlocks: string[] = [];
    let cursor = index + 1;
    while (cursor < rows.length && rows[cursor].indent > root.indent) {
      subTaskBlocks.push(rows[cursor].blockId);
      cursor += 1;
    }
    if (subTaskBlocks.length) groups.push({ rootTaskBlockId: root.blockId, subTaskBlocks });
    index = cursor - 1;
  }
  return groups;
}

/** 客户端消费形态：`Map<rootTaskBlockId, subTaskBlocks>`（官方那支建 Map）。 */
export function subtaskMap(groups: SubtaskGroup[]): Map<string, string[]> {
  return new Map(groups.map((group) => [group.rootTaskBlockId, group.subTaskBlocks]));
}

/** 某个块是不是某条根任务的子任务（反查）。 */
export function parentOf(groups: SubtaskGroup[], blockId: string): string | null {
  for (const group of groups) {
    if (group.subTaskBlocks.includes(blockId)) return group.rootTaskBlockId;
  }
  return null;
}
