import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const gapPath = join(repo, 'docs/craft-ref/features/gap.md');
const outDir = join(repo, 'docs/craft-ref/features/_audit');
mkdirSync(outDir, { recursive: true });

const lines = readFileSync(gapPath, 'utf8').split(/\r?\n/);

function splitRow(line) {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const parts = [];
  let cur = '';
  let esc = false;
  for (const ch of s) {
    if (esc) { cur += ch === '|' ? '|' : '\\' + ch; esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '|') { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur.trim());
  while (parts.length && parts[0] === '') parts.shift();
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function roleOf(h, i) {
  const t = h.replace(/\*/g, '').trim();
  if (i === 0 && /^(#|G号|编号|ID)$/i.test(t)) return 'id';
  if (/官方/.test(t)) return 'official';
  if (/本地/.test(t)) return 'local';
  if (/判定|类型|验证/.test(t)) return 'verdict';
  if (/影响|成本|优先级|分/.test(t)) return 'score';
  if (/补齐判据|判据/.test(t)) return 'criteria';
  if (/回归/.test(t)) return 'regression';
  if (/证据/.test(t)) return 'evidence';
  if (/状态/.test(t)) return 'status';
  return 'other' + i;
}

const rows = [];
const sections = new Map();
let section = '(head)';
let header = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^##+\s/.test(line)) {
    section = line.replace(/^#+\s*/, '').trim();
    header = null;
  }
  if (!line.trim().startsWith('|')) continue;
  const cells = splitRow(line);
  const first = (cells[0] ?? '').replace(/\*/g, '').trim();
  if (/^(#|G号|编号|ID)$/i.test(first)) {
    header = cells.map(roleOf);
    continue;
  }
  if (!/^G\d+$/.test(first)) continue;
  if (!header) continue;
  const rec = { line: i + 1, section, cols: cells.length };
  for (let j = 0; j < cells.length; j++) {
    const role = header[j] ?? 'extra' + j;
    if (rec[role] === undefined) rec[role] = cells[j];
    else rec[role] += ' | ' + cells[j];
  }
  rows.push(rec);
  sections.set(section, (sections.get(section) ?? 0) + 1);
}

function statusOf(r) {
  const local = r.local ?? '';
  const verdict = r.verdict ?? '';
  const all = [r.official, r.local, r.verdict, r.criteria, r.regression, r.status, r.evidence]
    .filter(Boolean).join(' ');
  const live = [r.verdict, r.status].filter(Boolean).join(' ');
  if (/部分落地|部分实现|部分已|部分补|部分清|只做了|还有.*(?:未|没)/.test(all)) return 'partial';
  if (/有意偏差|不做\s*[（(]|决策为.*跳过|跳过且不出入口/.test(live + ' ' + local)) return 'deliberate';
  if (/已清|已落地|已实现|已补|已建|已接|已对齐|已完成|无需实现|不需要实现|早已.*(?:落地|实现|在仓)|门已在|已分开|都已挡|系陈旧记录.*已/.test(live + ' ' + local)) {
    if (/差(?:第|一|那)|未做|未完成|待补|尚缺|仍缺|还缺/.test(local)) return 'partial';
    return 'aligned';
  }
  if (/未采|不可达|采集边界|主动放弃|不采|没采到|拿不到/.test(live)) return 'unreachable';
  if (/不适用|仪器|契约事实|工具事实|资料卫生|方法论|通路／工具/.test(live)) return 'nonaction';
  if (/^(?:无|全库无|全无|只有|缺失|未实现|没有|无任何)|未采纳|未覆盖|未做|零匹配|无对应|无绑定|无入口|无此|不同构|不一致|完全不同|数值不同|与官方不同/.test(local)) return 'gap';
  if (/缺失|行为不同|只有壳|未动|未实现|无绑定|无对应|零匹配/.test(verdict)) return 'gap';
  if (/一致|相同|无差异|两侧同|与官方相同/.test(local)) return 'aligned';
  if (/本地.{0,20}(?:无|没有|未|缺|仅|只有|不同|差异|没)|无[^\s]{0,12}(?:层|概念|字段|命令|入口|语义|统计|上限|对应|绑定)|只有|仅|完全没有|零匹配|完全不同|远小于|近似|纯拼接|整体抛错|落回|自造|抢|不到|未分流|没跟上|一样/.test(local)) return 'gap';
  if (/P0|P1|P2|缺口|待办/.test(r.section)) return 'gap';
  return 'unknown';
}

for (const r of rows) r.status = statusOf(r);

function scoreOf(r) {
  const s = (r.score ?? '').replace(/\*\*/g, '').trim();
  const m = s.match(/([0-9])\s*\/\s*([0-9])/);
  if (m) return { impact: Number(m[1]), cost: Number(m[2]), raw: s };
  const p = s.match(/P([0-3])/i);
  if (p) return { impact: 4 - Number(p[1]), cost: null, raw: s };
  return { impact: null, cost: null, raw: s };
}
for (const r of rows) r.scoreParsed = scoreOf(r);
for (const r of rows) {
  const local = r.local ?? '';
  const verdict = r.verdict ?? '';
  // 整条正则锚在行首：本地说明常在一段已落地的描述之后补「其余…无对应」，不锚会把对齐行误判成冲突。
  const missingLocal = /^(?:(?:无|全库无|全无|只有|缺失|未实现|没有|无任何)|未采纳|未覆盖|未做|零匹配|无对应|无绑定|无入口|无此|不同构)/.test(local);
  const clearVerdict = /已清|已落地|已实现|已补|已建|已接|已对齐|已完成/.test(verdict);
  r.conflict = null;
  if ((r.status === 'aligned' || r.status === 'partial') && missingLocal) r.conflict = 'local-says-missing';
  else if (r.status === 'gap' && clearVerdict) r.conflict = 'verdict-says-clear';
  r.priority = /^一、P0/.test(r.section) ? 'P0'
    : /^二、P1/.test(r.section) ? 'P1'
    : /^三、P2/.test(r.section) ? 'P2'
    : r.scoreParsed.impact === 3 ? 'P1' : r.scoreParsed.impact === 2 ? 'P2' : r.scoreParsed.impact === 1 ? 'P3' : 'P?';
}

const dist = (key) => {
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
const payload = {
  generatedAt: new Date().toISOString(),
  totalRows: rows.length,
  statusDistribution: dist('status'),
  priorityDistribution: dist('priority'),
  statusByPriority: cross('priority', 'status'),
  conflicts: rows.filter(r => r.conflict).length,
  conflictRows: rows.filter(r => r.conflict).map(r => ({ id: r.id, line: r.line, status: r.status, conflict: r.conflict, local: (r.local || '').slice(0, 160), verdict: (r.verdict || '').slice(0, 120) })),
  sectionRows: [...sections.entries()].map(([name, count]) => ({ name, count })),
  rows,
};
writeFileSync(join(outDir, 'ledger-rows.json'), JSON.stringify(payload, null, 2));

const short = (s, n = 150) => (s ?? '').replace(/\s+/g, ' ').slice(0, n);
console.log('TOTAL', rows.length);
console.log('STATUS', JSON.stringify(payload.statusDistribution));
console.log('PRIORITY', JSON.stringify(payload.priorityDistribution));
console.log('STATUS_BY_PRIORITY', JSON.stringify(payload.statusByPriority));
console.log('CONFLICTS', payload.conflicts);
for (const c of payload.conflictRows.slice(0, 15)) console.log('  CONFLICT', c.id, c.line, c.status, c.conflict);
console.log('SECTIONS');
for (const s of payload.sectionRows) console.log(' ', s.count, s.name.slice(0, 70));
for (const st of ['partial', 'aligned', 'deliberate', 'unreachable', 'nonaction', 'gap', 'unknown']) {
  const sample = rows.filter(r => r.status === st).slice(0, 3);
  console.log('\n==', st, rows.filter(r => r.status === st).length, '==');
  for (const r of sample) {
    console.log(r.id, 'L' + r.line, '| score', r.scoreParsed.raw, '| local:', short(r.local, 110));
    console.log('   verdict:', short(r.verdict, 110));
  }
}
