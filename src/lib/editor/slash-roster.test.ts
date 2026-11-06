import { describe, expect, it } from 'vitest';

import {
  LOCAL_EXTRA_GROUP,
  OFFICIAL_SLASH_ENTRIES,
  childRows,
  consumedCommandNames,
  filterRows,
  stage1Rows,
} from './slash-roster';

/** 第 430 批选择通路普查（round-430）逐字钉住的第二段子项集。 */
const CHILD_SETS: Record<string, string[]> = {
  列表: ['待办列表', '折叠列表', '无序列表', '编号列表', '取消列表格式'],
  文本样式: ['标题', '副标题', '中标题', '小标题', '正文', '说明', '页面', '卡片'],
  装饰: ['块', '焦点'],
  颜色: ['默认颜色', '灰色', '浅灰色', '海军蓝', '海洋蓝', '绿色', '橄榄绿', '粉色', '紫色', '红色', '棕色', '橙色'],
  缩进: ['缩进', '减少缩进'],
  对齐: ['左对齐', '居中对齐', '右对齐', '两端对齐'],
  字体: ['默认字体', 'Serif', 'Mono', 'Round'],
  文字格式: ['粗体', '斜体', '删除线', '代码'],
  '日期和时间': ['今天', '明天', '昨天', '现在'],
  插入文件: ['插入 Unsplash 图片', '插入文件'],
  插入片段: ['插入代码区块', '插入正文片段', '插入 TeX 公式', 'Mermaid 图表'],
  插入表格: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', '8x8', '9x9'],
  插入分隔符: ['分隔线 - 极细', '分隔线 - 细', '分隔线 - 常规', '分隔线 - 粗', '分页符'],
  动作: ['从模板插入'],
  '提醒我…': ['20 分钟后', '1小时后', '3小时后', '明天', '下周', '留着以后用'],
};

const ENTRY_ORDER = [
  '列表', '文本样式', '装饰', '颜色', '缩进', '对齐', '字体', '文字格式', '日期和时间', '插入文件',
  '插入片段', '插入表格', '插入分隔符', '动作', '提醒我…', '取消样式', '插入白板', '插入表格集合',
  '插入画廊集合', '插入看板集合',
];

describe('官方斜杠名册（G1544/G1613，第 430 批普查）', () => {
  it('第一段是扁平 20 入口、官方顺序逐字', () => {
    expect(OFFICIAL_SLASH_ENTRIES.map((entry) => entry.label)).toEqual(ENTRY_ORDER);
    expect(OFFICIAL_SLASH_ENTRIES).toHaveLength(20);
  });

  it('15 个分组入口的第二段子项集逐字逐序', () => {
    for (const [label, children] of Object.entries(CHILD_SETS)) {
      const entry = OFFICIAL_SLASH_ENTRIES.find((candidate) => candidate.label === label);
      expect(entry?.children?.map((child) => child.label), label).toEqual(children);
    }
    expect(OFFICIAL_SLASH_ENTRIES.filter((entry) => entry.children).length).toBe(15);
  });

  it('另外 5 个是叶子入口（直接执行）', () => {
    const leaves = OFFICIAL_SLASH_ENTRIES.filter((entry) => entry.leaf !== undefined);
    expect(leaves.map((entry) => entry.label)).toEqual(['取消样式', '插入白板', '插入表格集合', '插入画廊集合', '插入看板集合']);
  });

  it('stage1Rows 先官方 20 行，再有剩余命令时追加「更多」桶', () => {
    expect(stage1Rows([]).map((row) => row.label)).toEqual(ENTRY_ORDER);
    const withExtras = stage1Rows(['引用', 'Callout']);
    expect(withExtras).toHaveLength(21);
    expect(withExtras[20].label).toBe(LOCAL_EXTRA_GROUP);
    expect(withExtras[20].drill).toBe(true);
    // 分组入口都带 drill，叶子的 command 直接可执行。
    expect(withExtras[0]).toMatchObject({ kind: 'entry', drill: true, command: null });
    expect(withExtras[15]).toMatchObject({ kind: 'leaf', command: '取消样式' });
  });

  it('childRows 按选择通路顺序回子项，「更多」桶回本地剩余命令', () => {
    expect(childRows('列表', []).map((row) => row.label)).toEqual(CHILD_SETS['列表']);
    expect(childRows('插入表格', []).map((row) => row.command)).toEqual([
      '2x2', '3x3', '4x4', '5x5', '6x6', '7x7', '8x8', '9x9',
    ]);
    expect(childRows(LOCAL_EXTRA_GROUP, ['引用', '内容目录']).map((row) => row.label)).toEqual(['引用', '内容目录']);
    expect(childRows('不存在的入口', [])).toEqual([]);
  });

  it('未接的子项在名册里是 null（置灰），已接的指向本地命令名', () => {
    expect(childRows('颜色', []).find((row) => row.label === '海军蓝')?.command).toBeNull();
    expect(childRows('文本样式', []).find((row) => row.label === '说明')?.command).toBeNull();
    expect(childRows('文本样式', []).find((row) => row.label === '标题')?.command).toBe('标题 1');
  });

  it('consumedCommandNames 覆盖全部子项与叶子', () => {
    const consumed = consumedCommandNames();
    for (const label of ['待办列表', '标题 1', '2x2', '取消样式', '白板', '插入看板集合']) {
      expect(consumed.has(label), label).toBe(true);
    }
    expect(consumed.has('引用')).toBe(false);
  });
});

describe('过滤机制（G1613 全部实测逐条对上）', () => {
  it('按第二段子项名字做子串匹配', () => {
    expect(filterRows('列表', []).map((row) => row.label)).toEqual(CHILD_SETS['列表']);
    expect(filterRows('缩进', []).map((row) => row.label)).toEqual(['缩进', '减少缩进']);
    expect(filterRows('对齐', []).map((row) => row.label)).toEqual(['左对齐', '居中对齐', '右对齐', '两端对齐']);
    expect(filterRows('颜色', []).map((row) => row.label)).toEqual(['默认颜色']);
    expect(filterRows('字体', []).map((row) => row.label)).toEqual(['默认字体']);
    expect(filterRows('插入文件', []).map((row) => row.label)).toEqual(['插入文件']);
  });

  it('纯分组头的名字回 0（入口本身不参赛）', () => {
    for (const head of ['文本样式', '装饰', '文字格式', '日期和时间', '插入片段', '插入分隔符', '动作', '提醒我…']) {
      expect(filterRows(head, []), head).toEqual([]);
    }
  });

  it('「插入表格」只回叶子「插入表格集合」，不含八个尺寸', () => {
    expect(filterRows('插入表格', []).map((row) => row.label)).toEqual(['插入表格集合']);
  });

  it('叶子按自己的名字命中', () => {
    expect(filterRows('取消样式', []).map((row) => row.label)).toEqual(['取消样式']);
    expect(filterRows('插入白板', []).map((row) => row.label)).toEqual(['插入白板']);
  });

  it('同名的「明天」两处都在（日期原子与提醒各一条）', () => {
    const hits = filterRows('明天', []);
    expect(hits.map((row) => row.label)).toEqual(['明天', '明天']);
    expect(hits.map((row) => row.command)).toEqual(['明天', '提醒·明天']);
  });

  it('本地「更多」桶的命令按名字/关键词继续可筛（本增项）', () => {
    expect(filterRows('引用', [{ name: '引用', description: '引用块', keywords: ['quote'] }]).map((row) => row.label)).toEqual(['引用']);
    expect(filterRows('quote', [{ name: '引用', description: '引用块', keywords: ['quote'] }])).toHaveLength(1);
    expect(filterRows('   ', [])).toEqual([]);
  });
});