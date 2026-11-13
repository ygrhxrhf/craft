import { readFileSync, writeFileSync } from 'node:fs';

const root = 'docs/craft-ref/features';
const audit = JSON.parse(readFileSync(`${root}/_audit/ledger-rows.json`, 'utf8'));
const manual = JSON.parse(readFileSync(`${root}/_audit/manual-verified.json`, 'utf8'));
const rows = audit.rows.map((r) => {
  const m = manual.rows[r.id];
  return m ? { ...r, ...m, baseStatus: r.status } : { ...r, baseStatus: r.status };
});
for (const r of rows) {
  const local = r.local ?? '';
  const verdict = r.verdict ?? '';
  // 与 audit-ledger.mjs 同口径：整条正则锚在行首。
  const missingLocal = /^(?:(?:无|全库无|全无|只有|缺失|未实现|没有|无任何)|未采纳|未覆盖|未做|零匹配|无对应|无绑定|无入口|无此|不同构)/.test(local);
  const clearVerdict = /已清|已落地|已实现|已补|已建|已接|已对齐|已完成/.test(verdict);
  r.conflict = (r.status === 'aligned' || r.status === 'partial') && missingLocal ? 'local-says-missing'
    : r.status === 'gap' && clearVerdict ? 'verdict-says-clear'
    : null;
}

const count = (key) => {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
};
const cross = (a, b) => {
  const m = new Map();
  for (const r of rows) {
    const k = r[a] + ' / ' + r[b];
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort((x, y) => y[1] - x[1]));
};

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
const cols = ['id', 'line', 'priority', 'status', 'impact', 'cost', 'section', 'official', 'local', 'verdict', 'conflict', 'note', 'evidence'];
const csvRows = rows.map((r) => cols.map((c) => {
  if (c === 'impact' || c === 'cost') return csv(r.scoreParsed?.[c] ?? '');
  if (c === 'evidence') return csv(Array.isArray(r.evidence) ? r.evidence.join('; ') : '');
  return csv(r[c]);
}).join(','));
writeFileSync(`${root}/_audit/ledger-backlog.csv`, [cols.join(','), ...csvRows].join('\n'));

const explicit = (p) => rows.filter((r) => /^(一、P0|二、P1|三、P2)/.test(r.section) && r.priority === p);
const conflictRows = rows.filter((r) => r.conflict);
const unknownSections = new Map();
for (const r of rows.filter((x) => x.status === 'unknown')) {
  const k = r.section.replace(/^[一二三四五六七八九十百千〇零]+、/, '').slice(0, 36);
  unknownSections.set(k, (unknownSections.get(k) ?? 0) + 1);
}
const gapSections = new Map();
for (const r of rows.filter((x) => x.status === 'gap' || x.status === 'partial')) {
  const k = r.section.replace(/^[一二三四五六七八九十百千〇零]+、/, '').slice(0, 36);
  gapSections.set(k, (gapSections.get(k) ?? 0) + 1);
}

const digest = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  status: count('status'),
  priority: count('priority'),
  statusByPriority: cross('priority', 'status'),
  explicit: { P0: explicit('P0'), P1: explicit('P1'), P2: explicit('P2') },
  conflicts: conflictRows.map((r) => ({ id: r.id, line: r.line, status: r.status, conflict: r.conflict, local: (r.local || '').slice(0, 200), verdict: (r.verdict || '').slice(0, 160) })),
  unknownSections: [...unknownSections.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  gapSections: [...gapSections.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
};
writeFileSync(`${root}/_audit/backlog-digest.json`, JSON.stringify(digest, null, 2));

console.log('TOTAL', digest.total);
console.log('STATUS', JSON.stringify(digest.status));
console.log('PRIORITY', JSON.stringify(digest.priority));
console.log('EXPLICIT P0/P1/P2', digest.explicit.P0.length, digest.explicit.P1.length, digest.explicit.P2.length);
console.log('CONFLICTS', digest.conflicts.length);
console.log('CSV rows', rows.length);
