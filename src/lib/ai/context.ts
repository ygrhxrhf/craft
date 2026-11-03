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
