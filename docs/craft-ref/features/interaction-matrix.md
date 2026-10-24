# 交互矩阵（机器可核台账）

> 由 `docs/craft-ref/interaction-lab/diff.mjs` 生成；原始 record 在 `interaction-lab/runs/`（gitignore）。
> 一行 = 一 spec × 官方/本地 判定。

**判定口径**：

- `match` —— 除噪声与 severity=1 的绝对量外无差异。
- `differ` —— 存在 severity≥2 的差异行（具名文本计数 **delta** 不一致 / 文本名册单侧增删 / 属性·块名册·选区不一致）。
- `uncomparable` —— 任一侧有 error，或两侧步数不一致（无法逐帧对齐）。

**分档**：severity 1 = 只记录不判定（绝对 DOM 规模、绝对可见文本长度：两侧是两套实现，天然不等）；
severity 2 = 参与判定；severity 3 = 前置条件不成立。

**已声明偏差**（severity 0）：产品级差异照样列出，但 spec 里 `deviations` 带了理由与出处 ⇒ 不参与判定。

| spec | 判定 | 差异行 | severity 2+ | 已声明偏差 | 文本名册 +/− |
| --- | --- | --- | --- | --- | --- |
| `browse.box-select.drag-marquee` | differ | 22 | 14 | 0 | 本地 +0/−0 · 官方 +1/−0 |
| `editor.block.enter-empty-block` | match | 10 | 0 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.block.indent-in-list` | differ | 21 | 3 | 2 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.indent-plain-paragraph` | differ | 23 | 9 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.move-alt-updown` | differ | 21 | 1 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.block.move-top-bottom` | differ | 21 | 5 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.key.ctrl-arrow-word-nav` | differ | 43 | 15 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.duplicate-and-undo` | differ | 30 | 12 | 0 | 本地 +4/−0 · 官方 +4/−0 |
| `editor.key.enter-mid-block` | match | 14 | 0 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.shift-enter-hard-break` | differ | 17 | 3 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.turn-into-style` | differ | 19 | 7 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.selection.ctrl-a-ladder` | differ | 26 | 8 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.selection.select-to-top-bottom` | differ | 40 | 16 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.slash.open-and-filter` | match | 8 | 0 | 2 | 本地 +2/−0 · 官方 +1/−0 |
| `shell.command-palette.toggle-vs-jump` | match | 21 | 0 | 15 | 本地 +5/−0 · 官方 +3/−1 |

## 已声明偏差明细

| spec | facet | step | official | local | 理由 | 出处 |
| --- | --- | --- | --- | --- | --- | --- |
| `editor.block.indent-in-list` | selection:anchorOffset | 1 | 1 | 0 | 项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 空列表项里光标 offset 天然差 1 | probe-bullet（本轮实测：官方 childTexts ["•","L1"]；本地 listStyleType:disc） |
| `editor.block.indent-in-list` | selection:focusOffset | 1 | 1 | 0 | 同上（focusOffset 与 anchorOffset 同源） | probe-bullet |
| `editor.slash.open-and-filter` | countΔ:插入 | 1 | 8 | 4 | 菜单项文案与条数不同（官方扁平 8 条含「插入」：插入文件/片段/表格/分隔符/白板/表格集合/画廊集合/看板集合；本地 4 条）—— 与上面两条同源 | probe-verbatim.json · gap.md（本轮新登记） |
| `editor.slash.open-and-filter` | added-only-local |  |  | 无匹配命令 | 本地 / 菜单的**无匹配文案**是「无匹配命令」；官方过滤后直接把面板收起、不给无匹配文案（G1544 同源） | chk-roster：官方 added=["/wen"]、本地 added=["/wen","无匹配命令"] · gap.md G1544 |
| `shell.command-palette.toggle-vs-jump` | countΔ:搜索文档与块 | 1 | 0 | 1 | 两侧面板条目集合不同 ⇒ 该具名文案只在本地有 | probe-verbatim.json |
| `shell.command-palette.toggle-vs-jump` | countΔ:操作 | 1 | 0 | 1 | 本地面板有「操作」分组标题，官方跳转面板没有分组标题 | probe-verbatim.json |
| `shell.command-palette.toggle-vs-jump` | countΔ:搜索文档与块 | 2 | 0 | 1 | 两侧面板条目集合不同 ⇒ 该具名文案只在本地有 | probe-verbatim.json |
| `shell.command-palette.toggle-vs-jump` | countΔ:未找到结果 | 2 | 1 | 0 | 两侧**都**给无匹配提示，但文案不同：官方「未找到结果」vs 本地「未找到 <词> 的结果」 | probe-verbatim.json（官方计数 1 / 本地 0）· gap.md（本轮新登记） |
| `shell.command-palette.toggle-vs-jump` | added-only-local |  |  | Esc | 本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口 | gap.md（本轮新登记）· ui-affordances.md §四 |
| `shell.command-palette.toggle-vs-jump` | added-only-local |  |  | 关闭 | 本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口 | gap.md（本轮新登记）· ui-affordances.md §四 |
| `shell.command-palette.toggle-vs-jump` | added-only-local |  |  | 创建 快捷键 | 本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口 | gap.md（本轮新登记）· ui-affordances.md §四 |
| `shell.command-palette.toggle-vs-jump` | added-only-local |  |  | 搜索文档与块 | 本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口 | gap.md（本轮新登记）· ui-affordances.md §四 |
| `shell.command-palette.toggle-vs-jump` | added-only-local |  |  | 未找到 快捷键 的结果 | 本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口 | gap.md（本轮新登记）· ui-affordances.md §四 |
| `shell.command-palette.toggle-vs-jump` | added-only-official |  | 按 Enter 键 |  | 官方 ⌘K 面板条目是「在<空间>中 <文档名>」形态；本地无此形态（本地条目是命令） | gap.md（本轮新登记）· interactions.md V1 |
| `shell.command-palette.toggle-vs-jump` | added-only-official |  | 未找到结果 |  | 官方 ⌘K 面板条目是「在<空间>中 <文档名>」形态；本地无此形态（本地条目是命令） | gap.md（本轮新登记）· interactions.md V1 |
| `shell.command-palette.toggle-vs-jump` | added-only-official |  | 查看更多结果 |  | 官方 ⌘K 面板条目是「在<空间>中 <文档名>」形态；本地无此形态（本地条目是命令） | gap.md（本轮新登记）· interactions.md V1 |
| `shell.command-palette.toggle-vs-jump` | removed-only-official |  | 打开 |  | 官方 header 的「打开」标签在 ⌘K 后由 span 变成 input[placeholder="打开"]（同一件事换形态）⇒ 文本名册记为移除；本地无此 header 入口 | probe-takeover.json（官方 ⌘K 后 itemIds=13 仍在 ⇒ 不是整屏接管，是 header 浮层） |
| `shell.command-palette.toggle-vs-jump` | attr:paletteInput | 1 | 打开 | 搜索文档、内容… | placeholder 不同：官方「打开」（跳转语义）vs 本地「搜索文档、内容…」（搜索语义） | probe-verbatim.json |
| `shell.command-palette.toggle-vs-jump` | attr:paletteInput | 2 | 打开 | 搜索文档、内容… | placeholder 不同：官方「打开」（跳转语义）vs 本地「搜索文档、内容…」（搜索语义） | probe-verbatim.json |

## 逐行明细（severity ≥ 2）

### `browse.box-select.drag-marquee` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-official | 已选 6 项 |  |  | 2 |
| 0 | marquee | {"rect":null,"checked":0,"cbTotal":14,"itemIds":14} | {"rect":null,"checked":0,"cbTotal":0,"itemIds":0} |  | 2 |
| 1 | marquee | {"rect":{"pos":"fixed","z":"10","pe":"none"},"checked":6,"cbTotal":15,"itemIds":14} | {"rect":null,"checked":0,"cbTotal":0,"itemIds":0} |  | 2 |
| 2 | marquee | {"rect":null,"checked":6,"cbTotal":15,"itemIds":14} | {"rect":null,"checked":0,"cbTotal":0,"itemIds":0} |  | 2 |
| 3 | marquee | {"rect":null,"checked":6,"cbTotal":15,"itemIds":14} | {"rect":null,"checked":0,"cbTotal":0,"itemIds":0} |  | 2 |
| 1 | selection:collapsed |  | false |  | 2 |
| 1 | selection:anchorOffset |  | 0 |  | 2 |
| 1 | selection:focusOffset |  | 4 |  | 2 |
| 2 | selection:collapsed |  | false |  | 2 |
| 2 | selection:anchorOffset |  | 0 |  | 2 |
| 2 | selection:focusOffset |  | 4 |  | 2 |
| 3 | selection:collapsed |  | false |  | 2 |
| 3 | selection:anchorOffset |  | 0 |  | 2 |
| 3 | selection:focusOffset |  | 4 |  | 2 |

### `editor.block.indent-in-list` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | focusInEditor | true | false |  | 2 |
| 6 | indentLevels | [0,2] | [0,1] |  | 2 |
| 6 | indentLevel | 2 | 1 |  | 2 |

### `editor.block.indent-plain-paragraph` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 4 | focusInEditor | true | false |  | 2 |
| 5 | focusInEditor | true | false |  | 2 |
| 6 | focusInEditor | true | false |  | 2 |
| 4 | indentLevels | [0,1] | [0,0] |  | 2 |
| 4 | indentLevel | 1 | 0 |  | 2 |
| 5 | indentLevels | [0,2] | [0,0] |  | 2 |
| 5 | indentLevel | 2 | 0 |  | 2 |
| 6 | indentLevels | [0,1] | [0,0] |  | 2 |
| 6 | indentLevel | 1 | 0 |  | 2 |

### `editor.block.move-alt-updown` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 8 | blocks | ["AAA","BBB","CCC"] | ["BBB","AAA","CCC"] |  | 2 |

### `editor.block.move-top-bottom` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | blocks | ["AAA","BBB","CCC"] | ["CCC","AAA","BBB"] |  | 2 |
| 6 | selection:anchorOffset | 3 | 0 |  | 2 |
| 6 | selection:focusOffset | 3 | 0 |  | 2 |
| 7 | selection:anchorOffset | 3 | 0 |  | 2 |
| 7 | selection:focusOffset | 3 | 0 |  | 2 |

### `editor.key.ctrl-arrow-word-nav` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | keys | ArrowLeft!,Control | ArrowLeft,Control |  | 2 |
| 3 | keys | ArrowLeft!,Control | ArrowLeft,Control |  | 2 |
| 4 | keys | ArrowLeft!,Control | ArrowLeft,Control |  | 2 |
| 5 | keys | ArrowRight!,Control | ArrowRight,Control |  | 2 |
| 6 | keys | ArrowRight!,Control | ArrowRight,Control |  | 2 |
| 12 | keys | ArrowRight!,Control | ArrowRight,Control |  | 2 |
| 13 | keys | ArrowLeft!,Control | ArrowLeft,Control |  | 2 |
| 5 | selection:anchorOffset | 3 | 4 |  | 2 |
| 5 | selection:focusOffset | 3 | 4 |  | 2 |
| 6 | selection:anchorOffset | 7 | 8 |  | 2 |
| 6 | selection:focusOffset | 7 | 8 |  | 2 |
| 12 | selection:anchorOffset | 11 | 0 |  | 2 |
| 12 | selection:focusOffset | 11 | 0 |  | 2 |
| 13 | selection:anchorOffset | 8 | 11 |  | 2 |
| 13 | selection:focusOffset | 8 | 11 |  | 2 |

### `editor.key.duplicate-and-undo` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | focusInEditor | false | true |  | 2 |
| 7 | focusInEditor | false | true |  | 2 |
| 8 | focusInEditor | false | true |  | 2 |
| 6 | selection:collapsed |  | true |  | 2 |
| 6 | selection:anchorOffset |  | 1 |  | 2 |
| 6 | selection:focusOffset |  | 1 |  | 2 |
| 7 | selection:collapsed |  | true |  | 2 |
| 7 | selection:anchorOffset |  | 1 |  | 2 |
| 7 | selection:focusOffset |  | 1 |  | 2 |
| 8 | selection:collapsed |  | true |  | 2 |
| 8 | selection:anchorOffset |  | 1 |  | 2 |
| 8 | selection:focusOffset |  | 1 |  | 2 |

### `editor.key.shift-enter-hard-break` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | breaks | {"totalBr":1,"blocks":["1:1:AAA\|\|","0:1:BBB"]} | {"totalBr":0,"blocks":["0:1:AAA","0:1:BBB"]} |  | 2 |
| 6 | selection:anchorOffset | 1 | 3 |  | 2 |
| 6 | selection:focusOffset | 1 | 3 |  | 2 |

### `editor.key.turn-into-style` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | countΔ:AAA | 2 | 1 | -1 | 2 |
| 3 | countΔ:AAA | 2 | 1 | -1 | 2 |
| 4 | countΔ:AAA | 2 | 1 | -1 | 2 |
| 2 | blocks | ["AAA"] | ["AAA",""] |  | 2 |
| 3 | blocks | ["AAA"] | ["AAA",""] |  | 2 |
| 4 | blocks | ["AAA"] | ["AAA",""] |  | 2 |
| 5 | blocks | ["AAA"] | ["AAA",""] |  | 2 |

### `editor.selection.ctrl-a-ladder` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 7 | focusInEditor | false | true |  | 2 |
| 8 | focusInEditor | false | true |  | 2 |
| 7 | selection:collapsed |  | false |  | 2 |
| 7 | selection:anchorOffset |  | 0 |  | 2 |
| 7 | selection:focusOffset |  | 3 |  | 2 |
| 8 | selection:collapsed |  | false |  | 2 |
| 8 | selection:anchorOffset |  | 0 |  | 2 |
| 8 | selection:focusOffset |  | 3 |  | 2 |

### `editor.selection.select-to-top-bottom` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 8 | focusInEditor | false | true |  | 2 |
| 9 | focusInEditor | false | true |  | 2 |
| 10 | focusInEditor | false | true |  | 2 |
| 11 | focusInEditor | false | true |  | 2 |
| 8 | selection:collapsed |  | false |  | 2 |
| 8 | selection:anchorOffset |  | 3 |  | 2 |
| 8 | selection:focusOffset |  | 0 |  | 2 |
| 9 | selection:collapsed |  | false |  | 2 |
| 9 | selection:anchorOffset |  | 3 |  | 2 |
| 9 | selection:focusOffset |  | 3 |  | 2 |
| 10 | selection:collapsed |  | false |  | 2 |
| 10 | selection:anchorOffset |  | 3 |  | 2 |
| 10 | selection:focusOffset |  | 3 |  | 2 |
| 11 | selection:collapsed |  | false |  | 2 |
| 11 | selection:anchorOffset |  | 3 |  | 2 |
| 11 | selection:focusOffset |  | 3 |  | 2 |

## spec 自带期望（selfCheck）

每侧对**自己的观测**求 `spec.expect`（两侧互比由上表负责，两者是两件事）。

| spec | 靶 | 期望 | 结果 | actual |
| --- | --- | --- | --- | --- |
| `browse.box-select.drag-marquee` | official | blocksCount count 0 | PASS | 0 |
| `browse.box-select.drag-marquee` | local | blocksCount count 0 | PASS | 0 |
| `editor.block.enter-empty-block` | official | blocksCount count 1 | PASS | 1 |
| `editor.block.enter-empty-block` | official | blocksCount count 2 | PASS | 2 |
| `editor.block.enter-empty-block` | official | blocksCount count 3 | PASS | 3 |
| `editor.block.enter-empty-block` | official | blocks equals ["XY","",""] | PASS | ["XY","",""] |
| `editor.block.enter-empty-block` | official | text:XY count 1 | PASS | 1 |
| `editor.block.enter-empty-block` | local | blocksCount count 1 | PASS | 1 |
| `editor.block.enter-empty-block` | local | blocksCount count 2 | PASS | 2 |
| `editor.block.enter-empty-block` | local | blocksCount count 3 | PASS | 3 |
| `editor.block.enter-empty-block` | local | blocks equals ["XY","",""] | PASS | ["XY","",""] |
| `editor.block.enter-empty-block` | local | text:XY count 1 | PASS | 1 |
| `editor.block.indent-in-list` | official | blocksCount count 2 | PASS | 2 |
| `editor.block.indent-in-list` | official | indentLevel count 0 | PASS | 0 |
| `editor.block.indent-in-list` | official | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-in-list` | official | indentLevel count 2 | PASS | 2 |
| `editor.block.indent-in-list` | official | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-in-list` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-in-list` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-in-list` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-in-list` | local | blocksCount count 2 | PASS | 2 |
| `editor.block.indent-in-list` | local | indentLevel count 0 | PASS | 0 |
| `editor.block.indent-in-list` | local | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-in-list` | local | indentLevel count 2 | **FAIL** | 1 |
| `editor.block.indent-in-list` | local | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-in-list` | local | focusInEditor equals true | PASS | true |
| `editor.block.indent-in-list` | local | focusInEditor equals true | **FAIL** | false |
| `editor.block.indent-in-list` | local | focusInEditor equals true | PASS | true |
| `editor.block.indent-plain-paragraph` | official | blocksCount count 2 | PASS | 2 |
| `editor.block.indent-plain-paragraph` | official | indentLevel count 0 | PASS | 0 |
| `editor.block.indent-plain-paragraph` | official | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-plain-paragraph` | official | indentLevel count 2 | PASS | 2 |
| `editor.block.indent-plain-paragraph` | official | indentLevel count 1 | PASS | 1 |
| `editor.block.indent-plain-paragraph` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-plain-paragraph` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-plain-paragraph` | official | focusInEditor equals true | PASS | true |
| `editor.block.indent-plain-paragraph` | local | blocksCount count 2 | PASS | 2 |
| `editor.block.indent-plain-paragraph` | local | indentLevel count 0 | PASS | 0 |
| `editor.block.indent-plain-paragraph` | local | indentLevel count 1 | **FAIL** | 0 |
| `editor.block.indent-plain-paragraph` | local | indentLevel count 2 | **FAIL** | 0 |
| `editor.block.indent-plain-paragraph` | local | indentLevel count 1 | **FAIL** | 0 |
| `editor.block.indent-plain-paragraph` | local | focusInEditor equals true | **FAIL** | false |
| `editor.block.indent-plain-paragraph` | local | focusInEditor equals true | **FAIL** | false |
| `editor.block.indent-plain-paragraph` | local | focusInEditor equals true | **FAIL** | false |
| `editor.block.move-alt-updown` | official | blocksCount count 3 | PASS | 3 |
| `editor.block.move-alt-updown` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-alt-updown` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-alt-updown` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-alt-updown` | official | focusInEditor equals true | PASS | true |
| `editor.block.move-alt-updown` | official | focusInEditor equals true | PASS | true |
| `editor.block.move-alt-updown` | local | blocksCount count 3 | PASS | 3 |
| `editor.block.move-alt-updown` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-alt-updown` | local | blocks equals ["AAA","BBB","CCC"] | **FAIL** | ["BBB","AAA","CCC"] |
| `editor.block.move-alt-updown` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-alt-updown` | local | focusInEditor equals true | PASS | true |
| `editor.block.move-alt-updown` | local | focusInEditor equals true | PASS | true |
| `editor.block.move-top-bottom` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-top-bottom` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-top-bottom` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-top-bottom` | official | focusInEditor equals true | PASS | true |
| `editor.block.move-top-bottom` | official | focusInEditor equals true | PASS | true |
| `editor.block.move-top-bottom` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-top-bottom` | local | blocks equals ["AAA","BBB","CCC"] | **FAIL** | ["CCC","AAA","BBB"] |
| `editor.block.move-top-bottom` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.block.move-top-bottom` | local | focusInEditor equals true | PASS | true |
| `editor.block.move-top-bottom` | local | focusInEditor equals true | PASS | true |
| `editor.key.ctrl-arrow-word-nav` | official | blocks equals ["AAA BBB CCC"] | PASS | ["AAA BBB CCC"] |
| `editor.key.ctrl-arrow-word-nav` | official | blocks equals ["AAA BBB CCC",""] | PASS | ["AAA BBB CCC",""] |
| `editor.key.ctrl-arrow-word-nav` | official | blocks equals ["AAA BBB CCC","DDD"] | PASS | ["AAA BBB CCC","DDD"] |
| `editor.key.ctrl-arrow-word-nav` | official | blocksCount count 2 | PASS | 2 |
| `editor.key.ctrl-arrow-word-nav` | official | text:AAA count 1 | PASS | 1 |
| `editor.key.ctrl-arrow-word-nav` | official | text:DDD count 1 | PASS | 1 |
| `editor.key.ctrl-arrow-word-nav` | official | focusInEditor equals true | PASS | true |
| `editor.key.ctrl-arrow-word-nav` | local | blocks equals ["AAA BBB CCC"] | PASS | ["AAA BBB CCC"] |
| `editor.key.ctrl-arrow-word-nav` | local | blocks equals ["AAA BBB CCC",""] | PASS | ["AAA BBB CCC",""] |
| `editor.key.ctrl-arrow-word-nav` | local | blocks equals ["AAA BBB CCC","DDD"] | PASS | ["AAA BBB CCC","DDD"] |
| `editor.key.ctrl-arrow-word-nav` | local | blocksCount count 2 | PASS | 2 |
| `editor.key.ctrl-arrow-word-nav` | local | text:AAA count 1 | PASS | 1 |
| `editor.key.ctrl-arrow-word-nav` | local | text:DDD count 1 | PASS | 1 |
| `editor.key.ctrl-arrow-word-nav` | local | focusInEditor equals true | PASS | true |
| `editor.key.duplicate-and-undo` | official | blocks equals ["A","B","C"] | PASS | ["A","B","C"] |
| `editor.key.duplicate-and-undo` | official | blocks equals ["A","B","C","C"] | PASS | ["A","B","C","C"] |
| `editor.key.duplicate-and-undo` | official | blocks equals ["A","B","C"] | PASS | ["A","B","C"] |
| `editor.key.duplicate-and-undo` | official | blocks equals ["A","B","C","C"] | PASS | ["A","B","C","C"] |
| `editor.key.duplicate-and-undo` | local | blocks equals ["A","B","C"] | PASS | ["A","B","C"] |
| `editor.key.duplicate-and-undo` | local | blocks equals ["A","B","C","C"] | PASS | ["A","B","C","C"] |
| `editor.key.duplicate-and-undo` | local | blocks equals ["A","B","C"] | PASS | ["A","B","C"] |
| `editor.key.duplicate-and-undo` | local | blocks equals ["A","B","C","C"] | PASS | ["A","B","C","C"] |
| `editor.key.enter-mid-block` | official | blocks equals ["AAAA","BBBB"] | PASS | ["AAAA","BBBB"] |
| `editor.key.enter-mid-block` | official | blocksCount count 2 | PASS | 2 |
| `editor.key.enter-mid-block` | official | text:AAAA count 1 | PASS | 1 |
| `editor.key.enter-mid-block` | official | text:BBBB count 1 | PASS | 1 |
| `editor.key.enter-mid-block` | official | selection:collapsed equals true | PASS | true |
| `editor.key.enter-mid-block` | official | selection:anchorOffset equals 0 | PASS | 0 |
| `editor.key.enter-mid-block` | local | blocks equals ["AAAA","BBBB"] | PASS | ["AAAA","BBBB"] |
| `editor.key.enter-mid-block` | local | blocksCount count 2 | PASS | 2 |
| `editor.key.enter-mid-block` | local | text:AAAA count 1 | PASS | 1 |
| `editor.key.enter-mid-block` | local | text:BBBB count 1 | PASS | 1 |
| `editor.key.enter-mid-block` | local | selection:collapsed equals true | PASS | true |
| `editor.key.enter-mid-block` | local | selection:anchorOffset equals 0 | PASS | 0 |
| `editor.key.shift-enter-hard-break` | official | blocksCount count 2 | PASS | 2 |
| `editor.key.shift-enter-hard-break` | official | text:AAA count 1 | PASS | 1 |
| `editor.key.shift-enter-hard-break` | official | text:BBB count 1 | PASS | 1 |
| `editor.key.shift-enter-hard-break` | local | blocksCount count 2 | PASS | 2 |
| `editor.key.shift-enter-hard-break` | local | text:AAA count 1 | PASS | 1 |
| `editor.key.shift-enter-hard-break` | local | text:BBB count 1 | PASS | 1 |
| `editor.key.turn-into-style` | official | text:AAA count 1 | PASS | 1 |
| `editor.key.turn-into-style` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.turn-into-style` | local | text:AAA count 1 | PASS | 1 |
| `editor.key.turn-into-style` | local | blocksCount count 1 | **FAIL** | 2 |
| `editor.selection.ctrl-a-ladder` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.selection.ctrl-a-ladder` | official | selection:collapsed equals false | PASS | false |
| `editor.selection.ctrl-a-ladder` | official | focusInEditor equals true | PASS | true |
| `editor.selection.ctrl-a-ladder` | official | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.selection.ctrl-a-ladder` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.selection.ctrl-a-ladder` | local | selection:collapsed equals false | PASS | false |
| `editor.selection.ctrl-a-ladder` | local | focusInEditor equals true | PASS | true |
| `editor.selection.ctrl-a-ladder` | local | blocks equals ["AAA","BBB","CCC"] | PASS | ["AAA","BBB","CCC"] |
| `editor.selection.select-to-top-bottom` | official | blocksCount count 3 | PASS | 3 |
| `editor.selection.select-to-top-bottom` | official | text:AAA count 1 | PASS | 1 |
| `editor.selection.select-to-top-bottom` | official | text:BBB count 1 | PASS | 1 |
| `editor.selection.select-to-top-bottom` | official | text:CCC count 1 | PASS | 1 |
| `editor.selection.select-to-top-bottom` | local | blocksCount count 3 | PASS | 3 |
| `editor.selection.select-to-top-bottom` | local | text:AAA count 1 | PASS | 1 |
| `editor.selection.select-to-top-bottom` | local | text:BBB count 1 | PASS | 1 |
| `editor.selection.select-to-top-bottom` | local | text:CCC count 1 | PASS | 1 |
| `editor.slash.open-and-filter` | official | state:slashMenu gt 0 | PASS | 1 |
| `editor.slash.open-and-filter` | official | blocks equals ["/"] | PASS | ["/"] |
| `editor.slash.open-and-filter` | official | blocks equals ["/wen"] | PASS | ["/wen"] |
| `editor.slash.open-and-filter` | official | blocksCount count 1 | PASS | 1 |
| `editor.slash.open-and-filter` | local | state:slashMenu gt 0 | PASS | 1 |
| `editor.slash.open-and-filter` | local | blocks equals ["/"] | PASS | ["/"] |
| `editor.slash.open-and-filter` | local | blocks equals ["/wen"] | PASS | ["/wen"] |
| `editor.slash.open-and-filter` | local | blocksCount count 1 | PASS | 1 |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
