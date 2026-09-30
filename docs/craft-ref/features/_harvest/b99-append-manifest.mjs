import { appendFileSync, readFileSync } from 'node:fs';

const names = [
  ['QODER-HARVEST-B97-DRAG', '4755724d-64f1-ee94-7e6c-3013e1011dda', '4a4052ca-45f7-d15e-1f98-eae6a475f28f'],
  ['QODER-HARVEST-B97-INDENT', 'd6ec3a71', '20bf7dc9-5a39-69f5-ea88-70fab67c6915'],
  ['QODER-HARVEST-B97', 'e3ffc949', '631de6a3-15a5-05af-85bf-cbc7cb8d9241'],
  ['QODER-HARVEST-B96D', '903554d4', '72ecb7de-25cd-19bd-f672-70293c8d9cd8'],
  ['QODER-HARVEST-B96C', '87668082', 'c859e6b7-506f-57fb-a98f-5b31bbf04d2f'],
  ['QODER-HARVEST-B96B', 'd3b15134', '17aef441-6c17-3420-83ec-acd9e2388652'],
  ['QODER-HARVEST-B96', 'bc1adab2', '60970136-fb8c-8b73-1293-dec8412c36ba'],
  ['QODER-HARVEST-B81', '69575dc5', '24553b80-d781-19e8-4b87-8f164aad5931'],
  ['QODER-HARVEST-B79B', '6c28af2a', '6610e5e7-46a0-1fd0-28f3-9ce3d2bd3dd4'],
  ['QODER-HARVEST-B79', '8845e79a', 'b7b17b7b-5722-9a72-2ce9-ad5d040936e4'],
  ['QODER-HARVEST-B77', '889df49b', 'f90170fd-6360-0094-dde5-8d42566a3ab8'],
  ['QODER-HARVEST-B75', 'f29ed610', 'd657d3af-592c-2103-c8d9-8c8b6a88e3e3'],
];

const rec = {
  ts: new Date().toISOString(),
  batch: 99,
  kind: 'purge',
  name: 'QODER-HARVEST-* x12 permanent delete (Trash Slash, user-authorized this turn)',
  count: names.length,
  items: names.map(([name, documentId, rootBlockId]) => ({ name, documentId, rootBlockId })),
  before: 'trash 15 (12 named + 3 untitled); unsorted 3; reminders 0; tasks(all) 14',
  method: 'trash screen -> sort/menu button (data-testid browse-sort-button) -> Select -> select-all -> deselect the 3 untitled -> assert 已选 12 项 and selected set == 12 named -> Trash Slash (variant variantPlainDanger) -> confirm dialog 删除 12 个项目 -> 删除',
  after: 'trash 3 (untitled only: 2db38d6b / d8af008b / 73dc4026, untouched); unsorted 3 (same ids); reminders 0; tasks(all) 14 -> 9 (5 tasks that lived inside the purged trash docs are gone)',
  verification: 'documents list --location trash (3) + unsorted (3, per-id) + reminders list --status all (0) + search QODER-HARVEST (no matches) + hard reload of trash screen (3 cards, all untitled)',
  irreversible: true,
  spared: ['2db38d6b-55cd-4506-9e85-40c7d0d1c7ce', 'd8af008b-7492-4671-be51-d704a1ef3e52', '73dc4026-15eb-439c-a0f6-8a1681eb556d'],
};

appendFileSync('_harvest/manifest.jsonl', JSON.stringify(rec) + '\n');
const n = readFileSync('_harvest/manifest.jsonl', 'utf8').trim().split('\n').length;
console.log('manifest lines = ' + n + ' (was 133), purge items = ' + rec.items.length);
