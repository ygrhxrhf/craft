/**
 * Assistant settings (G162). Two things the ledger pins: the saved-prompt limits are 20 prompts
 * of at most 1000 characters each, and the prompt library is managed in settings as well as from
 * the chat panel. The per-space disable is per user, not a space-wide switch — the copy stresses
 * that turning it off does not affect other members.
 */

/** The two limits, from the code constants the description sentence matches. */
export const MAX_SAVED_PROMPTS = 20;
export const MAX_PROMPT_CHARS = 1000;

/** The limit sentence, with `[0]` the count and `[1]` the character cap. */
export const SAVED_PROMPTS_LIMIT_TEMPLATE = '最多可保存 [0] 条提示词，每条最多 [1] 个字符。';
export const SAVED_PROMPTS_LIMIT_KEY = 'assistant.saved.prompts.limit.desc';

export const ASSISTANT_MODEL_KEY = 'assistant.model';
export const SAVED_PROMPTS_KEY = 'assistant.saved.prompts';
export const ADD_PROMPT_KEY = 'assistant.add.prompt';
export const DELETE_PROMPT_KEY = 'assistant.delete.prompt';
export const AI_USAGE_KEY = 'ai.usage.and.limits';
export const VIEW_CREDITS_KEY = 'view.ai.assistant.credits';

/** Fill the limit sentence with the two constants. */
export function savedPromptsLimitLabel(): string {
  return SAVED_PROMPTS_LIMIT_TEMPLATE.replace('[0]', String(MAX_SAVED_PROMPTS)).replace(
    '[1]',
    String(MAX_PROMPT_CHARS),
  );
}

/** Whether another prompt may be saved, given how many exist. */
export function canAddPrompt(currentCount: number): boolean {
  return currentCount < MAX_SAVED_PROMPTS;
}

/** Whether a prompt body is within the character cap. */
export function isPromptWithinLimit(body: string): boolean {
  return body.length <= MAX_PROMPT_CHARS;
}

/** The assistant settings keys, so the panel and the chat panel name the same strings. */
export const ASSISTANT_SETTING_KEYS = {
  model: ASSISTANT_MODEL_KEY,
  savedPrompts: SAVED_PROMPTS_KEY,
  addPrompt: ADD_PROMPT_KEY,
  deletePrompt: DELETE_PROMPT_KEY,
  usage: AI_USAGE_KEY,
  credits: VIEW_CREDITS_KEY,
} as const;
