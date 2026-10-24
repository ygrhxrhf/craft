// 对照实验：证明 differ **真的会红**（不是恒绿）。
// 做法＝把本地侧一份 record 复制成「官方」槽位并**改掉一个行为量**（块名册），
// 跑 compare，看是否报 differ。逐字还原后复绿。
import { readFileSync, writeFileSync } from 'node:fs';

const R = 'C:/code/craft/docs/craft-ref/interaction-lab/runs';
const spec = (await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/specs/editor.key.enter-mid-block.mjs')).default;
const mod = await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/diff.mjs');
const compare = mod.compare;

const load = (f) => JSON.parse(readFileSync(`${R}/${f}`, 'utf8'));
const o = { rec: load('smoke-05-editor.key.enter-mid-block-official.json'), file: 'x' };
const l = { rec: load('smoke-05-editor.key.enter-mid-block-local.json'), file: 'y' };

const base = compare(spec.id, o, l, spec);
console.log('对照实验 0（原样）: verdict=' + base.verdict + ' sev2+=' + base.rows.filter(r=>r.severity>=2).length);

// ① 改块名册（行为量）：把本地末步的块文本从 BBBB 改成 BXBB
const l1 = JSON.parse(JSON.stringify(l));
l1.rec.steps[l1.rec.steps.length-1].blocks.blocks[1].text = 'BXBB';
const r1 = compare(spec.id, o, l1, spec);
console.log('对照实验 1（块名册 BXBB）: verdict=' + r1.verdict + ' sev2+=' + r1.rows.filter(r=>r.severity>=2).length + ' rows=' + JSON.stringify(r1.rows.filter(r=>r.severity>=2).map(r=>r.facet)));

// ② 改具名文本计数（行为量）：本地末步 BBBB 计数 1 -> 2
const l2 = JSON.parse(JSON.stringify(l));
l2.rec.steps[l2.rec.steps.length-1].fingerprint.counts.BBBB = 2;
const r2 = compare(spec.id, o, l2, spec);
console.log('对照实验 2（counts.BBBB=2）: verdict=' + r2.verdict + ' sev2+=' + r2.rows.filter(r=>r.severity>=2).length + ' rows=' + JSON.stringify(r2.rows.filter(r=>r.severity>=2).map(r=>r.facet)));

// ③ 改选区偏移（行为量）：本地末步 anchorOffset 0 -> 3
const l3 = JSON.parse(JSON.stringify(l));
l3.rec.steps[l3.rec.steps.length-1].selection.anchorOffset = 3;
const r3 = compare(spec.id, o, l3, spec);
console.log('对照实验 3（anchorOffset=3）: verdict=' + r3.verdict + ' sev2+=' + r3.rows.filter(r=>r.severity>=2).length + ' rows=' + JSON.stringify(r3.rows.filter(r=>r.severity>=2).map(r=>r.facet)));

// ④ 改步数（前置条件）：删掉本地末步
const l4 = JSON.parse(JSON.stringify(l));
l4.rec.steps.pop();
const r4 = compare(spec.id, o, l4, spec);
console.log('对照实验 4（步数 7->6）: verdict=' + r4.verdict + ' rows=' + JSON.stringify(r4.rows.map(r=>r.facet)));

// ⑤ 注入 error（前置条件）
const l5 = JSON.parse(JSON.stringify(l));
l5.rec.errors.push({ where: 'test', message: '注入的假 error' });
const r5 = compare(spec.id, o, l5, spec);
console.log('对照实验 5（注入 error）: verdict=' + r5.verdict + ' rows=' + JSON.stringify(r5.rows.map(r=>r.facet)));

// ⑥ 逐字还原：原样再跑一次，必须回到 match
const back = compare(spec.id, o, l, spec);
console.log('对照实验 6（逐字还原）: verdict=' + back.verdict + ' sev2+=' + back.rows.filter(r=>r.severity>=2).length);