# Wave 1 报告 · 编辑器块级核心（采集阶段）

**日期**：2026-10-23 开批（缩进面）→ 2026-10-24 续批（块移动/副本/选区）· **性质**：**零产品代码批**（`src/`／`e2e/` 零改动）· **净新增 7 条**（G1545—G1551）· **7 条 spec 全在**

---

## 一、这一批做了什么

Wave 0 造好了仪器（同 spec 两侧各跑一遍、自动出差异表），Wave 1 的第一件事**不是写产品代码，是把仪器修到能读 Wave 1 的量**。

三条 spec 里 **1 条 `match`、2 条 `differ`**，两条 `differ` 全部落在**缩进**这一个面上（普通段落 / 列表项两条通路）。

| spec | 判定 | severity 2+ | 已声明偏差 |
| --- | --- | --- | --- |
| `editor.block.enter-empty-block` | **match** | 0 | 0 |
| `editor.block.indent-in-list` | **differ** | 3 | 2 |
| `editor.block.indent-plain-paragraph` | **differ** | 9 | 0 |
| `editor.block.move-alt-updown` | **differ** | 1 | 0 |
| `editor.block.move-top-bottom` | **differ** | 5 | 0 |
| `editor.key.duplicate-and-undo` | **differ** | 12 | 0 |
| `editor.selection.ctrl-a-ladder` | **differ** | 8 | 0 |

（跑次＝`runs/wave1-09-*`（缩进面）＋`runs/wave1-10-*`／`wave1-11-*`（续批）；台账＝`docs/craft-ref/features/interaction-matrix.md`）

---

## 二、★ 仪器补强四处（都在 `interaction-lab/`，`src/` 零改动）

### 1、缩进探针改「标记 → 属主块」归位

官方缩进的载体是一个与块行**同层并列**的标记元素：

```
div._flexRow_1oz2o_1
├── div._indent_1oz2o_33   style="--indent-w: 28px"     ← 标记（与块行同层，不是祖先）
└── span#blockrowwrap-<id>  → div#blockwrap-<id>        ← 块行
```

旧探针沿块根的**祖先链**找 `--indent-w` ⇒ **恒读 0**（这就是上一轮读 0 的根因）。

改法：先收全树所有非零标记，再为每个标记向上找**只包含一个块根**的最近祖先 ⇒ 那个块根即属主。
无论标记是祖先、同层兄弟还是后代都能归位。

本地侧无该变量（纯核 `src/lib/editor/block-indent.ts` **零消费者**）⇒ 归一读**列表嵌套档**（`ul`/`ol` 层数，最外层不计）。两侧都归一到"级"后才可比。

### 2、块名册改列表摊平

| | 官方 | 本地 |
| --- | --- | --- |
| 模型 | **扁平块名册**（每个列表项各是一条 `blockrowwrap-*`） | **树**（一个 `<ul>` 包住所有项、`listItem` 嵌套） |
| 旧口径读到的 | `["L1","L2"]` | `["L1 L2"]`（整个列表只算**一块**） |

⇒ 命中的根若是 `UL`/`OL`，展开到每个 `li` 的首个文本块并递归嵌套列表。

### 3、新增焦点面 `focusInEditor`

键"没反应"与"键被浏览器接管"在块名册上**长得一样**（DOM 都不变）。实测本地 `Tab` 把 `activeElement` 带出编辑器：

```
.ProseMirror → nextjs-portal → body → button
```

⇒ `captureAll` 常带一个焦点面（宿主选择器由 spec 的 `editorBody` 传入），differ 逐帧比。

### 4、两处**呈现机制**差异抹平（声明成 chrome，不是行为）

| | 官方 | 本地 | 处置 |
| --- | --- | --- | --- |
| 项目符号 | **文本节点** `•`（进 `innerText`、占块内偏移） | CSS `list-style: disc`（不进、不占） | 块名册剥行首圆点；名册丢纯圆点条目；只剩"空列表项光标偏移差 1"在 `deviations` 里声明 |
| 缩进载体 | `--indent-w` 变量 | 列表嵌套档 | 归一到"级" |

实测两侧屏上**都有圆点**（`probe-bullet`：官方 `childTexts ["•","L1"]` / 本地 `listStyleType: "disc"`、`listPosition: "outside"`）⇒ 是 chrome 不是内容。

---

## 三、★ 推翻一条旧判

`specs/editor.block.indent-in-list.mjs` 文件头原先写着：

> `Tab` 在**普通段落**上**毫无反应**（块 id 不变、无 `--indent-w`、无 DOM 变化）

**那是探针缺陷造成的假象。** 修好探针后实测（`probe-plain-tab2`，逐级取证）：

| 动作 | 官方块级数 | `--indent-w` |
| --- | --- | --- |
| 起点 | 0 | （无） |
| `Tab` | 1 | 28px |
| `Tab` | 2 | 56px |
| `Tab` | 3 | 84px |
| `Shift-Tab` | 2 | 56px |

**官方普通段落照样缩进**，光标全程留在编辑器内。⇒ 教训：**"观测不到"与"不存在"必须分开** —— 探针读 0 时要先自证它能读到已知存在的样本。

---

## 四、★ 三枚产品级差异（照实登记，不掩盖）

### G1545 · 普通段落上 `Tab` 不缩进且丢焦点（缺失）

- **官方**：`Tab`×2 ⇒ `indentLevel` 1→2、`Shift-Tab` ⇒ 1；`focusInEditor` 3/3 `true`。
- **本地**：三级**全 0**、`focusInEditor` **3/3 `false`**（`activeElement` → `nextjs-portal`）。
- **根因**：`src/lib/editor/block-indent.ts` 是**纯核零消费者**（全仓唯一引用是自家单测）；`--indent-w` 在 `src/` 里只出现在该文件与一条测试注释。

### G1546 · 列表项只能进一级、第二次 `Tab` 丢焦点（行为不同）

- **官方**：第 6 步（第二次 `Tab`）`indentLevels [0,2]` / `indentLevel 2` / `focusInEditor true`。
- **本地**：`[0,1]` / `1` / **`false`**。
- **根因**：`@tiptap/extension-list` 的 `ListItem` 自带 `Tab: () => sinkListItem()`（`node_modules/@tiptap/extension-list/src/item/list-item.ts` 末尾）。本 spec 场景里 L2 的父项 L1 已是它的上一级 ⇒ 无处再 sink ⇒ `sinkListItem` 返回 `false` ⇒ 键**不被消费**，落回浏览器默认的 Tab 焦点移动。

### G1547 · 缩进载体 `--indent-w` 从未落地（缺失）

- **实测**：本地列表缩进前后 `indentVars: []`（正文块上从不出现该变量）。
- **与 G1546 分开记的理由**：前者是"**键没被消费**"、本条是"**载体不存在**" —— 两者都真，修一个不自动修另一个。

---

## 五、门禁与收尾

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **exit 0、0 行输出** |
| `npx vitest run` | **270 文件／2189 条全绿**（含 `gap.md` 第 9 行自述数闸） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 自述数 | 自述 **1543／G1551** ＝ 现跑 **1543／G1551**（逐字相同） |
| 对照实验 | `exp-differ.mjs`：三种判定都出得来；`exp-new-specs.mjs`：本批四条**逐条**红—绿—红（见 §五之二.6） |
| 临时文档 | 两侧**全部软删**：本地侧栏残留 `QODER` 行 **0**；官方浏览卡 **12 张**、其中 ILAB **0** |

`runs/` 仍被 `.gitignore:100` 命中（`git check-ignore -v` 自证）。

---

## 五之二、★ 续批（2026-10-24）：块移动 / 创建副本 / 选区

缩进面收口后接着采三面。四条 spec **全 `differ`**，逐条证据见 `interactions.md` **V168**。

### 1、★★ 定案一条**互相矛盾的静态记录**

官方面板「整理」段印 `移动所选区块：向上 Alt↑`，而 `keyboard.md` §分派机制 又记 `⌥↑`（`y2(Ts)`）带
`{skipDirection:"prev", shouldSkipFromEdgeOfBlock:!0}`（跨块移光标）。**同一个物理键只能落到一个 handler**，实测定案：

| 动作（三块 AAA/BBB/CCC，光标在中间块 BBB 块首） | 三条 blockId | `selection.anchorBlock` |
| --- | --- | --- |
| 起点 | `F30FCA0E`／`38C838B0`／`6DB0DDF7` | `38C838B0`（BBB） |
| `Alt-↑` | **一字未变** | **`F30FCA0E`（AAA）** ⇒ 光标跳上一块 |

⇒ 折叠光标上**不动块序、动光标**（"移动所选区块"要先有块选区才生效）。
本地同序列换块序（`BBB/AAA/CCC`）⇒ **G1548**／**G1549**。

### 2、`⌘A` 是**两档阶梯**

官方第一档选**当前块文本**，第二档把焦点交给 `body`、进入**块选区态**（`cls` 含 `block-select`，
`selection.present=false`）。本地只有一档（整篇文本选区），**无块选区态** ⇒ **G1550**。

### 3、`⌘D`：**块序与撤销/重做粒度两侧一致**

`A/B/C → A/B/C/C → A/B/C → A/B/C/C` 逐帧相同 ⇒ "创建副本"是一步可逆操作
（`interactions.md` 开篇自陈"可逆性尚未验证"的第一条实测回答）。差异只在"落到哪种选区" ⇒ **G1551**。

### 4、★ 修掉一枚会让**每一条官方 spec** 都采不到的仪器缺陷

官方 `page.goto({waitUntil:'load'})` **恒超时**（编辑器挂长连接，`readyState` 停在 `interactive`）
⇒ 旧写法抛错 ⇒ differ 判 `uncomparable`。改法＝**只吞"导航已提交的超时"**（`lab.mjs` `navigate` 分支）。

### 5、★ 本批自我更正两处

- 一度把 Ctrl-D 的选区态差异写成 `deviations` ⇒ **当场改回**：`deviations` 只留给"同一件事的两种画法"，
  而两侧落到的是**两个不同状态**（会改变下一个键的语义）⇒ 是产品级差异。
- 自己 spec 里两处**只有官方侧假红**的断言（step 8 的 `selection:collapsed`，官方那步 `selection.present=false`）
  从 selfCheck 撤下 ⇒ selfCheck 只放两侧共有的量。

★ 首跑 `vitest` 被 `ledger-arity-gate` 抓住 **1 处表形错位**（G1550 行里的 grep 备选符含**字面竖线** ⇒ 多切一栏）
⇒ 改成 `block-select / selection-box` 复绿。**教训：Markdown 表里写 grep 备选符要避开裸 `|`。**

### 6、对照实验（任务书强制：每条 spec 至少一次「摘掉实现 ⇒ 断言变红 ⇒ 逐字还原 ⇒ 复绿」）

本 lab 的「实现」在两侧产品里，spec 的判定就是 differ 本身；因此等价做法＝把**该条承重的判别量**中和成两侧一致
⇒ 该行必须消失；再从**原始 JSON 逐字重算** ⇒ 必须逐字回到原判定。三段式，红—绿—红。

脚本 `exp-new-specs.mjs`（临时目录），日志 `exp-new-specs.log`。

| spec | 承重量 | [1] 基线 | [2] 中和后 | [3] 逐字还原 | 还原逐字相同 |
| --- | --- | --- | --- | --- | --- |
| `editor.block.move-alt-updown` | `blocks` 名册 | differ sev2+=**1** `[blocks]` | **match** sev2+=0 `[]` | differ sev2+=1 `[blocks]` | **true** |
| `editor.block.move-top-bottom` | `blocks` 名册 | differ sev2+=**5** | differ sev2+=**4**（`blocks` 消失，余 4 条选区偏移） | differ sev2+=5 | **true** |
| `editor.key.duplicate-and-undo` | `focusInEditor` | differ sev2+=**12** | differ sev2+=**9**（3 条 `focusInEditor` 消失） | differ sev2+=12 | **true** |
| `editor.selection.ctrl-a-ladder` | `focusInEditor`＋`selection` 三元组 | differ sev2+=**8** | differ sev2+=**6**（2 条 `focusInEditor` 消失） | differ sev2+=8 | **true** |

四条**全部**满足：中和承重量 ⇒ 该行必消失；逐字还原 ⇒ 逐字复红。
★ 另注：`move-top-bottom`／`duplicate-and-undo`／`ctrl-a-ladder` 三条中和后**仍有残留行**，这正说明每条 spec 的判定
不止一根支柱（例：`⌘D` 那条既有「落到哪种选区」也有「选区偏移量」），**单点中和不足以整条转绿** —— 已如实记下，不夸成"整条可复现"。

---

## 六、仍挂（如实挂账，不写成"已排期"）

- ⚠ **本轮只采不修**：G1545／G1546／G1547／G1548／G1549／G1550／G1551 七枚**已登记未实现**。
- ⚠ Wave 1 仍未采：`⇧⏎` RENAME（探针的**起手没重置干净**：`probe-w1j` 的 S2 段落在 S1 留下的块选区态上跑，快照只剩 `BBB/CCC`、没有可比基线 ⇒ **该探针作废**，语义未定案 ⇒ 不写 spec 不猜）、`⌘←/→` NAVIGATE_INTO/OUT、`⌘⇧↑↓` 选至顶/底、框选、块间转换保真。 ✎ **后记（续批四）**：其中前两族**本批已采**（G1553／G1554，见本文件「八、」）；✎ **后记（续批五）**：**框选也已采**（G1555，见本文件「九、」）。★ 已采并登记：`⌥↑↓`／`⌥↖↘` 块移动（G1548/G1549）、`⌘A`（G1550）、`⌘D`＋`⌘Z`／`⌘⇧Z` 撤销粒度（G1551）。
- ⚠ `observe: ['a11y','animation','db']` 三档**仍未实现**（Wave 0 就挂着）。
- ⚠ 本批曾把 `observe.mjs` 写坏一次（PowerShell 转义把 `\s` 吃成 `s`，且补丁脚本的 `\n` 两字符搜索吃掉了 `NOISE_RULES` 后半段）——已逐字重写并 `node --check` 通过；坏版本另存 `C:/Users/zhanh/ego/craft-ilab-20261023/observe.broken.mjs` 备查。**教训：`.mjs` 补丁不要用"搜索含反斜杠的字符串再替换"，改写整文件。**

## 七、★ 续批三（2026-10-24）：`⇧⏎` —— 一条**推翻既有记录**的定案

净新增 **1 条**（G1552）· 零产品代码批。逐字证据见 `interactions.md` **V169**。

### 1、★★★ 官方 `Shift+Enter` 插入行内换行（旧记录说"确认无效"）

四次独立运行一致（含 V50 §4 的**原始前置**：两块、光标在首块行尾）：

| 观测 | 官方 | 本地 |
| --- | --- | --- |
| 块内文本 | `AAA` → `AAA`＋换行＋`\uFEFF`＋换行 | `AAA`（**一字未变**） |
| 块内 `<br>` | **0 → 1** | 0 → 0 |
| 键是否被消费 | **否**（`Shift`、`Enter` 都 `defaultPrevented=false`） | **是** |
| 刷新后 | 换行**仍在** | 无 |
| `domBytes` | 114,817 → 115,048（**+231 B**） | 不变 |

三块语境同样：中间块行尾 ⇒ 0→1；末块行尾 ⇒ 1→2。

### 2、由此推翻三处**互相印证**的旧记录

`keyboard.md:286`（"逐字节相同、`<br>` 恒 0 ⇒ 确认无效"）、`interactions.md:506`（V50 §4"被彻底吞掉"）、
`gap.md` **G615**（"官方零变化"＋"本地多做"）。★ 连带后果：本地 `hard-break.ts:4-16` 与 `Editor.tsx:313-315` 的注释
**逐字照抄了被推翻的读数**，那个取舍的前提是错的（本批只登记，Wave 1 实现另起批）。

### 3、★ 本轮修掉 **5 枚仪器缺陷**（都真踩过、都影响判定）

| # | 缺陷 | 后果 |
| --- | --- | --- |
| 1 | `lab.mjs` 的 `seedTempDoc` 的 `goto` 没修（`navigate` 修过、这处漏了） | 官方侧偶发超时 ⇒ `errors=1` ⇒ **新记录覆盖掉上一份好记录**（实测踩到） |
| 2 | `soft-delete.mjs` 两处 `goto` 同一根因 | 软删失败、临时文档残留（实测残留 1 张） |
| 3 | `findDangerButton` 只按 class 过滤 | 官方把**菜单项**也画成 `variantDanger` ⇒ `hits[0]` 取到菜单项 ⇒ 点了个寂寞（5 张里失败 2 张） |
| 4 | 确认框**异步**挂载，旧版固定等 1300ms | 偶发还没出现就判失败 |
| 5 | 一度用"菜单项坐标稳定"当判据 | 命中**陈旧菜单**（定位到 x=86，与卡片相距 300+ px）⇒ 3 张全失败 |

★ 最终写法：固定等 1500ms ＋ 要求菜单项**就在卡片附近**（`|dx| ≤ 500`）⇒ 3 张全部 `gone=true`。

### 4、探针重写（上一手 probe-w1j 作废的根因）

根因不是"没重置"：**官方 `Escape` 会把焦点交给 `body` 并进入块选区态**（`bodyCls` 含 `block-select`、`inEditor=false`），
此后 `Ctrl+A` 选的是"块"不是文本；且官方 `Ctrl+A` 是**两档阶梯**，一次清不干净。
⇒ 新探针改为**逐块清 ＋ 空文档后恢复焦点**，并把每次重置的读数写进日志。

### 5、spec 与对照实验

`editor.key.shift-enter-hard-break`（`runs/wave1-12-*`，两侧 0 error）判 **differ**，sev2+ **3**。
为它给观测库加了**加性**的 `breaks` 档（逐块 `<br>` 计数与不压空白的行数）——
**不改 `blocks` 口径**，故既有 10 条记录不受影响（`breaks` 只在两侧都采到时参与判定）。

对照实验（承重量＝`breaks`）：基线 differ sev2+ 3 ⇒ 中和承重量 ⇒ `breaks` 行**必消失**（sev2+ 2）⇒ 逐字还原 ⇒ **复红**（sev2+ 3）。
★ 顺带修掉一处 diff 缺陷：`breaks` 判一度写在 `blocks` 的 `if (不等)` 里 ⇒ 块名册两侧相同时**永不求值**。

### 6、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1544／G1552** ＝ 现跑 **1544／G1552** |
| 临时文档 | 官方浏览屏 **14 张、ILAB 0**（仅剩 2 张 **2 周前**的 `QODER-HARVEST-*`，非本批）· 本地 **0** 行 QODER |
| 矩阵 | 11 条 spec（既有 10 条判定未变）· selfCheck **两侧全 PASS**（10 条 FAIL 全是既有本地侧真 FAIL） |

## 八、★ 续批四（2026-10-24）：两条**跨块/跨层导航族** ＋ 仪器补一档 `keys`

净新增 **2 条**（G1553／G1554）· 零产品代码批。逐字证据见 `interactions.md` **V170**。

### 1、★★ `⌘←`/`⌘→`（`NAVIGATE_INTO`/`NAVIGATE_OUT`）＝词级导航，且官方**把键消费掉**

`runs/wave1-18-*`（两侧 14 步 0 error、selfCheck 两侧全 7 PASS）。单块 `AAA BBB CCC`、光标在行尾 11：

| 步 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl+←` ×3 | `11→8→4→0` | **逐字相同** |
| `Ctrl+→` #1 | `0→3`（**词尾**） | `0→4`（**词首**） |
| `Ctrl+→` #2 | `3→7` | `4→8` |
| 跨块 `Ctrl+→` | **不动**（仍在块 1 偏移 11） | **跳进块 2 偏移 0** |
| 跨块 `Ctrl+←` | `11→8`（仍在块 1） | 停在 11 |
| 键归属（7 步） | **全部 consumed** | **全部未消费** |

### 2、★★ `⌘⇧↖`/`⌘⇧↘`（`SELECT_TO_TOP`/`SELECT_TO_BOTTOM`）＝**块选区**入口

`runs/wave1-13-*`（两侧 12 步 0 error）。官方 `Ctrl+Shift+Home`/`End` ⇒ **进块选区态**
（`selection.present=false`、焦点交 `body`、`cls` 含 `block-select`、`inEditor=false`）；
本地 ⇒ **文本选区**（仍在编辑器内）。MAC 变体 `Ctrl+Shift+↑↓`：官方**键被消费但选区零变化**、本地**生效**
⇒ 与 `keyboard.md:486` 装配器 `Ll ? [COMMON, MAC] : [COMMON]` 的静态预测**吻合**。

### 3、本地两族**零实现**（`git grep` 自证）

- `NAVIGATE`：无命中；`src/lib/editor/keymap.ts:86-87` 只有两个字形映射。
- `SELECT_TO_*`：只命中 `src/lib/editor/keymap.test.ts:114` 的一行**注释** ⇒ 四条都没注册。

### 4、★ 仪器补一档：`keys`（按键消费探针）

**为什么必须**：`Ctrl+←` 两侧都让光标动 3 字符，但**官方把键消费掉、本地没有** ⇒ 只比选区偏移会把"键归谁"读成一致。
动三处：`observe.mjs`（`installKeyProbe()` cap/bub 双监听 + `readKeys()`）、`lab.mjs`（**`runSetup` 之后**装 + `observe` 按需带上）、
`diff.mjs`（⑤c 段、`facet:'keys'`、sev2）。**加性自证**：加档后重跑 `node diff.mjs`，既有 12 条 spec 判定与 sev2+ 数**逐字未变**。

### 5、★ 本批真踩的仪器缺陷（4 枚，都已修）

| # | 缺陷 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | `captureAll` 里调同模块 `readKeys()` | `page.evaluate` 在页面内跑、读不到兄弟函数 ⇒ `wave1-15` 两侧 **steps=0/errors=1** | 逻辑**内联**成 IIFE |
| 2 | 探针装在 `runSetup` **之前** | setup 的整页导航清掉监听器 ⇒ `wave1-16` 的 `keys` 名册**恒空** | 移到 `runSetup` **之后** |
| 3 | spec：`Enter` 前没先 `End` | 分块点两侧不同（官方 7 / 本地 8，是词边界差异的**下游**）⇒ 块名册被**自造差异**污染 | `Enter` 前插 `End` |
| 4 | `run` 卡住时**无磁盘痕迹** | `console.log` 不回传 ⇒ `wave1-17`/`wave1-18` 两次挂起**查不动** | `lab.mjs` 的 `log()` 同时追加写 `progress.log`（定位后确认是**被杀的浏览器会话**，非代码缺陷） |

### 6、★ 一处诚实边界

`probe-w1s` 的 `caretIn(i)` 落点**恒为 `abIdx=2`** ⇒ `Alt+Shift+↑` vs `↓` 的**位置对照未达成**；
但三位置读数一致 ⇒ 「`↑` 恒零变化 / `↓` 恒进块选区态」的**不对称结论仍成立**（已在 G1554 内标注）。

### 7、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1546／G1554** ＝ 现跑 **1546／G1554** |
| 矩阵 | 13 条 spec（既有 12 条判定未变）· `ctrl-arrow-word-nav` **43 行／15 sev2+**（新增 7 条 `keys` 行） |
| 临时文档 | 官方浏览屏**仅剩 2 张 2 周前的 `QODER-HARVEST-*`**（非本批）· 本地 **0** 行 QODER |

## 九、★ 续批五（2026-10-24）：浏览屏**框选**（连续 6 批欠账上屏验）

净新增 **1 条**（G1555）· 零产品代码批。逐字证据见 `interactions.md` **V171**。

### 1、★★★ 官方框选：矩形 ＋ 选中集（与盘上逐字算法吻合）

`runs/wave1-19-*`（两侧 4 步 0 error、selfCheck 两侧 PASS）。起手＝内容区左侧空白 (295,500)，拖到 (795,200)：

| 观测 | 官方 | 本地 |
| --- | --- | --- |
| 按住期间矩形 | **有** `_rubberBand_fdch5_1`（`fixed`／`z:10`／`pe:none`／`rgba(46,109,233,0.12)` 底／`solid 0.8px rgb(46,109,233)` 边／`radius:4px`／`x295 y200 w500 h300`） | **无** |
| `aria-checked=true` | **0 → 6** | **0 → 0** |
| 松手后 | 矩形**卸载**、选中**保留**（6） | 0 |

⇒ 与 **G1135 ⑥** 记的 CSS **逐字吻合**（`position:fixed`／`z-index:10`／`pointer-events:none`／`accent-100` 底／`accent-500` 边／`radius-sm`）。

### 2、★★ 本地：三档全零（整条缺失，不是"算法不同"）

`[data-item-id]` 0、`role=checkbox` 0、`[class*=rubber]` 0 ⇒ differ **22 行／14 sev2+**。
★ 本地**回收站**有「选择」模式（68 枚 `role=checkbox`、「已选 N 项」、「全选」）但**是按钮触发的勾选模式，不是拖拽框选**
（同屏 `[class*="rubber"]` 仍 0）⇒ 两条通路**不可互相顶替**。缺 G1136 的两层：三型几何模型 ＋ 按型分派命中器。

### 3、★ G1138 的判据门槛用上了（不踩老坑）

选中一律读 **`role=checkbox` 的 `aria-checked`**，不读 `_isActive_`：静止态 **14/14** 张卡都带该类
⇒ 用它会把"全都没选"读成"全都选中"。（首版探针 `probe-w1v` 正是踩这个坑，读数全 `selCount=14` ⇒ 作废重写。）

### 4、★ 本批新增两处**加性**仪器

| 加性件 | 为什么必须 | 落点 |
| --- | --- | --- |
| 观测档 `marquee` | 判据是「矩形 ＋ 选中集」，现成的 `state:`／`selection:` 都读不到矩形 | `observe.mjs` ＋ `lab.mjs` ＋ `diff.mjs`（⑤d） |
| step `dragHold`／`dragEnd` | ★ **矩形只在按住期间存在**（松手即卸载）⇒ 一条原子 `drag` 只能采到"松手后"，矩形**恒 null**（首跑实测） | `lab.mjs` 的 `runStep` |

**加性自证**：加这两处后重跑 `node diff.mjs`，既有 **13 条 spec 判定与 sev2+ 数逐字未变**（本条是新增第 14 条）。

### 5、★ 一处诚实边界

本地侧起手拖拽时**该屏文档为 0 枚**（本批临时文档已全部软删）⇒ 严格说是"**没有对象可划过**"而非"有对象但框选不生效"；
但同一动作在本地**三档全零**（连矩形层都没有）且 `git grep "rubber\|marquee" -- src` 无命中 ⇒ 「本地无框选」**不依赖文档数**。已在 G1555 内标注。

### 6、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1547／G1555** ＝ 现跑 **1547／G1555** |
| 矩阵 | 14 条 spec（既有 13 条判定未变）· `browse.box-select.drag-marquee` **22 行／14 sev2+** |
| 临时文档 | 本批为验"有对象"建过 3 个临时文档，**已全部软删**（`REMAINING []` 自证） |

## 十、★ 续批六（2026-10-24）：块间转换保真（**样式档**）—— 一条"两侧都真换档"的差异

净新增 **1 条**（G1556）· 零产品代码批。逐字证据见 `interactions.md` **V172**。

### 1、★★ 这一族不是"本地缺失"，是**口径 + 块数**两面不同

`runs/wave1-22-*`（两侧 6 步 0 error）。单块 `AAA`、光标在块内，依次 `Ctrl-Shift-1` → `-3` → `-2` → `-5`：

| step | 官方 leaf | 本地 leaf | 官方块名册 | 本地块名册 |
| --- | --- | --- | --- | --- |
| baseline | 15px/400 | 16px/400 | `["span:"]` | `["p:"]` |
| typeKeys AAA | 15px/400 | 16px/400 | `["span:AAA"]` | `["p:AAA"]` |
| TITLE | **23px/700** | **30px/700** | `["span:AAA"]` | `["h1:AAA","p:"]` |
| HEADING | **18px/600** | **20px/600** | `["span:AAA"]` | `["h3:AAA","p:"]` |
| SUBTITLE | **20px/700** | **24px/600** | `["span:AAA"]` | `["h2:AAA","p:"]` |
| BODY（回） | **15px/400** | **16px/400** | `["span:AAA"]` | `["p:AAA","p:"]` |

官方六步**块 id 一字未变**、文本恒 `AAA`、`found` 恒 1 ⇒ 「同一个块就地换档」两侧**都成立**；
差异＝① **口径**（本地标题更大、副标题更轻，来源 `src/app/globals.css:497-519`）② ★★ **本地换档后多一枚空 `<p>`**。

### 2、★ 根因落在**已有**的 G1485 豁免边界上（不另立新账）

本地 `craft-keymap.ts:27-31` 用 `setHeading`／`setParagraph` **就地改节点**，而 `StarterKit` 的 `TrailingNode`
"末块不是段落就补一枚空段"，`Editor.tsx:327` 的 `notAfter` **只豁免三族列表** ⇒ 末块换成标题档**必然**补一枚。
⇒ 这是 **G1485** 那条豁免的**已知边界**，同族现象、合并记在 G1556 里说明。

### 3、★ 一条会被误读的读数：官方的 `countΔ:AAA` 1→2 **不是重复块**

自造探针 `probe-w1aj`／`probe-w1ak` 定位到第二枚命中在**编辑器之外**：
`A._row_v0ra3_1 > SPAN._label_v0ra3_131 fade-truncate`，坐标 **x=16 y=216**＝**侧栏大纲行**
（块换成标题档后大纲里出现该块；换回正文档即消失，与 step 5 计数回 1 吻合）⇒ 台账已写清「不是重复块」。

### 4、★ 本批踩到的三处仪器缺陷（都已落地修法）

| # | 缺陷 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | 探**块行外壳** | 官方外壳恒 16px/400（样式在**文本叶**上）⇒ 读成"没反应" | 改探文本叶（官方 `[id^="blockrowwrap-"]:not([data-testid]) [data-slate-node="text"]`／本地 `.ProseMirror > p,> h1,> h2,> h3`） |
| 2 | 官方块 id 前缀**两种** | 探针用 `blockrowwrap-` 命中 0（实际 `blockwrap-`） | `captureBlocks` 两种都认（`observe.mjs:228-231`） |
| 3 | 自造探针**落光标点击没生效** | 文本没进正文（读数全空） | 必须复用 lab 的 `placeCaretTrailing`（`mode=title-below 528,204`） |

★ 工具面另两条：脚本里**全角引号会炸 `.mjs` 语法**（一律直角引号或纯 ASCII）；`run` 卡住时**无磁盘痕迹** ⇒
`lab.mjs` 的 `log()` 现同时追加写 `progress.log`（加性；根因＝**被杀的浏览器会话**，非代码缺陷）。

### 5、★ 一处诚实边界

本 spec **未采 `keys` 档** ⇒ 这三个组合键**是否被消费**本批**未测**，不写成"与官方一致"。

### 6、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1548／G1556** ＝ 现跑 **1548／G1556** |
| 矩阵 | 15 条 spec（既有 14 条判定未变）· `editor.key.turn-into-style` **19 行／7 sev2+／0 declared** |
| 临时文档 | 两侧各 1 个临时文档**已全部软删**（本地 `REMAINING []`；官方 `softDelete ok=true`） |

## 十一、★ 续批七（2026-10-24）：**Markdown 输入规则**（块类型档）—— 五档里四档一致、第五档**语义相反**

净新增 **1 条**（G1557）· 零产品代码批。逐字证据见 `interactions.md` **V173**。

### 1、★★★ 屏上结果：`#### ` 是**语义相反**那一档

`runs/wave1-23-*`（两侧 19 步 0 error、selfCheck 两侧 **5/5 PASS**）：

| 输入 | 官方 `kinds` | 本地 `kinds` | 一致？ |
| --- | --- | --- | --- |
| `# ` | `title`（leaf → 23px/700） | `title`（`h1`） | ✅ |
| `#### ` | **`strong`**（强调档，leaf 16px/700） | **`heading4`**（`h4:BBB`） | ❌ **语义相反** |
| `- ` | `bullet` | `bullet` | ✅ |
| `1. ` | `numbered`（块文本 `1. EEE`） | `numbered`（块文本 `EEE`） | ✅ |
| `[ ] ` | `task` | `task` | ✅ |

⇒ 把静态账 **G866**（盘上批："官方 18 条 vs 本地 6 条 ⇒ 四条缺失"）**收窄**为：
真差异＝**① `#### ` 语义相反**（官方强调 / 本地四级标题）＋ **② 本地每档多一枚空块** ＋ 序号画法。

### 2、★★ 本地"每档多一枚空块"＝G1485 豁免的**已知边界**

`blocks` 名册 **18/18 步**单侧多一项（如 step 2 官方 `["AAA"]` ↔ 本地 `["AAA",""]`）。
根因与 G1556 **同源**：`setHeading`／`setParagraph` 就地改节点，`TrailingNode` 见末块非段落就补一枚，
而 `Editor.tsx:327` 的 `notAfter` **只豁免三族列表**。

### 3、★ 新增一档**加性**观测面 `kinds`

官方块行 tag **恒为 `span`**（Slate 扁平渲染）⇒ 只看 tag 会把官方**所有** markdown 转换读成"没反应"
（`probe-w1an`：`# ` 之后官方仍 `span`，只有字号变了）。`kinds` 把两侧归一到同一枚举
（官方取**后代锚点＋计算样式**、本地取**标签/祖先**）；☆ 与既有 `indent` 档同一先例。

**加性自证**：既有 **15 条 spec 的判定与 sev2+ 数逐字未变**（本条是新增第 16 条）。

### 4、★ 本批踩到的三处仪器缺陷（都已落地修法）

| # | 缺陷 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | 列表判据要求"记号后有空格" | ★ **空列表项记号后没有空格**（官方 innerText 就是 `•`／`1.`）⇒ 空列表项一律落 `para`（首跑官方 step 9 读成 `para`） | 正则改 `(\\s\|$)` |
| 2 | 复位用"两下 `Ctrl+A` ＋ `Delete`" | 把文档清到 **0 块**，此后打字**一律不触发**规则（连 `# ` 都不换档）⇒ 整轮作废 | 改用 `Enter` → `Ctrl+Shift+Backquote`（**NO_LIST**） |
| 3 | 任务档排在列表档之后 | 列表/任务块**延续** ⇒ 后一档落在列表项里 | **任务档挪到最后**，每档之间显式复位 |

### 5、★ 一处**明确不采**

官方**折叠块**（`+ `）在 DOM 上无独有信号（`probe-w1aq`：`+ ` 组的 `data-*` 名册与普通段落**逐字相同**）
⇒ 不采 `+ `，**不把"读不出"写成"一致"**。

### 6、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1549／G1557** ＝ 现跑 **1549／G1557** |
| 矩阵 | 16 条 spec（既有 15 条判定未变）· `editor.md-rules.block-kind` **95 行／36 sev2+／21 declared** |
| 临时文档 | ★ 首轮官方侧软删**失败**（`列表里找不到卡片`）⇒ 当场补跑清理；`REMAINING` 只剩 2 张 2 周前 `QODER-HARVEST-*`，本地 `REMAINING []` |

## 十二、★ 续批八（2026-10-24）：**Markdown 行内标记** —— 六档语义全同、差在“**何时**触发”

净新增 **1 条**（G1558）· 零产品代码批。逐字证据见 `interactions.md` **V174**。

### 1、★★★ 屏上结果：六档行内标记**逐对全同**

`runs/wave1-24-*`（两侧 23 步 0 error、selfCheck 两侧 **4/4 PASS**）：

| 输入（各跟一空格） | 官方 `inline.marks` | 本地 `inline.marks` | 一致？ |
| --- | --- | --- | --- |
| `**X** ` | `["bold"]` | `["bold"]` | ✅ |
| `*Y* ` | `["italic"]` | `["italic"]` | ✅ |
| `~~Z~~ ` | `["strike"]` | `["strike"]` | ✅ |
| `==W== ` | `["highlight"]` | `["highlight"]` | ✅ |
| `` `C` `` ＋空格 | `["code"]` | `["code"]` | ✅ |
| `[T](https://a.com) ` | `["link"]` | `["link"]` | ✅ |

### 2、★★ 真差异＝**触发时点**

同一条记号在**收尾记号那一步**：本地已建好标记（`blocks` 里 `**X**` 已变 `X`、
`marks=["bold"]`）而官方还是原样（`**X**`、`marks=[]`）；到**紧接着的空格**那一步两侧才赶齐。
⇒ 与 **G1557**（块类型档）**同一口径**：官方的 markdown 规则全部是“**空格触发**”，
本地的 `InputRule` 是“**收尾字符触发**”（`markdown-shortcuts.ts:13/34/55` 均以 `$` 收尾）。

### 3、★ 新增一档**加性**观测面 `inline`

行内标记**不改块名册、不改具名文本计数** ⇒ 旧各档都读不出“到底转换了没有”。
`inline` 把两侧归一到**同一枚举 `marks`**（官方取 leaf 计算样式/属性、本地取标签）；
**加性自证**：既有 **16 条 spec 的判定与 sev2+ 数逐字未变**。

### 4、★★ 两处**仪器缺陷**（都已修，如实登记）

| # | 缺陷 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | `inline` 档第一版**只数语义标签** | 官方是 Slate 扁平渲染、无此类标签 ⇒ 官方六档**全读成“没反应”** | 两侧各按载体读、归一到 `marks`；代码 leaf 不再计高亮 |
| 2 | spec **漏了触发用的空格** | 官方未触发 ⇒ 差异被**夸大** | 每条记号后补一个 `Space` |

☆ **修前后**：`90 行／62 sev2+` → `59 行／16 sev2+`，且全部 sev2+ **可归结为一个根因**（触发时点）。

### 5、门禁

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **0 行输出**（0 错） |
| `npx vitest run` | **270 文件／2189 条全绿** |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 第 9 行自述数 | 自述 **1550／G1558** ＝ 现跑 **1550／G1558** |
| 矩阵 | 17 条 spec（既有 16 条判定未变）· `editor.md-rules.inline-mark` **59 行／16 sev2+／0 declared** |
| 临时文档 | 两侧均 `softDeleteTempDoc ok=true`；残留另补清两张（本批探针所出：官方 `QODER-ILAB-md-inline2`、本地 `QODER-ILAB-md-inlineL1`）⇒ 末次核对官方 `REMAINING` 只剩 2 张 2 周前 `QODER-HARVEST-*`、本地 `REMAINING []` |

## 十三、☆ 续批九（2026-10-24）：**Markdown 分隔线五档** —— 本轮**未能定案**（如实挂账，不写成一致）

净新增 **0 条**（未定案不立账）· 零产品代码批。本节只记**为何本轮采不下来**，避免下一手重跑。

### 1、★ 已经确认的一半：五档在两侧**都真生效**

- 官方（`probe-w1ay`／`w1bh2`）：`..-`／`.--`／`---`／`=--`／`===` 五档逐字输入，**当前块都变成一条空文本的分隔行**（行高 28px），且 `rows` 逐档递增（本轮复现：3→4→5→6→7）。
- 本地：`src/components/editor/extensions/divider.tsx:83-91` 的 `nodeInputRule` 用 `DIVIDER_PATTERN`（`src/lib/editor/divider-styles.ts:70`）
  同样收这五档，并把档位落在 `data-style`。

### 2、★★ 卡点：官方侧**档位信号找不到**（本找法已穷举）

| 候选判据 | 实测结果 |
| --- | --- |
| 块行的 `data-*` 属性 | 五档**逐字相同**（`probe-w1bi2`：无任何独有 `data-`） |
| 块行及后代的计算样式 | 五档**逐字相同**（无 border／无背景／无图／无 opacity 差） |
| 块自己带的自定义属性 | 只有一个公共的 `--bg-color:transparent`（五档一样） |
| 无状态块菜单里的勾选项 | 本轮未能稳定打开块菜单（`probe-w1bk2` 点到侧栏区域，读到的是“共享”）⇒ **未验** |
| 像素哈希（CDP 截图） | ★ **不可用**：同一档两次跑给出**不同** md5（`probe-w1bl2` vs `w1bm`：`---` 在两次分别为 `fa3ab064…` 与 `8136d9de…`） |
| 剪贴板回读（复制为 Markdown） | ★ **不可用**：`navigator.clipboard.readText()` 被平台拒绝（`Control of this task space is with the user`） |

⇒ 本轮结论：**五档在官方 DOM/CSS 上完全不可区分**，而两条能分辨的通路（像素、剪贴板）各自因**不稳定**与**被拒**而不成立。
★ 按本项目既有纪律：**不把“读不出”写成“两侧一致”**，也不为此新建一条无据的 G 行。本候选**仍挂**。

### 3、☆ 本轮另一个负面结果（有用，可回查）

若未来找到判据，下一手可直接用这两个已证事实：① 五档在官方**都真生效**（不是“只有一档”）；
② 五档在官方的**可见结果相同**（都是 28px 高的一条线）⇒ 若本地五档可见结果**不同**，那就是一条真差异（反之则是一致）。

### 4、★★ 本轮中途**被迫停止**（如实登记，含未清的临时文档）

时间线：本轮为找判据连跑了 6 个探针（`w1bh2`→`w1bn`），在 `probe-w1bn`（18:51）时
任务空间的控制权**交回用户**，错误文案逐字：
`Control of this task space is with the user, either through …`。
此后的两个收尾脚本（`cleanup-w1bk`、`list-residue4`）**均卡住、`.out.txt` 为 0 字节**，与“空间已归用户”一致。

按 `ego-browser` 的硬规则（本工作目录 `skill-guide.txt`「User control and completion」一节）：
**“Stop when the user takes control … Do not retry or route around the stop”** ⇒ 本轮**停止浏览器作业**，不重试、不换空间绕行。

**因此未能完成的清理（逐张列出，不淹盖）**：

| 侧 | 文档 | 来源探针 | 状态 |
| --- | --- | --- | --- |
| 官方 | `QODER-ILAB-div7` | `probe-w1bj2` | ★ `softDelete ok=false`（当时就没删掉） |
| 官方 | `QODER-ILAB-divB` | `probe-w1bn` | 脚本在读剪贴板时被迫中断，**未走到删除那一步** |
| 本地 | `QODER-ILAB-divAL` | `probe-w1bm` | 同上，**无删除步骤** |

已确认删掉的（`softDelete ok=true`）：官方 `QODER-ILAB-div5`／`div6`／`div8`／`div9`／`divA`；本地本找法期间**未新建**临时文档（只用官方侧）。

★ 另：本轮跑出一个卡死的 `ego.mojom.NodeService`（PID **4576**，启动于 18:38），是后续探针卡住的另一成因；
按既有纪律（**杀进程禁用模糊通配符**）本轮**未杀**，留给下一手按显式 PID 处理。

## 十四、★ 续批十（2026-10-26）：**分隔线五档定案** —— 换判据面（REST 读回），三枚新账

净新增 **3 条**（G1559—G1561）· 零产品代码批。台账＝`gap.md` 同批三行。

### 1、★★★ 卡点解法：**不读 DOM，读官方 REST**

续批九穷举了 DOM／CSS／像素／剪贴板四条路，全部不成立。本批换面：官方 REST
（`connect.craft.do/links/11WSzp0AjQN/api/v1`，**就是上一批 `dom-20261023/mcp/` 记下的那条 link**）的
`GET /blocks?id=<docId>` 直接返回每枚块的 `type` 与 `lineStyle`。

⇒ **八枚独立样本**（`div5`／`div6`／`div8`／`div9`／`divA`／`md-line`／`md-line3`／`md-line4`，全是续批九留下的临时文档）逐字相同：

| 记号（键入） | `lineStyle` | 自带 `markdown` |
| --- | --- | --- |
| `..-` | `extraLight` | `***` |
| `.--` | `light` | `****` |
| `---` | `regular` | `*****` |
| `=--` | `strong` | `******` |
| `===` | **`pageBreak`** | `*******` |

⇒ 星号枚数 ＝ `3 + 档序`，与上一批「档位信号找不到」的结论**不冲突**：DOM 上确实不可区分，**信号在数据面**。

### 2、★★ 三条新账

- **G1559**：第五档官方 REST 叫 **`pageBreak`**、本地存 **`pageSeparator`**。
  ★ 而官方**编辑器 bundle** 里另有 `Lt.PageSeparator="pageSeparator"`（`static/js/index-BclxLRzw.js`，7 处字面量）
  ⇒ **三套名字**（编辑器内部 `pageSeparator`／REST 读写 `pageBreak`／插入面板 item 键 `pageBreak`）。
  ☆ 这正是 G1411「桥面拒绝 `pageSeparator`」的根因面：写侧通路名与 REST 读回名**不是同一个字符串**。
- **G1560**：粗细口径两侧不同。官方 `BlockRenderer`＝`1/1/1/2/3px` ＋ 逐档 `opacity .08/.15/.24/.4/.5`；
  本地 `globals.css:921-935`＝`1/2/3/6px` ＋ **无 opacity**，且**第五档在本地没有任何专属规则**（落回基础 `1px`）。
  ⇒ 本地「常规」是官方的约 4 倍浓度；第五档在官方是**最粗一档**、本地画成**最细一档**。
- **G1561**：本地导出恒写 `---`（`document-codec/index.ts:106-107`），四档信息导出即丢；
  而 `dividerMarkupFromStyle()` 这张正确的星号表**建好了却零消费者**（只被自家单测引用）。

### 3、★★ 一条仪器纪律（本批新增，写下来免得下次再花一轮）

本地 `getComputedStyle` 把声明 `6px` 读回 **`5.6px`**——**连合成的 `<div>` 内联 `border-top:6px` 也读 `5.6px`**，
而根字号 16px、`devicePixelRatio ≈ 1`、`zoom` 1、`visualViewport.scale` 1 全对。
⇒ 结论：**本机的像素绝对值不可比**（浏览器层取整，不是缩容器的锅——已逐层扫过 13 层祖先，无一有 `zoom`／`transform`／`scale`）。
☆ 处置：G1560 一律以 **CSSOM 声明值**为据，不拿实测像素判差——这与 README 第 1 条「绝对量不可比」同源。

### 4、★★ 本批踩到的三处环境故障（都不是产品缺陷）

| # | 故障 | 后果 | 处置 |
| --- | --- | --- | --- |
| 1 | 上一批的任务空间已**不存在**（`listTaskSpaces()` 返回 `[]`） | 须 `taskSpace()` 重建（同一名字） | 已重建，`spaceId=2` |
| 2 | 本地 dev server（14:39 启动）的编译 worker 崩了：`/api/auth/*` **整条 500**、`Jest worker encountered 2 child process exceptions` | 本地侧登录进不去 ⇒ 两侧对照做不成 | 经用户同意后重启；重启后 `session=200` |
| 3 | ★ **我自己造成的**：为清本地 cookie 调了 `Network.clearBrowserCookies`，它作用于**整个浏览器上下文** ⇒ 连 `docs.craft.do` 的登录态一起清掉 | 官方侧**界面**退到「欢迎来到 Craft」登录页 | ★ **权威数据面不受影响**：REST link 自带令牌，`/connection`／`/blocks` 仍 200 ⇒ 本批全部官方证据取自 REST；**官方界面侧的本批补充测量（如 G1560 的屏上像素）因此未做，如实挂起** |

★ 教训：用 CDP 清 cookie 前要先想清楚作用域是**整个 context**而非"当前 origin"；本项目里两侧共用同一个 TaskSpace ⇒ 一清全清。
（本地侧改走「curl 取 session token → `Network.setCookie` 注入」的定向路线，不再清 context。）

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `gap.md` 台账两闸 | `ledger-arity-gate` **4/4**、`ledger-selftally-gate` **1/1** 全绿（自述 1553／G1561 ＝ 现跑逐字相同） |
| 临时文档 | 本地新建的一枚（`QODER-ILAB-divlocal`）已 `softDelete ok=true`；官方侧本批**未新建**任何文档（读的是续批九的样本） |
| 官方残留（非本批） | `QODER-ILAB-div7`／`divB` 仍在列表屏；`div5/6/8/9/A` 在**回收站**（`softDelete` 早已生效，只是未永久清除）★ 另：`/documents` 端点**会把回收站内容一并返回**（154→162 条），不能拿它当"未删"的判据 |


## 十五、★★★ 续批十一（2026-10-26）：**真实编辑器的五档不是粗细，是图案＋分页** —— 推翻同日早前的 G1560

净新增 **0 条**（只改判 G1560 一行）· 零产品代码批。台账＝`gap.md` 的 G1560（已改写）。

### 1、为什么这一批必须做

续批十把 G1560 记成「粗细口径不同」（官方 `1/1/1/2/3px`＋逐档 opacity，本地 `1/2/3/6px`），
判据取自 `dom-20261023/mcp/mcp-ui-edit-review.txt`——那是 Craft 的 **MCP 审阅小组件**里的 `BlockRenderer`。
本批官方登录恢复后上屏实测，**真实编辑器的渲染与小组件完全不同**。

### 2、★★ 实测：五档是「三种图案 ＋ 两种实线 ＋ 分页」

官方**不用 `<hr>`**。每档是一枚 `height="24"` 的 div，class 与形态逐档不同
（`md-line3`／新建 `QODER-ILAB-divshot` 两轮一致，用 `blockrowwrap-<blockId>` 与 REST `lineStyle` 对齐）：

| 档 | class | 实测形态 |
| --- | --- | --- |
| `extraLight` | `sc-nh9tr9-3` | `display:flex`，容器 728×24 **零背景零边框**，内部**三枚 3×3 圆点**（`border-radius:50%`、`rgba(31,34,37,.25)`、间隔 13px、居中）＝屏上「⋯」 |
| `light` | `sc-nh9tr9-1` | `linear-gradient(to right, rgba(31,34,37,.5) 30%, #fff 0%)` ＋ `background-size:5px 1px` ＋ `repeat-x` ＝**点线** |
| `regular` | `sc-nh9tr9-0` | 728×**1px** 实心 `rgba(31,34,37,.5)` |
| `strong` | `sc-nh9tr9-0`（另一变体） | 728×**2px** 实心 `rgb(31,34,37)`（不透明） |
| `pageBreak` | `sc-nh9tr9-2` | **自身零可见样式**（无 bg／无 border／无子元素）＝屏上不可见，**结构上把文档劈成两张卡** |

第五档的「分页」有两条独立证据：① 截图 `round-72-five.png` 里 `E` 落在**第二张白卡**；
② 逐层向上读带背景的祖先，`pageBreak` 之后的块最短链与之前的块**类名不同**（`jdQorT` → `fJrHfm`）。

### 3、★ 本地对照与真差异

本地同输入五档全落成 `<hr data-style=…>`，`globals.css:921-938` 给四档 `1/2/3/6px` **同一种实线**，
第五档 `pageSeparator` **无规则**（落回 1px）。

⇒ 真差异不是「粗细比例」而是**形态本身对不上**：官方前两档是**图案**（省略号／点线），本地是实线；
官方第五档是**分页**，本地是一条最细的实线。严重度从 2 提到 **3**、成本 1 提到 **3**
（要加图案渲染 ＋ 分页语义，不是调几个 px）。

### 4、★★ 本批的方法学教训（写下来）

**「官方渲染器」有多个**：MCP 审阅小组件、导出器、真实编辑器各一套，**不能互抄**。
续批十犯的正是这个错——拿小组件的简化渲染当真实编辑器。
⇒ 今后凡「官方怎么画」的结论，**必须标明取自哪一张面**；小组件的值只能当线索，上屏才能定案。

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| `ledger-arity-gate` / `ledger-selftally-gate` | **4/4** / **1/1** 全绿（自述 1553／G1561 未变，本批只改一行内容） |
| 临时文档 | 本批新建的 `divshot`／`divdetail`／`divfiveC`／`divfiveB`／`divfive` **全部 `softDelete ok=true`**；列表屏只剩 `div7`／`divB` 两张旧残留 |
| 证据留档 | 截图 `C:/Users/zhanh/ego/craft-ilab-20261026/round-72-five.png`（五档同屏，可直接目视比对） |

## 十六、★ 续批十二（2026-10-26）：**清掉 G1561** —— 上一批留的「半件」当场接上（真写入批）

净新增 **0 条**（清 1 条）· **本批动了 `src/`**（与前十一批不同）。台账＝`gap.md` G1561 改判**已清**。

### 1、接线

`document-codec/index.ts` 的 `case 'divider'` 原来与 `horizontalRule` 合并返回 `'---'`，
现改为读 `node.attrs.style` 走现成的 `dividerMarkupFromStyle()`；无 style 属性时仍写 `'---'`。

### 2、★★ 接线后才暴露的一个回归（差点写进去）

旧档名 `dashed` 的 markdown 形式是 `=-`，而**导入端不认**这个记号
（`DIVIDER_PATTERN` 里没有它，星号/下划线兜底正则也不含它）⇒ 直接写出会让整块**降级成普通段落**，
不是"档位丢了"而是"块没了"。

处置：把导入端的判据抽成共用常量 `DIVIDER_MARKUP_PATTERN`（`divider-styles.ts`），
导出前用它判一次，不保真的档退成默认 `*****`。★ 这里同时消掉一处**双声明**——
`markdown.ts:197` 原先写着 `DIVIDER_PATTERN.test(...) || /^(-{3,}|\*{3,}|_{3,})$/.test(...)` 两条并列，
现在两边共用同一个常量，不会再漂。

### 3、验收（先红后绿）

| 项 | 结果 |
| --- | --- |
| 单测（红→绿对照） | 接线前：`document-codec/index.test.ts` **2 条 FAIL**（`extraLight -> ---` 读回 `regular`）；接线后 **28/28 全绿** |
| ★ 端到端 | 浏览器里真建一篇（四档各一枚，从编辑器 `state.doc.toJSON()` 取）⇒ 导出得 `***`／`****`／`*****`／`******` 四行 ⇒ `parseMarkdown` 导回四档**逐枚相同** |
| 全量 | 272 文件／**2223** 条全绿（上批 2218，+5） |
| `npx tsc --noEmit` | **0 错** |
| 台账三闸 | `arity` 4/4 · `selftally` 1/1 · `cleared` 3/3 |

### 4、本批的环境故障（都不是产品缺陷）

- TaskSpace 的本地页 `p2` 失效（`No target with given id found`）⇒ 换页签后重建为 `p4`。
- `p3` 的 `Emulation.setDeviceMetricsOverride` 超时 ⇒ 关掉重开。
- 本地文档的 `content` **不会**同步进 Postgres（`DOC_CONTENT_COLS` 按红线不进同步白名单）⇒
  验证必须从浏览器里的编辑器 JSON 取，不能从库里查；这条已写进 `project-craft-local-env` 记忆。

## 十七、★ 续批十三（2026-10-26）：**Backspace 分派** —— Wave 1 最后一块核心面，两侧一致

净新增 **2 条 spec** · 零产品代码批 · 台账无新 G（两条都 `match`）。

### 1、★ 采到了什么

`keyboard.md:285` 屏上只量到「四档」，而代码面 `gap.md` **G578** 记的是**六段优先级链**
（守卫 → ① 去列表 → ② 减缩进 → ③ 清装饰 → …）。本批把**屏面上没量过的第 ① 段**补上，
并把四档里的三段逐档对拍：

| 段 | 步骤 | 官方 | 本地 |
| --- | --- | --- | --- |
| ① **合并** | `AAA`/`BBB`，光标在 BBB 块首 `Backspace` | `["AAABBB"]`，光标 **3**（交接点） | **逐字相同** |
| ② **删空前块** | 块首 `Enter` 造空块 ⇒ `Backspace` | `["AAABBB"]` | **逐字相同** |
| ③ **首块无动作** | 单块块首再 `Backspace` | 一字不变 | **逐字相同** |
| ④ **去列表**（G578 第①段，屏面从未量过） | `- AAA` 成列表项，块首 `Backspace` | `kinds` **bullet → para**、文本与块数不变 | **逐字相同** |

⇒ 两个 spec 判定均 **`match`**（`editor.key.backspace-at-block-start` 20 行／0 sev2+；
`editor.key.backspace-in-list` 14 行／0 sev2+／2 条已声明偏差）。

★ 未采的一段：**② 减缩进**——本地缩进本身是缺口（G1545 普通段落进不去、G1546 列表项只能进一级），
混进来会把两个已登记的原因搅在一起，故**单独留账**，不写成「一致」。

### 2、★★ 本批修掉五处仪器缺陷（都是真踩到、都影响判定）

| # | 缺陷 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | `evalExpect` 的 `actualOf` **没有 `kinds` 分支** | 任何 `facet:'kinds'` 的断言静默取 `null`、恒 FAIL（首跑 6/8 FAIL 全是它） | 补一行 `if (facet === 'kinds') return step.kinds ?? null;` |
| 2 | 文本名册的 `#n` **重复后缀被当成内容** | 官方把标题画在编辑区＋侧栏＋页签（3 条）、本地画 1 条 ⇒ 判成「单侧多出文本」假红 | `diffTextNodes` 比较前统一剥 `#n`；重复与否另有 `countΔ:` 精算 |
| 3 | 侧栏「无标题文档」占位串进名册 | 本地测试库累积几百篇历史文档 ⇒ 侧栏 **246 条**，官方 0 条 ⇒ 假红 | 归为外壳噪声 `<UNTITLED>`（与既有 `页面标题` 同一处置） |
| 4 | `PURE_NOISE` 正则写成 `#d+`（应为 `#\d+`） | 「纯噪声 + 重复后缀」的条目**永不丢弃**，静默漏网 | 改正 |
| 5 | `PAGE_LABEL` 写死页签标签 | 页一关一开就换号 ⇒ `page p2 was closed`／`No target with given id found`（本轮绊了三次） | `lab.mjs` 加 `resolvePage()`：先探活、再按靶子 URL 前缀找、都没有才新建 |

★ 仪器改动的**影响面已核**：唯一受影响的既有 spec 是 `editor.md-rules.block-kind`
（95→93 行、已声明 21→19；消失的两条正是 `AAA#1`／`…#3` 这类**重复后缀假条目**，
大纲行的证据仍由 `countΔ:AAA` 一族承载），**判定不变**（仍 `differ`、36 条 sev2+）；
其余 15 条 spec 的判定与 sev2+ 数**逐字未变**。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **19 条 spec**（新增 2 条，均 `match`） |
| 两侧记录 | 各 10 步／6 步，`errors=0`，selfCheck **7/7**、**8/8** 全 PASS |
| 临时文档 | 两侧均由 `softDeleteTempDoc` 软删 |

### 4、环境备注

本地侧栏累积了 **246 篇**历史测试文档（都是软删前的样本文档）。它们不进 `isDeleted=false`
的活跃列表，但侧栏仍渲染占位行 ⇒ 已用噪声规则挡住；**未做批量清理**（那是不可逆操作，需单独授权）。

## 十八、★ 续批十四（2026-10-26）：**`a11y` 观测档首次落地** —— 三条可达性差异

净新增 **1 条 spec ＋ 3 条 G（G1562–G1564）** · 零产品代码批。

### 1、这件事为什么等了这么久，又为什么必须做

`observe: ['a11y','animation','db']` 三档从 **Wave 0 就挂在「未实现」**名单上。本批落地了 `a11y`。
它承载的是**整个产品的一个维度**——读屏用户能不能用——此前一条都没量过；
唯一相关的是 `block-kind` 里一条「只登记不判定」的偏差（本地 checkbox 的合成英文名）。

### 2、★★ 仪器怎么接的（两处关键取舍）

- 走 **CDP `Accessibility.getFullAXTree`**（浏览器权威 AX 树），不是页内读 `aria-*` 猜。
- **按编辑器子树收口**：先走 DOM 收该子树全部 `backendNodeId`，再按 `backendDOMNodeId` 过滤 AX 节点。
  ★ 不收口不行——本地侧栏把**每篇文档都画成按钮**（实测全页 button：官方 **24** / 本地 **375**），
  不收口就只是在比「谁的文档多」。
- ★ 踩到并绕过的一枚：`Accessibility.getPartialAXTree` 在 `fetchRelatives:false` 下**只回该节点自己一个**
  （两侧 `nodes` 都是 1），**不含子树** ⇒ 读不到编辑器内部的控件。改用全树＋DOM 子树过滤。
- 只留**可操作角色**（button/link/textbox/checkbox/menuitem/tab/combobox…），丢掉
  generic/StaticText 这类结构节点：两侧渲染框架不同（官方 Slate 扁平 span / 本地 TipTap 树），
  结构节点数**天然不等**，比它没有意义。角色计数差只记 severity 1（不判定）。

### 3、★★★ 采到的三条差异（同屏：`[ ] Buy milk`）

| # | 面 | 官方 | 本地 |
| --- | --- | --- | --- |
| **G1562** | 可编辑区的 AX 角色 | `textbox`（`editable:richtext`／`multiline:true`／`focusable`） | `generic`（只有 `editable:richtext`＋`focusable`）——**两侧都没有可及名** |
| **G1563** | 任务项勾选框 | ★ **AX 树里根本不存在**（子树 85 个 DOM 节点逐枚核过，零 `checkbox`） | `checkbox`，可及名是 TipTap 合成串 `Task item checkbox for Buy milk` |
| **G1564** | 任务项的三个动作 | 3 枚**常显** AX `button`：`Calendar Icon`／`Flag Icon`／`Arrow Right Circle Icon` | **0 枚** —— 入口在块 `⋮` 菜单（「提醒我…」「将任务标记为已取消」） |

★ G1563 还牵出一条**连带污染**：那枚合成串进了具名文本计数与文本名册 ⇒ 同一份记录里
`countΔ:Buy milk` 官方 **1** / 本地 **2**、文本名册多出 `added-only-local: "Task item checkbox for Buy milk"`。
⇒ 修 `aria-label` 会一并消掉这两条。

### 4、★ 诚实边界

- **没采**「读屏实际播报什么」，只采 AX 树。AX 角色不同 ≠ 播报一定不同，但它是唯一可机读的权威面。
- G1563 的「更好还是更坏」不一句话判：本地**角色上更像样**、**标签上是机器串**，故只按「两侧不同」记。
- G1564 官方三枚与本地菜单项**未逐条对应**（`Arrow Right Circle Icon` 对应本地哪一项没验），不写成「一一等价」。
- `animation`／`db` 两档**仍未实现**。

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **20 条 spec**（新增 1 条；`differ` 33 行／19 sev2+） |
| 两侧记录 | 各 3 步、`errors=0`、selfCheck **2/2** 全 PASS |
| 台账 | 三闸全绿（自述 **1556／G1564**） |
| 临时文档 | 两侧均软删 |

★ selfCheck 只放**两侧共有**的量：首版把「编辑器里要有 checkbox」写成断言 ⇒ 官方侧必然 FAIL
（它本来就没有），等于把真差异伪装成仪器故障。已按 README 纪律撤下。

## 十九、★ 续批十五（2026-10-26→29）：**粘贴面首次对拍** —— 三枚新账

净新增 **1 条 spec ＋ 3 条 G（G1565–G1567）** · 零产品代码批。

### 1、采了什么

粘贴此前只有两条静态记录（`keyboard.md:139` 的键位表、`gap.md` G458 的 `ClipboardBoundary`），
**屏上一次都没对拍过**。本批两段：

| 段 | 官方 | 本地 | 判定 |
| --- | --- | --- | --- |
| 多行纯文本 `AAA\nBBB` | `["AAA","BBB"]` | `["AAA","BBB"]` | **一致**（复证不登记） |
| `Ctrl+A`＋`Delete` 清空 | **`[]`（0 块）** | `[""]`（1 个空段落） | **G1565** |
| 裸 URL 粘贴 | **1 块**：标题＋正文摘要 | **2 块**：链接卡 ＋ **尾随空段落** | **G1566 / G1567** |

### 2、★★ 三枚新账

- **G1565**：**空文档是两种状态**——官方"没有块"，本地"一个空块"。
  ☆ 这与 `block-kind` 注释里"官方复位能清到 0 块、此后打字不触发规则"是同一现象，
  此前当**仪器坑**绕过去了，本批第一次作为**产品差异**登记。★ 未采：清空后再打字的路由。
- **G1566**：本地粘完 URL **尾随多一枚空段落**（`div` 卡片 + 空 `<p>`）。
  疑与 **G1485／G1556／G1557 同族**（尾随空段规则的 `notAfter` 只豁免三族列表）——
  ★ 该归因是**按既有三例的模式推的**，未逐行读豁免表核对本节点名。
- **G1567**：链接卡口径不同。官方卡＝`Example Domain This domain is for use in documentation examples…`（**标题＋正文摘要**）；
  本地卡＝`example.com Example Domain`，且 `/api/link-preview` 回包 `description` **恒 null**。
  ★ 只测了 1 个 URL（`example.com` 无 `og:description`），"本地一律抽不到正文摘要"**未证**。

### 3、★ 一处差点写错的判定

首跑本地卡片文本是 `example.com 正在获取链接预览...`，看起来像"本地永远停在加载态"。
单独探针等 2 秒再读：`example.com Example Domain`，且 `/api/link-preview` 回 **200** 带
`{"title":"Example Domain",…}` ⇒ **只是我的采样快了一拍**。spec 因此加了一步 `wait`。
☆ 教训：**"占位串"要先分辨是"没做完"还是"我读早了"**——与 Wave 1 那条"观测不到 ≠ 不存在"同族。

### 4、★★ 本批的环境故障（机器停过机）

开工时本地靶整片 500。逐层查下来是**两层同时停**：dev server 进程没了、**Postgres 也停了**
（`ECONNREFUSED 127.0.0.1:5432`）。PG 日志自陈 `last known up at 2026-10-26 18:11` ⇒
中间机器停过。处置：`pg_ctl -D <data> start` 拉起（自动 recovery 完成），再重启 dev server
（重启前它持有的是**建在库停机期间**的连接池，库起来了也仍然拒绝）。
★ 另：`/api/link-preview` 匿名 `curl` 得 **307 → /login**，要在带会话的页面里才算数。

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **21 条 spec**（新增 1 条；`differ` 27 行／15 sev2+） |
| 两侧记录 | 各 6 步、`errors=0`、selfCheck **2/2** 全 PASS |
| 台账 | 三闸全绿（自述 **1559／G1567**） |

## 二十、★★ 续批十六（2026-10-29）：**`animation` 观测档落地** —— 动效机制两侧不同

净新增 **1 条 spec ＋ 2 条 G（G1568–G1569）** · 零产品代码批。

### 1、这一档为什么难，以及怎么解

`animation` 从 **Wave 0** 就挂着未实现。第一版想"动作后采样 `document.getAnimations()`"，
**直接栽了**：本地菜单 `animation: enter .15s` 只有 150ms，而 `waitForTimeout(100)` 加一次
`page.evaluate` 的往返就已超过它 ⇒ 采到的永远是空数组，把「有动画」读成「没动画」。

改**事件式**：监听 `animationstart/end`、`transitionrun/end`，时长直接取事件的 `elapsedTime`。
★ 随之踩出两枚必须先修好的仪器缺陷：

| # | 缺陷 | 现象 | 修法 |
| --- | --- | --- | --- |
| 1 | **被中断的过渡不触发 `transitionend`** | 读 1 拿到 5 条、读 2 只剩 1 条（那 5 条凭空消失） | 读时"就结算"成 `interrupted` 并**写回缓冲** |
| 2 | 动画**落在哪一步**取决于挂载时机 | 同一批事件这回落在第 1 步、下回落在第 2 步 ⇒ 逐步比会假红 | 缓冲改**累计**，differ 只比**末步** |

☆ 动画名两侧不可比（官方是构建哈希 `jOiMjk1699283064`、本地是 `enter`）⇒ 采集侧统一归一成 `(anim)`，
可比的是「哪个属性在动 ＋ 多久 ＋ 落在哪种标签上」。

### 2、★★ 采到的两条差异

| 账 | 官方 | 本地 |
| --- | --- | --- |
| **G1568** 入场 | 容器**自身零动效**（`animation-name:none`／`transition-duration:0s`）；动画落在**内层 div**、**100ms**，另有 `opacity` **150ms** 过渡 | 容器 `animation: enter .15s` ＋ `transition: all .15s`；实测动的是**四边 padding 与 visibility 各 150ms** |
| **G1569** 退场 | 观察到 **100ms** 动画一例 | **零动效事件** |

★ G1568 附带一处口径问题：本地那四条 padding 过渡的缓动是 **`ease`**（默认值），
而不是它自家的 `cubic-bezier(.4,0,.2,1)`（`globals.css:240` 与官方同值）。
★ 两侧 **token 层完全一致**（`.15s/.2s/.5s` ＋ 同一贝塞尔，`tokens.md:91`）——差异不在数值，
在**落到哪些属性、由哪一层承担**。
★ G1569 诚实边界：官方这条**不是每次都能采到**（组件卸载时动画可能被中断），两轮回放里一采到一没采到。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **22 条 spec**（新增 1 条；`differ` 37 行／8 sev2+／21 条已声明） |
| 两侧记录 | 各 4 步、`errors=0`、selfCheck **2/2** 全 PASS |
| 台账 | 三闸全绿（自述 **1561／G1569**） |
| 临时文档 | 本批探针建的 4 篇本地文档**全部软删**（`del=true`） |

★ 已声明偏差：菜单**文案/结构**差异（官方扁平 20 项 vs 本地分组长列表）由 **G1544** 承载，
与本 spec 的动效判据无关 ⇒ 按 README 判据声明掉。另把本地「同步中／保存中」这类**保存态外壳串**
加进噪声规则（与既有「已保存」同族）。

## 二十一、★ 续批十七（2026-10-29）：**`db` 观测档落地** —— 三档集齐

净新增 **1 条 spec**（本地侧自证）· 零产品代码批 · 台账无新 G。

### 1、这一档为什么只能是单侧

官方没有可查的库 ⇒ `db` 不是"两侧对比面"，而是**本地侧的自证面**：回答"这个交互在库里留下了什么"。
它只进 selfCheck、不进 differ。★ 这条尤其重要，因为本地文档的 `content` **按红线不进同步白名单**
（`src/lib/sync/tables.ts` 的 `DOC_CONTENT_COLS`）⇒「编辑器里看得见」与「库里存着」本来就是两件事。

### 2、采到的三件事（本地侧，6 条断言全 PASS）

| 步 | 库面读数 |
| --- | --- |
| 基线（刚建完） | `exists=true`／`isDeleted=false`／标题已落库 |
| 打完 `DBCONTENT` | 行仍在，**`contentLen` 恒 0** ⇒ 红线的可观测后果被写进断言防回归 |
| 走「移至最近删除」 | `isDeleted` **翻 true**，行还在（软删不是物理删） |

### 3、三条必须先立的纪律（都写进 README 第 12 条）

- **不能进两侧 selfCheck**：库面断言若放在 `expect` 里，官方侧恒 FAIL ⇒ 新增 `spec.selfCheckOnly: ['local']`。
- **必须收尾关连接**：`db-probe.mjs` 开着 pg 连接，不调 `closeDb()` 则 Node 事件循环不退出
  （实测：记录写完、进程挂到超时被移后台）。
- **建文档与写标题是两次异步落库**：基线步读到的 `title` 还是空串，第 1 步才落定 ⇒ 标题断言别放基线。

### 4、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **23 条 spec**（`local.db.document-row` 判 `match`，38 条已声明偏差＝外壳名册） |
| selfCheck | 本地 **6/6 PASS**；官方按设计 0 条（skipped） |
| 三档状态 | `a11y` ✅／`animation` ✅／**`db` ✅** ⇒ Wave 0 挂着的三档**全部落地** |

## 二十二、★ 续批十八（2026-10-29）：**样式槽列表四键** —— 挂了两年的"从未上屏"清掉

净新增 **1 条 spec** · 零产品代码批 · 台账无新 G（判 `match`）。

### 1、为什么这一族一直挂着

`keyboard.md:295` 逐字写着：「表 A 的列表家族**只试过 `Ctrl-Shift-7`** 一条，
`TODO_LIST=Ctrl-Shift-6`／`BULLET_LIST=-8`／`NUMBERED_LIST=-9`／`NO_LIST=-`` ` `` **全部未在任何屏幕按过**」。
⇒ 表 A 的列表段此前全是契约级证据。文档还记了它一旦跑通能连带解锁三件事。

### 2、实测：四键两侧**逐键一致**

单块 `AAA` 连按四键，`kinds` 读数：

| 步 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-Shift-6`（TODO_LIST） | `task` | `task` |
| `Ctrl-Shift-8`（BULLET_LIST） | `bullet` | `bullet` |
| `Ctrl-Shift-9`（NUMBERED_LIST） | `numbered` | `numbered` |
| `Ctrl-Shift-`` ` ``（NO_LIST） | `para` | `para` |

⇒ ① 四键**都生效**且落到同一档；② 连按时是**替换**不是叠加（`task→bullet→numbered` 没有叠成嵌套列表）；
③ 块数恒 1（换档不拆块）。判定 **`match`**（14 行／0 sev2+／2 条已声明）。

### 3、两条已声明偏差（都不是新差异）

- `countΔ:AAA` 本地 2 / 官方 1 —— 任务块勾选框的合成可及名含任务文本（**G1563**）；
- 编号档 `blocks` 官方 `1. AAA`、本地 `AAA` —— 官方把序号画进文本节点（**G866／G1556**）。

### 4、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **24 条 spec**（新 spec `match`） |
| 两侧记录 | 各 6 步、`errors=0`、selfCheck **2/2** PASS |
| 静态账 | `keyboard.md:295` 那条"全部未在任何屏幕按过"已就地标注为**已清** |

## 二十三、★ 续批十九（2026-10-29）：**页内查找两档** —— 表 B 的 FIND/REPLACE 首次上屏

净新增 **1 条 spec ＋ 2 条 G（G1570–G1571）** · 零产品代码批。

### 1、实测：官方分两档，本地一档到底

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-F` | `findInput:1` / **`replaceInput:0`** | `findInput:1` / **`replaceInput:1`** |
| `Ctrl-Shift-F` | `1 / 1` | `1 / 1` |

⇒ **G1570**。★ 本地代码里**自陈**了这个取舍（`craft-keymap.ts:92-95` 注释原话：
"the official split between *find* and *find and replace* is not reproduced here"）
⇒ 本条是把注释变成两侧实测，**不是新发现的设计意图**。

### 2、第二条：本地面板多三组开关

**G1571**：本地 `Ctrl-F` 面板里除两个输入框外，还有**「在文档中／在页面上」范围**、
**「文本／正则」模式**、**「Aa」大小写**三组开关与 `0 结果` 计数条；
官方 `Ctrl-F` 当场只有一个查找框 ＋ 一枚「查找」按钮。
★ 诚实边界：官方**是否另有**这些开关（藏在别处的选项菜单里）**未展开验证**——
本条只断言"当场看到的控件集不同"，不写成"官方没有这些能力"。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **25 条 spec**（新 spec `differ`：21 行／10 sev2+／3 已声明） |
| 两侧记录 | 各 4 步、`errors=0`、selfCheck **2/2** PASS |
| 台账 | 三闸全绿（自述 **1563／G1571**） |
| 静态账 | `keyboard.md:296` 已就地收窄：FIND/REPLACE 已对拍，表 D／E **仍成立** |

## 二十四、★ 续批二十（2026-10-29）：**造页面块的路被封死** —— 一条新账（G1572）

净新增 **1 条 G** · 零产品代码批 · **无新 spec**（样本造不出来）。

### 1、想采什么、为什么没采成

Wave 1 报告仍挂着「`⇧⏎` RENAME（页面块）」。要采它就得先有一枚**页面块**，四条路逐条试过：

| 路 | 结果 |
| --- | --- |
| 打开 Craft Handbook（唯一含 15 枚页面块的文档） | 编辑器区 **`rows=0`**：内容根本没渲染（弹层已用 `[data-testid="open-in-app-popup-close"]` 关掉，仍为 0） |
| 斜杠菜单过滤「表格／页面」 | 官方过滤后只剩「插入表格集合」，无「页面」项（G207 已记：页面入口在**插入面板**不在斜杠菜单） |
| REST `POST /blocks` 写 `type:"page"` | ★ **静默降级成 `text`**（见下） |
| 本地造 page 块 | 本地**没有** page 块类型（`grep` 全仓无该节点） |

### 2、★★ G1572：REST 造页面块被静默降级（新账）

三种载荷变体逐条试，全部回 `200` 但落成 `text`：

```
POST /blocks {type:"page", markdown:"PAGEPROBE2", position:{pageId:<doc>, position:"end"}}
→ 200 {"items":[{"id":"402079be-…","type":"text","markdown":"PAGEPROBE2"}]}
```

（另两种：裸 `type:"page"`／改走 `type:"text"`＋`textStyle:"page"` —— 同样落 `text`。）

⇒ 这是 **G1408「页中页判死」的第四条封死通路**：前三条是 `blocks move` 拒文档根块、
`documents create` 无 `--parent`、markdown 名册无页面块记号；**第四条是 `blocks add` 收下但降级**。
★ 顺带把载荷形状记清（省下一轮摸索）：body 是**单个块对象**，`position` 必须是对象
（`{pageId, position:"end"}`）；写成 `{blocks:[…]}` 或 `targetId` 会回 `VALIDATION_ERROR`。

### 3、这一项的处置

「页面块上的 `⇧⏎`」**当前工具链下不可达**（页面块造不出、唯一现成样本不渲染）。
按项目纪律**不把"采不到"写成"一致"**：G750 的静态结论（`RENAME`＝编辑页面区块）保持原样，
本项以 G1572 收口，并在任务里留下四条路的结论，避免下一手重走。

### 4、本批另修的两处环境故障

- **孤儿进程占 state 文件**：10:16 那次 `db` spec 跑完后 Node 因 pg 连接不退出（已修），
  但它的 `ego-browser.exe`(39736)＋`ego.exe`(40508) 一直活着，导致后续所有 ego 调用
  报 `EPERM: rename space-1.json`。按**显式 PID** 清掉后恢复（未用通配符）。
- 官方 REST 建的文档：`POST /documents` 回的是**块 id**（`599398c8…`），而 UI 列表用的是
  `clickableLink` 里的 **documentId**（`e4499ba9…`）⇒ 软删必须用后者，否则"列表里找不到卡片"。

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | 25 条 spec（不变） |
| 台账 | 三闸全绿（自述 **1564／G1572**） |
| 临时文档 | 本批官方建的 `QODER-ILAB-pageblock` 已软删（`del ok=true`） |

## 二十五、★ 续批二十一（2026-10-29）：**表 D 首次上屏** ＋ 修掉一处判定盲区

净新增 **1 条 spec ＋ 1 条 G（G1573）** · 零产品代码批。

### 1、`Ctrl-J`：官方弹窗、本地零反应

任务屏上按 `Ctrl-J`（`OPEN_NEW_TASK_POPUP`）：

| | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-J` 后 `popup-backdrop` | **0 → 1**（含输入框「新任务」＋ `task-popup-schedule-button`／`task-popup-deadline-button`） | **恒 0** |
| `domLength` 变化 | 184,640 → 196,133 | 413,576 → 413,642（**一字不变**） |
| `Escape` 之后 | 弹窗 1 → 0（能关） | — |

⇒ **G1573（缺失：键位无绑定）**。★ 附带一条**承载面差异**：本地任务屏**常驻**一枚行内输入框
（`添加任务，按回车确认…`，`Ctrl-J` 前后都在），官方任务屏没有它、只在弹窗里给输入位
⇒ 两侧「新建任务」的入口形态本就不同（行内 vs 弹窗）。

### 2、★★ 修掉一处判定盲区：`state:` 档从不参与比较

做这个 spec 时发现：`Ctrl-J` 的**主要差异**（弹窗开没开）在 verdict 里**没有行**——
因为 **differ 从来没比过 `stateAttrs`**。`stateSelectors` 一直能采、也能在 spec 里断言，
但那个断言只对**本侧自己**求值（selfCheck），两侧之间无人比。

修法：differ 增 ⑩ 段，逐键比 `stateAttrs.named`、severity 2。★ 影响面已核：
`editor.key.find-replace` 多一条 `state:replaceInput`（0 vs 1）、`editor.animation.slash-menu` 多一条，
其余 spec 判定未变 ⇒ 这个洞确实吞过真差异，但吞得不多。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 矩阵 | **26 条 spec**（新 spec `differ`：13 行／7 sev2+） |
| 两侧记录 | 各 3 步、`errors=0`、selfCheck **1/1** PASS |
| 台账 | 三闸全绿（自述 **1565／G1573**） |

## 二十六、★ 续批二十二（2026-10-29）：**任务行的键盘可达性** —— G1574（无新 spec）

净新增 **1 条 G** · 零产品代码批。

### 1、为什么没有 spec

本该写成 `shell.tasks.create-and-toggle-done`，但两侧「建任务 / 聚焦任务行」的路径不同，同一串步骤折不起来：
本地任务行点击后 `activeElement` 是 **`body`**，键盘无处作用。先把**已证事实**登记成 G，
spec 留到找到两侧共同的「选中行」写法再写。

### 2、★★ G1574：本地点不中任务行，键盘整族无从作用

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 建任务 | `Ctrl-J` → `textarea[aria-label="新任务"]` 输入 → `Enter`（弹窗保持打开） | 行内输入框「添加任务，按回车确认…」→ `Enter` |
| 点任务文本后焦点 | `DIV`（可编辑行） | **`BODY`** |
| 再按 `Ctrl-Alt-T` | **完成**（REST 读回 `- [x] TASKKEY`） | 无变化（仍 `todo`、`aria-checked=false`） |

★ 本地**不是不能完成**：点那枚 `<span role="checkbox" aria-checked>` 就能完成
（实测 `aria-checked=false` 由 18→17、该任务从 todo 列表消失）⇒ **缺的只是键盘通路**。

### 3、★★ 一条方法学教训（已写进 README 第 14 条）

官方的「完成」会让任务**离开 todo 列表** ⇒ 屏上读到「文本还在、没有删除线、`aria-checked` 为 0」时，
本批第一轮误判成「官方也没生效」。**靠 REST 读回 `- [x] TASKKEY` 才纠正**。
⇒ 与「观测不到 ≠ 不存在」同族：结论前先问「这个状态在屏幕上长什么样」。

### 4、顺带记清的 REST 用法（省下一轮摸索）

- `GET /tasks` 必须带 `scope`（`active|upcoming|inbox|logbook|document|all`），否则 400；
- `DELETE /tasks` 的 body 是 `{"idsToDelete":[…]}`（不是 `ids`）；
- 官方任务删除走 REST 即可（本批用它清掉了 3 条探针任务）；本地任务行的软删列是 `tasks.deletedAt`。

### 5、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 三闸全绿（自述 **1566／G1574**） |
| 临时数据 | 官方 3 条模拟任务经 REST 删除（`REMAIN 0`）；本地 4 条经 `tasks.deletedAt` 软删（剩 0） |


## 二十七、★ 续批二十三（2026-10-29）：**表 E 首次上屏（只到入口层）** —— G1575

净新增 **1 条 G** · 零产品代码批 · **无新 spec**（官方侧表格造不出来）。

### 1、采到的：两侧「插入表格」的入口形态不同

| | 官方 | 本地 |
| --- | --- | --- |
| 菜单项 | `插入表格` 在斜线菜单**第 12 项**（0-based 11；逐字 20 项已复核） | 一条「表格」命令 |
| 选中之后 | **不立即建表**，展开子菜单：`2x2`／`3x3`／…／`9x9`（ASCII `x`，载体 `button`） | **直接建出 3×3（9 格）**真 `<table>` |

⇒ **G1575**。与 G207「插入是对象面板不是块面板」同族：官方把"尺寸"当成插入时就要选的一维。
证据：截图 `C:/Users/zhanh/ego/craft-ilab-20261026/round-163-sub1.png`。

### 2、★★ 表 E 的 15 条键位**仍未采**（如实挂账） ✎ **后记（第 318 批）**：本节的"造不出样本"已解决（REST 建表 + 列表卡点入）；此后采到入口形态（`G1575`）与三条增行增列键（`G1576`／`G1577`）。**剩余 7 键的现状见本文件「三十一、存量清单」A 行**，不再以本节为准。

官方侧**造不出表格样本**。逐条试过、都失败：

| 路径 | 结果 |
| --- | --- |
| 斜线菜单过滤「表格」 | 只回 2 项（`插入表格集合`／`取消列表格式`），没有纯表格项 |
| 未过滤菜单按序号点第 12 项 | 菜单关闭、无表 |
| `→` 展开子菜单后 `↓`＋`⏎` | 子菜单按钮能枚举到（`2x2`…`9x9`），但回车不插入 |
| 子菜单展开后鼠标点 `3x3` | 坐标已核对（630,259），点完仍无表 |
| 页面内 `element.click()` 打 `3x3` | 无表 |
| 粘贴 markdown 管道表 | 不转换 |
| REST `POST /blocks {type:"table", markdown:"| a | b |\n| --- | --- |\n| 1 | 2 |"}` | ★ **成功**：回 200，块体是 `table` ＋ `rows:[[a,b],[1,2]]` |
| 打开 REST 建好的文档 | ★ **块行 `rows=0` 不渲染**（与 Craft Handbook 同症）⇒ 拿不到可操作的屏幕样本 |

★ 结论：**官方表格的"建"只能靠 UI，而 UI 那条自动化没过**；REST 能建但网页端不渲染。
→ 表 E 15 条键位（Tab 换格、Enter 换行、Ctrl-Enter 加行、Ctrl-Backspace 删行…）**留待能造出样本的下一手**。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 两闸全绿（自述 **1567／G1575**） |
| 矩阵 | 26 条 spec（本批无新增） |
| 临时文档 | 本批建的官方临时文档均经 REST/UI 清理；本地探针文档已软删 |


## 二十八、★★ 续批二十四（2026-10-29）：**更正上一批两条误判** —— REST 文档能渲染，官方表格是 div

净新增 **0 条 G** · 零产品代码批。**上一批（续批二十三）有两处结论是错的，此处逐条更正**。

### 1、★★ 更正一：REST 建的文档**能**渲染（我说过"不能"）

上一批写「REST 建好的文档块行 `rows=0` 不渲染 ⇒ 拿不到屏幕样本」。**错在打开方式**：
我直接 `goto(/editor/d/<space>/<docId>)` —— 缺了签名；改成**从列表卡点进去**（列表卡的 href 会补上 `?s=<sig>`）之后，
同一篇文档 **`rows=1`、内容正常渲染**（实测：块文本 `a b 1 2`）。
⇒ 教训与「观测不到 ≠ 不存在」同族：**同一篇文档，路径不同、可观测性不同**。

### 2、★★ 更正二：官方表格**不是 `<table>`**，是 div

我一路用 `document.querySelector("table")` 判"有没有表"，所以把**已经建好**的表格读成"没有"。
实测官方表格块的结构：块文本 `a b 1 2`，内部根节点 `div[role="presentation"]._root_1ltym_1._scrollRoot_1n6cb_1`，
整块 65 个 `div`、8 个 `button`（表格工具条），**没有一个 `<table>` / `<td>`**。
⇒ 判据要改：官方看 `[class*="_root_1ltym"]`，本地看真 `<table>`（本地实测 3×3、9 个 `td`）。

### 3、由此重新打开的路（下一手直接用）

- **造样本**：REST `POST /blocks` 的 `{type:"table", markdown:"| a | b |\n| --- | --- |\n| 1 | 2 |", position:{pageId, position:"end"}}` ⇒ 回 200、块体带 `rows:[[a,b],[1,2]]`。
- **打开**：必须**从列表卡点入**（带 `?s=` 签名），不要直接 `goto` 编辑器 URL。
- **观测第二通道**：`GET /blocks?id=<doc>` 会回表格块的 `rows` 二维数组 ⇒ 按键之后用 REST 读回行/列变化，不依赖 DOM 细节。

⇒ 表 E 的 15 条键位**仍然未采**，但卡点从"造不出样本"变成"聚焦单元格"（下一步）。


## 二十九、★ 续批二十五（2026-10-29）：**表 E 第一条键位上屏** —— G1576（`Ctrl-Enter` 加行）

净新增 **1 条 G** · 零产品代码批 · 仍无 spec（两侧造表路径不同，spec 待补）。

### 1、实测：官方加行、本地不加

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 起点 | `table` 块 3 行 × 2 列（REST 读回） | 3×3 真 `<table>` |
| 点进单元格 → `Ctrl-Enter` | ★ **4 行** × 2 列 | **仍 3 行** × 3 列 |
| 再按一次 | 再加一行（单变量确认） | 无变化 |

⇒ **G1576（缺失：键位无绑定）**。本地 `craft-keymap.ts` 里没有表格键位分支。

### 2、★★ 两处观测通道的更正（上一批我说错了）

1. **REST 建的文档能渲染** —— 关键是**从列表卡点入**（href 自动补 `?s=` 签名）；直接 `goto` 编辑器 URL 才会 `rows=0`。
2. **官方表格不是 `<table>`** —— 是 `div[role="presentation"]._root_1ltym_1`；我此前用 `querySelector("table")`
   判存在，把已经建好的表读成"没有"，白绕了几轮。
   ★ 更坑的是 `_root_1ltym` **在侧栏也有同名类**，按类名找会命中侧栏（实测拿到 x=-288 的"表格框"）。

### 3、现在的两条可用观测通道

- **DOM**：按块 `[data-block-id]` 定位，块内数 `[contenteditable="true"]`（官方每格一个）；
- **REST**：`GET /blocks?id=<doc>` 回表格块的 `rows` 二维数组 ⇒ 按键前后直接比行列数。

### 4、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 两闸全绿（自述 **1568／G1576**） |
| 环境 | 期间 Postgres 与本机 dev server 各停过一次（后台 pg_ctl 被回收），已重新拉起并确认 `/documents` 回 200 |

## 三十、★ 续批二十六（2026-10-29）：**表 E 键位族批量对拍** —— G1577

净新增 **1 条 G** · 零产品代码批。两侧各 10 次单变量，逐键读行列数。

### 1、★★ 结果：官方三键生效、本地全族无反应

| 键 | 官方（起点 2×2） | 本地（起点 3×3） |
| --- | --- | --- |
| `Ctrl-Enter` | **+1 行** → 3×2 | 0 |
| `Ctrl-Shift-Enter` | **+1 列** → 3×3 | 0 |
| `Ctrl-Alt-Enter` | **+1 列** → 3×4 | 0 |
| `Alt-↑ / ↓ / ← / →` | 0 | 0 |
| `Ctrl-⌫` / `Ctrl-Shift-⌫` | 0 | 0 |
| `Ctrl-[` | 0 | 0 |

⇒ **G1577（缺失：整族无绑定）**。本地 `craft-keymap.ts` 没有任何表格键位分支。

### 2、★★ 顺带定案 G726 那条面板冲突

面板把 `Ctrl-Shift-⏎` 印成「在前面添加行」，而表 E 的 Windows 列把同键给「添加列」。
**实测是加列** ⇒ **面板文案与行为不符，表 E 的 Windows 列才是对的**。

### 3、★ 诚实边界

官方那七键读数也是 0 —— 它们多半需要"**先选中行/列**"而不是单元格光标。
本批只测了**单元格光标**这一种前置，**未采到选择态**，所以既不写"官方没有"，
也不把本地那 0 放大成"官方能用本地不能用"——本地 0 只证明"单元格光标下无响应"。

### 4、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 两闸全绿（自述 **1569／G1577**） |
| 静态账 | `keyboard.md` 表 E 段已回写实测结论与 G726 定案 |

## 三十一、★ 存量清单（2026-10-29 第 317 批建立，单一口径）

本节的用途：把「还剩哪些没采」从散落在各批的 ⚠ 注释里收成**一张表**，避免"翻遍三千行才知道"。
每收一条就在这里划掉；**表清空＝采集面收口**。

| # | 未采面 | 规模 | 卡在哪（已逐条验证过的前置） | 下一手怎么破 |
| --- | --- | --- | --- | --- |
| A | 表 E 的 7 条表格键 | 7 | ★★ **已穷举四条路径，全部不得**（第 318 批）：① 单元格光标直按 `Alt-↑↓←→`／`Ctrl-⌫`／`Ctrl-Shift-⌫`／`Ctrl-[` → 行列零变化；② 先 `Shift-↓` 跨格文本选择再按同五键 → **仍零变化**（`r:2 c:2` 五次单变量一致）；③ 单元格右击 → 无菜单；④ 表格**左缘悬停**确实出现一个可拖元素（`div.sc-1iqnrwp-0` @498,186），但点它无菜单、无反应。另：表格右缘三枚无标签按钮一点就弹「在桌面应用中打开」层，关掉后行为同上 | ★ **第 332 批补一条更精确的原因**：单元格里 `Escape` 确实进**块选择态**（`body.block-select`），但粒度是**整张表**——该态下 `Alt-↓` 零变化、`Ctrl-⌫` 把**整张表删掉**（REST 读回 `none`）⇒ 卡的不是"没有选择态"，是**选择态的粒度不对**。⇒ 按"已穷举"结案：**这七条键在本会话可触达的前置下采不到**。措辞纪律：**不写成"官方没有"**（可能是另一套选择模型或此版本 web 端不生效）；**产品级结论不受影响**＝本地整族无绑定（`G1577`）。若日后再采：换移动/平板视口、或让用户在界面上选中行/列后我再按键 |
| B | 表 D 的 21 条任务键 | 21 | 本地任务行**不可聚焦**（`G1574`：`activeElement` 是 `body`、无 `role`/`tabindex`）⇒ 本地结构性不可比。★ **官方侧已采 7 键**：`Space`／`Ctrl-/`／`Ctrl-Alt-T` 切完成、`Ctrl-Alt-Shift-T` 切取消、**`Ctrl-Shift-S` 开日程选择器（popup ＋ 焦点落 INPUT）**、**`Ctrl-Shift-D` 开截止选择器（同上）**、**`Enter` 进编辑态（popup ＋ 焦点落 TEXTAREA、内容＝任务文本）**。⚠ 无定论 4 键：`Ctrl-Alt-S`／`Ctrl-Alt-R` 读回面无变化、`Alt-↓`（NEXT_TASK）焦点未见移动、`Ctrl-Shift-O` 弹出的是 INPUT 焦点浮层（是否跳到出处未证）。★ 仪器规律：点行后**第一下按键被吃掉**（进编辑态），第二下才执行。★★ **第 320 批补齐 3 条**：`↑`／`↓` **确实在行间移焦点**（中间行 `↓` 落到下一行、到底行 `↓` 不动；`↑` 反向，**不环绕**），`Ctrl-Z`／`Ctrl-Shift-Z` 在编辑态里**撤销/重做逐字生效**（`TKNX2ZZ→TKNX2Z→TKNX2ZZ`） | 剩 `Ctrl-Shift-O` 的"是否跳到出处"**未定证**（弹出的是 INPUT 焦点浮层、`url` 不变）；其余官方键已采完；**产品结论已定**（本地整族无从作用，`G1574`）⇒ 本行**按"官方侧已采完、本地结构性不可比"结案** |
| G | 表格里的**行/列选择态**（表 E 的 A/C 两行都卡在这里） | 1 | 第 331 批证明官方**有块选择态**（`Escape`→`body.block-select`），但表格里 `Escape` 是否进入"单元格/行选择"**未试** | ⇒ 下一手：在表格单元格里按 `Escape`，看 `body` class 与行/列高亮；若进态，A/C 两行的 20 条键就有救 |
| H | `Ctrl-Alt-T`（`TOGGLE_TOGGLES`） | 1 | 读数面已备好（`state:toggleish`）；本地能造出折叠块、读得到 `data-open`，**但 `Ctrl-Alt-T` 本地恒无反应**（`data-open` 一直是 `false`）；官方那条入口仍没点出折叠块 | ⇒ 官方入口换文案/坐标再试；若官方也"无反应"，则本例退化为"两侧都不支持该键"，可直接结案 |
| C | 表 E 剩余的 13 条表格键（`CUT/COPY/PASTE`／`CLEAR_CELL_CONTENTS`／`MOVE_ROWS_UP/DOWN`／`MOVE_COLUMNS_LEFT/RIGHT`／`DELETE_ROWS`／`DELETE_COLUMNS`／`ADD_CONTENT`） | 13 | 与 A 行**同一前置缺口**：本会话在单元格光标下拿不到"行/列选择态"（A 行已穷举四条路径）；这 13 条的语义按面板都得先有选择对象 | ★ 第 332 批已确认：`Escape` 进的是"整表选择"、不是"行/列选择" ⇒ 与 A 一并按"前置不可达"结案；产品结论仍成立＝本地表格整族无绑定（`G1577`） |
| D | 表 B 的 `RENAME`（`⇧⏎` 页面块重命名） | 1 | 官方**页面块**现在造得出来了（第 326 批 `Ctrl-Shift-P` 插出页面块 ⇒ `G1584`），但**本地没有 page 块类型**（`G1408` 一族）⇒ 两侧无共同前置 | ⇒ 只能做**单侧**采集（官方侧），产品结论已由"本地无 page 块"给出；单侧读数优先级低 |
| ~~E~~ | ~~`Ctrl-\` 侧栏收展的复测~~ **已清（第 330 批，`G1587`）** | — | 每步 3s、连按四次：本地 dom 奇偶交替（真切换），官方四次全等（无反应） | — |
| ~~F~~ | ~~`Ctrl-K` 在编辑器内的官方读数存疑~~ **已清（第 329 批，`G1586`）** | — | 复测结论：官方 `Ctrl-K` 开**链接输入框**（与方程同一 `input` 组件）、选中文本被涂 `rgb(173,208,245)`；那枚 `highlight` 不是伪影 | — |

★ 已完成、不在本清单内的：三档观测面（`a11y`／`animation`／`db`）、Wave 1 块级核心 12 面、
表 A 列表四键、表 B 查找/替换、表 D 的 `Ctrl-J`／`Ctrl-Alt-T`、表 E 的入口形态与 3 条增行增列键、
粘贴面、可达性面、动效面；
★ **第 321–328 批新增**：评论入口（`G1578`）、组合/区块链接（`G1579/80`）、输入方程（`G1581`）、
行内格式七键（`G1582`）、`Escape` 退层（`G1583`）、样式/装饰/卡片六键＋**页面块插入**（`G1584`）、
每日笔记（`G1585`）；另有两条"两侧一致 / 零差异"的实测：`Ctrl-Enter`（AI 助手）、`Space`／`Shift-Space`（插块两键）。

## 三十二、★ 续批二十七（2026-10-29）：**表 E 剩余键穷举两条前置** —— 均不得，记为不可达

净新增 **0 条 G** · 零产品代码批。目标：把存量清单 A 行（表 E 的 7 条键）打通。

### 1、试了什么

| 前置 | 动作 | 官方结果 |
| --- | --- | --- |
| 单元格光标 | `Alt-↑↓←→`／`Ctrl-⌫`／`Ctrl-Shift-⌫`／`Ctrl-[` 逐键 | 行列数**零变化**（此前已记 `G1577`） |
| **+ Shift 扩选** | 先 `Shift-↓` 跨格选中，再按同五键（各 1.4s 静置） | ★ **同样零变化**：`r:2 c:2` 五次单变量前后一致 |
| 鼠标入口 | 单元格右击／表格右缘三枚无标签按钮（含先关弹层再点） | 无菜单／弹层遮挡 |

### 2、结论的措辞（重要）

**不写成"官方没有这七条键"。** 只写成：
**在"单元格光标"与"跨格文本选择"两种前置下，官方行列数零变化** ⇒ 该族要么需要另一种选择模型（鼠标行/列手柄），
要么在此版本 web 端不生效（与 `keyboard.md` 里 `Ctrl-Shift-7`「屏上零增量」同族）。

★ 无论哪种，**产品级结论不变**：本地表 E 整族无绑定（`G1577`），本地这一侧已经采到底。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 不变（**1569／G1577**） |
| 存量清单 | A 行已更新为「两条前置已穷举」，并写明剩下唯一候选 |

## 三十三、★ 续批二十八（2026-10-29）：**任务行可聚焦性补强** —— G1574 加证

净新增 **0 条 G**（补强 `G1574`）· 零产品代码批。

### 1、新证据

| 项 | 官方 | 本地 |
| --- | --- | --- |
| 任务行的元素 | **`div[role="button"]`**（点击后 `document.activeElement` 就是它） | 无 `role`／不可聚焦（点击后焦点落 `body`，`G1574` 原判） |
| `Space` | ★ **切成完成态**：REST 读回 `state:"done"`、markdown 由 `- [ ]` 变 `- [x]`（连按两下才落定，第一下把焦点交回 `body`） | 无从作用（没有可聚焦的行） |

⇒ `G1574` 从"能不能点中"升级为"**本地根本不给行 `role`/`tabindex`**"。

### 2、顺带打通：REST 建任务

`POST /tasks` 的 body 必须是 `{"tasks":[{"markdown":"- [ ] …","location":{"type":"inbox"}}]}`
（`location` 是**必填对象**，不是位置字段）。这比走 `Ctrl-J` 弹窗稳得多，后续任务面采样直接用。

### 3、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 条数不变（**1569／G1577**，G1574 行内加证） |
| 临时任务 | 探针建的 `TASKKEY3`／`TASKKEY4` 已 REST 删除 |

## 三十四、★ 续批二十九（2026-10-29）：**官方任务键批量采（REST 读回）** ＋ 一条仪器规律

净新增 **0 条 G**（补实 `G1574` 族）· 零产品代码批。

### 1、★★ 仪器规律：点任务行后**第一下按键被吃掉**

`Space` 与 `Ctrl-/` 都是"按一次不动、按第二次才生效"（`Ctrl-/` 实测：第 1 下 state 仍 `todo`，
第 2 下变 `done` 且写入 `completedAt`）。⇒ 点行那一下只把焦点交给行，**第一下按键负责进入编辑态**
（对应表 D 的 `EDIT_START`／行内编辑语义）。★ 不掌握这条会把"要按两下"误读成"这键没用"——
本批第一轮就是这么误判的。

### 2、官方任务键实测（每条用 REST 新建一条 inbox 任务，按两次，读回 `taskInfo`）

| 键 | 结果 | 证据 |
| --- | --- | --- |
| `Space`（TOGGLE_STATE） | ✅ 切完成态 | `state: todo → done` |
| `Ctrl-/`（TOGGLE_DONE_SLASH） | ✅ 切完成态 | `- [ ] → - [x]`、`completedAt` 写入 |
| `Ctrl-Alt-T`（TOGGLE_DONE） | ✅ 切完成态 | 第 312 批已测（`REST 读回 - [x]`） |
| `Ctrl-Alt-Shift-T`（SET_CANCELLED） | ✅ 切取消 | `state → canceled`、markdown 变 `- [ ] ~TKC…`（删除线记号） |
| `Ctrl-Alt-S`（SCHEDULE_FOR_TODAY） | ⚠ **两次按键后 REST 无变化** | `taskInfo` 恒 `{state:"todo"}`、无 schedule 字段 |
| `Ctrl-Alt-R`（REMIND_IN_ONE_HOUR） | ⚠ 同上无变化 | 同上 |

★ 对 `Ctrl-Alt-S`／`Ctrl-Alt-R` 的措辞：**不写成"官方没有"** —— 可能作用在别的字段（本批只读了 `taskInfo` 与顶层键），
也可能要求任务已在某个视图（今天／即将进行）里。**记为"读回面未观察到变化"**。

### 3、与本地的关系

本地任务行**不可聚焦**（`G1574`：点击后 `activeElement` 是 `body`、无 `role`／`tabindex`）
⇒ 上述整族"按两次才生效"的语义在本地**没有承载面**，产品结论不变。

### 4、验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 不变（**1569／G1577**） |
| 临时任务 | 本批 6 条探针任务全部 REST 删除（读回 `REMAIN 0`） |

## 三十五、★ 续批三十（2026-10-29）：**任务键再采 3 键**（弹层与编辑态）

净新增 **0 条 G** · 零产品代码批。沿用"按一次→查，无变化再按一次"适配「第一下被吃」的规律。

| 键 | 观测 | 判定 |
| --- | --- | --- |
| `Ctrl-Shift-S`（OPEN_SCHEDULE_DATEPICKER） | `popup-backdrop` 出现、焦点落 `INPUT` | ✅ 打开日程选择器 |
| `Ctrl-Shift-D`（OPEN_DEADLINE_DATEPICKER） | 同上 | ✅ 打开截止选择器 |
| `Enter`（EDIT_START） | `popup` 出现、焦点落 `TEXTAREA`、内容＝任务文本 `TKNAV1` | ✅ 进入编辑态 |
| `Alt-↓`（NEXT_TASK） | 无弹层、焦点仍在原行（`div[role=button]` 文本仍 `TKNAV1`） | ⚠ 未见移动（可能需先在列表里建立选中态） |
| `Ctrl-Shift-O`（OPEN_TASK_LOCATION） | 弹出 `INPUT` 焦点浮层、URL 未变 | ⚠ 是否为"跳到出处"**未证** |

⇒ 官方侧累计 **7 键有定论**、4 键待定；本地侧因行不可聚焦整族无从作用（`G1574`）。

### 验收

| 项 | 结果 |
| --- | --- |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 不变（**1569／G1577**） |
| 临时任务 | `TKNAV1`／`TKNAV2` 已 REST 删除 |

## 三十六、★ 续批三十一（2026-10-29）：**`Ctrl-Shift-M` 评论入口上屏** —— G1578

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.comment`（23 行 / 7 条 sev2 / 6 条已声明）。

这条的起点是本地代码里的一句自陈：`shell-shortcuts.tsx:17-19` 写明 `COMMENT ⌘⇧M` **故意不绑**，
理由是「waits on an entry point that was never collected」——缺的不是键，是**官方入口长什么样**。
本批把那个入口采下来了。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 打 `QCOMMENTMARK alpha` | 文本在场 | 文本在场 |
| `Ctrl-A` 选中 | 选区落在块尾（offset 18） | offset 1（已声明归 `editor.selection.ctrl-a-ladder`） |
| **`Ctrl-Shift-M`** | `popup-backdrop` **0→1**、名册新增「输入你的评论」、焦点离开编辑器 | **零反应**（`popup-backdrop` 恒 0） |
| `Escape` | ⚠ 浮层**仍为 1**（一次没关掉） | — |

⇒ **G1578**＝官方有评论入口、本地按键未绑定。★ 两条诚实边界：① `Escape` 一次没关掉，
关闭键**未定**，不写成"Esc 可关"；② 本地不是漏做，是显式取舍，本条正是它等的那个形态。

### 仪器侧

- 新增 README 坑 15：**发现型 spec 先看文本名册新增了什么，再补 `stateSelectors`**。
  猜选择器的代价是 `state` 恒为 0，看着像"官方没弹"，其实探针指错了地方。
- 顺手清掉一条幽灵记录：`shell.tasks.create-and-toggle-done` 的 spec 早已删除，
  但两次 run 记录还留在 `runs/`，differ 因此一直报一条 `uncomparable`。记录改名为 `.stale`，矩阵已无该行。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.comment`（differ，7 条 sev2）；幽灵行已消失 |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1570／G1578** |
| 临时产物 | 两侧临时文档由 spec teardown 软删；探针任务本批未新建 |

## 三十七、★ 续批三十二（2026-10-29）：**组合键与区块链接两键上屏** —— G1579／G1580

净新增 **2 条 G** · 零产品代码批。矩阵新增 spec `editor.key.group-and-blocklink`（47 行 / 17 条 sev2 / 2 条已声明）。

这两条的起点是面板「整理」段与「编辑」段各一条从未按过的键：`组合 CtrlG`、`区块链接 CtrlShiftK`。
两侧各 14 步（两块文本 → `Ctrl-A` → `Ctrl-G` → `Ctrl-Shift-G` → `Ctrl-Shift-K` → 单词选区 → `Ctrl-Shift-K`）。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-G`（文本选中态） | 落到**查找**：名册新增「查找」「暂无结果」、焦点离开编辑器 | **零反应**（无 find、无组合） |
| `Ctrl-Shift-G` | 同上（查找面板仍在） | 零反应 |
| `Ctrl-Shift-K`（多块选区） | **零反应**（无链接选择器） | **弹命令面板**（`role="dialog"` 0→1） |
| `Ctrl-Shift-K`（单词选区） | **零反应** | 同样**弹命令面板** |

⇒ **G1579**＝`Ctrl-G` 同键两侧落点不同（官方走查找、本地无绑定）；**G1580**＝`Ctrl-Shift-K` 两侧都不通，
但原因不同：官方入口在 web 端本会话不可达，本地是**键被命令面板抢走**。
根因已定位到一行：`src/components/search/CommandPalette.tsx:37` 的 window 级门控
`(e.metaKey || e.ctrlKey) && key==='k'` **不排除 Shift**——`keymap.ts` 那套严格 `matches()` 管不到它。

★ 诚实边界两条：① 块选择态（拖动柄多选）本批**没建立**，所以官方「组合」是否另有通路**未证**；
② 官方「区块链接」是否存在 web 入口**未证**——只记「两种选区内零反应」。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.group-and-blocklink`（differ，17 条 sev2） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1572／G1580** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 三十八、★ 续批三十三（2026-10-29）：**输入方程上屏** —— G1581

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.equation`。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 打 `FORMULA` | 在场 | 在场 |
| `Ctrl-A` | 文本选中 | 文本选中 |
| **`Ctrl-Shift-E`** | 焦点交给 **`input.sc-jxjmdu-5.kiqmvz`**（`inEditor` true→false） | **零反应**（焦点仍在 `.ProseMirror`） |
| `Escape` | 焦点**回到编辑器** | 仍在编辑器 |

⇒ **G1581**＝`Ctrl-Shift-E` 的差异不在"插入了什么"，而在**入口把焦点交给谁**。
块名册与文本名册两侧全程一字未变（`FORMULA` 仍在）。

★ 三条诚实边界：① 只证焦点交给了一枚输入框，placeholder／值／提交后的节点种类**都没读**；
② "光标态"那一步被上一步的输入框接管，**不能**当对照 ⇒ 光标态是否也开框**未证**；
③ 第一版步骤把 `Escape` 放在中间，直接踩到**官方 `Escape` 会把焦点从编辑器送到 `body`** 这条行为，
导致后面三步在官方侧全在没有焦点的状态下执行 ⇒ 重排步骤后才拿到干净读数（`wave1-39`）。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.equation` |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1573／G1581** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 三十九、★ 续批三十四（2026-10-29）：**表 A 行内七键上屏** —— G1582

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.inline-chord-family`（124 行 / 56 条 sev2）。

这七条键（`Ctrl-B`／`Ctrl-I`／`Ctrl-Shift--`／`Ctrl-Shift-B`／`Ctrl-Shift-C`／`Ctrl-E`／`Ctrl-K`）
在**静态账里从没上过屏**；此前采过的 `editor.md-rules.inline-mark` 是 **markdown 记号线**，不是快捷键。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-B` 加粗 | `bold` ✓ | `bold` ✓ |
| `Ctrl-I` 斜体 | `italic` ✓ | `italic` ✓ |
| `Ctrl-Shift--` 删除线 | `strike` ✓ | **无** |
| `Ctrl-Shift-B` 高亮 | `highlight` ✓ | **无** |
| `Ctrl-Shift-C` 代码 | `code` ✓ | **无** |
| `Ctrl-E` 行内代码 | `code` ✓ | `code` ✓ |
| `Ctrl-K` 链接 | 读数 `highlight`（**存疑**） | **弹命令面板**（G1580 同根因） |

⇒ **G1582**：本地这三条落空的根因不是"没做"，是**键位表来源不同**——本地全部来自 TipTap 扩展默认
（`Mod-Shift-s`／`Mod-Shift-h`／`Mod-e`），官方表是 `Ctrl-Shift--`／`Ctrl-Shift-B`／`Ctrl-Shift-C`，
**只有恰好撞上的三条能用**。

★ 三条诚实边界：① 官方 `Ctrl-K` 读数 `highlight` **存疑**（疑似捕获到上一块的渲染）⇒ 不改判，下批复核；
② 本地 `Ctrl-Shift-B` 之后 `Enter` 不再分块，后续文本并进同一块（原因未定）；判据只看"有没有出现某个 mark"，
不受影响；③ 矩阵 56 条 sev2 里大部分是 `styles` 直方图与块文本漂移，不是 56 条产品差异。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.inline-chord-family`（differ） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1574／G1582** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十、★ 续批三十五（2026-10-29）：**表 B 插块两键 ＋ `Escape` 退层** —— G1583

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.insert-block-space`（20 行 / 5 条 sev2）。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Space`（表 B `INSERT_AFTER`） | 打出空格，块数不变 | 打出空格，块数不变 |
| `Shift-Space`（表 B `INSERT_BEFORE`） | 打出空格 | 打出空格 |
| `Escape`（表 B `CANCEL`） | **退一层**：焦点从编辑器落到 `body` | 焦点与选区**原地不动** |

⇒ 两条插块键在**文本编辑态**两侧都没触发（如实记"未触发"，不写成"官方没有"——
可能要先有块选择态，本批没建立）。**G1583** 来自 `Escape`：把第 323 批那条
"方程输入框里按 Esc 焦点回到编辑器"并进来，官方 `Esc` 就是**逐层退出**（子编辑器→编辑器→body），
本地编辑器层没有这个动作。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.insert-block-space`（differ，5 条 sev2，1 条已声明） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1575／G1583** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十一、★ 续批三十六（2026-10-29）：**样式/装饰/卡片六键上屏** —— G1584（并收窄 G1408）

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.turn-into-extra`。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-Shift-4` 强调 | 字重 **400→700**、字号 15→16px | 零变化 |
| `Ctrl-Shift-P` 页面 | **插出页面块**（名册新增「页面预览将显示在此处。单击以添加内容。」） | 零变化 |
| `Ctrl-Shift-L` 卡片 | 弹**卡片配置面板**（「配置卡片」「套用样式」「预览」「自定义背景」） | 零变化 |
| `Ctrl-Shift-\` 聚焦装饰 | 块 rect.x 472→488 | 零变化 |
| `Ctrl-Shift-'` 区块装饰 | 块 rect 494/186 | 零变化 |
| `Ctrl-Alt-T` 折叠全部 | 无变化（测试块不是折叠块） | 无变化 |

⇒ **G1584**：本地这五条全无绑定。

★★ 本批最重要的一条不是差异本身，是**它改了一条旧结论的范围**：`G1408` 写「桥面构造不出页中页＝三条通路逐条封死」，
读起来像"页中页不可达"；但 `Ctrl-Shift-P` 在官方 web 上**直接插出了一个页面块**。
⇒ G1408 已就地加 ✎：那条"判死"只覆盖 REST／markdown／`blocks move` 三条**造样本**通路，**UI 键位是通的**。

★ 一条诚实边界：`Ctrl-Alt-T`（`TOGGLE_TOGGLES`）两侧都没变化——测试块不是折叠块，没有可折叠对象，
所以这条**不算进差异**，留待折叠块上下文再采。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.turn-into-extra` |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1576／G1584** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十二、★ 续批三十七（2026-10-29）：**`Ctrl-Enter`（AI 助手）上屏 —— 两侧一致，0 条 G**

净新增 **0 条 G** · 零产品代码批。矩阵新增 spec `shell.assistant.open`。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 打 `HELLO` | 在场 | 在场 |
| `Ctrl-Enter` | **无任何承载面**（`popup-backdrop`／`dialog` 恒 0、正文不变） | 同样无承载面 |
| `Escape` | 焦点落到 `body`（G1583） | 焦点不动 |

⇒ 这条**没有**产生 G：两侧对 `Ctrl-Enter` 都没反应。它的价值是**把一个推测变成实测**——
「官方 web 端没有 AI 助手入口」此前是本会话的间接推断（助手面板在桌面端），现在有了一次直接读数。
★ 只写"本会话的 web 页面上没有反应"，**不写成"官方没有 AI 助手"**——桌面端很可能有，只是 web 入口不在这条键上。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `shell.assistant.open`（唯一 sev2 是 G1583 串进来的焦点差异，已声明） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | 不变（**1576／G1584**） |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十三、★ 续批三十八（2026-10-29）：**表 C 三条外壳弦上屏** —— G1585

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `shell.toggles.family`。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-\` 侧栏 | dom −506；第二次按**没回基线** | 来回切换（dom 375493→374770→374954） |
| `Ctrl-.` 专注模式 | dom +2833 再回落 | 侧栏整块收起（dom 375k→40k）再回来 |
| `Ctrl-Alt-N` 每日笔记 | **原地不动**（`url` 不变、正文不变） | **换页到 `/daily-notes`** |

⇒ **G1585** 来自每日笔记那条：本地真的换页，官方 web 同一按键没有任何响应。
★ 措辞纪律：Windows 上 `Ctrl+Alt` 是 AltGr 语义，官方**可能没收到这个组合**
⇒ 只写"这一按键通路官方没响应"，**不写成"官方没有每日笔记"**。

侧栏那条（`Ctrl-\` 第二次按没回基线）**读数不稳，本批不登记**，下批复测。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `shell.toggles.family` |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1577／G1585** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十四、★ 续批三十九（2026-10-29）：**`Ctrl-K` 干净复测** —— G1586（并结掉 G1582 的一条存疑）

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.key.url-link`。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 打 `ANCHOR` + 选中 | 文本选中 | 文本选中 |
| **`Ctrl-K`** | 焦点落 **`input.sc-jxjmdu-5.kiqmvz`**（与方程**同一组件**）；选中文本底色 `rgb(173,208,245)` | **弹命令面板**（`role="dialog"` 0→1） |
| `Escape` | 焦点回到编辑器（G1583 的"退一层"） | 面板仍在 |

⇒ **G1586** 两条收获：
① 官方 `Ctrl-K` 是**链接输入框**，本地这条键被命令面板抢走（`CommandPalette.tsx:37` 不排除 Shift、不看焦点）；
② 那枚"`highlight` 存疑读数"**不是伪影**——链接输入框开着时选中文本被涂成 `rgb(173,208,245)`，
mark 探针按"背景非透明"读成高亮。⇒ `G1582` 的注已就地结掉。

★ 结构面收获（写进 `G1586`）：方程输入与链接输入**共用同一个 styled input 组件**
⇒ 官方的"行内输入层"是一套可复用浮层，不是每个功能各造一个。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.url-link`（differ，9 条 sev2） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1578／G1586** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十五、★ 续批四十（2026-10-29）：**侧栏键复测** —— G1587（并更正第 328 批的一枚读数）

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `shell.sidebar-toggle.repro`（每步 3s、连按四次）。

| 按第几次 | 官方 dom | 本地 dom |
| --- | --- | --- |
| 基线 | 123083 | 374936 |
| #1 | 123089 | **374883** |
| #2 | 123089 | **375070** |
| #3 | 123089 | **374883** |
| #4 | 123089 | **375070** |

⇒ **G1587**：本地 `Ctrl-\` 是真切换（奇偶交替），官方 web 按四次**一次没动**。

★ 同批更正：第 328 批记的"官方第一次 −506"是**渲染抖动**（settle 只有 1.2s），不是键效——
那条读数当时就没登记，本批复测把结论钉成"官方无响应"。

★ 方法沉淀：**一次读数分不清「没动」与「动画没走完」；四次奇偶交替才分得清**。
这条已写进 `interactions.md` V200，后续外壳动效类读数都按这个口径。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `shell.sidebar-toggle.repro` |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1579／G1587** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十六、★ 续批四十一（2026-10-29）：**块选择态** —— G1588（一条把两处边界同时解开）

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `editor.block.selection-mode`。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 两块 `ALPHA`／`BETA` | `["ALPHA","BETA"]` | `["ALPHA","BETA"]` |
| **`Escape`** | 焦点落 **`body.…block-select`**、选区消失 | 焦点仍在 `.ProseMirror`（无该态） |
| `Shift-↑` | 无名册变化（选择态内部） | 变成跨块文本选区 |
| **`Ctrl-G`** | **`["ALPHA BETA"]`**（结构变了＝成组） | 零变化 |
| `Alt-↓` | 无变化（操作对象是块组） | **`["BETA","ALPHA"]`**（单块被搬走） |
| `Ctrl-Shift-G` | 再改结构（`["ALPHA BETA","BETA"]`） | 零变化 |

⇒ **G1588**＝官方有块选择态、本地没有；`Ctrl-G` 在这个态里才成组。

★★ 这条一次解开两处边界：`G1579`（文本态 `Ctrl-G` 为什么走查找）与 `G1583`（`Escape` 的"退层"退到哪）
——`Ctrl-G` 是**按态分派**的：文本态→查找、块选择态→组合。两条旧行都已就地加 ✎。

★ 诚实边界：块名册只证「结构变了」，**不证**是组容器还是并块——取消组合后名册出现 `["ALPHA BETA","BETA"]`，
第二个「BETA」疑似组内嵌套块被重复计入（仪器的块抽取没处理组容器）。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.block.selection-mode` |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1580／G1588** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十七、★ 续批四十二（2026-10-29）：**表格里的选择态粒度** —— 补强 G1588（0 条新 G）

净新增 **0 条 G** · 零产品代码批。目标：给存量清单 A/C 两行（表 E 的 20 条键）找前置。

| 步（官方，REST 建 3×2 表） | 读数 |
| --- | --- |
| 点单元格 | `body.nocmd.noshift.nodrag.noblock`、表 `r:3 c:2` |
| **`Escape`** | `body.…block-select` —— **进的是"整块选择"** |
| `Alt-↓`（`MOVE_ROWS_DOWN`） | `r:3 c:2` → `r:3 c:2`（**零变化**） |
| `Ctrl-⌫`（`DELETE_ROWS`） | 表块 **`none`** —— **整张表被删掉** |
| `Ctrl-[`（`ADD_CONTENT`） | 无表可加（已被删） |

⇒ 结论：**不是"没有选择态"，是"选择态的粒度不对"**——`Escape` 给的是整块/整表，表 E 要的是行/列。
这条把 A/C 两行的卡点写精确了，但**没有解锁**那 20 条键：本会话仍拿不到行/列选择对象。

### 收尾与遗留

- ★ 本批探针文档用 REST `DELETE /documents`（字段名 **`documentIds`**）删除：**165 篇 `QODER-ILAB-*` 全部删除**，
  返回 200 带 id。
- ★★ **但随后 `GET /documents`／`GET /blocks?id=…` 仍能读到它们**——一度被读成"没删掉"。
  ✎ **第 333 批复核（用户选择"UI 逐篇软删"后去执行时发现）**：进浏览列表**全页搜 `QODER-ILAB` 零命中**、
  卡片数 37 且标题全是「无标题文档」⇒ **它们确实进了「最近删除」**，是 **REST 读面把回收站一起列出来**。
  ⇒ 又一条「看得到≠还在」。**不需要再逐篇 UI 删**。
- ⚠ **仍留在界面上的**：37 篇「无标题文档」（1 小时前更新）。**无法证明它们是谁建的**（可能是本项目的空壳探针，
  也可能是用户自己的草稿）⇒ **不动，留给用户判断**。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 本批无新 spec（探针走 scratch 脚本） |
| `git status --porcelain src e2e` | **空** |
| 台账 | 不变（**1580／G1588**） |
| 临时产物 | ⚠ 165 篇历史探针文档待清（见上） |

### 四十七·补：清场结论（2026-10-29）

- REST `DELETE /documents`＋`documentIds` **真的把 165 篇探针文档删掉了**（列表页搜不到）。
- 之前的"没删掉"判断，是把 **REST 读面带回收站** 当成"还在"——已在 `interactions.md` V202 里就地更正。
- 界面上剩 37 篇「无标题文档」：来源不可证（我们的空壳 vs 用户草稿）⇒ **不碰**。

## 四十八、★ 续批四十三（2026-10-29）：**快速开启另两弦** —— G1589

净新增 **1 条 G** · 零产品代码批。矩阵新增 spec `shell.quick-open.alt`。

| 键 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-P`（`QUICK_OPEN_ALT`） | `popup-backdrop` 0→1，「文档」「在 zhang's Space 中」「无标题文档…」 | **零反应** |
| `Ctrl-Shift-O`（`QUICK_OPEN_SAFARI`） | 同样 0→1（**web 端也启用**） | **零反应** |

⇒ **G1589**：官方是**一个面板三条弦**（`Ctrl-K`／`Ctrl-P`／`Ctrl-Shift-O`），本地只有 `Ctrl-K`。
这条与 `shell.command-palette.toggle-vs-jump` 合起来才是完整形状——那条只按过 `Ctrl-K`。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `shell.quick-open.alt`（differ，2 条 sev2、20 条已声明） |
| `git status --porcelain src e2e` | **空**（零产品代码改动） |
| 台账 | **1581／G1589** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 四十九、★ 续批四十四（2026-10-29）：**`Ctrl-Alt-T` 上屏 —— 前置没造出来，本批无结论（0 条 G）**

净新增 **0 条 G** · 零产品代码批。矩阵新增 spec `editor.key.toggle-all`（45 行 / 23 条 sev2）。

| 尝试造折叠块 | 官方 | 本地 |
| --- | --- | --- |
| `Ctrl-Shift-7`（`TOGGLE_LIST`） | 首块属性 `_blockOverhang` **不变**、kinds 空 | 首块仍是 **`p`** |
| `/` ＋「折叠」＋`↵` | 同上（仍是普通块） | 同上（仍是 `p`） |
| `Ctrl-Alt-T` ×2 | `HEAD1`/`CHILD1` 计数**一字不变** | 同样一字不变 |

⇒ **本批没有结论**，也不登记 G：**没有可折叠对象**，`Ctrl-Alt-T` 两侧「没变化」是**前置不成立**，
不是"官方没有该键效"。矩阵里那 23 条 sev2 是两侧块结构/样式天然不同所致，不要读成 23 条产品差异。

★ 诚实边界：`Ctrl-Shift-7` 造不出折叠块**不等于**官方没有折叠块——斜线菜单的过滤词可能不匹配
（官方菜单是本地化文案、本地菜单用英文/中文两套），也可能是这条通路需要别的前置。
已把「折叠块怎么造」写进存量清单 H 行，留作下一批的第一个动作。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.key.toggle-all`（differ，但**前置不成立**，读法见上） |
| `git status --porcelain src e2e` | **空** |
| 台账 | 不变（**1581／G1589**） |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 五十、★ 续批四十五（2026-10-29）：**仪器加 `clickText`／`steps.targets`，`Ctrl-Alt-T` 仍缺读数面（0 条 G）**

净新增 **0 条 G** · 零产品代码批（只动实验台仪器）。

### 仪器（本批的真正交付）

- **`clickText` op**：在 `[data-testid="command-menu"]`／`[role=listbox|menu|dialog]` 里按**文案**命中菜单项并点它
  —— CSS 选不了"第几项是折叠列表"，斜线菜单又是运行时渲染。
- **`step.targets`**：给"只有某一侧才有的前置"分头写步骤；跳过的步仍写一条 `skipped` 记录（带观测），
  differ 按共有 step index 比。
- README 坑 16 记录这两条（含"两侧菜单形状不同"的写法）。

### 折叠块（`Ctrl-Alt-T` 的前置）

| 通路 | 官方 | 本地 |
| --- | --- | --- |
| 斜线菜单结构 | **二级**：`列表` → `折叠列表`（G1544 的"扁平 20 项"指顶层） | 扁平过滤：`toggle` → `折叠列表` |
| 点完「折叠列表」 | 正文里的 `/` 被清掉、块还在 | 块名册多出一个 **`div`**（疑似折叠容器） |
| `Ctrl-Alt-T` ×2 | 无读数可用 | 无读数可用 |

⇒ **折叠块造得出来了，但折叠态读不出来**：`kinds` 档对折叠块返回空、块名册没有 toggle 标识。
所以本批仍然**不登记 G**——"没变化"是**判据缺失**，不是产品事实。
存量清单 H 行已收窄为"给 `kinds`／块名册补折叠块识别"。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | `editor.key.toggle-all` 重跑（59 行 / 35 sev2，**判据未成立**，别读成 35 条差异） |
| `git status --porcelain src e2e` | **空** |
| 台账 | 不变（**1581／G1589**） |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 五十一、★ 续批四十六（2026-10-29）：**折叠块造法打通一半** —— G1590

净新增 **1 条 G** · 零产品代码批。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| `/` ＋ 选「折叠列表」 | 二级菜单（`列表` → `折叠列表`），点中后正文 `/` 被清 | 扁平过滤 `toggle`，点中 |
| 折叠块节点计数 | **0（始终没有）** | **0→2**（`data-open`／`.toggle-summary`）⇒ 造出来了 |
| 紧接着 `Enter` | — | **2→0** ⇒ 折叠块被拆回普通段落 |
| `Ctrl-Alt-T` ×2 | 无判据 | 无判据 |

⇒ **G1590**：本地 `/toggle` 能造折叠块，但 `Enter` 会把它拆掉；官方那条入口在**二级菜单**里没点出折叠块
（⚠ 边界：可能是点没点中，**不写成"官方没有折叠块"**）。

★ 本批把"读数面"补上了（`state:toggleish`：本地两个节点、官方编辑器内 `class*=toggle`），
第 335 批"读不出来"的缺口**已解**；现在缺的是**稳定的可折叠对象** ⇒ 存量清单 H 行已按这个改。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | `editor.key.toggle-all` 重跑（含 toggleish 档） |
| `git status --porcelain src e2e` | **空** |
| 台账 | **1582／G1590** |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

## 五十二、★ 续批四十七（2026-10-29）：**富文本粘贴上屏 —— 两侧一致，0 条 G**

净新增 **0 条 G** · 零产品代码批（仪器加了一个 `pasteHtml` op）。

粘贴面此前只有"纯文本／裸 URL"（`editor.paste.plain-text`）；**带格式的 HTML 粘贴从没对过**。

| 步 | 官方 | 本地 |
| --- | --- | --- |
| 打 `HEAD` ＋ `↵` | 在场 | 在场 |
| 粘贴 `<b>BOLDX</b> <i>ITX</i> <a href=…>LINKX</a>` | 三个词都在；`marks`＝**`["bold","italic","link"]`** | 同左，**逐字相同** |

⇒ **两侧完全一致**，矩阵判 `match`（8 行 / 0 条 sev2）。这条不出 G，但把粘贴面从"只测纯文本"补成了
"纯文本 ＋ 富文本"两块都上过屏。

★ 仪器：新增 **`pasteHtml`** op（`DataTransfer` ＋ 合成 `ClipboardEvent`），README 坑 17 已记。

### 验收

| 项 | 结果 |
| --- | --- |
| 矩阵 | 新增 `editor.paste.html`（**match**） |
| `git status --porcelain src e2e` | **空** |
| 台账 | 不变（**1582／G1590**） |
| 临时产物 | 两侧临时文档由 spec teardown 软删 |

### 五十一·补：折叠块第二轮（2026-10-29）

- 本地折叠块**新建即收起**：`data-open="false"`（`NodeViewWrapper` 的默认档）。
- 在该折叠块上连按 `Ctrl-Alt-T` 两次：`data-open` 恒 `false` ⇒ **本地这条键无响应**（与 `craft-keymap.ts` 无 `TOGGLE_TOGGLES` 分支一致）。
- 官方那条二级菜单入口**仍未点出折叠块**（`[class*="toggle"]` 恒 0）⇒ 两侧暂时**没有共同的可折叠对象**，`Ctrl-Alt-T` 仍不做结论。
