import fs from 'node:fs';

export const SIG = h => ({
  bytes: h.length,
  blockwraps: (h.match(/id="blockwrap-/g) || []).length,
  slateEls: (h.match(/data-slate-node="element"/g) || []).length,
  zeroW: [...h.matchAll(/data-slate-zero-width="([^"]*)"/g)].map(m => m[1]).join(','),
  slateLen: [...h.matchAll(/data-slate-length="(\d+)"/g)].map(m => m[1]).join(','),
  brs: (h.match(/<br>/g) || []).length,
  li: (h.match(/<li[\s>]/g) || []).length,
  checkbox: (h.match(/checkbox/g) || []).length,
  open: (h.match(/aria-expanded="true"|data-state="open"/g) || []).length,
});

export const TXTS = h => [...new Set([...h.matchAll(/data-slate-leaf="true"[^>]*>([\s\S]*?)<\/span>/g)]
  .map(m => m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, '')).filter(Boolean))].join('|');

export const BLK = h => [...h.matchAll(/id="blockwrap-([^"]*)"/g)].map((m, i) => {
  const tail = h.slice(m.index, m.index + 4200);
  const head = h.slice(Math.max(0, m.index - 900), m.index);
  const overhang = (head.match(/--overhang-left:\s*([^;]+)/g) || []).slice(-1).join('');
  const pad = (tail.match(/padding-left:\s*([^;"']+)/) || [])[1] || '';
  const marg = (tail.match(/margin-left:\s*([^;"']+)/) || [])[1] || '';
  const text = (tail.match(/data-slate-leaf="true"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '';
  return {
    i,
    id: m[1],
    upper: /^[A-F0-9-]{36}$/.test(m[1]) ? 'UPPER' : 'lower',
    menuInside: (tail.match(/data-menu-inside="([^"]*)"/) || [])[1] || '',
    overhang, pad, marg,
    listStyle: (tail.match(/data-list-style="([^"]*)"/) || [])[1] || (tail.includes('checkbox') ? 'checkbox' : ''),
    text: text.replace(/<[^>]*>/g, '').replace(/\s+/g, '').slice(0, 24),
  };
});

if (process.argv[2]) {
  const h = fs.readFileSync(process.argv[2], 'utf8');
  console.log(JSON.stringify(SIG(h)));
  console.log('TXT=' + TXTS(h));
  for (const b of BLK(h)) console.log('  blk#' + b.i + ' id=' + b.id + ' case=' + b.upper + ' menu=' + b.menuInside + ' ovh=' + b.overhang + ' pad=' + b.pad + ' marg=' + b.marg + ' list=' + b.listStyle + ' txt=' + b.text);
}
