// 对照实验（任务书强制）：本 spec 的承重量 = focusInEditor（官方进块选区态后焦点交 body）。
// 三段式：基线 differ -> 中和承重量 -> 逐字还原。
import { readFileSync, appendFileSync } from 'node:fs';
import { compare } from './diff.mjs';
import { loadSpecs } from './lab.mjs';
const RUNS = 'C:/code/craft/docs/craft-ref/interaction-lab/runs';
const LOG = 'C:/Users/zhanh/ego/craft-ilab-20261023/exp-select.log';
const say = (s) => { appendFileSync(LOG, s + '\n'); console.log(s); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const sev2 = (r) => r.rows.filter((x) => x.severity >= 2);
const id = 'editor.selection.select-to-top-bottom';
const of = 'wave1-13-' + id + '-official.json';
const lf = 'wave1-13-' + id + '-local.json';
const spec = (await loadSpecs(id))[0];
const o0 = JSON.parse(readFileSync(RUNS + '/' + of, 'utf8'));
const l0 = JSON.parse(readFileSync(RUNS + '/' + lf, 'utf8'));
const b1 = compare(id, { file: of, rec: o0 }, { file: lf, rec: l0 }, spec);
say('[1/3] 基线        : ' + b1.verdict + ' sev2+=' + sev2(b1).length + ' rows=' + JSON.stringify(sev2(b1).map((x) => x.facet)));
const o1 = clone(o0);
for (const st of o1.steps) if (st.focus) st.focus.inEditor = true;
const r1 = compare(id, { file: of, rec: o1 }, { file: lf, rec: l0 }, spec);
say('[2/3] 中和 focus  : ' + r1.verdict + ' sev2+=' + sev2(r1).length + ' rows=' + JSON.stringify(sev2(r1).map((x) => x.facet)));
const r2 = compare(id, { file: of, rec: o0 }, { file: lf, rec: l0 }, spec);
say('[3/3] 逐字还原    : ' + r2.verdict + ' sev2+=' + sev2(r2).length + ' rows=' + JSON.stringify(sev2(r2).map((x) => x.facet)));
say('判定: 中和后承重量行 ' + (sev2(r1).length < sev2(b1).length ? '减少(必变)' : '★未变') + ' | 还原后逐字相同=' + (JSON.stringify(sev2(b1).map((x) => x.facet)) === JSON.stringify(sev2(r2).map((x) => x.facet))));