import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appendIgnoreRule,
  ignoredBy,
  matchesByRule,
  normalizeIgnoreText,
  parseIgnoreRules,
  removeIgnoreRule,
  renameIgnoreRule,
  splitIgnored,
} from './ignore-rules';
import {
  IGNORE_LIST_DESC,
  IGNORE_LIST_TITLE,
  TAG_ADDED_TO_IGNORE_LIST,
  TEXT_TO_IGNORE,
  deleteRuleMessage,
  ignoredByRuleLabel,
} from './ignore-copy';

const rules = [
  { id: 'r1', text: '草稿' },
  { id: 'r2', text: 'Temp' },
];

describe('G171 忽略规则（纯核）', () => {
  it('读库时丢弃坏形状，并去掉开头 # 与空白', () => {
    expect(parseIgnoreRules(null)).toEqual([]);
    expect(parseIgnoreRules('nope')).toEqual([]);
    expect(
      parseIgnoreRules([
        { id: 'a', text: ' #草稿 ' },
        { id: 'b', text: '   ' },
        { id: 'c' },
        { text: '没有 id' },
      ]),
    ).toEqual([{ id: 'a', text: '草稿' }]);
  });

  it('追加去重（大小写不敏感），空文本不新增', () => {
    const first = appendIgnoreRule(rules, '#草稿', 'r3');
    expect(first.added).toBe(false);
    expect(first.rules).toEqual(rules);
    const added = appendIgnoreRule(rules, '临时', 'r3');
    expect(added.added).toBe(true);
    expect(added.rules.at(-1)).toEqual({ id: 'r3', text: '临时' });
    expect(appendIgnoreRule(rules, '   ', 'r4').added).toBe(false);
  });

  it('改名与删除不改入参', () => {
    expect(renameIgnoreRule(rules, 'r2', ' #TEMP2 ')).toEqual([
      { id: 'r1', text: '草稿' },
      { id: 'r2', text: 'TEMP2' },
    ]);
    expect(removeIgnoreRule(rules, 'r1')).toEqual([{ id: 'r2', text: 'Temp' }]);
    expect(rules).toHaveLength(2);
  });

  it('命中口径是「标签名包含规则文本」，带 # 的词同样命中', () => {
    expect(ignoredBy('我的草稿箱', rules)?.id).toBe('r1');
    expect(ignoredBy('#草稿', rules)?.id).toBe('r1');
    expect(ignoredBy('temp', rules)?.id).toBe('r2');
    expect(ignoredBy('正式', rules)).toBeNull();
  });

  it('分堆与按规则标注来源', () => {
    const tags = [{ name: '草稿甲' }, { name: '正式' }, { name: 'TEMP乙' }];
    const { visible, ignored } = splitIgnored(tags, rules);
    expect(visible.map((tag) => tag.name)).toEqual(['正式']);
    expect(ignored.map((entry) => entry.rule.id)).toEqual(['r1', 'r2']);
    expect(matchesByRule(tags, rules)).toEqual({ r1: ['草稿甲'], r2: ['TEMP乙'] });
  });

  it('归一化只去掉开头一个 #', () => {
    expect(normalizeIgnoreText('  ##草稿 ')).toBe('#草稿');
  });
});

describe('G171 官方文案', () => {
  const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

  it('与 feature-catalog 逐字一致', () => {
    expect(catalog).toContain(IGNORE_LIST_TITLE);
    expect(catalog).toContain(IGNORE_LIST_DESC);
    expect(catalog).toContain(TEXT_TO_IGNORE);
    expect(catalog).toContain(TAG_ADDED_TO_IGNORE_LIST);
    expect(catalog).toContain('被自定义规则忽略的标签');
  });

  it('来源标注与删除确认按官方句式拼装', () => {
    expect(ignoredByRuleLabel(['甲', '乙'])).toBe('被自定义规则忽略的标签：甲、乙');
    expect(deleteRuleMessage('草稿')).toBe('你确定要删除"草稿"吗？');
  });

  it('设置页与标签行都接到真动作上', () => {
    const panels = readFileSync(join(process.cwd(), 'src/components/settings/SettingsPanels.tsx'), 'utf8');
    expect(panels).toContain('getIgnoreOverview()');
    expect(panels).toContain('addIgnoreRule(text)');
    expect(panels).toContain('{IGNORE_LIST_DESC}');
    const tags = readFileSync(join(process.cwd(), 'src/components/browse/TagTreeList.tsx'), 'utf8');
    expect(tags).toContain('addIgnoreRule(group.name)');
    expect(tags).toContain('TAG_ADDED_TO_IGNORE_LIST');
  });
});