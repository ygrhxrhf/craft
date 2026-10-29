import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 「仍未采到」标题的**快照标记闸**（第 398 批）。
 *
 * 为什么要有这一闸：criterion ② 要求"各特征文档里「仍未采」的条目清空"。本仓的做法不是逐条删，
 * 而是给每个旧清单**标注它是批次快照**并在文首给出权威口径（现状只看 `WAVE1-REPORT.md` 与
 * `keyboard.md` 的覆盖率普查）。这套做法只有**标记真的在**时才成立——第 398 批统一标注前，
 * 11 个文件里 134 个标题都没有标记，读文档的人无从判断哪条还是现行待办。
 *
 * 判据（两条）：
 *  ① 任何标题行（`#` 起头）若以「仍未采」开头，**必须**含「历史快照」；
 *  ② 只要文件里还有这类标题，文首就必须有「未采面口径」那一段。
 * ☆ 只查标题行：正文里引用旧清单（如"见「仍未采到（第 N 批）」"）不受影响。
 */
const FEATURES = join(process.cwd(), 'docs', 'craft-ref', 'features');

function files(): string[] {
  return readdirSync(FEATURES).filter((f) => f.endsWith('.md'));
}

describe('features/*.md 的「仍未采到」标题必须标为历史快照', () => {
  it('扫描面非空（否则本闸在空转）', () => {
    const fs = files();
    expect(fs.length).toBeGreaterThan(10);
    expect(fs).toContain('gap.md');
  });

  it('没有未标记的「仍未采到」标题', () => {
    const bad: string[] = [];
    for (const f of files()) {
      const lines = readFileSync(join(FEATURES, f), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!/^#{1,6}\s*仍未采/.test(line)) return;
        if (line.includes('历史快照')) return;
        bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad, `未标注的标题（应加〔历史快照·现行口径见文首〕）⇒ ${bad.slice(0, 8).join('；')}`).toEqual([]);
  });

  it('带这类标题的文件必须在文首给出权威口径', () => {
    const missing: string[] = [];
    for (const f of files()) {
      const text = readFileSync(join(FEATURES, f), 'utf8');
      const hasHeading = /^#{1,6}\s*仍未采/m.test(text);
      if (!hasHeading) continue;
      const head = text.split(/\r?\n/).slice(0, 30).join('\n');
      if (!head.includes('未采面口径')) missing.push(f);
    }
    expect(missing, `文首缺「未采面口径」⇒ ${missing.join('；')}`).toEqual([]);
  });
});
