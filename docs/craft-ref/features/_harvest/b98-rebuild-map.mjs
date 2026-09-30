import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Rebuild the token table that an idempotent second run clobbered.
// Tokens were assigned by first-seen order over readdirSync('.md') at mask time,
// so replay that exact traversal against the committed (pre-mask) text.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const files = readdirSync('.').filter((f) => f.endsWith('.md'));
const map = new Map();
const perFile = {};
for (const f of files) {
  let head;
  try {
    head = execFileSync('git', ['show', `HEAD:docs/craft-ref/features/${f}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    console.log(`skip ${f} (not in HEAD)`);
    continue;
  }
  const hits = head.match(UUID_RE) || [];
  perFile[f] = hits.length;
  for (const raw of hits) {
    const k = raw.toLowerCase();
    if (!map.has(k)) map.set(k, `<objId:${map.size + 1}>`);
  }
}
writeFileSync('_harvest/uuid-map.json', JSON.stringify([...map.entries()].map(([uuid, token]) => ({ token, uuid })), null, 1) + '\n');
console.log('rebuilt distinct ids:', map.size);
console.log('head-side uuid counts per file:', JSON.stringify(perFile));

// Cross-check: token occurrences in the working tree must match head-side counts per file.
for (const f of files) {
  const work = readFileSync(f, 'utf8');
  const toks = work.match(/<objId:\d+>/g) || [];
  if (toks.length !== (perFile[f] || 0)) console.log(`MISMATCH ${f}: work ${toks.length} vs head ${perFile[f] || 0}`);
}
console.log('cross-check done');
for (const [uuid, token] of [...map.entries()].slice(0, 3)) console.log(token, '=', uuid.slice(0, 8) + '-…');
