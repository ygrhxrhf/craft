export interface AiPromptPreset {
  id: string;
  label: string;
  prompt: string;
}

/**
 * G39: the local prompt library. Labels are the collected quick-action titles;
 * templates are the instruction sent to the model.
 */
export const AI_PROMPT_PRESETS: AiPromptPreset[] = [
  {
    id: 'analyze-style',
    label: '分析写作风格',
    prompt: '请分析以下文本的写作风格，指出语气、句式和用词特点，并给出改进建议：',
  },
  {
    id: 'needs-detail',
    label: '找出需要详细解释的部分',
    prompt: '请找出以下文本中需要更详细解释的部分，并说明原因：',
  },
  {
    id: 'confident',
    label: '改为自信的语气',
    prompt: '请将以下文本改写为更自信的语气，保持原意：',
  },
  {
    id: 'friendly',
    label: '改为友好的语气',
    prompt: '请将以下文本改写为更友好的语气，保持原意：',
  },
];
