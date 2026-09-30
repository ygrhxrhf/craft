#!/usr/bin/env node
// 全量 1000 条 <5s 探针（spec 9.4-④，P4 生产复测）
// 用法：node scripts/bench-full-sync.mjs --url http://localhost:3000 --cookie "next-auth.session-token=..."
//   或先登录拿 cookie：curl -c jar -X POST http://localhost:3000/api/auth/callback/credentials ...
// 默认读 --url / --cookie，也可通过环境 BENCH_URL / BENCH_COOKIE 传入

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: process.env.BENCH_URL || 'http://localhost:3000' },
    cookie: { type: 'string', default: process.env.BENCH_COOKIE || '' },
    limit: { type: 'string', default: '500' },
  },
});

const base = values.url.replace(/\/$/, '');
const limit = Number(values.limit);

async function bench() {
  let since = undefined;
  let total = 0;
  let pages = 0;
  const pageMs = [];
  let hasMore = true;

  const start = performance.now();

  while (hasMore) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (since) qs.set('since', since);
    const url = `${base}/api/v1/sync?${qs}`;
    const t0 = performance.now();
    const res = await fetch(url, {
      headers: {
        ...(values.cookie ? { cookie: values.cookie } : {}),
        'cache-control': 'no-store',
      },
    });
    const t1 = performance.now();
    pageMs.push(Math.round(t1 - t0));

    if (res.status === 307 || res.status === 401) {
      console.error(`未认证（${res.status}），请传入有效 cookie：--cookie "next-auth.session-token=..."`);
      process.exit(2);
    }
    if (!res.ok) {
      console.error(`GET /api/v1/sync → ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const body = await res.json();
    total += body.records?.length ?? 0;
    pages += 1;
    hasMore = !!body.hasMore;
    since = body.cursor;
    if (pages > 20) {
      console.error('页数 >20，异常，终止');
      break;
    }
  }

  const elapsed = Math.round(performance.now() - start);
  console.log(JSON.stringify({ total, pages, pageMs, elapsedMs: elapsed, limit }, null, 2));
  console.log(`全量 ${total} 条 / ${pages} 页，页耗时 ${pageMs.join(' + ')} = ${elapsed}ms（阈值 5000ms）— ${elapsed < 5000 ? 'PASS' : 'FAIL'}`);
  process.exit(elapsed < 5000 ? 0 : 1);
}

bench().catch((e) => {
  console.error(e);
  process.exit(1);
});
