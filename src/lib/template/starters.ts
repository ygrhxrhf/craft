/**
 * G1672 —— 官方「我的模板」页顶部是「Craft 的模板库」横幅 +「打开图库」，图库里是数百个成品模板。
 * 官方图库是外部内容服务；本地不接那条内容源，改为**自带一套起始模板**（首次打开图库时种进
 * 本账号，之后就是普通的 `isTemplate` 文档，可改可删）。横幅与入口的文案、位置按官方。
 */
export interface StarterTemplate {
  key: string;
  title: string;
  icon: string;
  category: string;
  /** 每项是一段正文；`#` 开头的行成为标题块，`- [ ]` 开头成为待办，其余是正文段。 */
  lines: string[];
}

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    key: 'meeting-notes',
    title: '会议记录',
    icon: '🗒️',
    category: '工作',
    lines: [
      '# 会议记录',
      '日期 · 参会人 · 议程',
      '## 议程',
      '- [ ] 议题一',
      '- [ ] 议题二',
      '## 结论',
      '## 待办',
      '- [ ] 负责人 — 事项 — 截止时间',
    ],
  },
  {
    key: 'weekly-review',
    title: '每周复盘',
    icon: '📅',
    category: '个人',
    lines: [
      '# 每周复盘',
      '## 本周完成',
      '- [ ] ',
      '## 下周重点',
      '- [ ] ',
      '## 需要协调',
    ],
  },
  {
    key: 'project-plan',
    title: '项目计划',
    icon: '🚀',
    category: '工作',
    lines: [
      '# 项目计划',
      '## 目标',
      '## 范围',
      '## 里程碑',
      '- [ ] 里程碑一',
      '- [ ] 里程碑二',
      '## 风险',
    ],
  },
  {
    key: 'reading-notes',
    title: '读书笔记',
    icon: '📚',
    category: '学习',
    lines: ['# 读书笔记', '书名 · 作者 · 读完时间', '## 核心观点', '## 摘录', '## 我的想法'],
  },
  {
    key: 'daily-plan',
    title: '每日计划',
    icon: '☀️',
    category: '个人',
    lines: ['# 每日计划', '## 今天最重要的事', '- [ ] ', '## 其他', '- [ ] ', '## 收尾记录'],
  },
  {
    key: 'product-spec',
    title: '需求文档',
    icon: '📐',
    category: '工作',
    lines: [
      '# 需求文档',
      '## 背景',
      '## 目标与衡量',
      '## 方案',
      '## 边界与非目标',
      '## 验收标准',
      '- [ ] ',
    ],
  },
] as const;

/** 把上面的行式写法转成 TipTap 的 doc JSON（只用到官方那六档里的标题/正文/待办）。 */
export function starterContent(lines: readonly string[]) {
  const blocks = lines.map((line) => {
    if (line.startsWith('### ')) return heading(line.slice(4), 3);
    if (line.startsWith('## ')) return heading(line.slice(3), 2);
    if (line.startsWith('# ')) return heading(line.slice(2), 1);
    if (line.startsWith('- [ ]')) return taskItem(line.replace('- [ ]', '').trim());
    return paragraph(line);
  });
  return { type: 'doc', content: blocks };
}

function heading(text: string, level: number) {
  return {
    type: 'heading',
    attrs: { level },
    content: text ? [{ type: 'text', text }] : [],
  };
}

function paragraph(text: string) {
  return { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] };
}

function taskItem(text: string) {
  return {
    type: 'taskList',
    content: [
      {
        type: 'taskItem',
        attrs: { checked: false },
        content: [paragraph(text)],
      },
    ],
  };
}
