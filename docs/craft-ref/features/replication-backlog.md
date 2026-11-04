# 复刻执行清单（台账归一化审计）

> 生成日期：2026-10-30。本文件只出清单：**未改产品代码，也未回写 `gap.md`**。
> 审计对象：[gap.md](gap.md) 全部 1614 条 G 行；P0/P1 逐条现读代码，其余按台账文本归一化并标为待重扫。
> 机器可读全量清单：`_audit/ledger-backlog.csv`、`_audit/ledger-rows.json`、`_audit/backlog-digest.json`。
> 可直接开工的任务清单：[replication-tasks.md](replication-tasks.md)。

## 一、结论

- **采集面已收口，可以开始复刻；但台账不是现成的任务单。**
- **P0 8 条：6 已对齐、2 部分落地（`G03`／`G04`），0 条真实缺失。**
- **P1 29 条：8 已对齐、8 部分落地、12 未动、1 有意偏差（`G48`）。**
- **P2 显式 8 条：2 已对齐、1 部分落地、4 未动、1 有意偏差（`G35`）。**
- 三张显式表合计 45 条，其中可直接排期的缺口／补差 27 条；这是第一批复刻 backlog 的主体。
- 全量 1614 行里，文本规则判为“未动”的共 1053 行；其中只有 16 条在显式 P0/P1/P2 表里，其余绝大多数是批次里的静态／内部实现差异，**没有逐条现读，不能直接当任务数**；另有 192 行待重扫、14 行判定列与本地列自相矛盾。

## 二、方法与边界

1. 解析 `gap.md` 全部 G 行，按**每张表的表头**映射列（台账并非统一 5 列：P0 是 7 列、P1/P2 是 6 列、批次表有 5/6 列多种），并处理转义竖线与空首列。
2. 以“本地对照／判定”两列做文本归一化，得到 `已对齐／部分落地／未动／有意偏差／不可达／非交互面／待重扫` 七态。
3. **P0/P1 逐条现读代码**（grep＋读文件），用当前 `文件:行号` 校正文本状态；P2 只核了 `G31`／`G35`／`G38`。
4. **未做的**：没有逐条运行时复跑 1614 条；没有修改任何产品代码或台账正文；没有把“不可达”写成“官方没有”。

## 三、总览

| 状态 | 条数 |
| --- | --- |
| 未动（gap） | 1053 |
| 待重扫（unknown） | 192 |
| 已对齐（aligned） | 138 |
| 有意偏差（deliberate） | 96 |
| 部分落地（partial） | 63 |
| 非交互面（nonaction） | 56 |
| 不可达（unreachable） | 16 |

| 优先级 | 条数 | 口径 |
| --- | --- | --- |
| P0 | 8 | 仅 `一、P0` 表 |
| P1 | 280 | P1 表＋批次里影响 3 的条目 |
| P2 | 629 | P2 表＋批次里影响 2 的条目 |
| P3 | 270 | 批次里影响 1 的条目 |
| 待定 | 427 | 没有可解析的影响分 |

> 说明：上表的 1053 条“未动”是**文本规则**结果，不等于 1053 个已确认缺口。显式 P0/P1/P2 表里的“未动”只有 16 条，且已逐条现读。

## 四、P0（先做）

| G号 | 状态 | 影响/成本 | 官方行为（摘要） | 本地现状（摘要） | 下一步／证据 |
| --- | --- | --- | --- | --- | --- |
| G01 | 已对齐 | 3/1 | 输入 @ 提及某人（R2 web.collab.comment.hint.mention；提及进反向链接与成员） | 本行原判据把两码事混写＝"可点跳转"与"进 collectLinkedDocIds"说的是页面提及（commands.comma | 人员提及四段已落地；台账第 122 批记录仍有效；`src/components/editor/extensions/mention-users.ts`、`src/components/editor/extensions/mention-user-suggestion.tsx`、`e2e/mention-user.spec.ts` |
| G02 | 已对齐 | 3/2 | 提醒有投递与状态（R5：reminders.next.reminder.time、mark.resolved、alert 系列） | 已清（第 263 批复核）＝原判"无任何定时器/通知/邮件、task.ts:212-227 之外无投递代码"是陈旧账：投递是拉取 | 站内提醒投递已闭环；邮件档仍缺，单独登记在 G1488；`src/lib/notification/materialize.ts:31`、`src/app/api/v1/sync/route.ts:10`、`e2e/reminder-delivery.spec.ts` |
| G03 | 已对齐 | 3/2 | 通知设置三项真实可配（preferences.*、通知分区） | 部分落地（第 231 批复核）＝① 三开关已落库＝SettingsPanels.tsx 走 setSwitch→updatePr | 三开关均已消费：notifyReminders 门控投递、notifyComments 门控评论/提及、notifyDaily 门控站内每日摘要（邮件仍归 G1488）；`src/lib/notification/comment-notifications.ts:78`、`src/lib/notification/daily-digest.ts:45` |
| G04 | 已对齐 | 3/3 | 分享有链接查看/编辑两档 + 仅协作者 + 请求批准（R14 collab.access.*） | 部分落地（第 264 批）＝原判"无 permission 列、/s/[token] 恒只读"是陈旧账（第 262 批复核已证） | 请求批准流已落：viewer 可请求编辑，owner 在分享面板批准/拒绝，批准把 requested 行转 editor；`src/actions/document/access-requests.ts:65`、`src/components/share/RequestEditAccess.tsx:42` |
| G05 | 已对齐 | 3/1 | 发布与分享是两个概念：未发布不应可访问 | 改判：本行系陈旧记录，门已在（第 229 批复核）＝getSharedDocument（'use server' 动作层，sha | 无需动作；抽检证据见台账行；`src/lib/share/resolve.ts:16`、`src/actions/document/share.ts:229`、`e2e/share-publish.spec.ts` |
| G06 | 已对齐 | 3/2 | 成员档「可以查看和评论」= 能评论但不能编辑（collab.access.view.and.comment） | 改判：本行系陈旧记录，双档已分开（第 230 批复核）＝actions/comment/comment.ts 的 assertD | 无需动作；抽检证据见台账行；`src/actions/comment/comment.ts:27`、`src/actions/comment/comment.ts:111`、`src/actions/comment/comment.ts:131` |
| G07 | 已对齐 | 2/1 | 手柄菜单是块操作主入口（实测官方 6 项 + 「在上方/下方插入区块」，commands.insert.block.above/ | 本行原判据的"官方 6 项"是两码事＝那 6 项来自信息面板动作区（G956／G204 那一族），块级 ⋮ 唯一在册读数＝任务块 | 无需动作；抽检证据见台账行；`src/components/editor/drag-handle/block-actions.ts:124`、`src/components/editor/drag-handle/block-actions.ts:132`、`src/components/editor/drag-handle/DragHandle.tsx` |
| G08 | 已对齐 | 3/1 | 删除他人文档应报错而非静默成功 | 改判：本行系陈旧记录，三个动作都已挡（第 230 批复核）＝actions/document/delete.ts 的 delet | 无需动作；抽检证据见台账行；`src/actions/document/delete.ts:11`、`src/actions/document/delete.ts:27`、`src/actions/document/delete.ts:43` |

## 五、P1（高频交互）

| G号 | 状态 | 影响/成本 | 官方行为（摘要） | 本地现状（摘要） | 下一步／证据 |
| --- | --- | --- | --- | --- | --- |
| G11 | 已对齐 | 2/2 | 专注模式 + 退出快捷键（R17） | 现读（2026-10-31）更正：台账本地列仍写着「全库无 focus mode」，与判定列冲突；现读已落地。 | 台账本地列仍写着「全库无 focus mode」，与判定列冲突；现读已落地；`src/lib/store/use-focus-store.ts`、`src/components/editor/shell-shortcuts.tsx:22-27` |
| G12 | 已对齐 | 2/2 | 查找替换（R15 独立快捷键分组 commands.shortcuts.in.find.and.replace、find.* 1 | 现读（2026-10-31）更正：台账本地列仍写着「无」，已过期：查找替换独立扩展、面板、store 与 e2e 都在。 | 台账本地列仍写着「无」，已过期：查找替换独立扩展、面板、store 与 e2e 都在；`src/components/editor/extensions/find-replace.ts`、`src/components/editor/find-replace-panel.tsx`、`src/lib/store/use-find-replace-store.ts`、`e2e/find-replace-case.spec.ts` |
| G13 | 已对齐 | 2/2 | 快捷键面板按 6 个上下文分组 +「查看所有快捷键」命令（R15/R16）；全表 104 项键位已解出，见 keyboard.m | 现读（2026-10-31）更正：快捷键面板已按官方六组渲染且只印本地真实绑定；命令面板「查看所有快捷键」指向同一面板。 | 快捷键面板已按官方六组渲染且只印本地真实绑定；命令面板「查看所有快捷键」指向同一面板；`src/components/settings/ShortcutsPanel.tsx`、`src/components/search/CommandPalette.tsx` |
| G14 | 已对齐 | 2/1 | 块移动与样式槽快捷键（keyboard.md 表 A/B：⌥↑↓↖↘ 移动块、⌘⌥1-9/0 样式槽、⇧⏎ 重命名、⌘D 副本、 | 现读（2026-10-31）更正：块移动／样式槽／副本／查找／专注／侧栏／日记／快捷键面板已接；RENAME（Shift+Ent | RENAME 与 COMMENT 两个处理分支已接（选中块时 Shift+Enter 改标题、Ctrl+Shift+M 开评论入口）；`src/components/editor/extensions/craft-keymap.ts:113`、`src/components/editor/extensions/craft-keymap.ts:123` |
| G15 | 已对齐 | 2/3 | 任务 Deadline 与 Schedule 是两套独立属性（R4） | 现读（2026-10-31）更正：Task 已有独立 scheduleDate 列与迁移，任务页按计划日期分组，dueDate  | Task 已有独立 scheduleDate 列与迁移，任务页按计划日期分组，dueDate 仍是截止；`src/prisma/contract.prisma:333`、`src/actions/task/task.ts:60` |
| G16 | 已对齐 | 2/1 | 折叠块「全部展开/收起」（R8） | 本行系陈旧记录：extensions/toggle-all.ts 的 setOpenOnAllToggles 遍历全文改 ope | 「全部展开／全部收起」两档已注册进命令面板，执行后遍历全文改 open；`src/lib/editor/toggle-all-command.ts`、`src/components/search/CommandPalette.tsx` |
| G17 | 已对齐 | 2/2 | Mermaid 图表是插入片段之一（轴 C 四类 snippet） | 现读（2026-10-31）更正：Mermaid 渲染器与斜杠入口已落，导出仍保留代码围栏。 | Mermaid 渲染器与斜杠入口已落，导出仍保留代码围栏；`src/components/editor/extensions/mermaid-preview.tsx` |
| G18 | 已对齐 | 2/2 | 备份/历史版本对协作者可用；版本条目带变更计数与时间分组（V4 实测：「9月26日周六 22:46, 2 项变更」+ 作者名，按 | 部分落地（第 225 批）＝① 协作者可看/可恢复已清＝version.ts 四个函数此前一律 doc.userId !== s | 标题与样式变更也落版本快照，Document.version 随快照单调递增；`src/lib/versioning/snapshot.ts:3`、`src/actions/document/update.ts:8` |
| G19 | 已对齐 | 2/2 | 模板：另存 / 从模板新建 / 在文内插入模板片段（commands.insert.template.inline） | 前两个有（actions/document/template.ts:6、TemplateCard.tsx:25）；本行第三档系陈 | 无需动作；抽检证据见台账行；`e2e/template-insert.spec.ts`、`src/actions/document/template.ts:6` |
| G20 | 已对齐 | 已清 | 日记有模板与起始时间配置、前一天/后一天导航（daily.*） | 已清（第 275 批）＝原判"templateId＋startTime 是死字段、取值但从不使用"是陈旧账：两者早已驱动生成逻辑 | 无需动作；抽检证据见台账行；`src/lib/daily/daily-notes.ts:73-86` |
| G21 | 已对齐 | 2/2 | 侧栏一级有独立「连接」屏（✓ 屏上实测；官方有 connections 视图） | 现读（2026-10-31）更正：侧栏一级「连接」屏已建（/connections），列出并新增 MCP/API 连接。 | 侧栏一级「连接」屏已建（/connections），列出并新增 MCP/API 连接；`src/app/(app)/connections/page.tsx`、`src/components/sidebar/SidebarNav.tsx` |
| G22 | 已对齐 | 2/3 | 导出 7 类：DOCX / PDF（纸张、页码、水印、深色）/ Markdown / HTML / TextBundle / P | 有 markdown/html/text/json 四种导出 + 仅 Markdown 导入（actions/document/ | 导出补 DOCX/PDF/TextBundle/整库 zip/图片，导入补 Markdown/HTML/Evernote/Readwise/Notion 五源；`src/lib/export/docx.ts`、`src/lib/import/sources.ts` |
| G40 | 已对齐 | 2/2 | 官方块词表含 mermaid、audio、iframe/embed/html、subtitle（model.md 一、频次证据） | Mermaid 无（G17）；音频块无；linkPreview 只近似 iframe；无独立副标题块 | 音频块、iframe/网页嵌入、HTML 沙箱嵌入、副标题（h2）与 Mermaid 均已接；`src/components/editor/extensions/audio-embed.tsx`、`src/components/editor/extensions/html-embed.tsx` |
| G41 | 已对齐 | 2/2 | 集合列类型 ≈13 类，各有专用编辑组件（TextEditor/NumberEditor/SelectEditor/MultiS | 属性类型散在前端 AddPropertyMenu.tsx:52-127 无权威枚举；无汇总行/Calculations 概念 | 现读（第 88 批）改判 aligned：两件都落——① 专用编辑器名册（cell-editors.ts：官方 13 个编辑器名 + 13 列类型映射 + 本地派生 formula→FormulaInput，orphan；`src/lib/collection/cell-editors.ts:19`、`src/lib/collection/summary.ts:60`、`src/app/(app)/collections/[id]/TableView.tsx:318` |
| G42 | 已对齐 | 2/3 | 通知走 /api/ws-noti/v1，另有 /api/ws-rtc/v1（实时通信） | 现读（2026-10-31）更正：通知通道 /api/v1/notifications/stream 已接；RTC 三维（光标/ | 通知通道 /api/v1/notifications/stream 已接；RTC 三维（光标/编辑块/打开页面）走 awareness；`src/app/api/v1/notifications/stream/route.ts`、`src/lib/collaboration/presence.ts:18` |
| G43 | 已对齐 | 2/2 | 日历是纵向按日时间轴：↑ 显示前几天 + 逐日成节（今天/明天 + 星期）+ 每节 添加任务/创建每日笔记（V-实测 dom-r | 已清（日历＝纵向按日时间轴）＝src/lib/calendar/timeline.ts 把采集的成节规则逐字写下：锚点起连续七天 | 无需动作；抽检证据见台账行；`src/lib/calendar/timeline.ts` |
| G44 | 已对齐 | 2/3 | 侧栏「连接」屏 = MCP / API 接入中心（「你的 MCP 连接 — 让 AI 工具访问你的文档」「你的 API 连接 — | 现读（2026-10-31）更正：连接屏即 MCP/API 接入中心，两段文案与添加入口均落。 | 连接屏即 MCP/API 接入中心，两段文案与添加入口均落；`src/app/(app)/connections/ConnectionsPanel.tsx:21` |
| G45 | 已对齐 | 2/2 | /inbox = 未分类文档收集箱（页面标题「未分类」，侧栏 sidebar-inbox ✓） | 本地无该路由；未归属文档散在 /documents 与 /collections | 台账本地列仍写着「本地无该路由」，与判定列冲突；现读已落地；`e2e/inbox.spec.ts` |
| G46 | 已对齐 | 2/2 | 任务页分组 未归档 / 今天 / 即将进行 / 所有任务，空态文案点名 Inbox（dom-route-tasks.html ✓ | 本地 /tasks 有截止/提醒/重复编辑（tasks/page.tsx:286-321）但无这四档分组；TaskSchedul | 任务页四档分组已按 scheduleDate（计划日期）切，不再是 dueDate 轴；`src/lib/task/grouping.ts:23`、`src/lib/task/upcoming-groups.ts` |
| G47 | 已对齐 | 1/1 | 文件夹页带文档计数（「5 个文档」）与 Plus 限制徽标；星标/标签各有总页与空态文案（dom-route-folders/s | 本地有 /favorites、/trash、/collections 等，但列表项无文档计数徽标，空态文案与官方不一致 | 无需动作；抽检证据见台账行；`src/lib/browse/folder-counts.test.ts` |
| G48 | 有意偏差 | 2/2 | URL 形态：/s/<空间名>--<uuid>/<route>、/f/<中文夹名>--<uuid>、/editor/d/<doc | 本地 /documents/[id]、/collections/[id]、/s/[token]、/p/[slug]，无空间段、无 | 不做（有意偏差），不进复刻 backlog |
| G49 | 已对齐 | 2/2 | 官方 AI 代理工具面：blocks_get / insert_text / view_credits / web_search | 本地只有改写/续写/翻译/总结 + 生图（AiBubbleMenu.tsx:18-22），无联网工具、无上下文徽标、无额度显示 | web_search/web_ask/web_crawl/blocks_get/insert_text 均接工具面，上下文徽标与 connect_error 已落；view_credits 按项目自用不做；`src/lib/ai/tools.ts`、`src/app/api/ai/tools/route.ts:47` |
| G51 | 已对齐 | 2/2 | 排版层级是 title / subtitle / heading / strong / page / body 六档语义名（ap | 本地是 Heading 1–4 + 无 subtitle/strong/page 档（Editor.tsx:249-251），目 | 六档语义名齐（title/subtitle/heading/strong/page/body），格式面板新增「页面」档，导出映射不变；`src/lib/editor/semantic-levels.ts:9`、`src/components/editor/tabs/FormatTab.tsx:41` |
| G52 | 有意偏差 | 2/2 | 任务状态含 cancelled（与 completed 并列），日历默认只显示 pending，任务可按正则过滤内容；官方块嵌套 | 现读（2026-10-31）更正：cancelled 与默认只显示 pending 已落地；正则过滤与嵌套上限未按原判据做，台账 | cancelled 第三态与默认只显示 pending 已落地；剩余两项（按正则过滤内容、块嵌套上限 10）第 206 批已判不做——前者出处是 API 查询参数、后者是显示深度参数；`src/lib/editor/task-status.ts:78`、`src/lib/block-depth-gate.test.ts` |
| G53 | 已对齐 | 2/3 | 块即树节点、页面 = 有子块的块，子树序列化成 markdown 字符串（pageContent），块带 children 计数 | 本地页面是独立 Document + parentId 自树，块内子页与文档子页两套概念并存；无"块子树 markdown 投影 | page-tree 投影层已建（isPage/children/pageContentMarkdown），导出/搜索/AI 复用同一投影；`src/lib/document/page-tree.ts:72` |
| G23 | 已对齐 | 2/2 | 集合公式函数 25 个（table.formula.*）、视图可互相转换（collections.views.turn.into | lib/collection/formula.ts 是子集；视图类型有 6 个组件但无「转换为」命令；CollectionPro | 现读（第 32 批）：公式函数集已齐官方 25 键——src/lib/collection/formula.ts 的 FUNCTIONS 18 个（含 above/below/left/right 四向区域引用）＋ CO；`src/lib/collection/formula.ts:39`、`src/lib/collection/property-types.ts:9`、`src/components/collection/ViewActionsMenu.tsx:106` |
| G24 | 已对齐 | 2/2 | 设置分区真实生效（语言、集成、已发布内容等） | 部分落地（第 265 批复核）＝原判"每分区要么接后端要么移除入口"这条判据已按官方（未接的分区入口已移除）：src/lib/a | 现读（第 32 批）：本行判据＝「每分区要么接后端、要么移除入口，不留假开关」，已满足——src/lib/app/settings-sections.ts 是接线台账（14 分区各带 wired 标志），Settings；`src/lib/app/settings-sections.ts:33`、`src/components/settings/SettingsModal.tsx:160`、`src/components/settings/settings-nav.test.ts:16` |
| G32 | 已对齐 | 2/2 | 块级深链：URL 直接带 blockUuid（✓ …/d/<doc>/<block>?s=…），data-block-id 恒有 | 本地 blockId 由打开的编辑器惰性盖章（历史记忆里已记），旧文档链接可能指向不到块 | blockId 已常驻：打开文档即给顶层块盖章，深链与刷新后稳定；`src/components/editor/extensions/block-id.ts:18` |
| G33 | 已对齐 | 2/2 | 命令菜单 189 条命令全量可搜（R16） | 命令面板只有本地已有动作，条目数远小于官方；无 commands.* 命名体系 | 189 条官方命令已进注册表全量可搜，未接入的执行器置灰标「未接入」；`src/lib/commands/official-catalog.ts`、`src/lib/commands/registry.ts` |

## 六、P2（显式 8 条）

| G号 | 状态 | 影响/成本 | 官方行为（摘要） | 本地现状（摘要） | 下一步／证据 |
| --- | --- | --- | --- | --- | --- |
| G50 | 已对齐 | 1/1 | 代理每次写操作附一句给用户看的动作说明（契约原文 "Optional message to display to the use | 现读（2026-11-02）：AiBubbleMenu.tsx 每次落笔后弹一条 toast——aiWriteMessage(a | 第 177 批现读：AI 每次落笔后 toast 说明动作（aiWriteMessage）并带撤销动作；`src/lib/editor/ai-write-message.ts:19`、`src/components/editor/bubble-menu/AiBubbleMenu.tsx:250` |
| G31 | 已对齐 | 1/1 | 分隔线四档＝极细/细/常规/粗（R7） | 词汇表已迁到官方四档（divider-styles.ts），但 ★ 渲染层没跟上：globals.css 只给旧名 thin/m | 无需动作；抽检证据见台账行；`src/lib/editor/divider-commands.ts` |
| G34 | 已对齐 | 1/1 | 表格部分操作禁止走上下文菜单并给「请使用 [0] 来 [1]」改道提示（R10） | 现读（2026-11-02）：TableToolbar.tsx 在编辑器上监听 contextmenu，表内右键弹提示窗——首行 | 第 177 批现读：TableToolbar 表内右键弹「这些操作无法通过上下文菜单执行。」+「请使用工具栏来编辑表格」改道提示；`src/lib/editor/table-context-copy.ts:1`、`src/components/editor/table/TableToolbar.tsx:118` |
| G35 | 有意偏差 | 1/2 | 白板副本与原件联动、旧版升级迁移（R12） | tldraw 白板无「副本联动原件」概念 | 不做（有意偏差），不进复刻 backlog |
| G36 | 已对齐 | 1/2 | 离线语义可见：「离线更新于 [0]」、离线禁用表情/评论（R13） | 部分落地（第 220 批）＝① 离线保存徽标已清＝纯核 src/lib/offline/save-status.ts（offli | 离线徽标三态与离线表情门禁已落；在线文案归 G1528，离线评论门禁为有意偏差；`src/lib/offline/save-status.ts`、`src/components/editor/DocumentEditor.tsx:105`、`src/components/editor/comments/offline-reaction.ts` |
| G37 | 已对齐 | 1/2 | 移动端抽屉多档吸附（data-vaul-snap-points 17 处） | 现读（2026-11-02）：ui/sheet.tsx 支持 snapPoints（规范化/最近档/拖拽吸附，lib/ui/sn | 第 177 批现读：Sheet 支持 snapPoints（规范化/最近档/拖拽吸附），表格视图与右侧栏两处底部 Sheet 已传三档；`src/lib/ui/snap-points.ts:1`、`src/components/ui/sheet.tsx:45`、`src/app/(app)/collections/[id]/TableView.tsx:252`、`src/components/editor/tabs/RightPanel.tsx:159` |
| G38 | 已对齐 | 1/1 | 未发布文档作者/展示控制（toolbar.author.hidden/shown） | 已清（第 219 批）＝官方把它归在发布面板的 toolbar.visual.options 五组之一（publishing.m | 无需动作；抽检证据见台账行 |
| G39 | 已对齐 | 2/2 | AI：提示库、写作风格分析、PDF 问答、AI 额度与清除历史（assistant.* 223 条） | 现读（2026-11-03 第 257 批）：提示库（34 条官方模板）、改写/续写/翻译/总结、生图、联网搜索、PDF 问答已 | 提示库/写作改写/生图/联网/PDF 问答已在；设置侧新增清除 AI 历史；额度入口按 G462 有意偏差不复刻；`src/lib/editor/ai-prompt-library.ts`、`src/lib/ai/history.ts:36`、`src/components/settings/AssistantPanel.tsx` |

## 七、建议批次

排序原则：先补 P0 正确性，再做成本 1 的高频交互，然后做独立功能块，最后动 schema／架构。

| 批次 | 范围 | 条目 | 备注 |
| --- | --- | --- | --- |
| A · P0 收尾 | 通知开关、分享审批 | `G03`、`G04` | `G03` 需先定“评论通知”是否走站内；`G04` 的审批流要加分享状态 |
| B · 低成本高频 | UI／键位／状态 | `G14`、`G16`、`G32`、`G34`、`G37`、`G50`、`G51` | 多数是现有组件加分支；`G14` 只差 `RENAME`／`COMMENT` 两个处理分支 |
| C · 独立功能块 | 新增可闭合功能 | `G17`、`G21`＋`G44`、`G22`、`G33`、`G40`、`G41`、`G39`／`G49` | `G21` 与 `G44` 是同一张连接屏，合并做；`G33` 依赖命令注册表 |
| D · 架构级 | 动 schema／模型 | `G15`、`G42`、`G53`、`G24` | 先出迁移与兼容方案，不和 UI 小修混批 |

每批收口沿用台账纪律：新增/扩展 e2e、写清与官方 `R*`／`commands.*` 的对照结论、动布局的批次重生成视觉基线。

## 八、本轮现读改判（与台账文本不同）

| G号 | 台账原状 | 现读结论 | 依据 |
| --- | --- | --- | --- |
| `G12` | 未动（本地“无”） | **已对齐**：查找替换扩展、面板、store、e2e 都在 | `src/components/editor/extensions/find-replace.ts`、`find-replace-panel.tsx`、`e2e/find-replace-case.spec.ts` |
| `G14` | 未动（本地“无 addKeyboardShortcuts”） | **部分落地**：`craft-keymap` 已接块移动/样式槽/副本/查找/专注/侧栏/日记；`RENAME` 与 `COMMENT` 只有键表 id，无处理分支 | `src/components/editor/extensions/craft-keymap.ts`、`src/components/editor/shell-shortcuts.tsx`、`src/lib/editor/keymap.ts:206,213` |
| `G46` | 已对齐 | **部分落地**：四档分组在，但“今天/即将进行”按 `dueDate` 切，不是官方的 Schedule 轴 | `src/lib/task/grouping.ts:5-32` |
| `G32` | 未动 | **部分落地**：块深链可用，但 `blockId` 仍是跳到块时惰性盖章，不是恒有 `data-block-id` | `src/lib/editor/block-anchor.ts:111-145` |
| `G51` | 未动 | **部分落地**：快捷键样式槽已按 `title/subtitle/heading/strong/body` 映射；格式面板仍是 H1–H4 | `src/components/editor/extensions/craft-keymap.ts:22-37`、`src/components/editor/tabs/FormatTab.tsx` |

## 九、口径冲突（判定列与本地列矛盾，需回写台账）

`local-says-missing`＝判定说已清/部分落地，但本地列还写着“无/只有/未做”。这类行本轮不改台账，只列出来，下一批回写时逐条改本地列。

| G号 | 行 | 当前状态 | 冲突 | 本地列摘要 |
| --- | --- | --- | --- | --- |
| G95 | 1242 | 已对齐 | local-says-missing | 现读（2026-10-31）更正：有通知表与铃铛（四类），缺官方六类 ✎ 现读（2026-11-02）：评论通知按是否  |
| G96 | 1243 | 已对齐 | local-says-missing | src/app/(app)/tasks/page.tsx 单页无档位；日历页无五档分节语义 ⇒ ✎ 现读（2026-11 |
| G112 | 1263 | 已对齐 | local-says-missing | 无 ✎ 现读（2026-11-02）更正：已实现。① 守卫与取名＝lib/collection/csv-file.ts（ |
| G300 | 1582 | 已对齐 | local-says-missing | 本地已接有宿主的 5 条 ✎ 现读（2026-11-02）更正：PENDING_STATES 逐字 11 条；已接「正在 |
| G491 | 1927 | 已对齐 | local-says-missing | 无该语义（5 处监听彼此独立，各自判键）⇒ 本地"多层弹层 + 全局快捷键"必然互相干扰（与 G456/G471/G47 |
| G503 | 1946 | 已对齐 | local-says-missing | grep -rn "cropMask\|aspectRatio" src ⇒ 0 命中 ⇒ 本地既无裁剪框、也不区分"用户 |
| G623 | 2243 | 已对齐 | local-says-missing | 本地已补批量选择模式 ✎ 现读（2026-11-02）更正：SortableDocGrid 工具栏有「选择」；进入后卡片 |
| G691 | 2473 | 已对齐 | local-says-missing | 本地 Collection.name（默认「未命名集合」）＋ 行标题走 CollectionItem.documentI |
| G1223 | 3905 | 已对齐 | local-says-missing | 本轮实扫＝src/app/layout.tsx 与 src/app/globals.css 都没有 color-sche |
| G1228 | 3937 | 已对齐 | local-says-missing | grep -n toggle src/lib/import/markdown.ts ⇒ 0 命中＝本地把 -／+／* 一 |
| G1574 | 5553 | 已对齐 | local-says-missing | 本地对照＝任务行未设可聚焦属性（点击后 activeElement 是 body）；完成态载体是 span[role=" |
| G1611 | 5591 | 已对齐 | local-says-missing | 本地：无上限提示（G1577 记本地表格键整族无绑定 ⇒ 连"加到上限"这条通路都走不到）。✎ 现读（2026-11-0 |

## 十、待重扫

- **192 条 unknown**：文本没有给出可判定状态。集中在批次静态节（第 137/170/172/96/131–133 批），不是 P0/P1。
- **1053 条文本“未动”**：其中只有 16 条在显式 P0/P1/P2 表里；其余多数是批次里的内部实现差异（键表、同步层、bundle 结构），需要逐条现读才能升级为任务。
- **14 条口径冲突**：见上表；优先回写台账，避免继续用旧本地列做判断。
- 下一步建议：按 `priority=P1`＋`status=gap/partial` 从 CSV 里切片，每批 5–10 条做现读确认，确认后再排期。

差异最集中的节（文本统计，未逐条核）：

| 条数 | 节 |
| --- | --- |
| 12 | 三点一〇六十、第 110 批〔★★★ 代码块主题的作用域结案＝块级， |
| 11 | 三点一〇三八、第 97 批〔★★★ G943 裁定＝连接器的按键不自 |
| 11 | 三点二二八、第 293 批（清死代码＋登记新账）＝删掉被离线内核取代的第 |
| 10 | 三点七、P2 追加（来自 dialogs.md 与 protoco |
| 10 | 三点二五、第 2 批前置（任务三套时间语义的契约面结案，~  |
| 9 | 三点一四、标签系统与浏览面追加（来自 tags-browse.md， |
| 7 | 三点五、P2 追加（来自 modules.md 模块清单，静态证据） |
| 7 | 三点六、P2 追加（来自 longtail.md 与 keyboa |
| 7 | 三点一〇五九、第 109 批〔★★★ 代码块的写侧字段结案＝typ |
| 6 | 三点八〇、第 70 批（★ 静态补账：键位分派器全解 ⇒ B / D / |
| 5 | 三点一〇二四、第 96 批·上半〔★★行为级仍未解锁（视口第 8 次 |
| 5 | 三点一一一四、第 175 批新登记的官方行为（2026-10-09 机器 |
| 4 | 三点一〇、协同与权限追加（来自 collab.md，静态证据） |
| 4 | 三点一一、发布与共享控制中心追加（来自 publishing.md， |
| 4 | 三点四八、第 41 批（集合单元格十个按类型编辑器，model.md |
| 4 | 三点五一、第 42 批（集合输入层 + 白板预览本体，model.md |
| 4 | 三点八五、第 74 批（★★★ 静态补账：撤销计步器的生成/消费 ＋ 提 |
| 4 | 三点九三、第 79 批·下半 B79B（2026-09-28 07:33 |
| 4 | 三点九九、第 82 批·下半 C（2026-09-28 08:48–08 |
| 4 | 三点一〇三一、第 96 批·尾记六〔★★★判据盲区一次性结掉三条老结 |

## 十一、不进复刻 backlog

- **有意偏差 96 条**：已在台账写明不照搬的（如 `G48` 路由结构、`G35` 白板副本语义），保留本地选择。
- **收费／会员面（本项目自用）**：订阅、套餐、配额、账单、发票、升级／付费墙、AI credits／额度、团队付费管理，不做。
- **不可达 16 条**：本会话拿不到官方前置（表格行/列选择态、分组焦点等），措辞是“本会话不可达”，不是“官方没有”。
- **非交互面 56 条**：仪器、契约、静态事实，不属于屏幕交互复刻。

## 十二、产物与复现

| 文件 | 用途 |
| --- | --- |
| `_audit/ledger-rows.json` | 1614 行解析后的全量结构（含表头映射、状态、优先级、冲突） |
| `_audit/ledger-backlog.csv` | 全量 CSV，可直接按 `priority`／`status` 过滤 |
| `_audit/backlog-digest.json` | 统计、P0/P1/P2 行、冲突、待重扫分布 |
| `_audit/manual-verified.json` | 本轮 P0/P1 现读证据与状态覆盖 |
| `interaction-lab/audit-ledger.mjs` | 解析＋文本归一化 |
| `interaction-lab/build-backlog.mjs` | 应用现读覆盖，生成 CSV／统计 |
| `interaction-lab/render-backlog.mjs` | 生成三张显式表与冲突表 |

复现命令：

```bash
node docs/craft-ref/interaction-lab/audit-ledger.mjs
node docs/craft-ref/interaction-lab/build-backlog.mjs
node docs/craft-ref/interaction-lab/render-backlog.mjs
node docs/craft-ref/interaction-lab/inject-backlog.mjs
```
