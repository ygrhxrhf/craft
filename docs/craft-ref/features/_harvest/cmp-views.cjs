const fs=require('fs');
function cards(f){
  const h=fs.readFileSync(f,'utf8');
  // find elements with inline width/height that look like cards
  const boxes=[...h.matchAll(/style="([^"]*--(card|column|masonry|waterfall)[^"]*)"/gi)].map(m=>m[1]);
  const cls=new Set([...h.matchAll(/class="([^"]*_[a-z0-9]{4,}_[0-9]+)/g)].map(m=>m[1].split(' ')[0]));
  const cssVars=[...new Set([...h.matchAll(/style="([^"]*)"/g)].flatMap(m=>[...m[1].matchAll(/--[a-z-]+:\s*[^;]+/g)].map(x=>x[0])))];
  return {h,boxes,cls:[...cls],cssVars};
}
const a=cards('dyn-alldocs-after-del.html'), b=cards('dyn-view-waterfall.html');
console.log('=== only in WATERFALL css vars ===');
b.cssVars.filter(v=>!a.cssVars.includes(v)).slice(0,25).forEach(v=>console.log(v));
console.log('=== only in GRID css vars ===');
a.cssVars.filter(v=>!b.cssVars.includes(v)).slice(0,25).forEach(v=>console.log(v));
console.log('=== classes only in waterfall ===');
console.log(b.cls.filter(c=>!a.cls.includes(c)).join('\n'));
console.log('=== classes only in grid ===');
console.log(a.cls.filter(c=>!b.cls.includes(c)).join('\n'));
const strip=x=>new Set([...x.h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').matchAll(/>([^<>]+)</g)].map(m=>m[1].trim()).filter(t=>t.length>1));
const sa=strip(a), sb=strip(b);
console.log('=== text only in waterfall ==='); console.log([...sb].filter(t=>!sa.has(t)).join(' | '));
console.log('=== text only in grid ==='); console.log([...sa].filter(t=>!sb.has(t)).join(' | '));
