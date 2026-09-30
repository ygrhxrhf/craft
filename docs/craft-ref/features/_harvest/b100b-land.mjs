import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const rec = {
  ts: new Date().toISOString(),
  batch: 100,
  kind: 'restore',
  name: 'QODER-HARVEST-B100-UNDOGROUP LIFO restore',
  id: '6e16986d-b315-c24e-c845-8801f7d1a5ef',
  documentId: '75185252-8c73-cd12-9ef2-0190866127f6',
  before: '4 flat blocks U1..U4; two committed drag moves (U4->before U1, then U1->before U3) and three Ctrl+Z presses leaving U1,U3,U4,U2 (persisted across reload)',
  after: 'soft-deleted to trash; unsorted back to the same 3 ids; trash 4 (3 untitled + this sandbox); reminders 0; tasks(all) 9 with no QODER rows; injected aria-label/role/tabindex gone with the document',
  note: 'Sandbox created and destroyed inside batch 100 lower half. Permanent purge of this trash entry NOT done - needs a fresh named approval.',
};
appendFileSync('_harvest/manifest.jsonl', JSON.stringify(rec) + '\n');
const lines = readFileSync('_harvest/manifest.jsonl', 'utf8').trim().split('\n').length;

const p = 'features.md';
let s = readFileSync(p, 'utf8');
const clause = '第 100 批·下半〔★★★ **V91 拖拽协议补上"第 0 步"＝手柄是**单例浮层**（全页 1 个、父容器 0×0、不在任何 `[data-block-id]` 内），只有往**左缘沟槽 x=340** 派发 `pointermove` 才让它跳到目标行（实测 y 339→246→210→282），连接器 `hover` 三次都没驱动它** ＋ ★★★ **两次拖拽后连按三次 `Ctrl+Z` 回不到基线**（焦点四判据齐；第 1／3 次"送达但零变化"、第 2 次改序，终态 `U1,U3,U4,U2` ≠ 基线且 **reload 后保持**）⇒ 步数判为**未定**、严禁写成官方撤销缺陷；本地 TipTap 是严格 LIFO ⇒ **有意偏差候选** ＋ ★★ **中心落点第二次复现＝插到目标之前**（含"拖到末块中心仍插其前"）＋ ★ **两条工具事实**（`hover` 打 StaticText 报 `scrollIntoView is not a function`／`take_snapshot` 不收参数）⇒ **G1018–G1023、V94、internals §三十九、longtail §二十五**；`model.md`／`styles.md` 本段无新节（原因＝零模型字段、零样式读数）；沙盒 `QODER-HARVEST-B100-UNDOGROUP` 建→用→**已软删还原**（四判据复核），`manifest.jsonl` 135 → 136 行〕＋ ';
const jobs = [
  ['`gap.md` **1009 条（最大 G1017）**', '`gap.md` **1015 条（最大 G1023）**'],
  ['第 1–100 批批次日志（第 100 批·上半〔', '第 1–100 批批次日志（' + clause + '第 100 批·上半〔'],
];
for (const [a, b] of jobs) {
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS n=' + n + ' :: ' + a.slice(0, 30));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) { console.log('POST FAIL'); process.exit(1); }
}
writeFileSync(p, s);

const log = '\n## 第 100 批·下半（2026-09-30 01:0x–01:3x 本地＝UTC 17:0x–17:3x，★★★ **V91 协议补第 0 步＋两次拖拽的撤销异常**；沙盒 `QODER-HARVEST-B100-UNDOGROUP` 建→用→已软删）\n\n1. ★★★ **通路纠错**＝连接器 `hover`（真鼠标移到元素中心）**驱动不了 Craft 的拖拽手柄**——手柄是**全页单例浮层**（`[draggable=true].sc-1iqnrwp-0`，父 `sc-1yfn40-0` rect 0×0，`closest([data-block-id])` 为 null），三次 hover 它一直停在 y=339；★ 正解＝往**左缘沟槽 x=340、目标行中心 y** 派发 `pointermove`＋`mousemove` ⇒ 手柄 y 依次 339→246→210→282 精确跟行（x 322→330）。⇒ **V91 八步协议加第 0 步**（写进 `interactions.md V94` 第一节）。☆ 顺带解释了两件事＝第 98 批"手柄↔行归属由真实鼠标位置决定"＋"从手柄反查块 id"不可靠。\n2. ★★★ **两次拖拽的撤销回不到基线**＝基线 `U1 U2 U3 U4` → 拖 #1（U4→U1 中心）→ `U4 U1 U2 U3` → 拖 #2（U1→末块 U3 中心）→ `U4 U2 U1 U3`；随后在**焦点四判据齐**（`activeElement`＝U3 块 DIV／`hasFocus`／`rangeCount:1`／`anchorText:"U3 charlie"`）下按三次 `Ctrl+Z`＝**第 1 次零变化、第 2 次改序成 `U1 U3 U4 U2`、第 3 次零变化**；★ **reload 后仍是 `U1 U3 U4 U2`**（撤销落到了服务端态）。⇒ 口径＝**"两次拖拽＝两步逐条逆回"在本轮不成立，步数判为未定**（存在"送达但无变化"的按键＝撤销栈里有不改变块序列的条目），**不得写成官方撤销坏了**；与 §十八 `vQ` 每块去重＋`patchIndex` 可落空洞的读法咬合。\n3. ★★ **中心落点＝插到目标之前**（第 2 次独立复现，且新增"拖到**最后一块**中心仍插其前、不是插后"一例）；☆ 全程四块始终平级 ⇒ 中心落点≠嵌套（第 2 次印证）；⇒ 下批做上缘／下缘分档时**别再用行中心**，要取上 1/4／下 1/4。\n4. ★ **两条工具事实**＝`hover` 打在 StaticText 节点直接 `TypeError: this.scrollIntoView is not a function`（只能对元素级节点用）；`take_snapshot` **不收任何参数**（传 `includeSnapshot` 被 schema 拒）。\n5. ☆ **本地判定**＝本地手柄是**每块渲染**（`src/components/editor/drag-handle/DragHandle.tsx`）⇒ 不复现归属漂移；本地撤销是**严格 LIFO**（`Editor.tsx:265` ＋ 单 tr）⇒ 与本轮官方观察方向不同 ⇒ 登记**有意偏差候选**，且**队列里"`newGroupDelay` 是否写死"这条先别动**（官方连逆序都不保证，分组概念对拖拽可能不适用）。\n6. **规模**＝`gap.md` 1009 → **1015 条（最大 G1023）**；`interactions.md` **V94**；`internals.md` **§三十九**；`longtail.md` **§二十五**；`model.md`／`styles.md` 无新节（原因已写）；`features.md` 计数行；★ **`manifest.jsonl` 135 → 136**（建＋还原各 1 条）。\n7. **现场**＝`unsorted` 3 条逐 id 与基线相同／`trash` **4**（3 条无标题＋本沙盒）／`reminders` 0／`tasks(all)` 9 无 QODER 行；页内注入属性随沙盒删除消失，**无残留**；⚠ **本沙盒现在是回收站里第 4 条具名项**＝要不要按 V93 协议精确永久清除，需单独点头（历史授权不沿用）。\n\n### 第 101 批队列\n\n1. ★★★ **拖拽落点分档**＝目标行**上 1/4 与下 1/4** 两档落点是否分别产生 `before`／`after`，以及是否出现**嵌套**（协议＝V94 第 0 步起手的修订版；需新沙盒，具名授权）。\n2. ★★★ **撤销步数的正确测法**＝**每次拖完立刻单独按一次 `Ctrl+Z` 并读回**，逐对确认（本轮"连按三次"的测法已被证伪）。\n3. ★★ 其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集（盘上批，零授权）。\n4. ★★ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组（盘上批）。\n5. ★ `[data-whatintent]` 写入点定位（盘上反编译，零授权）。\n6. ★ 屏上验证 `16nf6` 壳是否真有搜索框（把 `~` 转正或作废）。\n7. ☆ 待用户点头三件＝是否精确清除回收站里那条新沙盒（不可逆）／是否重写 `feature/windows-offline-sync` 分支以抹掉 `screens.md`＋`styles/*.json` 的历史残留（该分支在另一个 worktree）／本地两条待裁项的实施。\n';
appendFileSync('_harvest/todo-actions.md', log);
console.log('manifest lines=' + lines + '; todo-actions lines=' + readFileSync('_harvest/todo-actions.md', 'utf8').split('\n').length);
