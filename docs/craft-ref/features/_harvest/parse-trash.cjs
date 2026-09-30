const fs=require('fs');
const html=fs.readFileSync('dyn-trash.html','utf8');
const vis=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');
const texts=[...vis.matchAll(/>([^<>]+)</g)].map(m=>m[1].replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#x27;/g,"'").trim()).filter(t=>t&&t!=='|'&&!/^[a-zA-Z0-9_\-\.:\/ ]*$/.test(t)===false? !!t:true);
const uniq=[...new Set(texts.filter(t=>t.length>0 && !/^[\s]+$/.test(t)))];
console.log('=== VISIBLE TEXT ('+uniq.length+' unique) ===');
for(const t of uniq) console.log(JSON.stringify(t));
console.log('\n=== aria-label ===');
console.log([...new Set([...html.matchAll(/aria-label="([^"]*)"/g)].map(m=>m[1]))].join(' | '));
console.log('\n=== title= tooltips ===');
console.log([...new Set([...html.matchAll(/\stitle="([^"]*)"/g)].map(m=>m[1]))].join(' | '));
console.log('\n=== data-state / expanded counts ===');
for(const k of ['data-state="open"','data-state="closed"','data-state="checked"','aria-expanded="true"','aria-expanded="false"','role="button"','<button']){
  console.log(k, (html.split(k).length-1));
}
console.log('\n=== placeholder ===');
console.log([...new Set([...html.matchAll(/placeholder="([^"]*)"/g)].map(m=>m[1]))].join(' | '));
