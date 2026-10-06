// Batched e2e runner: splits the suite into Playwright shards and runs them SEQUENTIALLY so
// each batch gets its own `next dev` + collab + tldraw trio instead of one server that has been
// compiling for twenty minutes. A long single run reliably hits
// `[WebServer] Server is approaching the used memory threshold, restarting...` and eats whichever
// test is in flight.
//
// What makes this a measurement rather than "run it twice" — three gates that can go red:
//   1. COVERAGE -- the union of the shards' titles must equal the unsharded set exactly, be
//      pairwise disjoint, and the per-shard counts must sum to the denominator. Prove it with
//      `--control=overlap`.
//   2. FRESHNESS -- the webServer ports must be free BEFORE each batch starts. With
//      `reuseExistingServer: !process.env.CI` set, a warm (already bloated) server would be
//      handed to the batch silently and the whole point would be void.
//   3. SENTINELS -- exit codes are read from the child process (never from a pipe tail), and
//      `flaky` is reported: with no CI env, retries are off, so flaky>0 means someone turned
//      them on and is masking an intermittent failure.
//
// Usage:
//   node scripts/e2e-batched.mjs [--shards=2] [--specs=nonvisual|visual|all] [--projects=desktop]
//   node scripts/e2e-batched.mjs --plan-only        // gates 1 only, runs nothing
//   node scripts/e2e-batched.mjs --check-ports      // gate 2 only
//   node scripts/e2e-batched.mjs --control=overlap  // injects a fault; gate 1 MUST go red
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGDIR = path.join(ROOT, 'test-results', 'batched');
const PORTS = [3000, 3001, 3002];

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : dflt;
};
const SHARDS = Number(arg('shards', '2'));
const SPECS = arg('specs', 'nonvisual');
const PROJECTS = arg('projects', 'desktop').split(',');
const PLAN_ONLY = argv.includes('--plan-only');
const CHECK_PORTS = argv.includes('--check-ports');
const CONTROL = arg('control', '');

if (!Number.isInteger(SHARDS) || SHARDS < 1) {
  console.log(`ABORT --shards must be a positive integer, got ${argv.find((a) => a.startsWith('--shards='))}`);
  process.exit(1);
}
if (!['nonvisual', 'visual', 'all'].includes(SPECS)) {
  console.log(`ABORT --specs must be nonvisual|visual|all, got ${SPECS}`);
  process.exit(1);
}

// A bind probe instead of parsing `netstat`: it asks the same question the server will ask when
// it starts, on both Windows and POSIX. Binding the wildcard address is deliberate -- a specific
// host bind can succeed alongside a wildcard listener and would read "free" for a busy port.
function portBusy(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', (e) => resolve(e.code === 'EADDRINUSE' ? 'busy' : `error:${e.code}`));
    srv.once('listening', () => srv.close(() => resolve('free')));
    srv.listen({ port });
  });
}

async function busyPorts() {
  const states = await Promise.all(PORTS.map(async (p) => [p, await portBusy(p)]));
  return states.filter(([, s]) => s !== 'free').map(([p, s]) => `${p}${s === 'busy' ? '' : `(${s})`}`);
}

if (!fs.existsSync(LOGDIR)) fs.mkdirSync(LOGDIR, { recursive: true });

const specFiles = fs
  .readdirSync(path.join(ROOT, 'e2e'))
  .filter((f) => f.endsWith('.spec.ts'))
  .filter((f) => (SPECS === 'nonvisual' ? !/^(visual|responsive)\.spec\.ts$/.test(f)
    : SPECS === 'visual' ? /^(visual|responsive)\.spec\.ts$/.test(f) : true))
  .map((f) => `e2e/${f}`);
console.log(`specs=${SPECS} files=${specFiles.length} projects=${PROJECTS.join(',')}`);

function pw(extra, logName) {
  const projectArgs = PROJECTS.flatMap((project) => [`--project=${project}`]);
  const res = spawnSync('npx', ['playwright', 'test', ...specFiles, ...projectArgs, ...extra], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
  });
  const stdout = res.stdout || '';
  // `next dev`'s `injected env` banner and the webServer log come out on stderr; they are wanted
  // for the counters but must never reach the JSON reader.
  const out = `${stdout}\n${res.stderr || ''}`;
  if (logName) fs.writeFileSync(path.join(LOGDIR, logName), out);
  return { code: res.status, out, stdout };
}

/** Test titles from the JSON reporter's suite tree, for one shard spec. */
function titlesFor(shard) {
  const extra = ['--list', '--reporter=json'];
  if (shard) extra.push(`--shard=${shard}`);
  const { code, stdout } = pw(extra);
  if (code !== 0) throw new Error(`ABORT --list shard=${shard || '1/1'} exit=${code}`);
  let json;
  try {
    json = JSON.parse(stdout.slice(stdout.indexOf('{')));
  } catch (e) {
    console.log('ABORT cannot parse the --list JSON plan: ' + e.message.slice(0, 70));
    console.log('  stdout head: ' + JSON.stringify(stdout.slice(0, 90)));
    console.log('  stdout tail: ' + JSON.stringify(stdout.slice(-90)));
    process.exit(1);
  }
  const titles = [];
  (function walk(suites) {
    for (const s of suites || []) {
      // file-qualified key: bare `spec.title` collides across files, and a collision would read
      // as "the shards double-count" in a perfectly good plan.
      for (const spec of s.specs || []) titles.push(`${spec.file || s.title} › ${spec.title}`);
      walk(s.suites);
    }
  })(json.suites);
  if (!titles.length) { console.log('ABORT the plan parsed to 0 titles (shape changed?)'); process.exit(1); }
  return titles;
}

if (CHECK_PORTS) {
  const busy = await busyPorts();
  console.log(busy.length ? `PORTS BUSY: ${busy.join(' ')}` : `PORTS FREE: ${PORTS.join(' ')}`);
  process.exit(0);
}

// ---- gate 1: the partition must cover the suite exactly --------------------------
const full = titlesFor(null);
const parts = [];
for (let i = 1; i <= SHARDS; i += 1) parts.push({ shard: `${i}/${SHARDS}`, titles: titlesFor(`${i}/${SHARDS}`) });
if (CONTROL === 'overlap') parts[0] = { shard: parts[1].shard, titles: parts[1].titles }; // injected fault

const seen = new Map();
let dupes = 0;
for (const p of parts) for (const t of p.titles) seen.set(t, (seen.get(t) || 0) + 1);
for (const [, n] of seen) if (n > 1) dupes += 1;
const missing = full.filter((t) => !seen.has(t));
const extraTitles = [...seen.keys()].filter((t) => !full.includes(t));
const sum = parts.reduce((a, p) => a + p.titles.length, 0);
console.log(`plan full=${full.length} shards=[${parts.map((p) => p.titles.length).join('+')}] sum=${sum} dupTitles=${dupes} missing=${missing.length} unexpected=${extraTitles.length}`);
if (sum !== full.length || dupes || missing.length || extraTitles.length) {
  console.log('COVERAGE GATE FAILED: the batched plan is not the same suite');
  if (missing.length) console.log('  missing: ' + missing.slice(0, 5).join(' | '));
  if (dupes) console.log('  duplicated titles: ' + dupes);
  process.exit(1);
}
console.log('COVERAGE GATE OK: union == full set, pairwise disjoint, sum == denominator');
if (PLAN_ONLY) process.exit(0);

// ---- gate 2 + the batches ---------------------------------------------------------
const agg = { passed: 0, failed: 0, flaky: 0, skipped: 0, notRun: 0, restarts: 0, badExit: [] };
for (const p of parts) {
  const busy = await busyPorts();
  if (busy.length) {
    console.log(`FRESHNESS GATE FAILED before ${p.shard}: ports ${busy.join(' ')} are already listening`);
    console.log('  reuseExistingServer would hand this batch a warm server; aborting instead of measuring that.');
    process.exit(2);
  }
  const tag = p.shard.replace('/', '-');
  console.log(`-- batch ${p.shard} (${p.titles.length} tests) start ${new Date().toTimeString().slice(0, 8)}`);
  const { code, out } = pw(['--shard=' + p.shard], `run-${tag}.log`);
  const grab = (re) => { const m = re.exec(out); return m ? Number(m[1]) : 0; };
  agg.passed += grab(/(\d+) passed/);
  agg.failed += grab(/(\d+) failed/);
  agg.flaky += grab(/(\d+) flaky/);
  agg.skipped += grab(/(\d+) skipped/);
  agg.notRun += grab(/(\d+) did not run/);
  agg.restarts += (out.match(/approaching the used memory threshold/g) || []).length;
  if (code !== 0) agg.badExit.push({ shard: p.shard, code });
  const after = await busyPorts();
  if (after.length) console.log(`  note: ports ${after.join(' ')} still listening after batch ${p.shard} (leaked server)`);
}

const counted = agg.passed + agg.failed + agg.flaky + agg.skipped;
console.log(
  `AGGREGATE passed=${agg.passed} failed=${agg.failed} flaky=${agg.flaky} skipped=${agg.skipped} didNotRun=${agg.notRun} ` +
  `counted=${counted}/${full.length} memoryRestart=${agg.restarts}`
);
console.log('per-batch exit codes: ' + (agg.badExit.length ? agg.badExit.map((b) => `${b.shard}=${b.code}`).join(' ') : 'all 0'));
if (counted !== full.length) { console.log('DENOMINATOR MISMATCH: batches did not account for every test'); process.exit(3); }
if (agg.notRun) { console.log('DID-NOT-RUN TESTS PRESENT'); process.exit(4); }
if (agg.flaky) { console.log('FLAKY>0 means retries are ON and are hiding an intermittent failure'); process.exit(5); }
if (agg.failed) { console.log(`FAILED>0 -- see ${path.join(LOGDIR, 'run-*.log')}`); process.exit(6); }
console.log('BATCHED RUN OK');
process.exit(0);
