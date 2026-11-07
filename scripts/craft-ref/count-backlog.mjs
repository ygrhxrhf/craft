import fs from 'node:fs';

const path = 'docs/craft-ref/features/_audit/ledger-backlog.csv';
const text = fs.readFileSync(path, 'utf8');

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
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const rows = parseCsv(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((name, i) => [name, i]));
const data = rows.slice(1).filter((r) => r.length > 1);

const wanted = process.argv.slice(2);
const priorities = wanted.length > 0 ? wanted : ['P0', 'P1', 'P2', 'P3'];

const tally = {};
for (const p of priorities) {
  const subset = data.filter((r) => r[idx.priority] === p);
  tally[p] = {
    total: subset.length,
    byStatus: subset.reduce((acc, r) => {
      const s = r[idx.status] || '(empty)';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {}),
  };
}

console.log(JSON.stringify(tally, null, 2));

if (process.env.SHOW_IDS) {
  for (const p of priorities) {
    const subset = data.filter(
      (r) => r[idx.priority] === p && (r[idx.status] === 'gap' || r[idx.status] === 'partial'),
    );
    console.log(`\n== ${p} actionable (gap/partial): ${subset.length}`);
    for (const r of subset) {
      console.log(`${r[idx.id]}\t${r[idx.status]}\tcost=${r[idx.cost]}\timpact=${r[idx.impact]}\t${r[idx.local].slice(0, 120)}`);
    }
  }
}