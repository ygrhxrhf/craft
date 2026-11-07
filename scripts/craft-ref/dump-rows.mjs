import fs from 'node:fs';

const csvPath = 'docs/craft-ref/features/_audit/ledger-backlog.csv';
const mvPath = 'docs/craft-ref/features/_audit/manual-verified.json';

function parseCsv(src) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows[0];
const idx = Object.fromEntries(header.map((n, i) => [n, i]));
const mv = JSON.parse(fs.readFileSync(mvPath, 'utf8')).rows || {};

const ids = process.argv.slice(2);
const want = new Set(ids.map((s) => s.trim().toUpperCase()));
const picked = rows.slice(1).filter((r) => r.length > 1 && (want.size === 0 ? r[idx.priority] === 'P3' : want.has(r[idx.id])));

for (const r of picked) {
  const id = r[idx.id];
  console.log(`\n### ${id} | ${r[idx.priority]} | ${r[idx.status]} | cost=${r[idx.cost]} impact=${r[idx.impact]}`);
  console.log(`OFFICIAL: ${r[idx.official]}`);
  console.log(`LOCAL: ${r[idx.local]}`);
  if (r[idx.verdict]) console.log(`VERDICT: ${r[idx.verdict]}`);
  if (r[idx.note]) console.log(`NOTE: ${r[idx.note]}`);
  const m = mv[id];
  if (m) console.log(`MV: ${JSON.stringify({ status: m.status, note: m.note }, null, 0)}`);
}