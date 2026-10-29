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
| `editor.block.group-shape` | differ | 28 | 10 | 4 | 本地 +2/−0 · 官方 +2/−1 |
| `editor.block.indent-in-list` | differ | 21 | 3 | 2 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.indent-plain-paragraph` | differ | 23 | 9 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.block.insert-before-selected` | differ | 37 | 17 | 4 | 本地 +1/−0 · 官方 +2/−0 |
| `editor.block.move-alt-updown` | differ | 21 | 1 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.block.move-top-bottom` | differ | 21 | 5 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.block.selection-mode` | differ | 49 | 30 | 1 | 本地 +2/−0 · 官方 +2/−1 |
| `editor.block.ungroup-shape` | differ | 42 | 15 | 7 | 本地 +2/−0 · 官方 +2/−1 |
| `editor.key.backspace-at-block-start` | match | 20 | 0 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.backspace-in-list` | match | 14 | 0 | 2 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.comment` | differ | 23 | 7 | 6 | 本地 +1/−0 · 官方 +2/−0 |
| `editor.key.comment.close` | differ | 34 | 16 | 4 | 本地 +0/−0 · 官方 +1/−0 |
| `editor.key.ctrl-arrow-word-nav` | differ | 43 | 15 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.duplicate-and-undo` | differ | 30 | 12 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.key.enter-mid-block` | match | 14 | 0 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.equation` | differ | 17 | 3 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.equation.commit` | differ | 28 | 9 | 5 | 本地 +1/−0 · 官方 +2/−0 |
| `editor.key.find-replace` | differ | 21 | 11 | 2 | 本地 +10/−0 · 官方 +5/−2 |
| `editor.key.group-and-blocklink` | differ | 47 | 17 | 2 | 本地 +8/−0 · 官方 +4/−2 |
| `editor.key.home-end-arrows` | match | 14 | 0 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.inline-chord-family` | differ | 124 | 56 | 0 | 本地 +14/−0 · 官方 +8/−0 |
| `editor.key.insert-block-space` | differ | 20 | 4 | 2 | 本地 +1/−0 · 官方 +2/−1 |
| `editor.key.insert-block-space-selected` | differ | 21 | 4 | 3 | 本地 +2/−0 · 官方 +3/−1 |
| `editor.key.list-family` | match | 14 | 0 | 2 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.shift-enter-hard-break` | differ | 17 | 3 | 0 | 本地 +2/−0 · 官方 +2/−0 |
| `editor.key.toggle-all` | differ | 71 | 44 | 1 | 本地 +1/−0 · 官方 +2/−0 |
| `editor.key.toggle-all-v2` | differ | 57 | 35 | 0 | 本地 +4/−0 · 官方 +2/−0 |
| `editor.key.toggle-all-v3` | differ | 48 | 19 | 1 | 本地 +2/−0 · 官方 +3/−0 |
| `editor.key.turn-into-extra` | differ | 46 | 21 | 5 | 本地 +1/−0 · 官方 +6/−0 |
| `editor.key.turn-into-style` | differ | 19 | 7 | 0 | 本地 +1/−0 · 官方 +1/−0 |
| `editor.key.url-link` | differ | 20 | 9 | 1 | 本地 +7/−0 · 官方 +1/−0 |
| `editor.md-rules.block-kind` | differ | 93 | 36 | 19 | 本地 +6/−0 · 官方 +6/−1 |
| `editor.md-rules.inline-mark` | differ | 59 | 16 | 0 | 本地 +6/−0 · 官方 +6/−0 |
| `editor.page-block.behavior` | differ | 38 | 20 | 4 | 本地 +1/−0 · 官方 +3/−1 |
| `editor.paste.html` | match | 10 | 0 | 2 | 本地 +4/−0 · 官方 +5/−1 |
| `editor.paste.plain-text` | differ | 27 | 15 | 0 | 本地 +2/−0 · 官方 +4/−0 |
| `editor.selection.ctrl-a-ladder` | differ | 26 | 8 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.selection.select-to-top-bottom` | differ | 40 | 16 | 0 | 本地 +3/−0 · 官方 +3/−0 |
| `editor.slash.open-and-filter` | match | 8 | 0 | 2 | 本地 +2/−0 · 官方 +1/−0 |
| `local.db.document-row` | match | 44 | 0 | 38 | 本地 +17/−1 · 官方 +17/−7 |
| `shell.assistant.open` | match | 9 | 0 | 1 | 本地 +1/−0 · 官方 +1/−0 |
| `shell.command-palette.toggle-vs-jump` | match | 21 | 0 | 15 | 本地 +5/−0 · 官方 +3/−1 |
| `shell.quick-open.alt` | differ | 34 | 2 | 20 | 本地 +1/−1 · 官方 +15/−1 |
| `shell.shortcuts-panel.key` | differ | 11 | 2 | 1 | 本地 +1/−0 · 官方 +1/−0 |
| `shell.sidebar-toggle.repro` | match | 10 | 0 | 0 | 本地 +0/−0 · 官方 +0/−0 |
| `shell.tasks.new-task-popup` | differ | 13 | 7 | 0 | 本地 +0/−0 · 官方 +0/−0 |
| `shell.toggles.family` | differ | 26 | 10 | 2 | 本地 +5/−1 · 官方 +1/−0 |

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
| `editor.block.group-shape` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.block.group-shape` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.group-shape` | focusInEditor | 5 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.group-shape` | focusInEditor | 6 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.indent-in-list` | selection:anchorOffset | 1 | 1 | 0 | 项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 空列表项里光标 offset 天然差 1 | probe-bullet（本轮实测：官方 childTexts ["•","L1"]；本地 listStyleType:disc） |
| `editor.block.indent-in-list` | selection:focusOffset | 1 | 1 | 0 | 同上（focusOffset 与 anchorOffset 同源） | probe-bullet |
| `editor.block.insert-before-selected` | added-only-official |  | ALPHA |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.block.insert-before-selected` | added-only-official |  | BETA |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.block.insert-before-selected` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.insert-before-selected` | focusInEditor | 5 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.selection-mode` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.block.ungroup-shape` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.block.ungroup-shape` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.ungroup-shape` | focusInEditor | 5 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.ungroup-shape` | focusInEditor | 6 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.ungroup-shape` | focusInEditor | 7 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.ungroup-shape` | focusInEditor | 8 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.block.ungroup-shape` | focusInEditor | 9 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.backspace-in-list` | selection:anchorOffset | 1 | 1 | 0 | 项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 光标 offset 天然差 1 | probe-bullet；同 editor.block.indent-in-list 的同一声明 |
| `editor.key.backspace-in-list` | selection:focusOffset | 1 | 1 | 0 | 同上（focusOffset 与 anchorOffset 同源） | probe-bullet |
| `editor.key.comment` | selection:focusOffset | 2 | 18 | 1 | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment` | selection:collapsed | 3 | true | false | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment` | selection:focusOffset | 3 | 0 | 1 | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment` | selection:collapsed | 4 |  | false | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment` | selection:anchorOffset | 4 |  | 0 | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment` | selection:focusOffset | 4 |  | 1 | 本 spec 的 Ctrl-A 只为"有选中"这一前置服务；选区落点两侧不同已由 select-all 梯子单独采集与登记，不在这里重复判 | specs/editor.selection.ctrl-a-ladder.mjs |
| `editor.key.comment.close` | added-only-official |  | CMT |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.comment.close` | focusInEditor | 0 | true | false | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.comment.close` | focusInEditor | 1 | true | false | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.comment.close` | focusInEditor | 2 | true | false | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.equation.commit` | added-only-official |  | 2 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.equation.commit` | added-only-official |  | x |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.equation.commit` | focusInEditor | 3 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.equation.commit` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.equation.commit` | focusInEditor | 6 | false | true | Escape 的焦点差异已由 G1583 承载 | gap.md G1583 |
| `editor.key.find-replace` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示（使用标题、页面或卡片创建目录。／目录）随面板重绘出现或消失；已由 G1556 一族的 TOC_PLACEHOLDER 承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.find-replace` | removed-only-official |  | 目录 |  | 官方侧栏目录区的空态提示（使用标题、页面或卡片创建目录。／目录）随面板重绘出现或消失；已由 G1556 一族的 TOC_PLACEHOLDER 承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.group-and-blocklink` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.group-and-blocklink` | removed-only-official |  | 目录 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.insert-block-space` | added-only-official |  | 35 |  | 官方侧栏的文档计数（本批读数 35）随列表重绘出现；是外壳计数不是编辑器内容 | observe.mjs NOISE_RULES 未覆盖该串，逐 spec 声明 |
| `editor.key.insert-block-space` | removed-only-official |  | 34 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.insert-block-space-selected` | added-only-official |  | 33 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.insert-block-space-selected` | removed-only-official |  | 32 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.key.insert-block-space-selected` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 承载；本 spec 只判两键是否插块 | gap.md G1583 |
| `editor.key.list-family` | countΔ:AAA | 2 | 1 | 2 | 本地任务块勾选框的合成可及名含任务文本 ⇒ 同一个词被 count 两次；已由 G1563 单独承载 | gap.md G1563 |
| `editor.key.list-family` | blocks | 4 | ["1. AAA"] | ["AAA"] | 官方把列表序号画进文本节点（1. AAA），本地由 CSS counter 画、不进 innerText；已由 G866／G1556 承载 | gap.md G866 · G1556；editor.md-rules.block-kind 同一声明 |
| `editor.key.toggle-all` | added-only-official |  | CHILD1 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.toggle-all-v3` | added-only-official |  | 空折叠块 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.turn-into-extra` | added-only-official |  | 套用样式 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.turn-into-extra` | added-only-official |  | 自定义 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.turn-into-extra` | added-only-official |  | 自定义背景 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.turn-into-extra` | added-only-official |  | 配置卡片 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.turn-into-extra` | added-only-official |  | 预览 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.key.url-link` | focusInEditor | 4 | true | false | Escape 的焦点差异已由 G1583 单独承载；本 spec 只判 Ctrl-K 有没有承载面 | gap.md G1583 |
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
| `editor.page-block.behavior` | added-only-official |  | CHILD |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.page-block.behavior` | added-only-official |  | PGBLKINNER |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.page-block.behavior` | added-only-official |  | 页面预览将显示在此处。单击以添加内容。 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.page-block.behavior` | removed-only-official |  | 使用标题、页面或卡片创建目录。 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `editor.paste.html` | added-only-official |  | 33 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `editor.paste.html` | removed-only-official |  | 32 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
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
| `shell.assistant.open` | focusInEditor | 3 | false | true | 第 3 步的焦点差异来自 Escape 的「退一层」（官方把焦点送到 body），已由 G1583 单独承载；本 spec 只判 Ctrl-Enter 有没有承载面 | gap.md G1583 |
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
| `shell.quick-open.alt` | added-only-official |  | / |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 2025/5/5 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 33 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | Craft Handbook |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | QODER-HARVEST-C01-W2-BLOCKS |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | QODER-ILAB-div7 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | QODER-ILAB-ins-page |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | Watch: how to videos |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | Welcome to Craft |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 在zhang's Space中 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 快照 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 文档 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 无标题文档 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | added-only-official |  | 日记 |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.quick-open.alt` | removed-only-local |  |  | 同步中 | 本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容 | observe.mjs NOISE_RULES |
| `shell.quick-open.alt` | removed-only-official |  | 32 |  | 官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载 | src/lib/editor/official-copy.ts:8 |
| `shell.quick-open.alt` | focusInEditor | 2 | false | true | Escape 的焦点差异已由 G1583 单独承载；本 spec 只判两条快速开启弦有没有承载面 | gap.md G1583 |
| `shell.quick-open.alt` | focusInEditor | 3 | false | true | Escape 的焦点差异已由 G1583 单独承载；本 spec 只判两条快速开启弦有没有承载面 | gap.md G1583 |
| `shell.quick-open.alt` | focusInEditor | 4 | false | true | Escape 的焦点差异已由 G1583 单独承载；本 spec 只判两条快速开启弦有没有承载面 | gap.md G1583 |
| `shell.quick-open.alt` | focusInEditor | 5 | false | true | Escape 的焦点差异已由 G1583 单独承载；本 spec 只判两条快速开启弦有没有承载面 | gap.md G1583 |
| `shell.shortcuts-panel.key` | focusInEditor | 3 | false | true | Escape 的焦点差异已由 G1583 承载；本 spec 只判面板有没有开 | gap.md G1583 |
| `shell.toggles.family` | added-only-official |  | SHELL |  | 官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容 | 逐 spec 声明（observe.mjs NOISE_RULES 未覆盖） |
| `shell.toggles.family` | removed-only-local |  |  | 📄 | 本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容 | observe.mjs NOISE_RULES |

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

### `editor.block.group-shape` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 6 | blocks | ["ALPHA BETA"] | ["ALPHA","BETA"] |  | 2 |
| 6 | kinds | ["para"] | ["para","para"] |  | 2 |
| 0 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 1 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 2 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 3 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 5 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 6 | state:popupBackdrop | 1 | 0 | -1 | 2 |

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

### `editor.block.insert-before-selected` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | countΔ:ALPHA | 1 | 0 | -1 | 2 |
| 6 | countΔ:BETA | 1 | 0 | -1 | 2 |
| 7 | countΔ:ALPHA | 1 | 0 | -1 | 2 |
| 7 | countΔ:BETA | 1 | 0 | -1 | 2 |
|  | added-only-local |  | ALPH |  | 2 |
| 6 | blocks | ["","ALPHA","BETA"] | ["ALPH"] |  | 2 |
| 7 | blocks | ["","ALPHA","BETA"] | ["ALPH"] |  | 2 |
| 6 | kinds | ["para","para","para"] | ["para"] |  | 2 |
| 7 | kinds | ["para","para","para"] | ["para"] |  | 2 |
| 0 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 1 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 2 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 3 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 5 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 6 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 7 | state:popupBackdrop | 1 | 0 | -1 | 2 |

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

### `editor.block.selection-mode` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 7 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 8 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 8 | countΔ:BETA | 2 | 1 | -1 | 2 |
| 6 | blocks | ["ALPHA BETA"] | ["ALPHA","BETA"] |  | 2 |
| 7 | blocks | ["ALPHA BETA"] | ["BETA","ALPHA"] |  | 2 |
| 8 | blocks | ["ALPHA BETA","BETA"] | ["BETA","ALPHA"] |  | 2 |
| 4 | focusInEditor | false | true |  | 2 |
| 5 | focusInEditor | false | true |  | 2 |
| 6 | focusInEditor | false | true |  | 2 |
| 7 | focusInEditor | false | true |  | 2 |
| 8 | focusInEditor | false | true |  | 2 |
| 6 | kinds | ["para"] | ["para","para"] |  | 2 |
| 7 | kinds | ["para"] | ["para","para"] |  | 2 |
| 8 | kinds | ["heading","para"] | ["para","para"] |  | 2 |
| 4 | selection:collapsed |  | true |  | 2 |
| 4 | selection:anchorOffset |  | 4 |  | 2 |
| 4 | selection:focusOffset |  | 4 |  | 2 |
| 5 | selection:collapsed |  | false |  | 2 |
| 5 | selection:anchorOffset |  | 4 |  | 2 |
| 5 | selection:focusOffset |  | 4 |  | 2 |
| 6 | selection:collapsed |  | false |  | 2 |
| 6 | selection:anchorOffset |  | 4 |  | 2 |
| 6 | selection:focusOffset |  | 4 |  | 2 |
| 7 | selection:collapsed |  | true |  | 2 |
| 7 | selection:anchorOffset |  | 0 |  | 2 |
| 7 | selection:focusOffset |  | 0 |  | 2 |
| 8 | selection:collapsed |  | true |  | 2 |
| 8 | selection:anchorOffset |  | 0 |  | 2 |
| 8 | selection:focusOffset |  | 0 |  | 2 |

### `editor.block.ungroup-shape` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 7 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 7 | countΔ:BETA | 2 | 1 | -1 | 2 |
| 8 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 8 | countΔ:BETA | 2 | 1 | -1 | 2 |
| 9 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 9 | countΔ:BETA | 2 | 1 | -1 | 2 |
| 6 | blocks | ["ALPHA BETA"] | ["ALPHA","BETA"] |  | 2 |
| 7 | blocks | ["ALPHA BETA","BETA"] | ["ALPHA","BETA"] |  | 2 |
| 8 | blocks | ["ALPHA BETA","BETA"] | ["ALPHA","BETA"] |  | 2 |
| 9 | blocks | ["ALPHA BETA","BETA"] | ["ALPHA","BETA"] |  | 2 |
| 6 | kinds | ["para"] | ["para","para"] |  | 2 |
| 7 | kinds | ["heading","para"] | ["para","para"] |  | 2 |
| 8 | kinds | ["heading","para"] | ["para","para"] |  | 2 |
| 9 | kinds | ["heading","para"] | ["para","para"] |  | 2 |

### `editor.key.comment` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 3 | countΔ:评论 | 1 | 0 | -1 | 2 |
| 4 | countΔ:评论 | 1 | 0 | -1 | 2 |
|  | added-only-official | 输入你的评论 |  |  | 2 |
| 3 | focusInEditor | false | true |  | 2 |
| 4 | focusInEditor | false | true |  | 2 |
| 3 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |

### `editor.key.comment.close` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 1 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 2 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 3 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 3 | countΔ:评论 | 1 | 0 | -1 | 2 |
| 4 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 4 | countΔ:评论 | 1 | 0 | -1 | 2 |
| 5 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 6 | countΔ:CMT | 1 | 0 | -1 | 2 |
| 1 | blocks | ["CMT"] | [""] |  | 2 |
| 2 | blocks | ["CMT"] | [""] |  | 2 |
| 3 | blocks | ["CMT"] | [""] |  | 2 |
| 4 | blocks | ["CMT"] | [""] |  | 2 |
| 5 | blocks | ["CMT"] | [""] |  | 2 |
| 6 | blocks | ["","CMT"] | [""] |  | 2 |
| 3 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |

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

### `editor.key.equation` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 3 | focusInEditor | false | true |  | 2 |
| 4 | focusInEditor | false | true |  | 2 |
| 5 | focusInEditor | false | true |  | 2 |

### `editor.key.equation.commit` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 5 | countΔ:FORMULA | 0 | 1 | 1 | 2 |
| 5 | countΔ:x | 1 | 0 | -1 | 2 |
| 6 | countΔ:FORMULA | 0 | 1 | 1 | 2 |
| 6 | countΔ:x | 1 | 0 | -1 | 2 |
|  | added-only-local |  | FORMULA |  | 2 |
| 5 | blocks | ["x 2"] | ["FORMULA"] |  | 2 |
| 6 | blocks | ["x 2"] | ["FORMULA"] |  | 2 |
| 3 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 4 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |

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

### `editor.key.group-and-blocklink` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-local |  | Esc |  | 2 |
|  | added-only-local |  | 关闭 |  | 2 |
|  | added-only-local |  | 搜索文档与块 |  | 2 |
|  | added-only-local |  | 操作 |  | 2 |
|  | added-only-local |  | 新建文档 |  | 2 |
|  | added-only-local |  | 查看所有快捷键 |  | 2 |
|  | added-only-official | 暂无结果 |  |  | 2 |
|  | added-only-official | 查找 |  |  | 2 |
| 5 | focusInEditor | false | true |  | 2 |
| 6 | focusInEditor | false | true |  | 2 |
| 7 | focusInEditor | false | true |  | 2 |
| 11 | focusInEditor | false | true |  | 2 |
| 8 | state:dialog | 0 | 1 | 1 | 2 |
| 9 | state:dialog | 0 | 1 | 1 | 2 |
| 10 | state:dialog | 0 | 1 | 1 | 2 |
| 12 | state:dialog | 0 | 1 | 1 | 2 |
| 13 | state:dialog | 0 | 1 | 1 | 2 |

### `editor.key.inline-chord-family` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-local |  | Esc |  | 2 |
|  | added-only-local |  | MK-CODE |  | 2 |
|  | added-only-local |  | MK-HILITE |  | 2 |
|  | added-only-local |  | MK-STRIKE |  | 2 |
|  | added-only-local |  | MK-URL |  | 2 |
|  | added-only-local |  | 关闭 |  | 2 |
|  | added-only-local |  | 搜索文档与块 |  | 2 |
|  | added-only-local |  | 操作 |  | 2 |
|  | added-only-local |  | 新建文档 |  | 2 |
|  | added-only-local |  | 查看所有快捷键 |  | 2 |
|  | added-only-official | CODE |  |  | 2 |
|  | added-only-official | HILITE |  |  | 2 |
|  | added-only-official | STRIKE |  |  | 2 |
|  | added-only-official | URL |  |  | 2 |
| 18 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE",""] |  | 2 |
| 19 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE",""] |  | 2 |
| 21 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE",""] |  | 2 |
| 22 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE",""] |  | 2 |
| 23 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE",""] |  | 2 |
| 24 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE",""] |  | 2 |
| 25 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE",""] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE",""] |  | 2 |
| 26 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2",""] |  | 2 |
| 27 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2",""] |  | 2 |
| 28 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2",""] |  | 2 |
| 29 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2",""] |  | 2 |
| 30 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2",""] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2",""] |  | 2 |
| 31 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2","MK-URL"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2 MK-URL",""] |  | 2 |
| 32 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2","MK-URL"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2 MK-URL",""] |  | 2 |
| 33 | blocks | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE","MK-CODE","MK-CODE2","MK-URL"] | ["MK-BOLD","MK-ITALIC","MK-STRIKE","MK-HILITE MK-CODE MK-CODE2 MK-URL",""] |  | 2 |
| 6 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 7 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 8 | inline | {"marks":["italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 9 | inline | {"marks":["italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 11 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 12 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 13 | inline | {"marks":["strike"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 14 | inline | {"marks":["strike"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 16 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 17 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 18 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 19 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 20 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 21 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 22 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 23 | inline | {"marks":["code"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 24 | inline | {"marks":["code"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 25 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 26 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 27 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 28 | inline | {"marks":["code"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","code","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 29 | inline | {"marks":["code"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","code","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 30 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","code","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 31 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","code","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 32 | inline | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":["bold","code","italic"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 33 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 33 | state:dialog | 0 | 1 | 1 | 2 |

### `editor.key.insert-block-space` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | focusInEditor | false | true |  | 2 |
| 6 | selection:collapsed |  | true |  | 2 |
| 6 | selection:anchorOffset |  | 16 |  | 2 |
| 6 | selection:focusOffset |  | 16 |  | 2 |

### `editor.key.insert-block-space-selected` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 5 | blocks | ["ALPHA","BETA",""] | ["ALPHA","BETA"] |  | 2 |
| 6 | blocks | ["ALPHA","BETA",""] | ["ALPHA","BETA"] |  | 2 |
| 5 | kinds | ["para","para","para"] | ["para","para"] |  | 2 |
| 6 | kinds | ["para","para","para"] | ["para","para"] |  | 2 |

### `editor.key.shift-enter-hard-break` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 6 | breaks | {"totalBr":1,"blocks":["1:1:AAA\|\|","0:1:BBB"]} | {"totalBr":0,"blocks":["0:1:AAA","0:1:BBB"]} |  | 2 |
| 6 | selection:anchorOffset | 1 | 3 |  | 2 |
| 6 | selection:focusOffset | 1 | 3 |  | 2 |

### `editor.key.toggle-all` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 10 | countΔ:CHILD1 | 1 | 0 | -1 | 2 |
| 11 | countΔ:CHILD1 | 1 | 0 | -1 | 2 |
| 12 | countΔ:CHILD1 | 1 | 0 | -1 | 2 |
| 0 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":"is-empty is-editor-empty","aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 1 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 2 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 3 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 4 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 5 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 6 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 7 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 7 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 8 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 8 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 9 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 9 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 10 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 10 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 11 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 11 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 12 | attr:block | {"class":"_blockOverhang_1oz2o_17","aria-expanded":null,"data-type":null,"role":null,"_tag":"span"} | {"class":null,"aria-expanded":null,"data-type":null,"role":null,"_tag":"p"} |  | 2 |
| 12 | attr:toggle |  | {"data-open":"false","aria-expanded":null,"class":"my-1","_tag":"div"} |  | 2 |
| 6 | blocks | ["HEAD1/"] | ["HEAD1/toggle"] |  | 2 |
| 7 | blocks | ["HEAD1"] | ["HEAD1","",""] |  | 2 |
| 8 | blocks | ["HEAD1",""] | ["HEAD1","",""] |  | 2 |
| 9 | blocks | ["HEAD1",""] | ["HEAD1","",""] |  | 2 |
| 10 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","",""] |  | 2 |
| 11 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","",""] |  | 2 |
| 12 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","",""] |  | 2 |
| 7 | kinds | ["para"] | ["para","para","para"] |  | 2 |
| 8 | kinds | ["para","para"] | ["para","para","para"] |  | 2 |
| 9 | kinds | ["para","para"] | ["para","para","para"] |  | 2 |
| 10 | kinds | ["para","para"] | ["para","para","para"] |  | 2 |
| 11 | kinds | ["para","para"] | ["para","para","para"] |  | 2 |
| 12 | kinds | ["para","para"] | ["para","para","para"] |  | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 5 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 6 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 7 | state:toggleish | 0 | 2 | 2 | 2 |
| 8 | state:toggleish | 0 | 2 | 2 | 2 |
| 9 | state:toggleish | 0 | 2 | 2 | 2 |
| 10 | state:toggleish | 0 | 2 | 2 | 2 |
| 11 | state:toggleish | 0 | 2 | 2 | 2 |
| 12 | state:toggleish | 0 | 2 | 2 | 2 |

### `editor.key.toggle-all-v2` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 3 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 4 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 5 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 5 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 6 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 6 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 7 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 7 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 8 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 8 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 9 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 9 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
| 10 | countΔ:CHILD1 | 1 | 3 | 2 | 2 |
| 10 | countΔ:HEAD1 | 1 | 2 | 1 | 2 |
|  | added-only-local |  | Task item checkbox for CHILD1 |  | 2 |
|  | added-only-local |  | Task item checkbox for HEAD1CHILD1 |  | 2 |
| 4 | blocks | ["HEAD1",""] | ["HEAD1 Task item checkbox for empty task item"] |  | 2 |
| 5 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 6 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 7 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 8 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 9 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 10 | blocks | ["HEAD1","CHILD1"] | ["HEAD1 Task item checkbox for CHILD1 CHILD1"] |  | 2 |
| 3 | kinds | ["para","task"] | ["task","task"] |  | 2 |
| 4 | kinds | ["para","task"] | ["task"] |  | 2 |
| 5 | kinds | ["para","task"] | ["task"] |  | 2 |
| 6 | kinds | ["task","para"] | ["task"] |  | 2 |
| 7 | kinds | ["para","para"] | ["task"] |  | 2 |
| 8 | kinds | ["para","para"] | ["task"] |  | 2 |
| 9 | kinds | ["para","para"] | ["task"] |  | 2 |
| 10 | kinds | ["para","para"] | ["task"] |  | 2 |
| 8 | state:toggleish | 0 | 2 | 2 | 2 |
| 9 | state:toggleish | 0 | 2 | 2 | 2 |
| 10 | state:toggleish | 0 | 2 | 2 | 2 |

### `editor.key.toggle-all-v3` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 10 | countΔ:CHILD1 | 0 | 1 | 1 | 2 |
| 4 | blocks | ["HEAD1/"] | ["HEAD1/toggle"] |  | 2 |
| 5 | blocks | ["HEAD1"] | ["HEAD1","",""] |  | 2 |
| 6 | blocks | ["HEAD1",""] | ["HEAD1","",""] |  | 2 |
| 7 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","CHILD1",""] |  | 2 |
| 8 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","CHILD1",""] |  | 2 |
| 9 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","CHILD1",""] |  | 2 |
| 10 | blocks | ["HEAD1","CHILD1"] | ["HEAD1","CHILD1",""] |  | 2 |
| 11 | blocks | ["HEAD1","CHILD1","空折叠块"] | ["HEAD1","CHILD1",""] |  | 2 |
| 12 | blocks | ["HEAD1","CHILD1","空折叠块"] | ["HEAD1","CHILD1",""] |  | 2 |
| 13 | blocks | ["HEAD1","CHILD1","空折叠块"] | ["HEAD1","CHILD1",""] |  | 2 |
| 8 | focusInEditor | true | false |  | 2 |
| 9 | focusInEditor | true | false |  | 2 |
| 12 | focusInEditor | true | false |  | 2 |
| 13 | focusInEditor | true | false |  | 2 |
| 2 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 3 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 5 | state:toggleish | 0 | 2 | 2 | 2 |

### `editor.key.turn-into-extra` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 4 | countΔ:ALPHA | 2 | 1 | -1 | 2 |
| 4 | countΔ:卡片 | -1 | 0 | 1 | 2 |
| 9 | countΔ:卡片 | 1 | 0 | -1 | 2 |
| 2 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 3 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 4 | blocks | ["ALPHA 页面预览将显示在此处。单击以添加内容。"] | ["ALPHA",""] |  | 2 |
| 5 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 6 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 7 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 8 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 9 | blocks | ["ALPHA"] | ["ALPHA",""] |  | 2 |
| 9 | focusInEditor | false | true |  | 2 |
| 2 | kinds | ["strong"] | ["heading4","para"] |  | 2 |
| 3 | kinds | ["para"] | ["para","para"] |  | 2 |
| 4 | kinds | ["para"] | ["para","para"] |  | 2 |
| 5 | kinds | ["para"] | ["para","para"] |  | 2 |
| 6 | kinds | ["para"] | ["para","para"] |  | 2 |
| 7 | kinds | ["para"] | ["para","para"] |  | 2 |
| 8 | kinds | ["para"] | ["para","para"] |  | 2 |
| 9 | kinds | ["para"] | ["para","para"] |  | 2 |
| 9 | state:popupBackdrop | 1 | 0 | -1 | 2 |

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

### `editor.key.url-link` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
|  | added-only-local |  | Esc |  | 2 |
|  | added-only-local |  | 关闭 |  | 2 |
|  | added-only-local |  | 搜索文档与块 |  | 2 |
|  | added-only-local |  | 操作 |  | 2 |
|  | added-only-local |  | 新建文档 |  | 2 |
|  | added-only-local |  | 查看所有快捷键 |  | 2 |
| 3 | inline | {"marks":["highlight"],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} | {"marks":[],"fw":"400","deco":"none","bg":"rgba(0, 0, 0, 0)","fs":"normal"} |  | 2 |
| 3 | state:dialog | 0 | 1 | 1 | 2 |
| 4 | state:dialog | 0 | 1 | 1 | 2 |

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

### `editor.page-block.behavior` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | countΔ:PGBLK | 2 | 1 | -1 | 2 |
| 3 | countΔ:INNER | 1 | 0 | -1 | 2 |
| 3 | countΔ:PGBLK | 2 | 1 | -1 | 2 |
| 4 | countΔ:INNER | 2 | 0 | -2 | 2 |
| 4 | countΔ:PGBLK | 2 | 1 | -1 | 2 |
| 5 | countΔ:CHILD | 1 | 0 | -1 | 2 |
| 5 | countΔ:INNER | 2 | 0 | -2 | 2 |
| 5 | countΔ:PGBLK | 2 | 1 | -1 | 2 |
| 6 | countΔ:CHILD | 1 | 0 | -1 | 2 |
| 6 | countΔ:INNER | 2 | 0 | -2 | 2 |
| 6 | countΔ:PGBLK | 2 | 1 | -1 | 2 |
|  | added-only-local |  | PGBLK |  | 2 |
| 2 | blocks | ["PGBLK 页面预览将显示在此处。单击以添加内容。"] | ["PGBLK"] |  | 2 |
| 3 | blocks | ["PGBLKINNER 页面预览将显示在此处。单击以添加内容。"] | ["PGBLK"] |  | 2 |
| 4 | blocks | ["PGBLKINNER 页面预览将显示在此处。单击以添加内容。",""] | ["PGBLK"] |  | 2 |
| 5 | blocks | ["PGBLKINNER 页面预览将显示在此处。单击以添加内容。","CHILD"] | ["PGBLK"] |  | 2 |
| 6 | blocks | ["PGBLKINNER 页面预览将显示在此处。单击以添加内容。","CHILD"] | ["PGBLK"] |  | 2 |
| 4 | kinds | ["para","para"] | ["para"] |  | 2 |
| 5 | kinds | ["para","para"] | ["para"] |  | 2 |
| 6 | kinds | ["para","para"] | ["para"] |  | 2 |

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

### `shell.quick-open.alt` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | state:popupBackdrop | 1 | 0 | -1 | 2 |
| 4 | state:popupBackdrop | 1 | 0 | -1 | 2 |

### `shell.shortcuts-panel.key` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 2 | countΔ:快捷键 | 0 | 3 | 3 | 2 |
| 2 | state:dialog | 0 | 1 | 1 | 2 |

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

### `shell.toggles.family` — differ

| step | facet | official | local | delta | severity |
| --- | --- | --- | --- | --- | --- |
| 4 | countΔ:任务 | 0 | -1 | -1 | 2 |
| 6 | countΔ:SHELL | 1 | 0 | -1 | 2 |
|  | added-only-local |  | 1 |  | 2 |
|  | added-only-local |  | 9月26日 周六 |  | 2 |
|  | added-only-local |  | 打开今天的日记 |  | 2 |
|  | added-only-local |  | 更早 |  | 2 |
|  | added-only-local |  | 📅 |  | 2 |
| 6 | blocks | ["SHELL"] | [] |  | 2 |
| 6 | focusInEditor | true | false |  | 2 |
| 6 | state:editorBody | 1 | 0 | -1 | 2 |

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
| `editor.block.group-shape` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.block.group-shape` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
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
| `editor.block.insert-before-selected` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.block.insert-before-selected` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
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
| `editor.block.selection-mode` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.block.selection-mode` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.block.ungroup-shape` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.block.ungroup-shape` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
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
| `editor.key.comment` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.comment` | official | text:QCOMMENTMARK gt 0 | PASS | 1 |
| `editor.key.comment` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.comment` | local | text:QCOMMENTMARK gt 0 | PASS | 1 |
| `editor.key.comment.close` | official | text:CMT gt 0 | PASS | 1 |
| `editor.key.comment.close` | local | text:CMT gt 0 | **FAIL** | 0 |
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
| `editor.key.equation` | official | blocks equals ["FORMULA"] | PASS | ["FORMULA"] |
| `editor.key.equation` | local | blocks equals ["FORMULA"] | PASS | ["FORMULA"] |
| `editor.key.equation.commit` | official | text:FORMULA gt 0 | PASS | 1 |
| `editor.key.equation.commit` | local | text:FORMULA gt 0 | PASS | 1 |
| `editor.key.find-replace` | official | state:findInput gt 0 | PASS | 1 |
| `editor.key.find-replace` | official | blocks equals ["ALPHA BETA ALPHA"] | PASS | ["ALPHA BETA ALPHA"] |
| `editor.key.find-replace` | local | state:findInput gt 0 | PASS | 1 |
| `editor.key.find-replace` | local | blocks equals ["ALPHA BETA ALPHA"] | PASS | ["ALPHA BETA ALPHA"] |
| `editor.key.group-and-blocklink` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.key.group-and-blocklink` | official | blocksCount count 2 | PASS | 2 |
| `editor.key.group-and-blocklink` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.key.group-and-blocklink` | local | blocksCount count 2 | PASS | 2 |
| `editor.key.home-end-arrows` | official | selection:focusOffset equals 6 | PASS | 6 |
| `editor.key.home-end-arrows` | official | selection:focusOffset equals 0 | PASS | 0 |
| `editor.key.home-end-arrows` | official | selection:focusOffset equals 6 | PASS | 6 |
| `editor.key.home-end-arrows` | official | selection:focusOffset equals 1 | PASS | 1 |
| `editor.key.home-end-arrows` | official | selection:focusOffset equals 0 | PASS | 0 |
| `editor.key.home-end-arrows` | local | selection:focusOffset equals 6 | PASS | 6 |
| `editor.key.home-end-arrows` | local | selection:focusOffset equals 0 | PASS | 0 |
| `editor.key.home-end-arrows` | local | selection:focusOffset equals 6 | PASS | 6 |
| `editor.key.home-end-arrows` | local | selection:focusOffset equals 1 | PASS | 1 |
| `editor.key.home-end-arrows` | local | selection:focusOffset equals 0 | PASS | 0 |
| `editor.key.inline-chord-family` | official | blocksCount count 8 | **FAIL** | 0 |
| `editor.key.inline-chord-family` | official | text:MK-URL gt 0 | **FAIL** | 0 |
| `editor.key.inline-chord-family` | local | blocksCount count 8 | **FAIL** | 0 |
| `editor.key.inline-chord-family` | local | text:MK-URL gt 0 | **FAIL** | 0 |
| `editor.key.insert-block-space` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.insert-block-space` | official | text:ALPHA gt 0 | PASS | 1 |
| `editor.key.insert-block-space` | local | blocksCount count 1 | PASS | 1 |
| `editor.key.insert-block-space` | local | text:ALPHA gt 0 | PASS | 1 |
| `editor.key.insert-block-space-selected` | official | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
| `editor.key.insert-block-space-selected` | local | blocks equals ["ALPHA","BETA"] | PASS | ["ALPHA","BETA"] |
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
| `editor.key.toggle-all` | official | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all` | local | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v2` | official | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v2` | official | text:CHILD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v2` | local | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v2` | local | text:CHILD1 gt 0 | PASS | 3 |
| `editor.key.toggle-all-v3` | official | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v3` | official | text:CHILD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v3` | local | text:HEAD1 gt 0 | PASS | 1 |
| `editor.key.toggle-all-v3` | local | text:CHILD1 gt 0 | PASS | 1 |
| `editor.key.turn-into-extra` | official | text:ALPHA gt 0 | PASS | 1 |
| `editor.key.turn-into-extra` | official | blocksCount count 1 | **FAIL** | 0 |
| `editor.key.turn-into-extra` | local | text:ALPHA gt 0 | PASS | 1 |
| `editor.key.turn-into-extra` | local | blocksCount count 1 | **FAIL** | 0 |
| `editor.key.turn-into-style` | official | text:AAA count 1 | PASS | 1 |
| `editor.key.turn-into-style` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.turn-into-style` | local | text:AAA count 1 | PASS | 1 |
| `editor.key.turn-into-style` | local | blocksCount count 1 | **FAIL** | 2 |
| `editor.key.url-link` | official | text:ANCHOR gt 0 | PASS | 1 |
| `editor.key.url-link` | official | blocksCount count 1 | PASS | 1 |
| `editor.key.url-link` | local | text:ANCHOR gt 0 | PASS | 1 |
| `editor.key.url-link` | local | blocksCount count 1 | PASS | 1 |
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
| `editor.page-block.behavior` | official | text:PGBLK gt 0 | PASS | 1 |
| `editor.page-block.behavior` | local | text:PGBLK gt 0 | PASS | 1 |
| `editor.paste.html` | official | text:BOLDX gt 0 | PASS | 1 |
| `editor.paste.html` | official | text:LINKX gt 0 | PASS | 1 |
| `editor.paste.html` | local | text:BOLDX gt 0 | PASS | 1 |
| `editor.paste.html` | local | text:LINKX gt 0 | PASS | 1 |
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
| `shell.assistant.open` | official | text:HELLO gt 0 | PASS | 1 |
| `shell.assistant.open` | official | blocksCount count 1 | PASS | 1 |
| `shell.assistant.open` | local | text:HELLO gt 0 | PASS | 1 |
| `shell.assistant.open` | local | blocksCount count 1 | PASS | 1 |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | official | attr:paletteInput exists null | PASS | "打开" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
| `shell.command-palette.toggle-vs-jump` | local | attr:paletteInput exists null | PASS | "搜索文档、内容…" |
| `shell.quick-open.alt` | official | text:QK gt 0 | PASS | 1 |
| `shell.quick-open.alt` | local | text:QK gt 0 | PASS | 1 |
| `shell.shortcuts-panel.key` | official | text:SHORT gt 0 | PASS | 1 |
| `shell.shortcuts-panel.key` | local | text:SHORT gt 0 | PASS | 1 |
| `shell.sidebar-toggle.repro` | official | text:任务 gt 0 | PASS | 1 |
| `shell.sidebar-toggle.repro` | local | text:任务 gt 0 | PASS | 1 |
| `shell.tasks.new-task-popup` | official | text:任务 gt 0 | PASS | 1 |
| `shell.tasks.new-task-popup` | local | text:任务 gt 0 | PASS | 4 |
| `shell.toggles.family` | official | text:SHELL gt 0 | PASS | 1 |
| `shell.toggles.family` | local | text:SHELL gt 0 | PASS | 1 |
