const fs=require('fs');
const html=fs.readFileSync('dyn-trash.html','utf8');
console.log('=== hrefs containing trash/deleted ===');
for(const m of html.matchAll(/href="([^"]*trash[^"]*)"/g)) console.log(m[1]);
console.log('=== all internal hrefs (uniq, first 40) ===');
console.log([...new Set([...html.matchAll(/href="(\/[^"]*)"/g)].map(m=>m[1]))].slice(0,40).join('\n'));
console.log('=== context around Tray Full ===');
let i=html.indexOf('Tray Full');
while(i>-1 && i<html.length){ console.log('...'+html.slice(Math.max(0,i-420),i+120).replace(/\s+/g,' ')+'...'); i=html.indexOf('Tray Full',i+1); if(i>60000) break; }
