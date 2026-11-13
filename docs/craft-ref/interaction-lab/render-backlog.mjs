import { readFileSync, writeFileSync } from 'node:fs';
const root = 'docs/craft-ref/features';
const d = JSON.parse(readFileSync(`${root}/_audit/backlog-digest.json`, 'utf8'));
const audit = JSON.parse(readFileSync(`${root}/_audit/ledger-rows.json`, 'utf8'));
const byId = new Map(audit.rows.map((r) => [r.id, r]));
const manual = JSON.parse(readFileSync(`${root}/_audit/manual-verified.json`, 'utf8'));

const statusZh = { aligned: '已对齐', partial: '部分落地', gap: '未动', deliberate: '有意偏差', unreachable: '不可达', nonaction: '非交互面', unknown: '待重扫' };
const clean = (s, n) => (s || '')
  .replace(/\*\*/g, '')
  .replace(/`/g, '')
  .replace(/\s+/g, ' ')
  .replace(/^[☆★✎\s]+/, '')
  .slice(0, n)
  .replace(/\|/g, '\\|');
const next = (r) => {
  const m = manual.rows[r.id];
  if (m?.note) return clean(m.note, 110);
  if (r.status === 'aligned') return '无需动作；抽检证据见台账行';
  if (r.status === 'deliberate') return '不做（有意偏差），不进复刻 backlog';
  if (r.status === 'partial') return '补剩余部分；先按现读确认边界';
  return '补实现；先现读确认前置';
};
const evidence = (r) => {
  const m = manual.rows[r.id];
  return m?.evidence?.length ? m.evidence.map((x) => '`' + x + '`').join('、') : '';
};
const table = (rows) => {
  const lines = ['| G号 | 状态 | 影响/成本 | 官方行为（摘要） | 本地现状（摘要） | 下一步／证据 |', '| --- | --- | --- | --- | --- | --- |'];
  for (const r of rows) {
    const s = byId.get(r.id) || r;
    const localText = (r.conflict ? '⚠ ' : '') + clean(r.local, 64);
    const nextText = next(s).replace(/[。；;]$/, '');
    lines.push(`| ${r.id} | ${statusZh[r.status] || r.status} | ${r.scoreParsed?.raw || '—'} | ${clean(r.official, 64)} | ${localText} | ${nextText}${evidence(r) ? '；' + evidence(r) : ''} |`);
  }
  return lines.join('\n');
};

const p0 = d.explicit.P0;
const p1 = d.explicit.P1;
const p2 = d.explicit.P2;
const conflicts = d.conflicts.map((c) => `| ${c.id} | ${c.line} | ${statusZh[c.status] || c.status} | ${c.conflict} | ${clean(c.local, 60)} |`).join('\n');
const gaps = d.gapSections.map(([k, v]) => `| ${v} | ${clean(k, 70)} |`).join('\n');
const out = [
  `## P0（${p0.length} 条）\n`, table(p0),
  `\n## P1（${p1.length} 条）\n`, table(p1),
  `\n## P2（显式 ${p2.length} 条）\n`, table(p2),
  `\n## 口径冲突（${d.conflicts.length} 条）\n`,
  '| G号 | 行 | 当前状态 | 冲突 | 本地列摘要 |', '| --- | --- | --- | --- | --- |', conflicts,
  '\n## 差异最多的节（前 20）\n', '| 条数 | 节 |', '| --- | --- |', gaps,
].join('\n');
writeFileSync(`${root}/_audit/backlog-tables.json`, JSON.stringify({
  p0: table(p0).split('\n').slice(2).join('\n'),
  p1: table(p1).split('\n').slice(2).join('\n'),
  p2: table(p2).split('\n').slice(2).join('\n'),
  conflicts,
  gaps,
}, null, 2));
console.log('rendered tables', out.length);
