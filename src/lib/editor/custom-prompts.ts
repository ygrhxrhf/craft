/**
 * G120: the custom-prompt contract. Official limits are 20 saved prompts and
 * 1000 characters per prompt; the count overflow is an error toast, the length
 * overflow is a silent `substring` cut. Storage holds both `prompts` (legacy
 * string list) and `promptObjects` (current object list) — reads prefer the
 * object list and migrate the string list once, per user.
 */

export interface CustomPrompt {
  id: string;
  prompt: string;
}

export const MAX_CUSTOM_PROMPTS = 20;
export const MAX_PROMPT_CHARS = 1000;
export const CUSTOM_PROMPT_LIMIT_TOAST_MS = 4000;

export const SAVED_PROMPTS_TITLE = '已保存的提示';
export const CREATE_CUSTOM_PROMPT = '创建自定义提示';
export const CUSTOM_PROMPT_LIMIT_DESC = '最多可保存 [0] 条提示词，每条最多 [1] 个字符。';

export function customPromptLimitDesc(
  count = MAX_CUSTOM_PROMPTS,
  chars = MAX_PROMPT_CHARS,
): string {
  return CUSTOM_PROMPT_LIMIT_DESC.replace('[0]', String(count)).replace('[1]', String(chars));
}

export function sanitizePromptText(text: string): string {
  return text.substring(0, MAX_PROMPT_CHARS);
}

function parseJsonish(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readObjectList(value: unknown): CustomPrompt[] | null {
  const parsed = parseJsonish(value);
  if (!Array.isArray(parsed)) return null;
  const seen = new Set<string>();
  const objects: CustomPrompt[] = [];
  for (const [index, item] of parsed.entries()) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { id?: unknown; prompt?: unknown };
    if (typeof record.prompt !== 'string') continue;
    const prompt = sanitizePromptText(record.prompt);
    if (!prompt.trim()) continue;
    let id =
      typeof record.id === 'string' && record.id.trim() ? record.id : `prompt-${index + 1}`;
    if (seen.has(id)) id = `${id}-${objects.length + 1}`;
    seen.add(id);
    objects.push({ id, prompt });
    if (objects.length >= MAX_CUSTOM_PROMPTS) break;
  }
  return objects;
}

function readStringList(value: unknown): string[] | null {
  const parsed = parseJsonish(value);
  if (!Array.isArray(parsed)) return null;
  const prompts: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const prompt = sanitizePromptText(item);
    if (!prompt.trim()) continue;
    prompts.push(prompt);
    if (prompts.length >= MAX_CUSTOM_PROMPTS) break;
  }
  return prompts;
}

export interface CustomPromptState {
  prompts: string[];
  promptObjects: CustomPrompt[];
  /** True when the object list was rebuilt from the legacy string list. */
  migrated: boolean;
}

export function readCustomPromptState(raw: {
  prompts?: unknown;
  promptObjects?: unknown;
}): CustomPromptState {
  const objects = readObjectList(raw.promptObjects);
  if (objects !== null) {
    return { prompts: objects.map((item) => item.prompt), promptObjects: objects, migrated: false };
  }
  const strings = readStringList(raw.prompts) ?? [];
  const promptObjects = strings.map((prompt, index) => ({
    id: `legacy-${index + 1}`,
    prompt,
  }));
  return { prompts: strings, promptObjects, migrated: strings.length > 0 };
}

export type AppendCustomPromptResult =
  | { ok: true; prompts: string[]; promptObjects: CustomPrompt[] }
  | { ok: false; reason: 'limit' | 'empty'; prompts: string[]; promptObjects: CustomPrompt[] };

export function appendCustomPrompt(
  state: Pick<CustomPromptState, 'promptObjects'>,
  text: string,
  idFactory: () => string = () => crypto.randomUUID(),
): AppendCustomPromptResult {
  const prompt = sanitizePromptText(text);
  if (!prompt.trim()) {
    return {
      ok: false,
      reason: 'empty',
      prompts: state.promptObjects.map((item) => item.prompt),
      promptObjects: state.promptObjects,
    };
  }
  if (state.promptObjects.length >= MAX_CUSTOM_PROMPTS) {
    return {
      ok: false,
      reason: 'limit',
      prompts: state.promptObjects.map((item) => item.prompt),
      promptObjects: state.promptObjects,
    };
  }
  const promptObjects = [...state.promptObjects, { id: idFactory(), prompt }];
  return { ok: true, prompts: promptObjects.map((item) => item.prompt), promptObjects };
}

export function removeCustomPrompt(
  state: Pick<CustomPromptState, 'promptObjects'>,
  id: string,
): { prompts: string[]; promptObjects: CustomPrompt[] } {
  const promptObjects = state.promptObjects.filter((item) => item.id !== id);
  return { prompts: promptObjects.map((item) => item.prompt), promptObjects };
}
