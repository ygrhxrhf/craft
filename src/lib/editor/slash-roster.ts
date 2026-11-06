/**
 * 官方斜杠菜单名册（G1544 / G1613）——第 430 批选择通路普查定版：
 *
 * - 第一段是**扁平 20 个入口**（官方顺序逐字），其中 15 个是分组入口（Enter 开第二段），
 *   5 个是叶子（取消样式／插入白板／三条集合）。分组入口在过滤时**本身不参赛**，
 *   过滤只按**第二段子项与叶子的名字**做子串匹配（这是把 G1613 全部实测逐条对上的机制：
 *   「列表」→五个含「列表」的子项、文本样式→0、插入表格→只回「插入表格集合」）。
 * - 第二段子项集按**选择通路顺序**逐字落表（与过滤通路的顺序不同，G1613 注已记）。
 * - `command` 是本地命令名；`null` ＝本机未接（菜单里置灰不可选，口径同快捷键面板「未接入」）。
 * - 名册没覆盖的本地命令进「更多」桶（本增项，保证本地能力一条不丢）。
 */

export interface SlashRosterChild {
  /** 官方逐字标签。 */
  label: string;
  /** 本地命令名；`null` ＝本机未接。 */
  command: string | null;
}

export interface SlashRosterEntry {
  label: string;
  children?: readonly SlashRosterChild[];
  /** 叶子入口：直接执行的本地命令名（`null` ＝本机未接）。 */
  leaf?: string | null;
}

export const OFFICIAL_SLASH_ENTRIES: readonly SlashRosterEntry[] = [
  {
    label: '列表',
    children: [
      { label: '待办列表', command: '待办列表' },
      { label: '折叠列表', command: '折叠列表' },
      { label: '无序列表', command: '无序列表' },
      { label: '编号列表', command: '编号列表' },
      { label: '取消列表格式', command: '取消列表格式' },
    ],
  },
  {
    label: '文本样式',
    children: [
      { label: '标题', command: '标题 1' },
      { label: '副标题', command: '标题 2' },
      { label: '中标题', command: '标题 3' },
      { label: '小标题', command: '标题 4' },
      { label: '正文', command: '文本' },
      { label: '说明', command: null },
      { label: '页面', command: '页面' },
      { label: '卡片', command: '卡片' },
    ],
  },
  {
    label: '装饰',
    children: [
      { label: '块', command: '块' },
      { label: '焦点', command: '焦点' },
    ],
  },
  {
    label: '颜色',
    children: [
      { label: '默认颜色', command: '默认颜色' },
      { label: '灰色', command: null },
      { label: '浅灰色', command: null },
      { label: '海军蓝', command: null },
      { label: '海洋蓝', command: null },
      { label: '绿色', command: null },
      { label: '橄榄绿', command: null },
      { label: '粉色', command: null },
      { label: '紫色', command: null },
      { label: '红色', command: null },
      { label: '棕色', command: null },
      { label: '橙色', command: null },
    ],
  },
  {
    label: '缩进',
    children: [
      { label: '缩进', command: '缩进' },
      { label: '减少缩进', command: '减少缩进' },
    ],
  },
  {
    label: '对齐',
    children: [
      { label: '左对齐', command: '左对齐' },
      { label: '居中对齐', command: '居中对齐' },
      { label: '右对齐', command: '右对齐' },
      { label: '两端对齐', command: '两端对齐' },
    ],
  },
  {
    label: '字体',
    children: [
      { label: '默认字体', command: null },
      { label: 'Serif', command: null },
      { label: 'Mono', command: null },
      { label: 'Round', command: null },
    ],
  },
  {
    label: '文字格式',
    children: [
      { label: '粗体', command: '粗体' },
      { label: '斜体', command: '斜体' },
      { label: '删除线', command: '删除线' },
      { label: '代码', command: '代码' },
    ],
  },
  {
    label: '日期和时间',
    children: [
      { label: '今天', command: '今天' },
      { label: '明天', command: '明天' },
      { label: '昨天', command: '昨天' },
      { label: '现在', command: null },
    ],
  },
  {
    label: '插入文件',
    children: [
      { label: '插入 Unsplash 图片', command: null },
      { label: '插入文件', command: '文件附件' },
    ],
  },
  {
    label: '插入片段',
    children: [
      { label: '插入代码区块', command: '代码块' },
      { label: '插入正文片段', command: null },
      { label: '插入 TeX 公式', command: '公式' },
      { label: 'Mermaid 图表', command: 'Mermaid 图表' },
    ],
  },
  {
    label: '插入表格',
    children: [
      { label: '2x2', command: '2x2' },
      { label: '3x3', command: '3x3' },
      { label: '4x4', command: '4x4' },
      { label: '5x5', command: '5x5' },
      { label: '6x6', command: '6x6' },
      { label: '7x7', command: '7x7' },
      { label: '8x8', command: '8x8' },
      { label: '9x9', command: '9x9' },
    ],
  },
  {
    label: '插入分隔符',
    children: [
      { label: '分隔线 - 极细', command: '分隔线 - 极细' },
      { label: '分隔线 - 细', command: '分隔线 - 细' },
      { label: '分隔线 - 常规', command: '分隔线 - 常规' },
      { label: '分隔线 - 粗', command: '分隔线 - 粗' },
      { label: '分页符', command: '插入分页符' },
    ],
  },
  {
    label: '动作',
    children: [{ label: '从模板插入', command: '从模板插入' }],
  },
  {
    label: '提醒我…',
    children: [
      { label: '20 分钟后', command: '20 分钟后' },
      { label: '1小时后', command: '1小时后' },
      { label: '3小时后', command: '3小时后' },
      { label: '明天', command: '提醒·明天' },
      { label: '下周', command: '下周' },
      { label: '留着以后用', command: null },
    ],
  },
  { label: '取消样式', leaf: '取消样式' },
  { label: '插入白板', leaf: '白板' },
  { label: '插入表格集合', leaf: '插入表格集合' },
  { label: '插入画廊集合', leaf: '插入画廊集合' },
  { label: '插入看板集合', leaf: '插入看板集合' },
];

/** 本地补渲染桶：名册没覆盖的本地命令进这一组（本增项）。 */
export const LOCAL_EXTRA_GROUP = '更多';

export type SlashRowKind = 'entry' | 'child' | 'leaf' | 'extra' | 'back';

export interface SlashRow {
  /** React key（列表内唯一）。 */
  id: string;
  label: string;
  kind: SlashRowKind;
  /** 本地命令名；`null` ＝本机未接，置灰不可选。 */
  command: string | null;
  /** 分组入口：Enter/点击进第二段。 */
  drill?: boolean;
}

/** 名册占用的本地命令名（子项＋叶子）；用于算「更多」桶。 */
export function consumedCommandNames(): Set<string> {
  const names = new Set<string>();
  for (const entry of OFFICIAL_SLASH_ENTRIES) {
    if (entry.leaf) names.add(entry.leaf);
    for (const child of entry.children ?? []) {
      if (child.command) names.add(child.command);
    }
  }
  return names;
}

/** 第一段：官方 20 入口＋（有剩余本地命令时）「更多」桶。 */
export function stage1Rows(extraCommands: readonly string[]): SlashRow[] {
  const rows: SlashRow[] = OFFICIAL_SLASH_ENTRIES.map((entry, index) => ({
    id: `entry-${index}`,
    label: entry.label,
    kind: entry.children ? 'entry' : 'leaf',
    command: entry.children ? null : (entry.leaf ?? null),
    drill: Boolean(entry.children),
  }));
  if (extraCommands.length > 0) {
    rows.push({ id: 'entry-extra', label: LOCAL_EXTRA_GROUP, kind: 'entry', command: null, drill: true });
  }
  return rows;
}

/** 第二段：某入口的子项集（按选择通路顺序）；「更多」桶回本地剩余命令。 */
export function childRows(entryLabel: string, extraCommands: readonly string[]): SlashRow[] {
  if (entryLabel === LOCAL_EXTRA_GROUP) {
    return extraCommands.map((name, index) => ({
      id: `extra-${index}`,
      label: name,
      kind: 'extra' as const,
      command: name,
    }));
  }
  const entry = OFFICIAL_SLASH_ENTRIES.find((candidate) => candidate.label === entryLabel);
  if (!entry?.children) return [];
  return entry.children.map((child, index) => ({
    id: `child-${index}`,
    label: child.label,
    kind: 'child' as const,
    command: child.command,
  }));
}

export interface ExtraCommandMatch {
  name: string;
  description: string;
  keywords: readonly string[];
}

/**
 * 过滤（官方机制）：对**第二段子项与叶子的名字**做子串匹配——分组入口本身不参赛，
 * 所以「文本样式」回 0、「列表」回五个含「列表」的子项、「插入表格」只回「插入表格集合」。
 * 本地「更多」桶里的命令另按 名字/描述/关键词 匹配（本增项的本地扩展）。
 */
export function filterRows(query: string, extraCommands: readonly ExtraCommandMatch[]): SlashRow[] {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];
  const rows: SlashRow[] = [];
  for (const entry of OFFICIAL_SLASH_ENTRIES) {
    if (entry.leaf !== undefined) {
      if (entry.label.toLowerCase().includes(needle)) {
        rows.push({ id: `leaf-${entry.label}`, label: entry.label, kind: 'leaf', command: entry.leaf });
      }
      continue;
    }
    for (const child of entry.children ?? []) {
      if (child.label.toLowerCase().includes(needle)) {
        rows.push({
          id: `hit-${entry.label}-${child.label}-${rows.length}`,
          label: child.label,
          kind: 'child',
          command: child.command,
        });
      }
    }
  }
  for (const command of extraCommands) {
    const hit =
      command.name.toLowerCase().includes(needle) ||
      command.description.toLowerCase().includes(needle) ||
      command.keywords.some((keyword) => keyword.toLowerCase().includes(needle));
    if (hit) {
      rows.push({ id: `extra-hit-${command.name}`, label: command.name, kind: 'extra', command: command.name });
    }
  }
  return rows;
}