import fs from 'node:fs';

/** Merge batch verdicts into manual-verified.json. Usage: node apply-verified.mjs <updates.json> */
const file = 'docs/craft-ref/features/_audit/manual-verified.json';
const src = JSON.parse(fs.readFileSync(file, 'utf8'));
const updates = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const missing = [];
for (const [id, patch] of Object.entries(updates)) {
  if (!src.rows[id]) missing.push(id);
  src.rows[id] = { ...(src.rows[id] || {}), ...patch };
}
if (missing.length) {
  console.error('unknown ids:', missing.join(', '));
  process.exitCode = 1;
}
fs.writeFileSync(file, JSON.stringify(src, null, 2) + '\n');
console.log(`updated ${Object.keys(updates).length} rows`);