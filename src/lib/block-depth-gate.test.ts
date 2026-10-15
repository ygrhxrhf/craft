import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G52③④ 的**不做裁决**靠两条盘上出处，这里把它们钉住，别让它们悄悄漂走。
 *
 * ④（"官方块嵌套上限 10"）＝那个数字的出处是 `api-contract.md` 的 `depth` 参数，原文写的是
 *   **"Maximum depth the structure is displayed"** —— 它是**显示深度**，不是编辑面的嵌套上限；
 *   而官方编辑器的真实轴是 `indentLevel`（`interactions.md` V23：`Tab` 写 `--indent-w`、
 *   块序列是**扁平**的 `subblocks`），下界守卫只有 `indentLevel + delta >= 0`、**没有上限**证据。
 *   ⇒ 照"10 层就拒绝"去实现，就是拿显示参数当编辑面判据（台账自己禁止的那件事）。
 * ③（"任务可按正则过滤内容"）＝出处是 `api-contract.md` 的 `contentRegex` **查询参数**
 *   （"only tasks whose content matches the given regular expression"）——盘上**没有**任何
 *   "任务页有正则过滤控件"的证据 ⇒ 不得据此造一个 UI。
 */
const FEATURES = join(process.cwd(), 'docs', 'craft-ref', 'features');
const read = (f: string) => readFileSync(join(FEATURES, f), 'utf8');

describe('G52③④ 不做裁决的出处闸', () => {
  const api = read('api-contract.md');
  const interactions = read('interactions.md');

  it('扫描面非空（判据没在空转）', () => {
    expect(api.split(/\r?\n/).length).toBeGreaterThan(50);
    expect(interactions.split(/\r?\n/).length).toBeGreaterThan(1000);
  });

  it('④ 的出处仍是"显示深度"：`depth` 那条必须逐字带 displayed 与 10', () => {
    const line = /^- `depth`：[\s\S]*?$/m.exec(api)?.[0] ?? '';
    expect(line, '`depth` 那条不见了＝④ 的裁决失去出处').toContain('Maximum depth the structure is displayed');
    expect(line, '`depth` 那条不再说"显示" ⇒ 它可能被改成编辑面参数，④ 的裁决要重审').toContain('displayed');
    expect(line).toContain('10');
  });

  it('④ 的反证仍在：缩进是 `indentLevel`＋扁平序列（V23 的 `--indent-w` 与"缩进不是嵌套"）', () => {
    expect(interactions, 'V23 那段（`--indent-w` 承载缩进）不见了＝"缩进不是嵌套"失去一手证据').toContain('--indent-w');
    expect(interactions, '"缩进不是嵌套"这句结语不见了＝④ 的反证失去出处').toContain('缩进**不是嵌套**');
  });

  it('③ 的出处仍是 API 查询参数（`contentRegex` 在参数表里，而非某个屏上控件）', () => {
    expect(api, '`contentRegex` 那条不见了＝③ 的"只有 API 出处"这一判据失效').toContain('contentRegex');
    expect(api, '`contentRegex` 那句原文变了＝③ 的裁决要重审').toContain('only tasks whose content matches the given regular expression');
  });
});
