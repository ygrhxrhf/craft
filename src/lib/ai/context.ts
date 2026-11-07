/**
 * G116: the AI request carries structured context, not just a bare string.
 * Each item names the document (or page) and flags whether it has children;
 * the same document id is attached at most once (`existing.has(id) → return`).
 */

export type AiContextType = 'document' | 'page';

export interface AiContextItem {
  type: AiContextType;
  documentId: string;
  hasChildren: 'true' | 'false';
  subtitle?: string;
  textContent?: string;
}

export const MAX_CONTEXT_TEXT = 4000;

export function addContextItem(items: AiContextItem[], item: AiContextItem): AiContextItem[] {
  if (items.some((existing) => existing.documentId === item.documentId)) return items;
  return [...items, item];
}

export function parseAiContext(raw: unknown): AiContextItem[] {
  if (!Array.isArray(raw)) return [];
  let items: AiContextItem[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    if (record.type !== 'document' && record.type !== 'page') continue;
    if (typeof record.documentId !== 'string' || !record.documentId.trim()) continue;
    items = addContextItem(items, {
      type: record.type,
      documentId: record.documentId,
      hasChildren: record.hasChildren === 'true' || record.hasChildren === true ? 'true' : 'false',
      subtitle: typeof record.subtitle === 'string' ? record.subtitle : undefined,
      textContent:
        typeof record.textContent === 'string'
          ? record.textContent.slice(0, MAX_CONTEXT_TEXT)
          : undefined,
    });
  }
  return items;
}

export function contextFromDocument(input: {
  documentId: string;
  textContent: string;
  subtitle?: string;
  hasChildren?: boolean;
  type?: AiContextType;
}): AiContextItem {
  return {
    type: input.type ?? 'document',
    documentId: input.documentId,
    hasChildren: input.hasChildren ? 'true' : 'false',
    subtitle: input.subtitle,
    textContent: input.textContent.slice(0, MAX_CONTEXT_TEXT),
  };
}

/** The user-message prefix the model sees — one block per context document. */
export function renderContextPrompt(items: AiContextItem[]): string {
  return items
    .map((item) => {
      const attrs = [
        `type="${item.type}"`,
        `documentId="${item.documentId}"`,
        `hasChildren="${item.hasChildren}"`,
        item.subtitle ? `subtitle="${item.subtitle}"` : null,
      ]
        .filter(Boolean)
        .join(' ');
      return `<context ${attrs}>\n${item.textContent ?? ''}\n</context>`;
    })
    .join('\n\n');
}

/**
 * G97 —— AI 调用的**位置上下文**：官方从「当前空间 → 当前页 → scope」逐级取，
 * 并把「用户选中的区块」放进 `blockIds`（`user_selected_blocks`）。
 *
 * 本地这层只做**边界解析与渲染**：`/api/ai` 接受顶层 `spaceId` / `rootBlockId` /
 * `documentId` / `blockIds` / `folderId`（也接受包在 `scope` 里），解析后拼进用户消息。
 * ☆ 调用侧（`AiBubbleMenu`）的富集仍未接：那个文件属编辑器面，本批不动，见报告 REMAINING。
 */
export interface AiScopeContext {
  spaceId: string | null;
  rootBlockId: string | null;
  documentId: string | null;
  /** 用户选中的区块 id，去重、保序。 */
  blockIds: string[];
  folderId: string | null;
}

export const EMPTY_AI_SCOPE: AiScopeContext = {
  spaceId: null,
  rootBlockId: null,
  documentId: null,
  blockIds: [],
  folderId: null,
};

function textField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** 解析请求体里的位置上下文；`scope` 里的同名字段优先于顶层（它是更明确的那一层）。 */
export function parseAiScope(raw: unknown): AiScopeContext {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_AI_SCOPE, blockIds: [] };
  const body = raw as Record<string, unknown>;
  const nested =
    body.scope && typeof body.scope === 'object' ? (body.scope as Record<string, unknown>) : {};
  const pick = (key: string): unknown => (key in nested ? nested[key] : body[key]);
  const blockIds: string[] = [];
  for (const value of Array.isArray(pick('blockIds')) ? (pick('blockIds') as unknown[]) : []) {
    const id = textField(value);
    if (id && !blockIds.includes(id)) blockIds.push(id);
  }
  return {
    spaceId: textField(pick('spaceId')),
    rootBlockId: textField(pick('rootBlockId')),
    documentId: textField(pick('documentId')),
    blockIds,
    folderId: textField(pick('folderId')),
  };
}

export function hasAiScope(scope: AiScopeContext): boolean {
  return Boolean(
    scope.spaceId || scope.rootBlockId || scope.documentId || scope.folderId || scope.blockIds.length,
  );
}

/** 一行位置标签 + 选中的区块清单；没有上下文时返回空串（不改变现有消息形状）。 */
export function renderScopePrompt(scope: AiScopeContext): string {
  if (!hasAiScope(scope)) return '';
  const attrs = [
    scope.spaceId ? `spaceId="${scope.spaceId}"` : null,
    scope.documentId ? `documentId="${scope.documentId}"` : null,
    scope.rootBlockId ? `rootBlockId="${scope.rootBlockId}"` : null,
    scope.folderId ? `folderId="${scope.folderId}"` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const blocks = scope.blockIds.length
    ? `\n<selectedBlocks>${scope.blockIds.map((id) => `<block id="${id}" />`).join('')}</selectedBlocks>`
    : '';
  return `<location ${attrs}>${blocks}</location>`;
}
