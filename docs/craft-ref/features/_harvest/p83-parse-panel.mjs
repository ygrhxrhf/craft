import fs from 'fs';

const file = process.argv[2] ?? 'b83-panel-tab-heji.unescaped.html';
let s = fs.readFileSync(file, 'utf8');
try { s = JSON.parse(s); } catch { /* already unescaped */ }

const tabs = [...s.matchAll(/<(?:button|div)[^>]*class="[^"]*_action_1j891_[^"]*"[^>]*>([\s\S]*?)<\/(?:button|div)>/g)]
  .map(m => m[1].replace(/<[^>]*>/g, '').trim())
  .filter(t => t && !/^\s*$/.test(t));

const cat = [...s.matchAll(/class="[^"]*_categoryTitle[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());
const header = [...s.matchAll(/class="[^"]*_headerText[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());
const caption = [...s.matchAll(/class="[^"]*_caption[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());

function rows() {
  const out = [];
  const marks = [...s.matchAll(/class="[^"]*_row_dm375_102/g)].map(m => m.index);
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1] : s.indexOf('_closeButton', start) > 0 ? s.length : s.length;
    const chunk = s.slice(start, end);
    const name = [...chunk.matchAll(/class="[^"]*_rowName[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());
    const alt = [...chunk.matchAll(/class="[^"]*_rowAlternative[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());
    const keys = [...chunk.matchAll(/class="[^"]*_key_dm375_124[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
    const sect = [...chunk.matchAll(/class="[^"]*_sectionTitle[^"]*"[^>]*>([\s\S]*?)</g)].map(m => m[1].trim());
    out.push({ name, alt, keys, sect, len: chunk.length });
  }
  return out;
}

// section titles in document order, with their nearest following rows
const secMarks = [...s.matchAll(/class="[^"]*_sectionTitle[^"]*"[^>]*>([\s\S]*?)</g)].map(m => ({ at: m.index, title: m[1].trim() }));
const rowMarks = [...s.matchAll(/class="[^"]*_rowName[^"]*"[^>]*>([\s\S]*?)</g)].map(m => ({ at: m.index, name: m[1].trim() }));
const keyGroups = [...s.matchAll(/class="[^"]*_keys_dm375_124[\s\S]*?<\/div>/g)].map(m => ({ at: m.index, keys: [...m[0].matchAll(/class="[^"]*_key_dm375_124[^"]*"[^>]*>([\s\S]*?)</g)].map(k => k[1].replace(/<[^>]*>/g, '').trim()) }));

const lines = [];
lines.push('HEADER: ' + JSON.stringify(header));
lines.push('CAPTION: ' + JSON.stringify(caption));
lines.push('SIDEBAR ITEMS: ' + JSON.stringify(tabs));
lines.push('CATEGORY TITLES: ' + JSON.stringify(cat));
lines.push('SECTIONS: ' + JSON.stringify(secMarks.map(x => x.title)));
for (const r of rowMarks) {
  const sec = secMarks.filter(x => x.at < r.at).pop();
  const kg = keyGroups.filter(x => x.at > r.at).shift();
  lines.push(`ROW | section=${sec ? sec.title : '?'} | name=${r.name} | keys=${kg ? JSON.stringify(kg.keys) : '[]'}`);
}
const txt = lines.join('\n') + '\n';
fs.writeFileSync(process.argv[3] ?? 'b83-panel-tab-heji.parsed.txt', txt);
console.log(txt);
