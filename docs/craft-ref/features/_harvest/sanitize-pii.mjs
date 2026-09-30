import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Scope: every committed text artifact under docs/craft-ref, not just features/*.md.
// The narrow scope was itself a leak — screens.md and styles/*.json carried the
// space id and the account holder name through three commits unnoticed.
const CRAFT_REF = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP_DIRS = new Set(['_harvest', 'node_modules', '.git', 'raw', 'screens', 'local']);
const TEXT_EXT = /\.(md|json|txt|tsv)$/i;

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), acc);
    } else if (TEXT_EXT.test(e.name)) {
      acc.push(join(dir, e.name));
    }
  }
  return acc;
}

// PII forms observed in the artifacts (verified by grep before writing this).
const RULES = [
  ['C:\\Users\\omen\\AppData\\Local\\Temp', '<系统Temp>'],
  ['zhang meng', '<账户持有人>'],
  ['3b788e8c-7aa3-d2e8-fc70-0c112def1581', '<spaceId>'],
  ['3b788e8c-…', '<spaceId>'],
  ['3b788e8c…', '<spaceId>'],
  ['zhang\'s-Space--<spaceId>', '<空间名--spaceId>'],
  ['zhang\\\'s Space', '<空间名>'],
  ['zhang\'s Space', '<空间名>'],
  ['zhang\'s-Space', '<空间名>'],
  ['zhang\'s', '<空间名>'],
];

const FORBIDDEN = ['3b788e8c', 'zhang', 'C:\\Users\\omen'];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const files = walk(CRAFT_REF).sort();
let changed = 0;
let total = 0;

for (const f of files) {
  const before = readFileSync(f, 'utf8');
  let after = before;
  for (const [from, to] of RULES) {
    let n = 0;
    while (after.includes(from)) {
      after = after.replace(from, to);
      n += 1;
    }
    if (n > 0) {
      total += n;
      console.log(`  ${f.slice(CRAFT_REF.length + 1)}: ${from} -> ${to}  ×${n}`);
    }
  }
  if (after !== before) {
    writeFileSync(f, after);
    changed += 1;
  }
}

console.log(`files scanned = ${files.length}, rewritten = ${changed}, replacements = ${total}`);

// --- deep masking of object ids (document / block UUIDs), authorized 2026-09-29 ---
// Full UUIDs are resolvable handles inside the space, so they never belong in the
// committed artifacts. Tokens are stable per UUID and the inverse table lives in
// _harvest/uuid-map.json (gitignored), so local restore commands still work.
const mapPath = join(CRAFT_REF, 'features', '_harvest', 'uuid-map.json');
const existing = JSON.parse(readFileSync(mapPath, 'utf8'));
const idMap = new Map(existing.map((e) => [e.uuid.toLowerCase(), e.token]));
let nextIndex = idMap.size;
let uuidRewritten = 0;

for (const f of files) {
  const before = readFileSync(f, 'utf8');
  const after = before.replace(UUID_RE, (m) => {
    const k = m.toLowerCase();
    let token = idMap.get(k);
    if (!token) token = `<objId:${++nextIndex}>`, idMap.set(k, token);
    return token;
  });
  if (after !== before) {
    writeFileSync(f, after);
    uuidRewritten += 1;
  }
}

writeFileSync(
  mapPath,
  idMap.size > 0
    ? JSON.stringify([...idMap.entries()].map(([uuid, token]) => ({ token, uuid })), null, 1) + '\n'
    : readFileSync(mapPath, 'utf8')
);
console.log(`uuid masking: ${idMap.size} distinct ids across ${uuidRewritten} files`);

// Post-assertion: nothing forbidden survives anywhere in scope, and markers did land.
let leaks = 0;
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  for (const needle of FORBIDDEN) {
    if (txt.includes(needle)) {
      console.log(`LEAK ${f.slice(CRAFT_REF.length + 1)} still contains ${needle}`);
      leaks += 1;
    }
  }
  const survivor = txt.match(UUID_RE);
  if (survivor) {
    console.log(`LEAK ${f.slice(CRAFT_REF.length + 1)} still contains ${survivor.length} full UUID(s)`);
    leaks += 1;
  }
}
for (const marker of ['<spaceId>', '<空间名>', '<账户持有人>', '<objId:']) {
  if (!files.some((f) => readFileSync(f, 'utf8').includes(marker))) {
    console.log(`MISSING ${marker} — replacement did not land`);
    leaks += 1;
  }
}
console.log(leaks === 0 ? 'SANITIZE OK' : `SANITIZE FAILED (${leaks})`);
process.exitCode = leaks === 0 ? 0 : 1;
