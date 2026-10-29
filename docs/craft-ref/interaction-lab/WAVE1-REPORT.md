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
