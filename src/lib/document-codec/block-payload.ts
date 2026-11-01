/**
 * G400 —— 块的结构化负载分散在**四个 JSON 容器**里，且**类型有位置门禁**（`model.md` §一之八）。
 *
 * | 容器         | 装什么                                          |
 * |--------------|-------------------------------------------------|
 * | `content`    | 只放**文本**（纯文本 / 行内 runs）              |
 * | `pluginData` | `table` 数据                                    |
 * | `objectData` | `object` / `objectList` 数据                    |
 * | `blob`       | `code` 正文与 `whiteboard` 数据                 |
 *
 * 官方把负载放错容器会 `trackError("Unexpected blob data for block type …")`。本地整棵 TipTap JSON
 * 存在 `Document.content` 单列，没有容器分层——本模块不迁库，而是在**编解码层**做一次投影：
 * 给定一个本地块的 JSON，把它按类型归到正确的容器，并在**读侧**校验位置不变量（放错的负载被
 * 拒绝而不是悄悄带上）。
 */

export type PayloadContainer = 'content' | 'pluginData' | 'objectData' | 'blob';

export const PAYLOAD_CONTAINERS: readonly PayloadContainer[] = ['content', 'pluginData', 'objectData', 'blob'];

/** 本地块类型 → 它的结构化负载该去哪个容器。没列出的类型只有文本，归 `content`。 */
const CONTAINER_BY_TYPE: Record<string, PayloadContainer> = {
  table: 'pluginData',
  object: 'objectData',
  objectList: 'objectData',
  codeBlock: 'blob',
  whiteboard: 'blob',
};

/** 某块类型的结构化负载容器；纯文本类型归 `content`。 */
export function containerForType(type: unknown): PayloadContainer {
  return typeof type === 'string' ? (CONTAINER_BY_TYPE[type] ?? 'content') : 'content';
}

export interface BlockPayload {
  type: string;
  /** 结构化负载（表格数据 / 记录数据 / 代码正文 / 白板数据）；纯文本块为 `undefined`。 */
  payload?: unknown;
  /** 文本内容，永远归 `content`。 */
  text?: string;
}

export type PayloadProjection = Record<PayloadContainer, unknown>;

/**
 * 把一块的负载投影到四个容器。文本进 `content`；结构化负载进它该去的容器。
 *
 * ☆ 这里**不**校验位置——投影只是"按类型归位"。校验是读侧的 `checkPayloadPlacement`：
 *   因为一份外来的文档可能把负载塞进了错的容器，读的时候要能判出来。
 */
export function projectPayload(block: BlockPayload): PayloadProjection {
  const projection: PayloadProjection = { content: block.text ?? '', pluginData: null, objectData: null, blob: null };
  if (block.payload === undefined) return projection;
  projection[containerForType(block.type)] = block.payload;
  return projection;
}

/**
 * 读侧位置门禁：一个容器的负载是否**允许**出现在该块类型上。
 * 官方那句话 `Unexpected blob data for block type …` 就是这条判定失败时打的。
 */
export function isContainerAllowed(type: unknown, container: PayloadContainer): boolean {
  if (container === 'content') return true; // 文本谁都能有
  return containerForType(type) === container;
}

export type PlacementCheck = { ok: true } | { ok: false; error: string };

/**
 * 检查一份投影是否放对了位置。第一个非空的**非 `content`** 容器若不被该类型允许，即报错，
 * 文案照官方那句的结构（`Unexpected <container> data for block type <type>`）。
 */
export function checkPayloadPlacement(type: unknown, projection: Partial<PayloadProjection>): PlacementCheck {
  for (const container of PAYLOAD_CONTAINERS) {
    if (container === 'content') continue;
    const value = projection[container];
    if (value === null || value === undefined) continue;
    if (!isContainerAllowed(type, container)) {
      return { ok: false, error: `Unexpected ${container} data for block type ${String(type)}` };
    }
  }
  return { ok: true };
}
