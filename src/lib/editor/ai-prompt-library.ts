/**
 * G119: the 34 built-in prompt actions, verbatim from the zh-Hans catalog.
 * Each action is a title (`assistant.prompt.<name>`) plus a template
 * (`assistant.prompt.<name>.template`) whose `{0}` slot is the selected text.
 * `find.action.items` is the 35th name but has no template (context action).
 */

export interface BuiltinPrompt {
  id: string;
  label: string;
  template: string;
  group: PromptGroupId;
}

export type PromptGroupId = 'tone' | 'length' | 'write' | 'translate' | 'structure';

export const PROMPT_GROUP_LABELS: Record<PromptGroupId, string> = {
  tone: '语气',
  length: '长度',
  write: '生成文体',
  translate: '翻译',
  structure: '结构',
};

export const BUILTIN_PROMPTS: BuiltinPrompt[] = [
  // 语气
  {
    id: "change.tone.confident",
    label: "改为自信的语气",
    template: "改为自信的语气: \n ---\n{0} \n --- ",
    group: "tone",
  },
  {
    id: "change.tone.friendly",
    label: "改为友好的语气",
    template: "改为友好的语气: \n ---\n{0} \n --- ",
    group: "tone",
  },
  {
    id: "change.tone.professional",
    label: "改为专业的语气",
    template: "改为专业的语气: \n ---\n{0} \n --- ",
    group: "tone",
  },
  // 长度
  {
    id: "make.longer",
    label: "加长",
    template: "加长: \n---\n{0} \n---",
    group: "length",
  },
  {
    id: "make.shorter",
    label: "缩短",
    template: "缩短: \n ---\n{0} \n --- ",
    group: "length",
  },
  // 生成文体
  {
    id: "write.article",
    label: "写一篇关于这个话题的文章",
    template: "写一篇关于这个主题的文章：\n ---\n {0}\n ---",
    group: "write",
  },
  {
    id: "write.blog",
    label: "关于这个话题写一篇博客",
    template: "关于这个话题写一篇博客: \n ---\n{0} \n --- ",
    group: "write",
  },
  {
    id: "write.essay",
    label: "关于这个话题写一篇文章",
    template: "关于这个话题写一篇文章: \n ---\n{0} \n --- ",
    group: "write",
  },
  {
    id: "write.example",
    label: "为此创建示例文本",
    template: "为此创建示例文本：\n ---\n {0}\n ---",
    group: "write",
  },
  {
    id: "write.facebook.post",
    label: "写一篇关于这个主题的 Facebook 帖子",
    template: "写一篇关于这个主题的 Facebook 帖子：\n ---\n {0}\n ---",
    group: "write",
  },
  {
    id: "write.poem",
    label: "写一首关于这个话题的诗",
    template: "就这个话题写一首诗：\n ---\n {0}\n ---",
    group: "write",
  },
  {
    id: "write.template",
    label: "创建有关此主题的模板",
    template: "创建有关此主题的模板：\n ---\n {0}\n ---",
    group: "write",
  },
  {
    id: "write.twitter.post",
    label: "写一篇关于这个话题的 X (Twitter) 帖子",
    template: "写一篇关于这个主题的 Twitter 帖子：\n ---\n {0}\n ---",
    group: "write",
  },
  // 翻译
  {
    id: "translate.dutch",
    label: "翻译成荷兰语",
    template: "将其翻译成荷兰语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.english",
    label: "翻译成英文",
    template: "将其翻译成英文：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.french",
    label: "翻译成法语",
    template: "将其翻译成法语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.german",
    label: "翻译成德语",
    template: "将其翻译成德语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.italian",
    label: "翻译成意大利语",
    template: "将其翻译成意大利语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.japanese",
    label: "翻译成日语",
    template: "将其翻译成日语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.korean",
    label: "翻译成韩语",
    template: "将其翻译成韩语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.portuguese",
    label: "翻译成葡萄牙语",
    template: "将其翻译成葡萄牙语：\n ---\n {0}\n ---",
    group: "translate",
  },
  {
    id: "translate.spanish",
    label: "翻译成西班牙语",
    template: "将其翻译成西班牙语：\n ---\n {0}\n ---",
    group: "translate",
  },
  // 结构
  {
    id: "brainstorm.ideas",
    label: "集思广益",
    template: "集思广益关于这个话题的想法：\n ---\n {0}\n ---",
    group: "structure",
  },
  {
    id: "continue.writing",
    label: "继续写作",
    template: "继续写作：\n ---\n {0}\n ---",
    group: "structure",
  },
  {
    id: "explain",
    label: "给我解释一下",
    template: "用五岁小孩能懂的方式给我解释：\n ---\n{0} \n --- ",
    group: "structure",
  },
  {
    id: "fix.spelling.and.grammar",
    label: "修正拼写和语法",
    template: "修正拼写和语法: \n ---\n{0} \n --- ",
    group: "structure",
  },
  {
    id: "generate.hashtags",
    label: "生成主题标签",
    template: "根据以下内容生成主题标签：\n---\n {0}\n---",
    group: "structure",
  },
  {
    id: "generate.keywords",
    label: "生成关键词",
    template: "根据以下内容生成关键词：\n---\n {0}\n---",
    group: "structure",
  },
  {
    id: "improve.writing",
    label: "改善写作",
    template: "改善写作: \n ---\n{0} \n --- ",
    group: "structure",
  },
  {
    id: "outline",
    label: "创建大纲",
    template: "根据以下内容创建大纲：\n---\n {0}\n---",
    group: "structure",
  },
  {
    id: "pros.and.cons",
    label: "列出优缺点",
    template: "列出这份文档的优缺点：\n---\n {0}\n---",
    group: "structure",
  },
  {
    id: "simplify.language",
    label: "简化语言",
    template: "简化语言: \n ---\n{0} \n --- ",
    group: "structure",
  },
  {
    id: "suggest.title",
    label: "建议标题",
    template: "这份文档的好标题是什么？ :\n ---\n {0}\n ---",
    group: "structure",
  },
  {
    id: "summarize",
    label: "总结",
    template: "总结一下：\n ---\n {0}\n ---",
    group: "structure",
  },
];

/** The `{0}` slot holds the selected text; `[0]` is a human-visible i18n value. */
export function fillPromptTemplate(template: string, text: string): string {
  return template.split('{0}').join(text);
}

export function promptsInGroup(group: PromptGroupId): BuiltinPrompt[] {
  return BUILTIN_PROMPTS.filter((item) => item.group === group);
}
