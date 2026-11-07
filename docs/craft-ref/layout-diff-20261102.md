# craft.do ↔ 本地复刻：布局与样式偏差报告（2026-11-02 采集）

- 采集：1440×900、dpr 1、浅色主题、两侧同一 probe；craft 12 屏、本地 10 屏。
- 数据：`docs/craft-ref/layout-20261102/craft/_shell-truth.json`（手工壳测量）+ `diff.json`（`node scripts/craft-ref/diff-ui.mjs` 生成，gitignored）。
- 本报告所有数字都能在 `diff.json` 里复算：`screens.<屏>.shell` / `.metrics` / `.chrome` / `.nodeIndex.<craft|local>[节点号]` / `.textStyles.pairs`。文中 `c#n` = craft 节点号、`l#n` = 本地节点号，即 `nodeIndex` 的下标。
- 范围：只做尺寸/位置/间距/字体/颜色/圆角/阴影。两侧内容不同（文档标题、条数、空态文案），内容差异不计入偏差。

屏名缩写：`AD` 所有文档 · `TK` 任务 · `CA` 日历 · `IB` 未分类 · `ST` 星标 · `FO` 文件夹 · `TG` 标签 · `TR` 回收站 · `TP` 模板 · `DC` 文档 · `SO` 搜索浮层 · `SM` 设置弹窗。

---

## 1. 结论摘要

1. **应用壳不同构**：craft 有 1440×48 全宽顶栏（`_shell-truth.json`），侧栏位于其下（aside 288×852@(0,48)）；本地没有全宽顶栏，唯一顶栏是 `main` 内的 `<header>` 1148×53@(292,0)，侧栏从 y=0 起 → **Δdy −48 / Δdh +48 / 顶栏 Δw −292 / Δh +5**。〔G01、G02〕
2. **主列起点差 4px**：craft main 1152×852@(288,48)；本地 1148×900@(292,0)，多出的 4px 来自侧栏拖拽手柄 `w-1` → **Δdx +4 / Δdw −4**。〔G03〕
3. **内容内边距是 craft 的两倍**：craft 16px（内容列 304,100，首行 y=116）；本地 32px（内容列 324,85）→ **横向 +16、纵向 +16**，并因此把 5 列卡片网格挤成 4 列（208→256 宽）。〔G10、G11、G15〕
4. **首屏形态不同**：craft 直接是 5×208×260 文档卡（列距 228 / 行距 280，gap 20）；本地是 5×207×80 快捷操作条（gap 12）+ 4×256×64 紧凑卡（gap 20）→ **卡高 −196、列数 −1**。〔G15、G16〕
5. **13px UI 的行高整体偏高**：同区位 47 组文本对中，lineHeight 落在 ±1px 的只有 **7/47**；导航行 16→19.5（**+3.5**），行盒 32→36（**+4**），步进 33→40（**+7**）。〔G17、G29〕
6. **标题层级偏大**：h1 22/600/26.4/ls 0 → 24/600/32/ls −0.6（**+2 / +5.6 / −0.6**）；文档标题 23/700/28 → 30/400/36 且 serif italic（**+7 / −300 / +8**）。〔G25、G26〕
7. **次级文字偏深、次文本偏淡**：craft 的"弱化"是 α0.55 等效 #808183，本地 `--muted-foreground` 是 #525C66 → **ΔRGB 46、ΔE 16.5**；反向地，导航未激活文字 craft α0.85 vs 本地 α0.7（**Δα 0.15**）。而页面底、正文色、卡片底完全一致（**ΔE 0 / 0 / 1**）。〔G37、G38、G36〕
8. **结构缺口**：本地 `/folders` 是 404；`DC` 屏缺 craft 的右侧检查器（296×853@(1144,47)）；`SO` 从未在本地采集。这三项无法用像素对齐解决。〔G06、§8〕

---

## 2. 测量口径与已知伪差异

| # | 伪差异 | 处理方式 |
|---|---|---|
| 1 | craft `shell.header` 是 2px 细条（probe 取"最短全宽元素"的启发式） | 一律不用；craft 顶栏取 `_shell-truth.json` 与 `div[class*="headerOuter"]`（`AD c#4` = 1440×48） |
| 2 | craft `shell.main` 是内部滚动列，不是 `<main>`；`DC` 屏选了 x=−278 的离屏抽屉 | 一律不用；craft main 取 `div[class*="_mainColumn_"]`（`AD c#251` = 288,48 1152×852） |
| 3 | craft `nodes` 上限 600，超限屏的节点是"未测"，不是"不存在" | `diff.json.screens.*.craftCapped`；`AD/IB/TR/SM/SO` 命中上限 |
| 4 | 本地颜色序列化为 `lab()/oklch()/oklab()`，craft 为 `rgb()/rgba()` | `diff-ui.mjs` 全部归一化到 RGBA-8bit（lab 走 D50→Bradford→sRGB），本次 **420 次颜色比较，0 次解析失败** |
| 5 | 本地 `SM` JSON 含全视口 fixed 节点；craft 浮层 JSON 其实是底层页面 | 浮层只报本地实测值，craft 记"未测"，不编 Δ |
| 6 | 两侧内容不同（标题、条数、空态文案） | 内容差异不计入偏差；文本匹配后用"同区位（≤200px）"过滤，42 组跨区位同名对（如 craft 分区头"标签" ↔ 本地导航"标签"）判为**错误匹配**，不计入统计 |
| 7 | 本地 `/folders` 是 404（只有 `folders/[id]`） | 单列 §8，作为结构缺口，不做测量 |

覆盖率（证明"没测到的不是一致"）：文本对共 **89** 组，其中同区位 **47** 组；在这 47 组里 fontSize 达标 33、fontWeight 达标 36、letterSpacing 47、backgroundColor 44、**lineHeight 仅 7**、color 仅 13。

---

## 3. 结构层（S1）：应用壳

| 元素 | craft | 本地 | Δ | 证据 |
|---|---|---|---|---|
| 全局顶栏 | 1440×48 @(0,0)，全宽，压在侧栏之上 | 无；替代物在 main 内：1148×53 @(292,0)（`DC` 屏 1148×48） | dx +292 / dw −292 / dh +5 | SH；`AD c#4`；`AD l#151`；`DC l#152` |
| 侧栏 | 288×852 @(0,48) | 288×900 @(0,0) | dy −48 / dh +48 | `AD c#46`；`AD l#1` |
| 主列 | 1152×852 @(288,48) | 1148×900 @(292,0) | dx +4 / dw −4 | `AD c#251`；`AD l#149`；4px = `SidebarResizer w-1` |
| 侧栏内容宽 | 288（无边框），行 268 @x10 | 287（`border-r` 1px），行 271 @x8 | +1 / Δx −2 | `AD l#1`、`AD l#12` |
| 侧栏顶区 | 空间切换行 268×36 @(10,56)（顶栏下 8px）；搜索在全局顶栏（搜索域 428×24 @(506,12)，占位文本"打开" @(506,16)） | 搜索行 287×52 @(0,0)，按钮 229×28 @(12,12) | 结构不同 | `AD c#57`、`AD c#25`、`AD c#26`、`AD l#2`、`AD l#3` |
| 侧栏底栏 | `_stickyFooter_` 288×61 @(0,839)：1px 分隔线 @y839 + 面板 268×53，按钮 28×28 @x18/50/82/129 y856 | `mt-auto` 287×53 @(0,847)：`border-t` @y847，按钮 28×28 @x12/44/76 y860 | dy +8 / dh −8 / 首按钮 dx −6 dy +4 | `AD c#218,220,222`；`AD l#130,132` |
| 文档右检查器 | aside 296×853 @(1144,47)，内容 284 @x1148 | **无** | −296 宽 | `DC c#196`、`DC c#199` |

结论：本地是"侧栏 + 单列 main"的两栏结构，craft 是"全宽顶栏 + 侧栏 + 主列 +（文档屏）右栏"的四块结构。这是本报告里唯一需要改 JSX 层级的项（G01/G02/G05/G06）。

---

## 4. 节奏与间距（S2）

| 项 | craft | 本地 | Δ | 证据 |
|---|---|---|---|---|
| 内容内边距 x | 16（`_viewWrapper_` pad 0 16；内容列 304 = main 288 + 16） | 32（324 = 292 + 32） | **+16** | `AD c#297 pad 0 16`、`AD c#254 pad 0 16`；`AD l#159 pad 32` |
| 内容内边距 y（顶） | 16（`AD c#298 pad 16px 0 80px`；首行 y=116 = 48+52+16） | 32（首行 y=85 = 53+32） | **+16** | `AD c#297`、`AD c#298`；`AD l#159` |
| 页头带高 | 52（1152×52 @(288,48)） | 53（= py 8 + 铃铛 36 + py 8 + border 1） | +1 | `AD c#254`；`AD l#151` |
| h1 在带内 y | 61（带顶 +13） | 10（bar 顶 +10） | −3 | `AD c#263`；`AD l#152` |
| h1 x（相对 main） | +70（带 36×36 图标，`AD/TK/CA/IB/TP`）/ +16（`ST/TG/TR`） | +24 | −46 / +8 | `AD c#263`、`ST c#270`；`AD l#152` |
| 卡片网格 | 5 列 208×260，列距 228（gap 20），行距 280（gap 20） | 快捷操作 5 列 207×80（gap 12）；最近编辑 4 列 256×64（gap 20） | 卡宽 +48、卡高 −196、列 −1 | `AD c#304`；`AD l#160`、`AD l#210` |
| 卡内 padding | 7px 10px 0（标题 y = 卡 y +13） | 6+7 竖向、10 横向（标题 y = 卡 y +13） | 0 | `AD c#311`、`AD c#315`；`AD l#210`、`AD l#211`、`AD l#216` |
| 侧栏导航行 | 268×32，步进 33，padding 7/11/7/6，radius 8，图标 20×20 @x16 | 271×36（min-h-9），步进 40（gap-1），padding 0 12，radius 12，图标 18×18 @x20 | 高 +4 / 步进 +7 / radius +4 / 图标 −2 / 图标 x +4 | `AD c#72`、`AD c#84`；`AD l#12`、`AD l#13` |
| 侧栏树行 | 268×32，步进 33，图标 @x16（chevron 12×12 叠在图标上） | 279×31.5，步进 33.5，文件图标 @x32（chevron 占 14 + gap 6） | 高 −0.5（一致）/ 图标 x **+16** | `AD c#175`、`AD c#179`；`AD l#71`、`AD l#72` |
| 侧栏分区头 | 行 32 高，标题 12px @x19，无 chevron | 行 23 高（px-1.5 py-1），标题 12px @x10，前置 14×14 chevron | 行高 −9 / 标题 x −9 | `AD c#133`、`AD c#138`；`AD l#63`、`AD l#64` |
| 侧栏树区 padding | 容器 x=10 | `px-1` → x=4 | −6 | `AD c#70`；`AD l#62` |
| `IB` 列表行 | 208×260 卡（同 `AD`） | li 1084×40，radius 8，步进 42 | −220 高 | `AD c#304`；`IB l#164` |
| `TR` 列表行 | 208×260 卡 | 1080×64，radius 12，步进 64，标题 15/500/23 | −196 高 | `TR l#170`、`TR l#175` |
| `TG` 列表行 | `_docGrid_` 单行 1120×32 | a 1058×36，radius 12 | +4 | `TG c#286`；`TG l#168` |
| `TP` 空态 | 行 1120×72，radius 10，bg rgba(26,28,30,.03) | 盒 1084×126，radius 12，虚线边框 | +54 高 | `TP c#300`；`TP l#160` |
| `CA` 日行 | 1120×105 @(304,152)，步进 121，radius 20 | section 832×92 @(450,163)，步进 108，radius 16 | 宽 −288 / 高 −13 / 步进 −13 | `CA c#274`、`CA c#293`；`CA l#167`、`CA l#181`（本地内容列被 `max-w-4xl` 夹到 896） |
| `TK` 顶部分段 | 页头带 52 + 任务行 1120×40 radius 8 @y116/348/654 | h1 bar 53 + tabs 1148×39 @y53 + section @y92 | 结构不同 | `TK c#268`、`TK c#297`；`TK l#164`、`TK l#169` |

---

## 5. 排版（S3）

| 项 | craft | 本地 | Δ | 结论 |
|---|---|---|---|---|
| h1 | 22 / 600 / 26.4 / ls 0（`AD c#263`） | 24 / 600 / 32 / ls −0.6（`AD l#152`） | +2 / 0 / +5.6 / −0.6 | 偏差 |
| 文档标题 | 23 / 700 / 28 / ls −0.3，色 rgb(31,34,37)（`DC c#167`） | 30 / 400 / 36 / ls 0，serif + italic（`DC l#223`） | +7 / −300 / +8 / +0.3 | 偏差（另含字体族/斜体） |
| 正文 | **未测**（craft `DC` 采集只有 1 个空块） | 15 / 400 / 23 / ls 0，色 rgb(31,34,37)@0.9（`DC l#226`） | — | 未测 |
| 卡片标题 | 15 / 600 / 18 / ls −0.13（`AD c#315`） | 15 / 600 / 18 / ls 0（`AD l#216`） | 0 / 0 / 0 / +0.13 | **一致** |
| 未命名占位标题 | 15 / 600 / 18，色 α0.25（`AD c#315`） | 16 / 400 / 24，色 α0.45（`AD l#243`） | +1 / −200 / +6 / +0.2 | 偏差 |
| UI 13px（侧栏标签） | 13 / 400 / 16 / ls −0.04（`AD c#93`） | 13 / 400 / 19.5 / ls 0（`AD l#36`） | 0 / 0 / **+3.5** / +0.04 | 偏差（行高） |
| 分区标题（星标/文件夹/标签） | 12 / 600 / 12 / ls 0.05，满对比 rgb(26,28,30)（`AD c#159`） | 12 / 600 / 15 / ls 0，色 α0.4（`AD l#99`） | 0 / 0 / +3 / −0.05 / Δα 0.6 | 偏差（行高 + 颜色） |
| meta（"已更新 …"） | 12 / 400 / 14.4 / ls 0.01，α0.55（`AD c#321`） | 12 / 400 / 15 / ls 0，α0.55（`AD l#217`） | 0 / 0 / +0.6 / +0.01 | **一致** |
| 空态文案 | 13 / 400 / 15.6 / ls −0.04，α0.55（`ST c#306`） | 14 / 400 / 20 / ls 0，`--muted-foreground`（`ST l#164`） | +1 / 0 / +4.4 | 偏差 |
| 日历日期 | 16 / 600 / 19.2 / ls −0.18（`CA c#296`） | 14 / 600 / 20 / ls 0（`CA l#169`） | −2 / 0 / +0.8 | 偏差（字号） |
| 日历星期 | 13 / 500 / 16 / ls −0.04，α0.25（`CA c#279`） | 14 / 400 / 20 / ls 0（`CA l#247`） | +1 / −100 / +4 | 偏差 |
| `TK` 分区标题 | 15 / 600 / 18 / ls −0.13（`TK c#331`） | 12 / 500 / 16 / ls 0（`TK l#170`） | −3 / −100 / −2 | 偏差 |
| 右侧检查器分区标签 | 11 / 600 / 12 / ls 0.05，α0.4（`DC c#221`） | 无对应 | — | 未测（结构缺失） |

字距是唯一整体达标项：47 组同区位对里 **47/47** 在 ±1px 内（craft 的 −0.04/−0.18/−0.13px 都是亚像素级）。

---

## 6. 色彩与描边（S4）

| 项 | craft | 本地 | Δ | 结论 |
|---|---|---|---|---|
| 页面底 | rgb(252,253,254) | lab(99.2573 −0.21 −0.6) = (252,253,254) | ΔRGB 0 / ΔE 0 | 一致 |
| 主文本 | rgb(26,28,30) | oklab(0.2252 0 0) = (26,28,30) | ΔE 0 | 一致 |
| 正文墨色 | rgb(31,34,37)（`DC c#167`） | (31,34,37) @α0.9（`--editor-fg`） | Δα 0.1 | 近似（craft 正文未测） |
| 次级文本 | rgba(26,28,30,0.55) → 等效 (128,129,131) | `--muted-foreground` #525C66 = (82,92,102) | ΔRGB 46 / ΔE 16.5 | **偏差** |
| 导航未激活文字 | α0.85 | α0.7 | Δα 0.15 | 偏差 |
| 激活行底 | rgba(26,28,30,0.06) → (238,240,241)（`AD c#80`） | oklch(0.94) = (234,235,237)（`AD l#12`） | ΔRGB 5 / ΔE 1.8 | 一致 |
| 卡片底 | rgb(255,255,255)（`AD c#307`） | lab(98.9676) = (252,252,252)（`AD l#211`） | ΔRGB 3 / ΔE 1 | 一致 |
| 分隔线色 | rgba(26,28,30,0.06) → (238,240,241)（`AD c#220`） | `--sidebar-border` = (229,230,231)（`AD l#130`） | ΔRGB 9 | 偏差（偏深） |
| 圆角：卡片 | 16（`AD c#307`），内容层 10 10 0 0 | 12（`AD l#210`、`AD l#211`） | −4 | 偏差 |
| 圆角：导航行 | 8（`AD c#72`） | 12（`AD l#12`） | +4 | 偏差 |
| 圆角：侧栏树行 | 8 | 8（rounded-md） | 0 | 一致 |
| 圆角：设置弹窗 | 未测 | 20（`SM l#248`） | — | 未测 |
| 阴影：卡片 | none | `shadow-sm` → 解析为全透明层，归一化 none | 0 | 一致 |
| 阴影：导航激活行 | none | 同（全透明层） | 0 | 一致 |

---

## 7. 覆盖层（S5）

**设置弹窗（`SM`）** — 本地实测：

| 项 | 本地实测 | 证据 |
|---|---|---|
| 遮罩 | 0,0 1440×900，oklab(0 0 0 / 0.16) | `SM l#247` |
| 弹窗 | 240,153 960×594，radius 20，bg 页面底 | `SM l#248` |
| 左导航 | 280×594，padding 16/0/12 | `SM l#249` |
| 导航行 | 232×32，radius 10，激活底 oklab(0.2252/0.08) | `SM l#265` |
| 右栏 | 679 宽，页头 h-14=56，h2 15/600/22.5 | `SM l#318`、`SM l#319` |
| 分隔线 | 679×1 @y209 | `SM l#324` |

craft 侧：`SM` 的 JSON 是底层页面（已知伪差异 5），**弹窗矩形未测**。唯一可用的 craft 数据是 `_round-16.json` 的导航行 **232×32 @x256**（本地 @x260，Δx +4）与 PNG。两者宽度/圆角/高度**不能**据此判定差异。

**搜索浮层（`SO`）** — 只有 craft 采集：浮层内唯一实测搜索域 428×24 @(506,12)（在顶栏中央），无 dialog 节点；本地从未采集（`diff.json` 记 `missingReason`）。**未测**。

---

## 8. 本地缺失与结构缺口

1. **`/folders` 404**：`src/app/(app)/folders/` 下只有 `[id]/page.tsx`，没有 `folders/page.tsx`。craft `FO` 屏是 288 侧栏 + 1152 主列 + 顶部 52 带 + `_docGrid_`，本地无对应页面 → 修 item，不是测量伪差。
2. **`DC` 屏缺右检查器**：craft 有 296×853@(1144,47) 的 aside（内容 284，分区标签 11/600/12/0.05），本地完全没有右栏，因此文档正文列只能居中（720 @x506），与 craft 的左对齐（728 @x358）永远对不上。
3. **侧栏信息架构不同**：
   - craft：所有文档 / 任务 / 日历 / 连接 / 与我共享 / 我的模板，下面挂 星标 / 文件夹 / 标签 三个可折叠分区，每个分区带一行 12px 说明（"收藏文档以便快速访问""固定关键标签以便快速访问"）。
   - 本地：首页 / 收藏 / 标签 / 未归档 / 最近 / 日记 / 任务 / 日历 / 模板 / 连接 / 回收站 / 归档，下面挂 文档 / 文件夹 / 集合 / 白板 四个分区，分区无说明行。
   - 缺：与我共享、Craft 模板库入口、分区说明行；多：首页、最近、日记、归档、集合、白板。渲染在 `SidebarNav.tsx:22-35`（12 项）与 `Sidebar.tsx:24-40`（4 个 `SidebarSection`）。
4. **首屏形态**：craft 无快捷操作条；本地无 craft 的 208×260 预览卡（`DocumentCard` 内容自适应 64 高）。
5. **`SO` 无本地采集**；`SM` craft 弹窗几何未测。

---

## 9. 每条偏差的处置建议

类别 `结构` = 需要改 JSX/布局；`外观` = 改 token / 类名即可。P0 影响整屏骨架，P1 明显可见，P2 细节。

| 编号 | 类别·优先级 | 偏差 | 证据（屏/节点） | craft | 本地 | Δ | 归属文件（当前类名/属性） | 建议改法 |
|---|---|---|---|---|---|---|---|---|
| G01 | 结构·P0 | 无全宽顶栏 | `AD c#4` / `AD l#151`；SH | 1440×48 @(0,0) | 1148×53 @(292,0)，在 main 内 | dx+292 dw−292 dh+5 | `src/app/(app)/layout.tsx:9-20`（`<Sidebar/>` 与 `<main>` 同级）；`src/components/app/AppPageHeader.tsx:21-27`（`flex min-h-12 …`） | 把 `AppShellHeader` 提到 `layout.tsx` 顶层、`<aside>` 之前，`h-12` 固定 48 并去掉 `min-h-12` |
| G02 | 结构·P0 | 侧栏起点 | `AD c#46` / `AD l#1` | 288×852 @(0,48) | 288×900 @(0,0) | dy−48 dh+48 | `src/components/sidebar/Sidebar.tsx:78-87`（`h-full`） | 随 G01 一起，侧栏容器改为 `h-[calc(100%-48px)]` 并让出顶栏 |
| G03 | 外观·P1 | 主列右移 4px | `AD c#251` / `AD l#149` | x=288 宽 1152 | x=292 宽 1148 | dx+4 dw−4 | `src/components/sidebar/SidebarResizer.tsx:40`（`w-1 shrink-0`） | 手柄改 `absolute right-0 top-0 h-full w-1 -mr-px`（脱离 flex 宽度），主列回到 288/1152 |
| G04 | 外观·P2 | 侧栏 1px 右边框 | `AD l#1`（`border-r`）内容 287 | 288（无边框） | 287 | +1 | `Sidebar.tsx:80`（`border-r border-sidebar-border`） | 若保留分隔：改用 `border-foreground/6`（与 craft 分隔线同色）；否则去掉 `border-r` |
| G05 | 结构·P0 | 搜索入口位置 | `AD c#25`（搜索域 428×24 @506,12）/ `AD l#3`（229×28 @12,12） | 全局顶栏中部 | 侧栏顶行 | — | `SidebarHeader.tsx:20-42`；`AppPageHeader.tsx` | 随 G01 把搜索按钮迁到全宽顶栏；侧栏顶行改成 craft 的空间切换（268×36 @x10） |
| G06 | 结构·P0 | 无右检查器 | `DC c#196`、`DC c#199` | 296×853 @(1144,47) | 无 | −296 | 需新增（`src/components/editor/`，可复用 `SidebarResizer` 的 4px 边） | 新增 296 宽右栏（内容 284，分区标签 11/600/12/0.05），文档屏挂上 |
| G07 | 结构·P1 | 侧栏底栏位置 | `AD c#218,220,222` / `AD l#130,132` | 288×61 @(0,839)，1px 分隔 @839，按钮 @x18 y856 | 287×53 @(0,847)，border-t @847，按钮 @x12 y860 | dy+8 dh−8 dx−6 | `SidebarFooter.tsx:14`（`mt-auto … border-t px-3 py-3`） | `py-3`→`py-2`，分隔线改 `border-foreground/6`，按钮组内缩进 `px-3`→`px-1.5` |
| G08 | 外观·P2 | 侧栏树区 padding | `AD c#70` / `AD l#62` | x=10 | x=4 | −6 | `Sidebar.tsx:24`（`px-1`） | `px-1`→`px-2.5` |
| G09 | 结构·P1 | 树行缩进 16px | `AD c#179`（图标 @16）/ `AD l#72`（图标 @32） | 16 | 32 | +16 | `DocumentTreeItem.tsx:297`（`px-2 py-1.5` + `paddingLeft: level*16+8`）、`:311-327`（chevron 占 14+gap 6） | chevron 改成 absolute 叠在图标上（同 craft），`paddingLeft` 顶层取 8 |
| G10 | 外观·P1 | 内容内边距 x | `AD c#297`/`c#254` / `AD l#159` | 16 | 32 | +16 | `src/components/app/AppPageContainer.tsx:8`（`px-4 … sm:px-6 lg:px-8`） | `lg:px-8`→`lg:px-4` |
| G11 | 外观·P1 | 内容内边距 y | 同上 | 16 | 32 | +16 | 同上（`pt-6 … sm:py-8`） | `sm:py-8`→`sm:pt-4 sm:pb-8` |
| G12 | 外观·P2 | 页头带高 | `AD c#254` / `AD l#151` | 52 | 53 | +1 | `AppPageHeader.tsx:23`（`min-h-12 … py-2`）+ `NotificationBell`（36px） | 铃铛 `size-9`→`size-8`，带高回 52 |
| G13 | 外观·P2 | h1 带内 y | `AD c#263` / `AD l#152` | 13 | 10 | −3 | `AppPageHeader.tsx:37` | 与 G12 同批微调 `py` |
| G14 | 结构·P1 | h1 x | `AD c#263`(358)、`ST c#270`(304) / `AD l#152`(316) | main+70 / main+16 | main+24 | −46 / +8 | `AppPageHeader.tsx:23-37`（`px-4 sm:px-6`、无图标位） | 加 36×36 图标位 + `gap-[18px]`（对齐 70），或无图标屏 `pl-4`（对齐 16） |
| G15 | 结构·P0 | 卡片网格形态 | `AD c#304` / `AD l#160`、`AD l#210` | 5×208×260 gap20 | 5×207×80 gap12 + 4×256×64 gap20 | 宽+48 高−196 列−1 | `src/components/app/BrowseGrid.tsx:48`（`minmax(0,268px)`）；`src/components/document/QuickActions.tsx:44`（`grid-cols-5 gap-3`）；`src/app/(app)/documents/page.tsx:48-64` | 修完 G10 后列数自动回 5；首屏去掉 `QuickActions`（或下移），最近编辑直接用 `BrowseGrid`+`DocumentCard` |
| G16 | 结构·P1 | 卡片高度 | `AD c#307`(260) / `AD l#210`(64) | 260（=208×1.25） | 64（内容自适应） | −196 | `src/components/document/DocumentCard.tsx:45,64`（`block rounded-lg …`） | 卡根加 `aspect-[1/1.25]`（或 `height: cardHeightForWidth()`，`lib/browse/grid.ts:42` 已备） |
| G17 | 外观·P1 | 导航行几何 | `AD c#72,84` / `AD l#12,13` | 32 / step33 / r8 / icon20 @16 | 36 / step40 / r12 / icon18 @20 | +4 / +7 / +4 / −2 / +4 | `src/components/sidebar/SidebarNav.tsx:41`（`gap-1 px-2 py-2`）、`:49`（`min-h-9 … rounded-lg px-3`）、`:55`（`size-[18px]`） | `min-h-9`→`h-8`，`gap-1`→`space-y-px`，`rounded-lg`→`rounded-md`，`size-[18px]`→`size-5`，`px-3`→`px-1.5` |
| G18 | 外观·P2 | 分区头行高/缩进 | `AD c#133,138` / `AD l#63,64` | 32 / 标题 @x19 | 23 / 标题 @x10 | −9 / −9 | `src/components/sidebar/SidebarSection.tsx:19-22`（`px-1.5 py-1`，前置 `ChevronRight size-3.5`） | `py-1`→`py-[5px]`，`px-1.5`→`px-2.5`，chevron 改 absolute |
| G19 | 结构·P0 | `IB` 列表 vs 卡 | `AD c#304` / `IB l#164` | 208×260 卡 | 1084×40 行 | −220 | `src/components/document/InboxList.tsx:76-81`（`ul gap-0.5`、`li rounded-md px-2 py-1.5`） | 若要复刻 craft，改 `BrowseGrid`+`DocumentCard`；若保留列表，行高按 `LIST_ROW_HEIGHT=65`（`lib/browse/grid.ts:23`） |
| G20 | 结构·P0 | `TR` 行几何 | `TR l#170,175` | 208×260 卡 | 1080×64 r12 step64 | −196 | `src/components/document/TrashList.tsx:326`（`rounded-lg border p-3`） | 同上；保留列表时行高对 65、去边框 |
| G21 | 结构·P1 | `TG` 行高 | `TG c#286` / `TG l#168` | 32 | 36 | +4 | `src/components/browse/TagTreeList.tsx:18`（`min-h-9 … rounded-lg`） | `min-h-9`→`h-8`，`rounded-lg`→`rounded-md` |
| G22 | 结构·P1 | `TP` 空态盒 | `TP c#300` / `TP l#160` | 1120×72 r10 bg α0.03 | 1084×126 r12 虚线 | +54 | `src/app/(app)/templates/page.tsx:28`（`rounded-lg border border-dashed p-8`） | 空态改 `rounded-[10px] bg-foreground/[0.03] px-6 py-6`，去虚线 |
| G23 | 结构·P0 | `CA` 内容列宽/日行 | `CA c#274,293` / `CA l#167,181` | 1120 宽、日行 105 r20 | 896（`max-w-4xl`）、日行 92 r16 | −288 / −13 | `src/app/(app)/calendar/page.tsx:138`（`<AppPageContainer className="max-w-4xl">`）；`src/components/calendar/CalendarTimeline.tsx:265-270`（日行 section） | 去掉 `max-w-4xl`；日行 `rounded-[20px]` 并把内距调到总高 105，步进 121 |
| G24 | 结构·P1 | `TK` 顶部分段 | `TK c#268,297` / `TK l#164,169` | 带 52 + 行 40 @y116 | bar 53 + tabs 39 @y53 + section @y92 | 结构不同 | `src/app/(app)/tasks/TasksView.tsx:331`（`nav flex gap-1 border-b border-border px-4`）、任务行 | 任务行 `h-10 rounded-md`；tabs 行并入页头带或压到 40 高 |
| G25 | 外观·P1 | h1 字号/行高/字距 | `AD c#263` / `AD l#152` | 22/600/26.4/0 | 24/600/32/−0.6 | +2/+5.6/−0.6 | `AppPageHeader.tsx:37`（`text-2xl font-semibold tracking-tight`） | `text-[22px] leading-[26.4px] tracking-normal` |
| G26 | 外观·P1 | 文档标题 | `DC c#167` / `DC l#223` | 23/700/28/−0.3 sans | 30/400/36/0 serif italic | +7/−300/+8/+0.3 | `src/components/editor/EditorHeader.tsx:68`、`:99`（`font-serif text-3xl font-normal italic`） | `text-[23px] leading-[28px] font-bold tracking-[-0.3px]`，去 `font-serif`/`italic` |
| G27 | — | 卡片标题（**一致**，回归断言用） | `AD c#315` / `AD l#216` | 15/600/18/−0.13 | 15/600/18/0 | 0/0/0/+0.13 | `DocumentCard.tsx:75-82`（`text-card-title font-semibold`） | 不改 |
| G28 | 外观·P1 | 未命名占位标题被改小改细 | `AD c#315` / `AD l#243` | 15/600/18 α0.25 | 16/400/24 α0.45 | +1/−200/+6/+0.2 | `DocumentCard.tsx:75-82`（`head.placeholder && 'italic font-normal text-foreground/45'`） | 占位分支保留 `text-card-title font-semibold`，只改 `italic` 与 `text-foreground/25` |
| G29 | 外观·P1 | 13px UI 行高 | `AD c#93` / `AD l#36`（`AD` 全屏同型） | 16 | 19.5 | +3.5 | `SidebarNav.tsx:49`、`DocumentTreeItem.tsx:297`（`text-[13px]`）、`TagTreeList.tsx:18`、`InboxList.tsx:80` | `text-[13px]`→`text-ui`（`globals.css:1480` 已定义 13/16） |
| G30 | 外观·P1 | 分区标题行高+颜色 | `AD c#159` / `AD l#99` | 12/600/12/0.05 满色 | 12/600/15/0 α0.4 | +3/−0.05/Δα0.6 | `SidebarSection.tsx:22`（`text-meta font-semibold text-foreground/40`） | `text-[12px] leading-[12px] tracking-[0.05px] text-foreground`（去 `/40`） |
| G31 | — | meta（**一致**） | `AD c#321` / `AD l#217` | 12/400/14.4/0.01 α0.55 | 12/400/15/0 α0.55 | +0.6 | `DocumentCard.tsx:91`（`text-meta text-foreground/55`） | 不改 |
| G32 | 外观·P1 | 日历日期字号 | `CA c#296` / `CA l#169` | 16/600/19.2 | 14/600/20 | −2 | `src/components/calendar/CalendarTimeline.tsx:270-271`（`h2 … text-sm` + `span.font-semibold`） | 日期 `text-sm`→`text-base leading-[19.2px]` |
| G33 | 外观·P2 | 空态文案字号/颜色 | `ST c#306` / `ST l#164` | 13/400/15.6 α0.55 | 14/400/20 muted | +1/+4.4/ΔRGB46 | 各页空态（`StarredGrid`/`templates/page.tsx:30`/`InboxList.tsx:70`） | `text-sm muted-foreground`→`text-[13px] leading-[15.6px] text-foreground/55` |
| G34 | 外观·P2 | `TK` 分区标题偏小偏细 | `TK c#331` / `TK l#170` | 15/600/18 | 12/500/16 | −3/−100 | `src/app/(app)/tasks/TasksView.tsx:351`（`h2 mb-2 text-xs font-medium text-muted-foreground`） | `text-xs`→`text-[15px] leading-[18px] font-semibold text-foreground/85` |
| G35 | 结构·P2 | 提示条形态 | `TK c#339` / `TK l#171` | 13/500/16，pad 0 64，无边框 | 12/400/16，pad 8 12，`rounded-lg border border-dashed` | pad +8/−52 | `src/app/(app)/tasks/TasksView.tsx:353`（`p rounded-lg border border-dashed … px-3 py-2 text-xs`） | 去边框改纯文本，`px-16` 居中，字号 13/16 |
| G36 | — | 页面底/主文本/卡片底（**一致**） | `AD c#0`/`l#0`、`c#307`/`l#211` | 见 §6 | 见 §6 | ΔE 0/0/1 | `src/app/globals.css:95,127` | 不改 |
| G37 | 外观·P1 | 次级文字偏深 | `ST c#306` / `ST l#164` | α0.55 → (128,129,131) | `--muted-foreground` (82,92,102) | ΔRGB46 ΔE16.5 | `globals.css:95`（`--muted-foreground: oklch(0.4698 0.0205 248.3)`）+ 各空态/说明文字调用点 | 说明型文字统一 `text-foreground/55`；`--muted-foreground` 只留给图标 |
| G38 | 外观·P1 | 导航未激活文字偏淡 | `AD c#93`(α0.85) / `AD l#36`(α0.7) | α0.85 | α0.7 | Δα0.15 | `SidebarNav.tsx:52`（`text-sidebar-foreground/70`） | `/70`→`/85` |
| G39 | 外观·P1 | 圆角：卡片 16 / 导航行 8 | `AD c#307`、`AD c#72` / `AD l#210`、`AD l#12` | 16 / 8 | 12 / 12 | −4 / +4 | `DocumentCard.tsx:45,64`（`rounded-lg`）、`SidebarNav.tsx:49`（`rounded-lg`） | 卡片→`rounded-xl`（16）；导航行→`rounded-md`（8） |
| G40 | 外观·P2 | 分隔线偏深 | `AD c#220` / `AD l#130` | (238,240,241) | (229,230,231) | ΔRGB9 | `SidebarFooter.tsx:14`（`border-sidebar-border`） | `border-foreground/6` |

按类别统计：**37 条偏差** —— 结构 16 条（P0 8 / P1 7 / P2 1）、外观 21 条（P1 13 / P2 8）；另有 3 条一致性断言（G27/G31/G36）与 §6 内 3 行颜色一致性，用于回归。

---

## 10. 未能判定项（明确写"未测"，不写成"一致"）

1. **craft 命中 600 节点上限**：`AD`、`IB`、`TR`、`SM`、`SO` 五屏（`diff.json.screens.*.craftCapped = true`）。这些屏里 craft 侧任何"找不到的节点"都只能记为未测——例如 `TR` 的卡片数量、`SO` 的浮层内部结构。
2. **craft 文档正文排版未测**：`DC` 采集里文档只有 1 个空块（`_round-13.json` note），因此只有标题 23/700/28 可比；本地正文 15/400/23、色 (31,34,37)@0.9 没有 craft 对照。
3. **craft 设置弹窗几何未测**：`SM` 的 craft JSON 是底层页面，只有 `_round-16.json` 的导航行 232×32 @x256 与 PNG；弹窗宽高、圆角、左导航宽度、遮罩透明度均无 craft 数值 → 不编 Δ。
4. **craft 搜索浮层内部未测**：`SO` JSON 与 `AD` 完全同构（同一份底层页），仅落一个顶栏搜索域。
5. **craft 侧栏导航容器（`shell.nav`）全屏为 null**：craft 的 nav 行位置全部由节点矩形给出（`AD c#72` 起），没有容器级测量。
6. **边框只采到上边框**（probe 只记录 `borderTopWidth/borderTopColor`）：本地侧栏 `border-r`、页头 `border-b` 的 1px 只能从总宽/总高的差值推断（287 vs 288、53 vs 52），颜色按 token 值（`--sidebar-border` = 229,230,231）引用。
7. **PNG 未做视觉复核**：本环境没有配置图像理解模型（`analyze_image` 不可用），因此没有用截图确认结构；§3/§4 的结构性结论全部由节点矩形支撑（如"顶栏全宽"= `c#4 rect.w = 1440`）。若需要，可人工抽查三对 PNG：`AD`、`SM`、`DC`。
8. **同名不同物**：42 组文本对因两侧跨区位（>200px）判为错误匹配，不计入统计（典型：craft 分区头"标签" `c#202` ↔ 本地导航项"标签" `l#19`，距离 430px）。另有 1 组同区位但语义错误的对：`TG` 屏 craft h1"所有标签"（`c#257`，22px）↔ 本地 10px 统计标签（`l#162`），距离仅 32px 而被判为"同区位"，读 §2 覆盖率时应把这 1 组从 47 的样本里剔除（剔除后 fontSize 达标 33/46）。明细见 `diff.json` 的 `textStyles.pairs`。
9. **两侧内容差异**（`ST` 文档数 0 vs 2、`TR` 条目不同、`CA` 日期基准不同）不参与任何尺寸结论；`CA` 的 21 组文本对只用于字体/颜色，不用于位置。

---

## 11. 实施状态（2026-11-07）

以 1104 轮重采（`layout-20261104/`）为准，桌面 1440×900 实测复核。

| 编号 | 项 | 状态 | 实测（本地 → craft） |
|---|---|---|---|
| G01 | 全宽顶栏 | ✅ | 新增 `AppTopBar`（1440×48 @(0,0)）；搜索 428×28 @(506,10) r10 与 craft 逐值一致 |
| G02 | 侧栏起点 | ✅ | 288×852 @(0,48)（原 288×900 @(0,0)） |
| G03 | 主列 4px | ✅ | 手柄改绝对定位；main 1152×852 @(288,48)（原 292/1148） |
| G04 | 侧栏右边框 | ✅ | `border-r` 已去（craft 全站无竖向 hairline） |
| G05 | 搜索入口 | ✅（部分） | 桌面搜索迁进顶栏；侧栏顶行改成空间行 242×36 @(10,56)（craft 268×36 —— 本地该行还要放「新建文档」，少 26px）。手机不挂顶栏，搜索留在抽屉里 |
| G06 | 右检查器宽 | ✅ | `--panel-w` 360 → **296**（craft 296×853 @(1144,47)），`responsive-spec.md` 同步改口 |
| G07 | 侧栏底栏 | ✅ | `py-2.5` + `border-foreground/6` |
| G08 | 树区 padding | ✅ | `px-1` → `px-2.5`（x=10） |
| G12/G13 | 页头带高/标题 y | ✅ | 带 `h-[52px]`、h1 y=+12.8（craft +13） |
| G14 | h1 x | ✅（无图标档） | h1 @main+16（craft 无图标屏 304=main+16）；craft 有图标屏是 main+70，本地**没有 36×36 图标位**，图标名册未采 |
| G15/G16/G19/G20 | 卡片/列表形态 | ⏳ | 归下一批（L3） |
| G17 | 导航行几何 | ✅ | 32 / 步进 33 / r8 / 图标 20 / 13-16 |
| G18/G30 | 分区头 | ✅ | 行高 32、12/600/12/ls.05 满对比、标题 @x19；本地保留折叠 chevron 叠在左 gutter（craft 该处无 chevron，属可及性保留） |
| G21 | 标签行高 | ✅ | 已是 h-8/r-md |
| G22 | 模板空态 | ✅ | 72 高 / r10 / foreground-3% / 无虚线 |
| G23/G24 | 日历列宽 / 任务分段 | ⏳ | 归 L3 |
| G25 | h1 字阶 | ✅ | 22/600/26.4/ls0 |
| G26 | 文档标题 | ✅ | 23/700/28/ls−0.3、去 serif+italic |
| G28 | 占位标题 | ✅ | 保留 `text-card-title font-semibold`，只 italic + α0.25 |
| G29 | 13px 行高 | ✅ | 导航/树行显式 `text-[length:13px] leading-4`（`text-ui` 会被 tailwind-merge 吞掉） |
| G32 | 日历日期 | ✅ | 16/600/19.2、「今天」15/600/18、星期 13/500/16 |
| G33/G37 | 空态文案/次级文字 | ✅（逐点） | 空态 13/15.6/α0.55；`--muted-foreground` 保留给图标，说明文字改 `text-foreground/55` |
| G34/G35 | 任务分区标题/提示条 | ✅ | 15/600/18 α0.85；空态去虚线边框 |
| G38 | 导航未激活文字 | ✅ | α0.7 → α0.85 |
| G39 | 圆角 | ✅ | 卡片 16、导航行 8 |
| G40 | 分隔线 | ✅ | `foreground/6` |

仍未做：G15/G16/G19/G20/G23/G24（列表与卡片的整体形态）、G06 的右检查器**内容**（宽度已对齐）、
G14 的 36×36 图标位（需先采各屏图标名册）。
