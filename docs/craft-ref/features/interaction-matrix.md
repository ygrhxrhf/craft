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
| `editor.a11y.task-item-checkbox` | differ | 33 | 19 | 0 | 本地 +2/−0 · 官方 +1/−0 |
| `editor.animation.slash-menu` | differ | 38 | 9 | 21 | 本地 +1/−1 · 官方 +21/−0 |
| `editor.block.enter-empty-block` | match | 10 | 0 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.block.indent-in-list` | differ | 21 | 3 | 2 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.indent-plain-paragraph` | differ | 23 | 9 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.move-alt-updown` | differ | 21 | 1 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.block.move-top-bottom` | differ | 21 | 5 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.key.backspace-at-block-start` | match | 20 | 0 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.backspace-in-list` | match | 14 | 0 | 2 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.ctrl-arrow-word-nav` | differ | 43 | 15 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.duplicate-and-undo` | differ | 30 | 12 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.key.enter-mid-block` | match | 14 | 0 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.find-replace` | differ | 22 | 11 | 3 | 本地 +10/−1 · 官方 +5/−2 |
| `editor.key.list-family` | match | 14 | 0 | 2 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.shift-enter-hard-break` | differ | 17 | 3 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.turn-into-style` | differ | 19 | 7 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.md-rules.block-kind` | differ | 93 | 36 | 19 | 本地 +6/−0 · 官方 +6/−1 |
| `editor.md-rules.inline-mark` | differ | 59 | 16 | 0 | 本地 +6/−0 · 官方 +6/−0 |
| `editor.paste.plain-text` | differ | 27 | 15 | 0 | 本地 +2/−0 · 官方 +4/−0 |
| `editor.selection.ctrl-a-ladder` | differ | 26 | 8 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.selection.select-to-top-bottom` | differ | 40 | 16 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.slash.open-and-filter` | match | 8 | 0 | 2 | 本地 +2/−0 · 官方 +1/−0 |
| `local.db.document-row` | match | 44 | 0 | 38 | 本地 +17/−1 · 官方 +17/−7 |
| `shell.command-palette.toggle-vs-jump` | match | 21 | 0 | 15 | 本地 +5/−0 · 官方 +3/−1 |
| `shell.tasks.new-task-popup` | differ | 13 | 7 | 0 | 本地 +0/−0 · 官方 +0/−0 |

## 已声明偏差明细

| spec | facet | step | official | local | 理由 | 出处 |
| --- | --- | --- | --- | --- | --- | --- |
| `editor.animation.slash-menu` | added-only-official |  | 列表 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 动作 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 取消样式 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 字体 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 对齐 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 提醒我… |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入分隔符 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入文件 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入片段 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入画廊集合 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入白板 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入看板集合 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入表格 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 插入表格集合 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 文字格式 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 文本样式 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 日期和时间 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 缩进 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 装饰 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | added-only-official |  | 颜色 |  | 官方斜线菜单是扁平 20 项、本地是分组长列表 ⇒ 菜单项文案两侧本就不一一对应；该差异已由 gap.md G1544 单独登记，与动效无关 | gap.md G1544；editor.slash.open-and-filter 同一声明 |
| `editor.animation.slash-menu` | removed-only-local |  |  | 同步中 | 本地列表屏的同步状态串（同步中/保存中）在官方无对应物；属外壳状态不是编辑器内容 | observe.mjs NOISE_RULES <SAVING> |
| `editor.block.indent-in-list` | selection:anchorOffset | 1 | 1 | 0 | 项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 空列表项里光标 offset 天然差 1 | probe-bullet（本轮实测：官方 childTexts ["•","L1"]；本地 listStyleType:disc） |
| `editor.block.indent-in-list` | selection:focusOffset | 1 | 1 | 0 | 同上（focusOffset 与 anchorOffset 同源） | probe-bullet |
| `editor.key.backspace-in-list` | selection:anchorOffset | 1 | 1 | 0 | 项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 光标 offset 天然差 1 | probe-bullet；同 editor.block.indent-in-list 的同一声明 |
| `editor.key.backspace-in-list` | selection:focusOffset | 1 | 1 | 0 | 同上（focusOffset 与 anchorOffset 同源） | probe-bullet |
| `editor.key.find-replace` | removed-only-local |  |  | 同步中 | 本地同步状态串（同步中）随同步完成而消失；属外壳状态不是编辑器内容 | observe.mjs NOISE_RULES <SAVING> |
| `editor.key.find-replace` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示（使用标题、页面或卡片创建目录。／目录）随面板重绘出现或消失；已由 G1556 一族的 TOC_PLACEHOLDER 承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.find-replace` | removed-only-official |  | 目录 |  | 官方侧栏目录区的空态提示（使用标题、页面或卡片创建目录。／目录）随面板重绘出现或消失；已由 G1556 一族的 TOC_PLACEHOLDER 承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.list-family` | countΔ:AAA | 2 | 1 | 2 | 本地任务块勾选框的合成可及名含任务文本 ⇒ 同一个词被 count 两次；已由 G1563 单独承载 | gap.md G1563 |
| `editor.key.list-family` | blocks | 4 | ["1. AAA"] | ["AAA"] | 官方把列表序号画进文本节点（1. AAA），本地由 CSS counter 画、不进 innerText；已由 G866／G1556 承载 | gap.md G866 · G1556；editor.md-rules.block-kind 同一声明 |
| `editor.md-rules.block-kind` | countΔ:AAA | 3 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 4 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 5 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 6 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 7 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 8 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 9 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 10 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 11 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 12 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 13 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 14 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 15 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 16 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 17 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | countΔ:AAA | 18 | 2 | 1 | 官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块" | gap.md G1556（侧栏大纲行定位） |
| `editor.md-rules.block-kind` | added-only-local |  |  | Task item checkbox for empty task item | 本地 TipTap 任务块的 checkbox 可及名（`Task item checkbox for <text>／empty task item`）用 visuallyHiddenStyle 画，文本**仍进 innerText**；官方任务块无此串。★ 第 304 批已把 a11y 面单独采成账（`gap.md` | node_modules/@tiptap/extension-list/src/task-item/task-item.ts:83-85（getCheckboxLabel 默认串）；gap.md G1563 |
| `editor.md-rules.block-kind` | added-only-official |  | 1. |  | 官方列表序号（`1.`／`2.`）会出现在正文文本流之外，本地列表序号由 CSS counter 画、不进 innerText。☆ 侧栏大纲行原本也在这里表现为 `AAA#1`／`…#3` 这样的**重复文本**条目，第 303 批把名册的重复计数后缀去掉后（重复与否另有 `countΔ:` 精算），该类条目不再单列  | gap.md G1556 · G866（官方序号画进文本节点） |
| `editor.md-rules.block-kind` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方基线里带一枚目录空态提示「使用标题、页面或卡片创建目录。」，本批临时文档本地侧未渲染该提示（本地该串是纯核常量 TOC_PLACEHOLDER）⇒ 与本 spec 主判据无关 | src/lib/editor/official-copy.ts:8（TOC_PLACEHOLDER 逐字） |
| `editor.slash.open-and-filter` | countΔ:插入 | 1 | 8 | 4 | 菜单项文案与条数不同（官方扁平 8 条含「插入」：插入文件/片段/表格/分隔符/白板/表格集合/画廊集合/看板集合；本地 4 条）—— 与上面两条同源 | probe-verbatim.json · gap.md（本轮新登记） |
| `editor.slash.open-and-filter` | added-only-local |  |  | 无匹配命令 | 本地 / 菜单的**无匹配文案**是「无匹配命令」；官方过滤后直接把面板收起、不给无匹配文案（G1544 同源） | chk-roster：官方 added=["/wen"]、本地 added=["/wen","无匹配命令"] · gap.md G1544 |
| `local.db.document-row` | added-only-local |  |  | 1 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 上次浏览 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 分享者 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 创建/共享日期 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 升序 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 名称 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 已更新 4秒钟前 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 已移至最近删除 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 排序方式 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 新建文件夹 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 新建文档 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 新建白板 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 新建集合 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 最近编辑 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-local |  |  | 降序 | 外壳（侧栏/标题行）在删除前后的名册变化，两侧组织方式本就不同，与库面判据无关 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | / |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | 18 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | 2025/5/5 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | AAA |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | Craft Handbook |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | QODER-HARVEST-C01-W2-BLOCKS |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | QODER-HARVEST-C01-W3-REMIND |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | QODER-ILAB-div7 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | QODER-ILAB-divB |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | Quick Start: get going |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | Watch: how to videos |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | Welcome to Craft |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | 无标题文档 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | 日记 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | added-only-official |  | 获得 Craft Plus |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-local |  |  | 📄 | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | 19 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | QODER-ILAB-local.db.document-row |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | ​ |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | 共享 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | 刚刚 |  | 同上 | editor.paste.plain-text 同族噪声 |
| `local.db.document-row` | removed-only-official |  | 目录 |  | 同上 | editor.paste.plain-text 同族噪声 |
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

### `editor.a11y.task-item-checkbox` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | countΔ:Buy milk | 1 | 2 | 1 | 2 |
|  | added-only-local |  | Task item checkbox for Buy milk |  | 2 |
| 0 | a11y-only-official | button\|Reaction Icon |  |  | 2 |
| 0 | a11y-only-official | button\|Text Bubble Icon |  |  | 2 |
| 0 | a11y-only-official | textbox\| |  |  | 2 |
| 1 | a11y-only-local |  | checkbox\|Task item checkbox for empty task item |  | 2 |
| 1 | a11y-only-official | button\|Arrow Right Circle Icon |  |  | 2 |
| 1 | a11y-only-official | button\|Calendar Icon |  |  | 2 |
| 1 | a11y-only-official | button\|Flag Icon |  |  | 2 |
| 1 | a11y-only-official | button\|Reaction Icon |  |  | 2 |
| 1 | a11y-only-official | button\|Text Bubble Icon |  |  | 2 |
| 1 | a11y-only-official | textbox\| |  |  | 2 |
| 2 | a11y-only-local |  | checkbox\|Task item checkbox for Buy milk |  | 2 |
| 2 | a11y-only-official | button\|Arrow Right Circle Icon |  |  | 2 |
| 2 | a11y-only-official | button\|Calendar Icon |  |  | 2 |
| 2 | a11y-only-official | button\|Flag Icon |  |  | 2 |
| 2 | a11y-only-official | button\|Reaction Icon |  |  | 2 |
| 2 | a11y-only-official | button\|Text Bubble Icon |  |  | 2 |
| 2 | a11y-only-official | textbox\| |  |  | 2 |

### `editor.animation.slash-menu` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 3 | state:slashMenu | 1 | 0 | -1 | 2 |
| 3 | anim-only-local |  | anim\|(anim)\|div\|150 |  | 2 |
| 3 | anim-only-local |  | trans\|padding-bottom\|div\|150 |  | 2 |
| 3 | anim-only-local |  | trans\|padding-left\|div\|150 |  | 2 |
| 3 | anim-only-local |  | trans\|padding-right\|div\|150 |  | 2 |
| 3 | anim-only-local |  | trans\|padding-top\|div\|150 |  | 2 |
| 3 | anim-only-local |  | trans\|visibility\|div\|150 |  | 2 |
| 3 | anim-only-official | anim\|(anim)\|div\|100 |  |  | 2 |
| 3 | anim-only-official | trans\|opacity\|div\|interrupted |  |  | 2 |

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

### `editor.key.find-replace` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-local |  | 0 结果 |  | 2 |
|  | added-only-local |  | Aa |  | 2 |
|  | added-only-local |  | \| |  | 2 |
|  | added-only-local |  | 在文档中 |  | 2 |
|  | added-only-local |  | 在页面上 |  | 2 |
|  | added-only-local |  | 文本 |  | 2 |
|  | added-only-local |  | 正则 |  | 2 |
|  | added-only-official | 暂无结果 |  |  | 2 |
|  | added-only-official | 查找和替换 |  |  | 2 |
| 2 | attr:replaceInput |  | 替换为…… |  | 2 |
| 2 | state:replaceInput | 0 | 1 | 1 | 2 |

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

### `editor.md-rules.block-kind` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 1 | blocks | [""] | ["",""] |  | 2 |
| 2 | blocks | ["AAA"] | ["AAA",""] |  | 2 |
| 3 | blocks | ["AAA",""] | ["AAA","",""] |  | 2 |
| 4 | blocks | ["AAA",""] | ["AAA","",""] |  | 2 |
| 5 | blocks | ["AAA",""] | ["AAA","",""] |  | 2 |
| 6 | blocks | ["AAA","BBB"] | ["AAA","BBB",""] |  | 2 |
| 7 | blocks | ["AAA","BBB",""] | ["AAA","BBB","",""] |  | 2 |
| 8 | blocks | ["AAA","BBB",""] | ["AAA","BBB","",""] |  | 2 |
| 9 | blocks | ["AAA","BBB",""] | ["AAA","BBB","",""] |  | 2 |
| 10 | blocks | ["AAA","BBB","CCC"] | ["AAA","BBB","CCC",""] |  | 2 |
| 11 | blocks | ["AAA","BBB","CCC",""] | ["AAA","BBB","CCC","",""] |  | 2 |
| 12 | blocks | ["AAA","BBB","CCC",""] | ["AAA","BBB","CCC","",""] |  | 2 |
| 13 | blocks | ["AAA","BBB","CCC","1."] | ["AAA","BBB","CCC","",""] |  | 2 |
| 14 | blocks | ["AAA","BBB","CCC","1. EEE"] | ["AAA","BBB","CCC","EEE",""] |  | 2 |
| 15 | blocks | ["AAA","BBB","CCC","1. EEE","2."] | ["AAA","BBB","CCC","EEE","",""] |  | 2 |
| 16 | blocks | ["AAA","BBB","CCC","1. EEE",""] | ["AAA","BBB","CCC","EEE","",""] |  | 2 |
| 17 | blocks | ["AAA","BBB","CCC","1. EEE",""] | ["AAA","BBB","CCC","EEE","",""] |  | 2 |
| 18 | blocks | ["AAA","BBB","CCC","1. EEE","DDD"] | ["AAA","BBB","CCC","EEE","","DDD"] |  | 2 |
| 1 | kinds | ["title"] | ["title","para"] |  | 2 |
| 2 | kinds | ["title"] | ["title","para"] |  | 2 |
| 3 | kinds | ["title","para"] | ["title","para","para"] |  | 2 |
| 4 | kinds | ["title","para"] | ["title","para","para"] |  | 2 |
| 5 | kinds | ["title","strong"] | ["title","heading4","para"] |  | 2 |
| 6 | kinds | ["title","strong"] | ["title","heading4","para"] |  | 2 |
| 7 | kinds | ["title","strong","para"] | ["title","heading4","para","para"] |  | 2 |
| 8 | kinds | ["title","strong","para"] | ["title","heading4","para","para"] |  | 2 |
| 9 | kinds | ["title","strong","bullet"] | ["title","heading4","bullet","para"] |  | 2 |
| 10 | kinds | ["title","strong","bullet"] | ["title","heading4","bullet","para"] |  | 2 |
| 11 | kinds | ["title","strong","bullet","bullet"] | ["title","heading4","bullet","bullet","para"] |  | 2 |
| 12 | kinds | ["title","strong","bullet","para"] | ["title","heading4","bullet","para","para"] |  | 2 |
| 13 | kinds | ["title","strong","bullet","numbered"] | ["title","heading4","bullet","numbered","para"] |  | 2 |
| 14 | kinds | ["title","strong","bullet","numbered"] | ["title","heading4","bullet","numbered","para"] |  | 2 |
| 15 | kinds | ["title","strong","bullet","numbered","numbered"] | ["title","heading4","bullet","numbered","numbered","para"] |  | 2 |
| 16 | kinds | ["title","strong","bullet","numbered","para"] | ["title","heading4","bullet","numbered","para","para"] |  | 2 |
| 17 | kinds | ["title","strong","bullet","numbered","task"] | ["title","heading4","bullet","numbered","task","para"] |  | 2 |
| 18 | kinds | ["title","strong","bullet","numbered","task"] | ["title","heading4","bullet","numbered","task","para"] |  | 2 |

### `editor.md-rules.inline-mark` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 1 | countΔ:**X** | 1 | 0 | -1 | 2 |
| 5 | countΔ:*Y* | 1 | 0 | -1 | 2 |
| 9 | countΔ:~~Z~~ | 1 | 0 | -1 | 2 |
| 13 | countΔ:==W== | 1 | 0 | -1 | 2 |
| 1 | blocks | ["**X**"] | ["X"] |  | 2 |
| 5 | blocks | ["X","*Y*"] | ["X","Y"] |  | 2 |
| 9 | blocks | ["X","Y","~~Z~~"] | ["X","Y","Z"] |  | 2 |
| 13 | blocks | ["X","Y","Z","==W=="] | ["X","Y","Z","W"] |  | 2 |
| 17 | blocks | ["X","Y","Z","W","`C`"] | ["X","Y","Z","W","C"] |  | 2 |
| 21 | blocks | ["X","Y","Z","W","C","[T](https://a.com)"] | ["X","Y","Z","W","C","T"] |  | 2 |
| 1 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 5 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 9 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["strike"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 13 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 17 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["code"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 21 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["link"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |

### `editor.paste.plain-text` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-local |  | example.com |  | 2 |
|  | added-only-official | Data is Outdated |  |  | 2 |
|  | added-only-official | This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring purposes. |  |  | 2 |
|  | added-only-official | example.com/ |  |  | 2 |
| 3 | blocks | [] | [""] |  | 2 |
| 4 | blocks | ["Example Domain This domain is for use in documentation examples without needing permission. This is not a service; avoid"] | ["example.com 正在获取链接预览...",""] |  | 2 |
| 5 | blocks | ["Example Domain This domain is for use in documentation examples without needing permission. This is not a service; avoid"] | ["example.com Example Domain",""] |  | 2 |
| 1 | focusInEditor | false | true |  | 2 |
| 2 | focusInEditor | false | true |  | 2 |
| 3 | focusInEditor | false | true |  | 2 |
| 4 | focusInEditor | false | true |  | 2 |
| 5 | focusInEditor | false | true |  | 2 |
| 3 | kinds | [] | ["para"] |  | 2 |
| 4 | kinds | ["para"] | ["para","para"] |  | 2 |
| 5 | kinds | ["para"] | ["para","para"] |  | 2 |

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

### `shell.tasks.new-task-popup` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 0 | attr:taskInput |  | 添加任务，按回车确认… |  | 2 |
| 1 | attr:taskInput |  | 添加任务，按回车确认… |  | 2 |
| 2 | attr:taskInput |  | 添加任务，按回车确认… |  | 2 |
| 0 | state:taskInput | 0 | 1 | 1 | 2 |
| 1 | state:newTaskPopup | 1 | 0 | -1 | 2 |
| 1 | state:taskInput | 0 | 1 | 1 | 2 |
| 2 | state:taskInput | 0 | 1 | 1 | 2 |

## spec 自带期望（selfCheck）

每侧对**自己的观测**求 `spec.expect`（两侧互比由上表负责，两者是两件事）。

| spec | 靶 | 期望 | 结果 | actual |
| --- | --- | --- | --- | --- |
| `browse.box-select.drag-marquee` | official | blocksCount count 0 | PASS | 0 |
| `browse.box-select.drag-marquee` | local | blocksCount count 0 | PASS | 0 |
| `editor.a11y.task-item-checkbox` | official | blocks equals ["Buy milk"] | PASS | ["Buy milk"] |
| `editor.a11y.task-item-checkbox` | official | blocksCount count 1 | PASS | 1 |
| `editor.a11y.task-item-checkbox` | local | blocks equals ["Buy milk"] | PASS | ["Buy milk"] |
| `editor.a11y.task-item-checkbox` | local | blocksCount count 1 | PASS | 1 |
| `editor.animation.slash-menu` | official | state:slashMenu gt 0 | PASS | 1 |
| `editor.animation.slash-menu` | official | blocks equals ["/"] | PASS | ["/"] |
| `editor.animation.slash-menu` | local | state:slashMenu gt 0 | PASS | 1 |
| `editor.animation.slash-menu` | local | blocks equals ["/"] | PASS | ["/"] |
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
| `editor.key.backspace-at-block-start` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-at-block-start` | official | blocks equals ["AAA","BBB"] | PASS | ["AAA","BBB"] |
| `editor.key.backspace-at-block-start` | official | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-at-block-start` | official | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | official | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-at-block-start` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-at-block-start` | local | blocks equals ["AAA","BBB"] | PASS | ["AAA","BBB"] |
| `editor.key.backspace-at-block-start` | local | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-at-block-start` | local | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | local | blocks equals ["AAABBB"] | PASS | ["AAABBB"] |
| `editor.key.backspace-at-block-start` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-in-list` | official | kinds equals ["para"] | PASS | ["para"] |
| `editor.key.backspace-in-list` | official | kinds contains "bullet" | PASS | ["bullet"] |
| `editor.key.backspace-in-list` | official | kinds contains "bullet" | PASS | ["bullet"] |
| `editor.key.backspace-in-list` | official | kinds equals ["para"] | PASS | ["para"] |
| `editor.key.backspace-in-list` | official | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.backspace-in-list` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-in-list` | official | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.backspace-in-list` | official | kinds equals ["para"] | PASS | ["para"] |
| `editor.key.backspace-in-list` | local | kinds equals ["para"] | PASS | ["para"] |
| `editor.key.backspace-in-list` | local | kinds contains "bullet" | PASS | ["bullet"] |
| `editor.key.backspace-in-list` | local | kinds contains "bullet" | PASS | ["bullet"] |
| `editor.key.backspace-in-list` | local | kinds equals ["para"] | PASS | ["para"] |
| `editor.key.backspace-in-list` | local | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.backspace-in-list` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.backspace-in-list` | local | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.backspace-in-list` | local | kinds equals ["para"] | PASS | ["para"] |
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
| `editor.key.find-replace` | official | state:findInput gt 0 | PASS | 1 |
| `editor.key.find-replace` | official | blocks equals ["ALPHA BETA ALPHA"] | PASS | ["ALPHA BETA ALPHA"] |
| `editor.key.find-replace` | local | state:findInput gt 0 | PASS | 1 |
| `editor.key.find-replace` | local | blocks equals ["ALPHA BETA ALPHA"] | PASS | ["ALPHA BETA ALPHA"] |
| `editor.key.list-family` | official | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.list-family` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.list-family` | local | blocks equals ["AAA"] | PASS | ["AAA"] |
| `editor.key.list-family` | local | blocksCount count 1 | PASS | 1 |
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
| `editor.md-rules.block-kind` | official | text:AAA count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | official | text:BBB count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | official | text:CCC count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | official | text:EEE count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | official | text:DDD count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | local | text:AAA count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | local | text:BBB count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | local | text:CCC count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | local | text:EEE count 1 | PASS | 1 |
| `editor.md-rules.block-kind` | local | text:DDD count 1 | PASS | 1 |
| `editor.md-rules.inline-mark` | official | text:**X** count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | official | text:*Y* count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | official | text:~~Z~~ count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | official | text:==W== count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | local | text:**X** count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | local | text:*Y* count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | local | text:~~Z~~ count 0 | PASS | 0 |
| `editor.md-rules.inline-mark` | local | text:==W== count 0 | PASS | 0 |
| `editor.paste.plain-text` | official | text:AAA count 1 | PASS | 1 |
| `editor.paste.plain-text` | official | text:BBB count 1 | PASS | 1 |
| `editor.paste.plain-text` | local | text:AAA count 1 | PASS | 1 |
| `editor.paste.plain-text` | local | text:BBB count 1 | PASS | 1 |
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
| `local.db.document-row` | local | db:exists equals true | PASS | true |
| `local.db.document-row` | local | db:isDeleted equals false | PASS | false |
| `local.db.document-row` | local | db:title equals "QODER-ILAB-local.db.document-row" | PASS | "QODER-ILAB-local.db.document-row" |
| `local.db.document-row` | local | blocks equals ["DBCONTENT"] | PASS | ["DBCONTENT"] |
| `local.db.document-row` | local | db:contentLen equals 0 | PASS | 0 |
| `local.db.document-row` | local | db:isDeleted equals true | PASS | true |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
| `shell.tasks.new-task-popup` | official | text:任务 gt 0 | PASS | 1 |
| `shell.tasks.new-task-popup` | local | text:任务 gt 0 | PASS | 4 |
