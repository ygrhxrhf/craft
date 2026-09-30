import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const clause = '第 100 批·上半〔★★★ **推翻本目录自己的一条阶梯结论＝强调色族不是"到 `-500` 为止的 10 档"，而是 18 档两段式（`-50…-500` 走 alpha、`-550…-900` 走不透明逐档加深）** ⇒ `gap.md` G971 与 `styles.md §九.2` 就地 ✎ 作废（只有 `-950` 确实不存在那条仍成立）＋ ★★★ **`[data-whatintent]` 是全官方的 hover／focus 闸门（CSS 内 349 处）⇒ 根本不用 `:focus-visible`，触屏无 hover 也是运行时判定而非 `@media`** ＋ ★★★ **DS 按钮规格全集到手＝21 个 variant ＋ 3 档尺寸（28／32／34px，radius 7／8／9）＋ 8 个状态类，全部带逐字底色**（`variantFilled` 底＝4% 前景、`variantFilledDanger`＝12% 红、`variantOutlined` **用 inset box-shadow 当边框**）＋ ★★ **禁用是两道闸**（`[data-disabled]{opacity:.4}` ＋ 所有反馈规则带 `:not(.isStatic,[data-disabled])`）＝**本地只有一道且是 50%** ＋ ★★ **强调色主题恰好 6 档**（`blue/pink/green/purple/yellow/gray`，整体重指 18 条别名＝两跳） ⇒ **G1009–G1017、`styles.md §十一`、`internals.md §三十八`、`longtail.md §二十四`；`interactions.md`／`model.md` 本段无新节**（原因＝盘上样式批，零操作动线、零实体字段）；**零浏览器调用、零写入、零沙盒**（`manifest.jsonl` 不追加＝134 行不变）〕＋ ';

const p = 'features.md';
let s = readFileSync(p, 'utf8');
const jobs = [
  ['`gap.md` **1000 条（最大 G1008）**', '`gap.md` **1009 条（最大 G1017）**'],
  ['第 1–99 批批次日志（第 99 批·尾记〔', '第 1–100 批批次日志（' + clause + '第 99 批·尾记〔'],
];
for (const [a, b] of jobs) {
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS n=' + n + ' :: ' + a.slice(0, 30));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST FAIL');
    process.exit(1);
  }
}
writeFileSync(p, s);

const log = '\n## 第 100 批·上半（2026-09-30 00:3x–00:5x 本地＝UTC 16:3x–16:5x，**盘上样式批＝零浏览器调用、零写入、零沙盒**）\n\n1. ★★★ **推翻自己上一条阶梯结论**＝`--red-*` 与 `--accent-blue-*` 各有 **18 档**（`-50…-900`，步长 50），其中 **`-50…-500` 是同一 RGB 的 alpha 阶**（6→100%）、**`-550…-900` 是不透明、逐档变暗的独立 RGB**（red `237 54 58`→`118 39 42`；accent-blue `44 103 217`→`34 60 111`，基色 `46 109 233`）⇒ ⚠ **G971 与 `styles.md §九.2` 的"`-600`～`-900` 在 accent 系里根本不存在"作废**（两处已就地 ✎，指向 G1009）；☆ 旧结论"`-950` 不存在"仍成立。⇒ **根因＝第 97 批那次只扫到 alpha 段就收手**，正是自检清单里"阶梯类必须 `new Set` 枚举手"的同型失误 ⇒ 自检再加一条＝**枚举手之后还要看"每段是不是同一种量纲"**。\n2. ★★★ **`[data-whatintent]` 是 CSS 契约级机制**＝349 处消费；焦点环＝`[data-whatintent=keyboard] .X:focus`、悬停＝`[data-whatintent]:not([data-whatintent=touch]) .X:hover` ⇒ **官方不用 `:focus-visible`**，且"触屏无 hover"是**运行时判定**不是 `@media (hover:hover)`；☆ 与第 94 批静态读到的 `Npe` 触觉（`dataset.whatintent==="touch"` → `navigator.vibrate`）是**同一属性的两个消费者** ⇒ 写入点未定位（挂在未采到）。\n3. ★★★ **DS 按钮规格全集**＝21 variant ＋ 3 size（`28/32/34px`，radius **7/8/9**，padding 只给横向，`--icon-height 18/20/22`，`--chevron-size 13/14/15`，gap `.125rem`）＋ 8 状态类（`isActive/isStatic/isHoverable/isOnlyIcon/isDropdown/hasIcon/fluid/nowrap`）；★ 关键底色逐字＝`variantFilled`＝`foreground-900 on foreground-100`（**4% 底**）、`variantFilledDanger`＝`red-500 on red-100`（**12% 底**）、`variantOutlined`＝**`box-shadow:inset 0 0 0 1px var(--foreground-200)` 当边框**（与第 97 批六位码面同族 ⇒ DS 通用做法）；★ **"只有图标"官方是状态类 `isOnlyIcon`（只改 padding），本地是四个尺寸档** ⇒ **建模轴不同，不是数量差**。\n4. ★★ **禁用两道闸**＝`[data-disabled]{opacity:.4;cursor:default}`（**40%、`cursor:default` 不是 `not-allowed`**）＋ 所有反馈规则 `:not(._isStatic_1bml7_134,[data-disabled])`；⇒ 本地 `src/components/ui/button.tsx:6` 只有 `disabled:opacity-50`（**50% 且无 static 档**）⇒ 数值差可直接改。\n5. ★★ **强调色主题＝恰好 6 档**＝`[data-accent=blue|pink|green|purple|yellow|gray]`，每档整体重指 18 条别名（两跳）⇒ 本地强调色面板应按这 6 个词建模，且别把色值直发给消费方。\n6. ★ **工具层两条坑（值得固化）**＝① CSS Module 类名**自带前导下划线**，用不带 `_` 的形态去搜 `.`＋名字会**全部 NOT FOUND**（本轮第一次就踩了，10 个选择器全空）；② 36 个类名里 **33 个有独立基础规则、3 个只在组合选择器出现** ⇒ "搜不到基础规则"≠"没样式"。\n7. ☆ **一屏四套 hash 族成员数**＝`1bml7` 36／`1j891` 21／`16nf6` **11**（含 `searchField`／`searchList` ⇒ 这套壳**疑似带搜索框的命令菜单**，标 `~` 未屏上验）／`1fgll` 3。\n8. **规模**＝`gap.md` 1000 → **1009 条（最大 G1017）**；`styles.md` **§十一**；`internals.md` **§三十八**；`longtail.md` **§二十四**；★ `interactions.md`／`model.md` **本段无新节**（原因如实写＝盘上样式批，零操作动线、零实体字段）；`features.md` 计数行；★ **`manifest.jsonl` 不追加＝134 行不变**；☆ 新落盘证据＝`_harvest/b100-ds-button-1bml7.json`（36 类名＋33 基础规则，gitignored）。\n9. ☆ **三条校验实跑**＝见下条。\n\n### 第 100 批下半队列\n\n1. ★★★ **撤销分组实验**（需新沙盒 `QODER-HARVEST-B100-UNDOGROUP`＝**写入批，要先拿具名口头授权**）。\n2. ★★ 其余 **12 份 CSS 落盘**（含 `TaskViews.css`）＋ 暗档是否换表（`[data-theme]`）＋ `@layer utilities` 工具类全集。\n3. ★★ `variant*` 的 `:active`／按下态逐条 ＋ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ 另四色（green/purple/yellow/gray）基色三元组。\n4. ★ `[data-whatintent]` 的**写入点**（在哪个 chunk、判定规则、是否防抖）＋ `isStatic` 的赋值来源。\n5. ★ 屏上验证 `16nf6` 壳是否真有搜索框（`~` 转正或作废）。\n6. ☆ 待用户点头的两件（沿袭）＝是否重写 git 历史抹掉 `963a442` 全量 id；本地两条待裁项（`permanentDeleteDocument` 接线形状／回收站"已删除"横幅）。\n';
appendFileSync('_harvest/todo-actions.md', log);
console.log('OK features patched; todo-actions lines=' + readFileSync('_harvest/todo-actions.md', 'utf8').split('\n').length);
