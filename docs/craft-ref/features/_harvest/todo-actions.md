# 待验证动作队列（动态行为面）

**已完成（2026-09-27 会话，见 `interactions.md` §四点五 与 `features.md` §十）**：
- V1–V5：⌘K=「跳转到」（非命令面板）、Escape 关不掉、`cua.click` 点正文可关、`ax.get()+ax.click(idx)` 是唯一稳定点击通路、**查看备份 → 历史版本面板**（变更计数 + 昨天/较早分组 + 30/180 天付费墙）、goto 复原干净。
- 9 条路由 sweep（all/tasks/calendar/connections/templates/starred/tags/folders/inbox），零写入。
- ~~**T0-1 判定为不可达**~~ **已推翻（2026-09-27 静态解码）**：快捷键全表 104 项已从 bundle 解出 → `../keyboard.md`。当初判"面板唤不出"是因为按了 `Control+,`，而官方 `TOGGLE_KEY_SHORTCUTS` 在 Windows 是 **`Ctrl-Shift+,`**（Mac 是 `⌘⌥,`）—— 键错了，不是功能不存在。**T0-1 已结案（2026-09-27 动态 V7）：判定为平台不可得**——`Control+Shift+,` 与 `Control+Shift+Comma` 两种拼法各按一次，DOM 字节零变化且无 `<kbd>`/`role=dialog`，命令面板也不列「查看所有快捷键」条目，注册方 `HelpButton` 在 web DOM 不存在。作用域归属改由静态 `kbd-contexts.tsv` 结案（445 站点 / 13 具名上下文）。
- **T0-3 已完成**：`sidebar-inbox` = 未分类文档收集箱；`sidebar-imagine`/`connections` = MCP/API 接入中心。

**阻塞已解除**：点击通路确定为 `ax.get()` → `ax.click(index)`（`locator.click()` 与 `dom_cua.click` 在本 app 上不可用，见 probe-recipes §4b）。窗口可见性不是前置条件，别再拿它当理由。

## 静态已结案、不要再排给动态采集的项（2026-09-27 更新）

| 原动态项 | 现在由什么结案 | 动态只剩 |
|---|---|---|
| 拖拽落点类型 | `registries.md` §二：落点封闭 5 类 `blocks/tableColumn/tableRow/newBlock/importBlocks`，落库行为 3 类 `TASK/UPDATE_ON_DROP/PIN_ON_DROP`；`dialogs.md` §6：视图带 filter/sort/group 时禁拖 | 逐条验"某元素能否落到某类"（可达性矩阵） |
| 分享档位 | `registries.md` §二 `r4` = `AnyoneWithLinkCanView/AnyoneWithLinkCanEdit/Restricted` 三档封闭 | 档位切换的后效与 UI 反馈 |
| 块类型全集 | `registries.md` §二 `BlockType` 13 项 + `TextStyle` 9 + `ListStyle` 5 | 块间**转换保真矩阵**（哪些转换丢属性） |
| 分隔线/字体/渐变档位 | `LineType` 6、`FontFamilyId` 4（无品牌字体）、渐变预设仅 2 个 | 无需采 |
| 统计作用域 / 集合视图档 | `id` = `FullDocument/ThisPage/Selection`、`Gs` = `table/gallery/kanban` | 无需采 |
| 快捷键全表 | `keyboard.md` 104 项 | 面板已实测：web 端无该面板（interactions.md V7 ✓，判定不可得）+ 360 条 matcher 的作用域归属 |
| **AI 动作面有哪些** | `assistant.md` §一/§二：62 条注册项 × 13 个上下文分组、81 槽位，**两侧零孤儿闭合** | 面板里是否可搜索/滚动、是否随订阅档裁剪条目 |
| AI 提示库内容 | `assistant.md` §八：35 条「标题 + `指令: --- {0} ---` 模板」，翻译 9 语种 | 无需采 |
| 自定义提示的上限与存储 | `assistant.md` §九：20 条 / 1000 字符、`settings_state` 双写 + 读时迁移 | 超限 toast 的实际呈现（已知 4 秒、type=error） |
| Imagine 接入中心的实体维度 | `assistant.md` §十：权限 3 × 保护 3（public/key/password）× 作用域 3，密钥只显示一次，**上限 10 个 API** | 三维能否自由组合（未见约束代码）；属写操作，需授权 |
| 内部深链 | `assistant.md` §十一：`craft://` 全集 + `folder/{unsorted,starred,all-docs}` 三保留字 + `tasks` 四档 | 无需采（scheme 已在 `AIChatPopup` 解析器里穷举） |
| **大部分 `[0]` 类上限** | `plans.md` §二：1 空间（个人）/ 25 空间（团队与 Business）/ 入门团队每空间 10 文档 / 家庭 5 成员 / 团队 25 成员 / 备份 30\|180 天 / 14 天试用 / 降级后每周 2 篇 / Plus＝2 倍 AI 请求额度 | **只剩三个真远端值**：免费档每空间区块上限、单文件大小上限、免费档文件个数上限 |
| 付费墙有哪些功能 | `plans.md` §三：卡片样式全集、作者控制、高级共享选项、自定义域名与路径、高级分析、备份 | 触墙时的呈现形态（变灰？弹窗？）——只读即可观察 |
| **快捷键作用域归属**（挂了 6 批） | `keyboard.md` §运行时绑定：焦点栈 `pushIntoFocus({id,keyDefs,allowPropagation})`、**445 站点 / 115 处 allowPropagation（51 true / 64 false）**、13 具名上下文键集（`kbd-contexts.tsv`）、12 模块自注册分布；命令 id 与键位分离（`N.*`/`ot.*`） | 仅剩 31 个变量名 id 的逐上下文传播取值（需别名追踪）与谓词型上下文（框选 Esc）的实际触发 |
| 订阅与域名生命周期态 | `team.md` §三/§五：订阅三态（到期后停止新增）、App Store 拒答、域名四态（未设置→声明已加记录→验证中→已验证）、换域使外链失效、删除团队需先取消订阅 | DNS 验证轮询节奏、发票能否在应用内下载 |
| 家庭/团队/业务是否同族 | `team.md` §六：`create.{business,family,team}.name` 三条创建分支 ⇒ 三种实体形态（结案 `plans.md` §六 遗留） | 管理员能否多人、角色能否自定义 |
| **块转换丢什么属性**（挂了 7 批） | `internals.md` §一：转换动作是 `setTextStyle`，块对象不变 ⇒ 样式族转换不丢属性；转集合＝切 `objectList` | 仅剩**跨块类型**（文本↔列表↔代码↔图片）的动作名，需继续找 `BlocksV2Actions` 的分支调用点 |
| 行内公式落到哪个类型 | `internals.md` §二：内联 subtype 判别值是 `"tex"`，命令 id `ot.INLINE_TEX` | 仅剩公式的渲染路径与可编辑性 |
| 三种代理态的结果呈现 | `internals.md` §三：权威全集是 **5 档**（`assistant`/`search`/`documentReview`/`help`/`websearch`）且每档有图标；线程是按空间的持久对象 | 各档结果的呈现形态（批注式？列表？带引用来源？）仍需动态 |
| 取消订阅流程 | `plans.md` §四：三段式（6 个封闭原因 → 预约通话 → 仍然取消）+ 优惠码是**可部分消费的余额** + 需续订日前 1 天取消 | 无需采（属支付禁区，本就不该实测） |

| 发布面板有哪些设置 | `publishing.md` §一：`ShareSheet` 的 `Pa={…}` **13 字段默认值对象** + 域名三档 + 两条硬互斥 | 仅 `hideHashTagWords` 的界面标签（代码里有、文案里无） |
| 样式档位与装饰 | `styles.md` §一–§六：语义样式档位、24 具名色、自定义样式实体七操作、装饰素材清单、六处枚举交叉验证 | 自定义样式上限数值、`dynamic.style` 与 `decoration.focus` 的实际行为（面板分区顺序已由动态 V12 结案） |

仍未静态解决、必须动态做的（已缩到 7 条）：**撤销粒度**（`Ctrl+Z` 循环次数；静态侧已证"未自定义任何撤销参数"，故只能实测）、**跨块类型转换丢什么**（样式族已结案）、**提醒投递与到期行为**、Idea Starter 与 Analytics 的真实入口、四个真远端上限值（区块 / 文件大小 / 文件个数 / 自定义样式条数）、**触墙模态的样式**（一处即可，`internals.md` §四）、**AI 五态的结果呈现**、彩蛋与谓词型上下文的实际触发。（样式面板顺序已于 V12 结案）

## 事故记录（2026-09-27，影响下一次开场）

**队列挂死一次**：同一连接器周期内第二次调 `ax.get()` **本地超时**（返回串是 `ERR local-timeout axget`，不是语义树），我据此解析出 `idx = -1` 并发了 `ax.click(-1)` —— 该调用既不返回也不抛错，cell 永久 running，整个扩展串行队列被它堵住。已 `node_repl_cancel` 释放内核。

- **没有产生任何写入**：唯一一次"可能被执行"的调用是非法索引点击（从未派发）；此前 `查看备份` 是只读弹层，批次末尾已 `goto` 复原。**没有创建沙盒文档，无需清理残留。**
- **恢复动作**：请用户在 `edge://extensions` 把 **Qoder Browser Connector 关闭再打开**（重启 service worker），或完全退出 Edge 重开。单纯点重连按钮不消积压。
- **下一次开场的硬规矩**（已写进技能 SKILL.md 失败路径与 probe-recipes §4b）：
  1. 重建客户端三步（`createBrowserAgent` → `browsers.list` → `openTabs` + `claimTab`），第一条 tab 级命令按不可信处理（≥45s 本地超时）。
  2. `ax.get()` 结果必须**结构校验**后才允许点击：`typeof tree === 'string' && tree.length > 2000 && /^\s*\d+\s+button\b/m.test(tree)`；不满足就**只 goto 重取，不发任何点击**。
  3. 一个周期内 `ax.get()` 只当 1 次机会（不是 2 次）；要全量树就 `goto(当前URL)` 重载后取第一次。

## 连接器状态（2026-09-27 第三次记录 —— **当前处于队列堵塞，别再往里发命令**）

- 现象：连跑 4 个候选路由（`/trash` `/deleted` `/archive` `/bin`）的 cell 在 `goto` 序列中挂住，`node_repl_wait` 两次 60s 未回，随后**重建客户端 + `tabs.new()` 报 `Tool command waited too long in queue`**。⇒ 上一轮那 4 条导航仍排在扩展串行队列里，**跨重连残留**（与 sibling 技能记录的行为一致）。
- **本批没有产生任何写入**：那 4 条全是 `goto` 只读路由探测；沙盒文档已在第 1c 批删除并复核。
- **恢复动作（需用户执行）**：在 `edge://extensions` 把 Qoder Browser Connector 关闭再打开（重启 service worker），或完全退出 Edge 重开。单纯点重连按钮不消积压。
- **教训（已写进技能）**：一次 cell 里连做 4 次 `goto` 是本批唯一的高风险动作 —— **路由探测要一次一条**，尤其探测**未知路由**（未知路径可能触发服务端重定向环或长时间 pending 的文档加载，把串行队列占死）。
- 待恢复后第一件事：把 `/trash` 等四个路由的探测**逐条**重跑（这是回收站问题的决定性证据，目前只有文案侧的 `trash.find.in.history`「查找历史」）。

## 第 13 命名空间批（静态，零浏览器，2026-09-27）—— **已完成，产物 `tags-browse.md` 追加 §一–§八**

来源不是浏览器，是本地留存的 `_harvest/contract-app.json`（`copy`/`i18nKey` 桶）里 grep `trash|restore|deleted` 撞出来的：`recently.deleted` 一整套 11 句 + `browse.*` 131 条全量重读。
**推翻自己**：V27 判"网页版硬删无回收站"→ 产品侧有完整的「最近删除 / 30 天 / 恢复 / 清空＝永久删除 / 两条专错」体系 ⇒ V27 降级为待复验（V27b），G221 的"有意偏差"结论同时打折。
新增缺口 G233–G241（9 条）。**并修正第 12 批的审计结论**：`browse.*` 当时被审计判为"已覆盖"（132/7 引用），实际只读了排序与分区两块 ⇒ **"被点名"≠"读全"**，条数 >100 的命名空间要按行读完。
浏览器恢复后的复验顺序：① 「最近删除」屏入口与布局（定 V27b）② 四个未知路由逐条探（`/trash` 等）③ 瀑布视图 ④ 搜索"查看更多"的触发。

## 第 14 批结案（2026-09-27 04:23–04:37，零写入）

- ① **结案 → V31**：`<space>/trash` 真实可达（标题「最近删除」、DOM 157,674、共用浏览屏外壳、空态句 `browse.doc.you.deleted.will.appear.here`、⋯ 只有「清空最近删除」一项、30 天 disclaimer 空态不渲染）。**入口三处全落空**（侧栏 / 所有文档 ⋯ / ⌘K 面板）⇒ "有屏无入口"本身成结论。V27b 结案：两条删除路径并存（批量选择=硬删不进回收站，已实测；单项「将"X"移至最近删除」=30 天，仍 ~ 文案级）。
- ② **结案**：`/trash` 就是那个"未知路由"（此前 4 连发 `goto` 把队列打挂的那批探测，正确答案是 `<space>/trash`，**空间级前缀**，不是全局 `/trash`）。
- ③ **部分结案 → V32**：第三档 `Line3 Horizontal` = **列表视图**（表格组件 `_1m9yz_`、四列 名称/上次浏览/已更新↓/已创建、列宽 112px、副标题是内容摘要回退链、复选框列条件渲染）；**中间档 `Rectangle3 Group` = 瀑布仍未采**。
- ④ 未做（本周期命令数已达上限）。
- **越权自纠**：切视图档改了**持久化的空间偏好**（禁区"改默认视图"），未先开口。还原点击 `ax.click(365 → Rectangle Grid2x2)` 返回成功，但随后 `screenshot()`/`title()` 连续本地超时 ⇒ **还原未做视觉复核**，已记 manifest 为未验证残留。

### 下周期开场顺序（按此执行，不要重新想）

1. ~~先复核视图=网格~~ **已结案**：队列约 90 秒后排空，`shot-view-restored.png`（406,083 字节）逐张读过，第一档高亮 + 卡片网格渲染 ⇒ 偏好已还原，manifest 闭环。
2. 中间档「瀑布」布局（**要先拿授权**，因为同样是持久化偏好；采完必须当场截图确认还原）。
3. 搜索"查看更多"的触发阈值（只读：`cua.click` 开 ⌘K → `cua.type` 一个常见词 → 文本集合差）。
4. **第 2 批写入授权**：任务三套时间语义（Deadline / Schedule / Reminder 三分、14 档循环与 roll-forward、文档↔/tasks↔/calendar 三向同步）+ 顺带把「单项移至最近删除」动线与**有内容的回收站布局**一次采掉（建→删→看回收站→清空，全部在沙盒文档内）。
5. 拖拽落点（T-C4）与块首 Backspace 合并 —— 同属块行为，需要写入授权。

## 第 12 命名空间批（静态，零浏览器，2026-09-27）—— **已完成**

产出：`longtail.md` §11–§18（Sign in with Craft / 访客全空间可写 / 空间跨团队迁移 / `{{var}}` 第四套插值 / **恢复＝新文档并跳转** / 智能搜索·正则·自由形式三模式 / onboarding 可勾选清单 / macOS 分享扩展与 Windows 端 / 文件上传限制项名 / 剩余 74 命名空间逐条裁决），`gap.md` G226–G232。
覆盖度：排除 `country`(261)+`unit`(79) 两组地区本地化数据后，**未点名命名空间 135 → 117 → 逐条裁决后真实缺口为 0**（其余是 CLDR 星期/时长单位数据与单词级 UI 原子词，已在各自宿主屏内）。
**过程教训**：本批一开始误建了 `long-tail.md` 重复文件（`longtail.md` §2 早已覆盖分析屏 29 条），因为**动手前没先列目录**。已合并并删除重复文件、G226 改写为"只补门禁粒度"。⇒ 新建产物前先 `ls *.md` + 读同主题文件的标题清单，是本技能的硬前置。

## 连接器状态（2026-09-27 第二次记录）

- 重新接管成功（`openTabs` + `claimTab` + `title` + `domSnapshot` 都正常），但 **playwright locator 通道再次卡住**：`getByTestId('command-palette-button').count()` 本地超时。这次**没有发任何点击**（结构判定 `cnt !== 1` 直接早退），所以没有新的队列污染。
- 结论：`ax.*` / `cua.*` / `goto` / `domSnapshot` 与 `playwright.locator.*` 可能不同一条通道；locator 通道堵了就先改用 `ax.get()` → `ax.click(index)`，**不要反复重试 locator**。彻底恢复仍需用户在 `edge://extensions` 重启 Qoder Browser Connector 的 service worker。
- 新线索（**2026-09-27 已推翻，别再排**）：曾以为 `command-palette-button` / `command-menu` 两个 testid 证实"网页版有命令面板按钮"。实测把本会话全部 10 份 DOM 捕获（含 ⌘K 打开态 `dyn-ctrlk-after.html`、输入态 `dyn-palette-typed.html`、文档页 `dyn-doc-handbook.html`）grep 一遍：**两个 testid 零出现**，页面里存在的 testid 只有 23 个（`header-root` / `document-editor` / `editor-body` / `editor-title` / `sidebar-*` / `*-link` / `*-chevron` / `*-add-button`）。⇒ 与 V6/V7 结论一致：**bundle 里的 testid 只证明组件存在，不证明 web 渲染**；189 条命令的实际快捷键表在网页版**拿不到**，这条线索作废。

## 本批（2026-09-27 动态第 0 批收尾）新增结案

| 项 | 结论 |
|---|---|
| 样式面板分区顺序 | **结案**：自定义样式 → 所有样式 → 颜色（背景/文档颜色/文本颜色）→ 封面（封面图片）→ 分隔符样式（线/和纸胶带/涂鸦）→ 字体（默认/高级）→ 宽页（V12） |
| 插入面板项目全集 | **结案**：16 项平铺无分组，列表家族/引用/分栏/嵌入**不在内**（V10） |
| 格式面板分段 | **结案**：文本(5) / 分组(页面·卡片) / 装饰(焦点·块) / 颜色 / 字体；内联格式不在面板（V11） |
| 信息页结构 | **结案（V8 + V14 两次一致）**：四页签 插入/格式/样式/信息（默认信息）→ 子页签 页面信息/动作 → 属性 / 动作(6 项) / 位置 / 统计·这一页(4 项) |
| 信息页「动作」子页签全集 | **未采到**（V13 索引过期快速失败）；要拿必须 `goto` 重载后取一次全量树，代价=整个页面状态重置 |
| 点击通路 | `ax.get()`(全量) → `ax.click(idx)` 四连点全成；**页签条索引可跨面板内容切换复用**（排在主体之前）；`locator.click()` 第三次静默失效，彻底降级为"只做预检" |


## 第 0 批（零写入，剩余）

跑法：一个动作一个 cell；动作前后各取一次指纹（`screenshot().length` + `title()` + `data-state` 属性）；**指纹没变 = 点击静默失效，不许记成官方行为**。每完成一条，把 `interactions.md` 对应行的 `~` 升为 `✓` 并挂指纹 tag。

前置阻塞：**上次 `getByTestId('sidebar-profile').click()` 后两张截图与 domSnapshot 字节完全相同（89132 / 156327），即界面没有任何变化**——最可能是 Edge 窗口不可见或未前台。SDK 无法编程唤回（`browser_visibility_set` 也走同一条扩展队列）。所以下面所有条目前置：**用户把 Craft 窗口显示出来并保持在可渲染状态**。

## 第 0 批（零写入，先打通通路）

| # | 目标 | 动作 | 判据 |
|---|---|---|---|
| T0-1 | 快捷键全表（阻塞 G13/G14 与 §六-1） | 设置弹窗 → 键盘快捷键分区 → `domSnapshot()` | 拿到 6 个上下文分组的组合文本；弹层开合后 `data-state` 或截图字节变化 |
| T0-2 | 命令菜单条目全集（G33） | `ax.pressKey('Control+k')` → 快照 | 能列出面板分组与默认条目 |
| T0-3 | 侧栏 inbox / imagine 两个 testid 对应什么屏 | 分别 `locator` 点开 + 快照 | 明确这两个功能面入口（本地完全没有） |
| T0-4 | 手柄 `⋮` 与 `+` 的实际项 | 悬停首块 → 快照 | 与 token 采集到的 6 项对齐 |

## 第 1 批：块行为（沙盒文档，`QODER-HARVEST-20260927-blocks`）—— **2026-09-27 已跑，部分完成**

**本批实际产出**（详见 `interactions.md` V15–V21）：T-C3 撤销粒度 **结案**（4 条量化结论）；T-C1 部分（面板建块 4 类：代码块/公式/Mermaid/白板，含渲染形态与 CM6 归属）；顺带结案 V10 更正（插入面板有「合集」组 + Kanban 条目）、V17（面板项不进 a11y 树）、V18（`cua.click` = CSS px，`elementInfo`/`elementScreenshot` 在后台标签页不可用）、V19（统计派生态、空块计入区块数）。

**本批未完成**：T-C2 转换矩阵（需要选中态，坐标点选块 + 格式面板联动未跑通）、T-C4 拖拽落点（未做，`cua.drag` 是原子操作，中途无截图窗口）、T-C5 Enter/Backspace/Tab 边界（未做）、T-C6 分隔线四档与折叠块全体展开（未做）。

**⚠ 沙盒残留（需处理）**：文档 `f4524777-abfd-41e1-97f7-5fc51212662f`（「无标题文档」，未分类，2 个空块）**删除失败**：信息页「删除」按钮点击后跳到 所有文档 但文档仍在（无确认、无失败提示）；卡片右键与 hover 取树两条通路都没出菜单。已按"不盲目重试删除"的规矩停手。**下一轮开场第一件事**：用「所有文档」屏卡片悬浮 ⋮（需先 `cua.move` 悬停再截图定位）或找 回收站 路由清掉它，然后做残留三连。

**下一轮开场的技术前提**（本批踩出来的）：① 建块走 `cua.click` 坐标（CSS px = 截图 px ÷ 1.25），面板项不进 a11y 树所以 `ax` 帮不上；② 想做"选中某块再转换"的實驗，必须先**点进该块**（点块文本行，不是点面板），否则格式面板无对象；③ 撤销类实验要先确认焦点在编辑器（先点正文再按 Ctrl+Z，否则零变化会被误读成"官方不撤销"）；④ 标题写入：`cua.type` 在**新建文档刚打开**时有效（app 自动聚焦），普通 `goto` 打开的文档**没有默认焦点**，`ax.setValue` 会写进隐藏的 `#spellCheckEnabler`（无害但不生效）。


| # | 目标 | 动作 | 判据 |
|---|---|---|---|
| T-C1 | 块类型全集与嵌套规则 | 沙盒里逐类插入（用 `commands.insert.*` 22 条逐项） | 每类一块；截图 + domSnapshot 记录 `data-block-id` 层级 |
| T-C2 | 转换矩阵 | 手柄/格式面板逐条转换，每格后撤销 | 合法值只有 保留 / 降级纯文本 / 不支持 |
| T-C3 | 撤销粒度 | 每类操作后循环 `Ctrl+Z` 回到基线 | 记录**次数**与是否合并 |
| T-C4 | 拖拽落点规则 | 对同一列取 5–7 个落点 y，逐点拖 + 指纹 + 撤销 | 得到"落在 y=X → 插到第 i 块之后"的映射 |
| T-C5 | Enter/Backspace/Tab 边界 | 块首 `Backspace`、块中 `Enter`、列表项 `Tab`/`Shift+Tab`、空块合并 | 焦点落点与块数变化 |
| T-C6 | 分隔线四档与折叠块全体展开 | 分别触发 | 与本地 `divider.tsx:4` 的 dashed 档对照（G31） |

## 第 1b 批（同一沙盒文档续跑，2026-09-27）—— **已完成，见 interactions.md V22–V25**

| 目标 | 结果 |
|---|---|
| T-C2 转换矩阵 | **结构层结案**：格式面板 6 档 + 分组 + 装饰 + 内联三行的**权威清单与槽位顺序**已拿到（V22），并推翻 V11。**逐档转换丢什么属性仍未做**（需要逐档点击 + 内容保真比对，本批预算不够） |
| T-C5 边界键 | **部分结案**：Enter 分裂块 ✓、点正文下方空白会补末尾空块 ✓、Backspace 非块首只删字符 ✓；**块首 Backspace 合并、Tab 在块首的行为语义未验** |
| 缩进 | **意外收获并结案**：`--indent-w` 变量、一级 28px、0 档不输出属性（V23 → G218） |
| 标题写入 | 通路结案（点标题行 + type；setValue 会被 `#spellCheckEnabler` 吞；`tab.title()` 有一拍延迟）→ 已把沙盒文档改名为 `QODER-HARVEST-20260927-blocks`，manifest 第 3 条 |
| 删除通路 | **仍未打通**，按用户决定"继续当沙盒用、收尾再删"。候选：卡片 hover 后 ⋮（需截图定位，面板项不进 a11y 树）、回收站路由（本会话未找到入口）、多选模式 + Delete 键 |

**✅ 沙盒残留已清除（第 1c 批）**：删除通路结案 = 「所有文档 → 工具栏 ⋯ → 选择 → 勾选卡片 → 红色垃圾桶 → 确认框」。三重复核全过（列表命中 0 / 卡片 9→8 / 文档 URL 落到营销页 / ⌘K 搜沙盒名 = 未找到结果）。manifest 第 4 条 `restored:true`。信息页那个「删除」按钮**不删文档**（V20 的未解现象由此解释）。

## 第 1c 批（零写入收尾，2026-09-27）—— **已完成，见 interactions.md V26–V30**

结案：信息页「动作」子页签 12 项（**V13 关掉**，且 5 项直接印键位字形 ⇒ keyboard.md 第二方对照，见 `keyboard.md` §八）；删除通路（V27）；所有文档屏 ⋯ 菜单 11 项（V28）；Escape 在浏览屏的 ⌘K 上不生效（V29）；浏览屏卡片无右键菜单（V30）。
新未解：① 「向上移动 Alt-↑」是移动块还是移动本页（面板语境是页面，命令 id 是 MOVE_BLOCK_*）；② 信息页「删除」按钮的真实语义（不删文档，那它删什么？）；③ 回收站在网页版是否存在其它入口（该路径是硬删）。

## 第 2 批：任务三套时间语义（R4/R5/R6）

| # | 目标 | 判据 |
|---|---|---|
| T-T1 | Deadline 与 Schedule 分别设置后在 任务页/日历 的落点差异 | 二者独立可见、可分别清除 |
| T-T2 | 提醒「20 分钟/1 小时/3 小时/下周/自定义」后的界面与到期表现 | 「下次提醒时间：[0]」文本出现处 |
| T-T3 | 循环 14 档 + 完成后 roll-forward（月末、DST、"周末除外"） | 造跨月与跨夏令时样本 |
| T-T4 | 文档内勾选 ↔ 任务页双向同步链路 | 指纹链：文档勾选 → /tasks → /calendar → 搜索 → 连接 |

## 第 3 批：权限与分享档位矩阵（R14，需单独确认）

逐档切 owner/editor/viewer/commenter + 链接查看/编辑 + 密码 + 邮箱域名，采顶栏与手柄菜单可用性差异。**对外分享与邀请他人属禁区**，需要用户单独授权或提供第二测试账号。

## 采不了的项目（保持记录，别再试）

IME 拼音候选期（SDK 无合成能力）；`viewport` 档（`viewport.set()` 静默无效）；后端同步协议（CDP Network body 被封）；桌面客户端独有交互。

## 第 15 批（2026-09-27 04:51–05:07，连接器全程卡死 ⇒ 转静态反编译，零浏览器预算）

**连接器状态（第 4 次记录）**：`browsers.list()` 6ms 正常（transport 活着），但 `tabs.list()` 25s 超时、`title()` 30s/60s 超时 ⇒ **扩展串行队列整体卡死，已挂 20+ 分钟不自愈**。恢复办法见技能：用户在 `edge://extensions` 把 Qoder Browser Connector 关掉再打开（重启 service worker），或完全退出 Edge 重启；**单纯点重连按钮无效**。

**本批结案（全部来自仍在盘上的 `_harvest/js/` 26 MB bundle，已 gitignore）**：

1. **`repeatConfig` 完整 schema**（`tasks.md` §九）：`type ∈ {"flexible"(解析缺省), "fixed"(UI 初始)}`、`weekly.days: string[]`、`monthly.{days:number[], dynamicDays:[{type,selector}]}`、`selector` 是**字符串**、**`monthly.days===[]` 意为「最后一天」**。⇒ 结掉 `tasks.md` 三条旧开放项。
2. **滚动锚点其实两档并存** ⇒ **推翻我上一轮 G256 的"官方单一口径"判断**，本地缺的是 `fixed` 档与切换器（G256 已改写）。
3. **重复选择器真实结构**（§十）：组件官方名 `TasksRepeatConfigBasePicker`、七个 setter 含独立的 `setRepeatType`、菜单 id 图 `repeatFrequencies(after|every) → frequency → repeatIntervals → daily-weekend-items`、**周末是两条互斥勾选菜单项且选完自动回退一层**、**interval 往小选时重置为 1**、内嵌 `reminder:{enabled(必填),dateOffset}`、英文星期复数 `"s"` 由代码拼。
4. **拖拽落点 T-C4 从"必须动态采"改判为静态结案**（`ui-affordances.md` §七）：起拖阈值三档（指针 8px / 触摸 150ms±5 / 看板一律长按 / 另一类无阈值）、`preventActivation` 排除表单控件与链接、**落点=半区公式 `side==="left"?C:C+1`**、**三种指示线抑制条件**、拖未选中卡片在 `onDragStart` 即时改选中集、表格专属指示线 + `0px` 主动清空、虚拟列表分组标题独立行高 + `overscan:2` + rAF+150ms 双路。
5. 新增 gap **G264–G273**（其中 **G270 落点半区判定**与 **G264 双默认值分层** 是可直接判定要改的行为差异）。表结构 lint：ALL CONSISTENT，265 行 / max G273。

**仍未结案（静态已尽力）**：`my`（daily 跳周末最大尝试次数）常量、`sxn=20` 用途、提醒推送 payload、指示线视觉形态、logbook 与 `isArchived` 是否同层。

**下周期第一件事不变**：连接器恢复 → 复核沙盒文档 `QODER-HARVEST-20260927-tasks` 内容 → 走第 2 批动线（现在有了 §九/§十 的精确预期，动态只需"点一遍对答案"，预算省一半）。

## 第 16 批（2026-09-27 05:10–05:17，连接器仍卡死 ⇒ 继续静态反编译，零浏览器预算）

**连接器状态（第 5 次记录）**：`tabs.list()` 20s 超时，队列卡死已 30+ 分钟。等用户重启 service worker。

**本批结案（`model.md` §一之六，共 9 小节）**：

1. **`textStyle` 内部是 9 值**（不是此前记的 6 档）：`Title Subtitle Heading Strong Body Caption PageRegular PageCard Note`，且**官方有数字序号函数 `eY()`**：1/2/3/4/5/6，后三值落 default→5。`Note` 在 UI 与对外协议两侧都不出现 ⇒ 内部遗留值。⇒ **T-C2「逐档转换保真度」的主体结案**。
2. **导出映射表拿到字面量**：`title→h1 subtitle→h2 heading→h3 toggle→h4`、`focus→blockquote`、`PageSeparator→hr`、`Video/File→p`（塌成段落）、`Drawing/Whiteboard→div`。⇒ Step 4 一直想要的"块语义最硬证据"，**不需要实际导出物**就能拿到。
3. **块类型判定是优先级链且 `listStyle` 压过 `textStyle`** ⇒ "项目符号 + Heading"的块官方判为 `listItem`。本地按 textStyle 优先会不一致。
4. **"页面"判据两条任一**：`textStyle ∈ {PageRegular, PageCard}` **或** `subblocks.length>0` ⇒ **尚无子块的空页面也是页面**。已修正记忆里那条单判据（"页面即有子块的块"）——它是 MCP 契约层的说法，编辑器内部判据不同层。
5. **降级时子块的去向**（`w$`）：`setTextStyle(Heading)` + 子块整批移到 `afterAnchor(自身)` ⇒ **平铺上提**，不删除也不保留嵌套。
6. **Alt-↑/↓ 的移动单位是"含缩进子块的整块"**（`extendWithIndentChildren → firstLastSelectedIdxInParent → getMinIndentOfSelection`）。
7. **落点寻址 6 种**，含 `afterAnchorVisible` / `beforeAnchorVisible` ⇒ **折叠/隐藏块在落点计算中被越过**（比第 15 批的画廊半区公式更深一层：UI 算 index、协议层算 anchor）。
8. **块线格式 20 字段 + 新建默认值**（每块自带 11 子字段 `pageStyle`、默认 `styleId:"luki"`）⇒ 结掉 `model.md` 未采清单第 1 条（原本判为"必须靠剪贴板/导出反推"）。
9. **`undo`/`redo` 与块操作在同一张 26 项 action 分派表里** ⇒ 协议级 action，不是纯客户端栈；表内另有此前完全未记录的 `setLineType` / `setPageParagraphSpacingType` / `setPageStylePreset` / `duplicateSubtree` / `insertNewBlocksToObjectList` / `toggleCoverImageEnabled`。

**格式面板守卫补充**（`dyn-format-tab.html` 重读）：6 个档位按钮在无选中文本时**全部带 `disabled=""`** ⇒ 面板打开即灰，选中才亮（V22 只记了"selection-aware highlight"，实际是 disabled 而非仅高亮）。

**新增 gap G274–G282（9 条）**，其中 **G276（类型判定优先级）/ G277（页面判据两条）/ G278（降级子块上提）/ G279（移动整块含子块）** 都是可直接判定要改的行为差异。表结构 lint：ALL CONSISTENT，274 行 / max G282。

**下周期**：连接器恢复 → 复核开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（任务时间语义，见 task #13）。**静态已把答案写好大半，动态只需对答案 + 补视觉形态**。

## 第 17 批（2026-09-27 05:18–05:26，连接器仍卡死 ⇒ 目标层面完整性审计 + 逐条枚举）

**换了手段**：不再单点深挖，先量"全部功能"到底覆盖了多少。写了 `key-coverage.mjs`（逐条 i18n key 是否被产物引用，分母剔数据表命名空间），结果 **功能面逐条覆盖 44.5%（1621/3639）**，未覆盖 2018 条 ⇒ 此前的"命名空间被点名即算覆盖"审计给的是假象。脚本已收进技能 `scripts/`。

**本批结案**：
1. `table.*` 80 条**逐条枚举**（`features.md` §五之二）：单元格 7 项 / 行列增删 10 / **移动 12 条文案**（行纵向、列横向，各带单复数变体）/ 标题行与标题列**两个独立开关** / 隔行颜色 / 表内目录 / 排序带示例序列 / **公式函数 24 个 + 方向性区域引用（above/below/left/right）** / `error.row.limit` 远端行上限。
2. `collections.*` 200 条**逐条枚举**（§五之三）：三视图 × 各 3 入口 + 视图 CRUD 9 项；**双向关联字段**（`related.collection` + `related.field` + `two.way`）；**日期范围字段**（`range.*` 含 `range.mon` ⇒ 有周起始日）；聚合 **16 项**（复选框字段专供 4 种）+ 计算行可显隐；★ **硬守卫：筛选/排序/分组任一激活 ⇒ 拖放整体禁用**；★ **删组只清字段值、不删行**；行可 `navigate.into.block`；`move.out.*` 仍是 beta；`download.as.csv`。
3. `teamsettings.*` 190 条重读 ⇒ **大部分是测量假象**（`team.md` §二–§六 早已覆盖 DNS 状态机/订阅三态/成员成败句对，只是没逐字引 key 名）。真增量 6 条（§六之二）：★ **i18n 插值双轨并存且迁移中**（`{{plan}}` 具名 vs `[0]` 位置，同概念 `X`/`X.new` 两键并存，极端例是同一事件的两条文案各用一套）；**席位是有上限的资源**（`invite.error.out.of.seats`）；团队三模板 business/family/team；按席位 + 按周两种正交计费维度；分享页品牌水印是团队级开关；改账单邮箱走人工 24h SLA。

**新增 gap G283–G296（14 条）**，其中 G283（三态禁拖拽）/ G284（删组语义）/ G292（双轨插值）是可直接判定要改的行为差异。表结构 lint：ALL CONSISTENT，288 行 / max G296。

**剩余大面（按未覆盖条数，需逐个人工判"真缺口 vs 已摘要未枚举"）**：`subscription` 276 · `assistant` 217 · `alert` 162（**状态迁移表，价值最高**）· `onboarding` 136 · `imagine` 82（Craft Imagine API）· `collab` 78 · `style` 77 · `tasks` 80。

**下周期**：连接器恢复 → 开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（task #13）。静态面下一刀建议切 `alert.*`（162 条未覆盖，每条背后是一个状态迁移）。

## 第 18 批（2026-09-27 05:28–05:33，连接器仍卡死·第 7 次记录，累计 46 分钟）

**`alert.*` 252 条逐条重读**（`dialogs.md` §八，7 小节）⇒ 覆盖率 44.5% → **46.7%**（`alert` 36% → 56%）。

- ★ **官方自身有 4 类不一致，已单列 §8.1 并要求显式决策**：三条同义"无法撤销"文案（一条问号后多**半角空格**、一条写作「撤**消**」）；**key 名里带空格**（`alert.could.not add.reaction`、`alert.not.load.pending invites`）⇒ 按 `.` 分段查表会失败；失败句前缀三种混用（`could.not.X` / `not.update.X` / `not.load.X`）；进行时句省略号有无不一。⇒ 记成 **G304「有意偏差候选」**：建议本地修正，但必须留痕，否则下轮会被当漂移改回去。
- **输入式确认**（删账户要输入邮箱 + 列出受影响空间清单）= 比二次确认更强的一档（G297）。
- **离开共享文档**是独立确认，单复两键 + 明写"你可能无法再访问"后果 + 成败四键（G298）。
- **字段类型变更会尝试转换现有值**（"如果可以转换"）而非清空（G299，破坏性差异）。
- **11 条进行时句 = 异步 pending 态全集**，含导出与空间头像更新（G300）。
- ★ **表情反应明确禁离线**（两条专错）⇒ **离线写队列不是"所有操作都能排队"**，与 `dialogs.md` §四 离线状态机的默认假设冲突（G301）。
- **套餐"过期"与"档位不足"是两套守卫**：过期单独锁自定义域名与自定义路径（G302）。
- **懒加载 chunk 失败有专错** + 通用兜底句带**原因插值**「操作失败 [0]」+ 剪贴板失败与粘贴失败各自单列（G303）。

**新增 gap G297–G304（8 条）**。表结构 lint：ALL CONSISTENT，296 行 / max G304。
**技能更新**：`scripts/key-coverage.mjs` 收进 scripts；Step 6 加了"覆盖率指标只能定位整块没读、不能判定某面缺失"的口径边界；Step 1 侧加了"字符串表自相矛盾是要交付的事实，必须标有意偏差候选"。

**剩余榜单**（下一步先人工二分再开挖）：`subscription` 276 · `assistant` 217 · `teamsettings` 136（**已知多为假缺口**）· `onboarding` 135 · `alert` 111。
**下周期**：连接器恢复 → 开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（task #13）。

## 第 19 批（2026-09-27 05:34–05:45，连接器仍卡死·第 8 次记录）

**先做鉴定再开挖**（按上轮立的规矩），结果修正了对覆盖率指标的预期：
- `assistant` 217 未覆盖 = **100% 假缺口**（`assistant.md` §一/§二 已有「13 个上下文作用域→动作集」权威分派、§八 已有 35 条提示库与 `{0}`/`[0]` 区别）。我差点把作用域维度重写一遍 —— **规矩救了一次**。
- `teamsettings` 136 = 大部分假缺口（上轮已鉴定）。
- **真缺口只有两个**：`onboarding` 135（全库仅 1 处提及）与 `subscription` 276。

**本批结案 `onboarding.*` 138 条**（`longtail.md` §19，5 小节）：
- ★ **onboarding 是版本化更新轮播**（`v3` / `v326` / `v330`，版本号进 key 名、旧版不删，每版 4-5 屏）⇒ 不是"一个欢迎弹窗"而是一个 changelog 轮播系统。
- **认证渠道 6 种**（邮箱/SSO/Apple/Google/Microsoft/**Setapp**）+ 共享文档可要求登录。
- **邮箱变更五态子流程**（含"没有收到邮件？/检查垃圾邮件文件夹"救济句）。
- **兴趣→灌模板文档 8 档** + 插入面板三步引导任务。
- **从文案掉出的产品事实**：**周套餐存在**（与 `plan.weekly` 互证 ✓）、**AI 额度随订阅附带**、Web Clipper 是独立产品线、Android 测试版带离线、**「100 多种预设样式」是官方口径**、**同一句的写死版与参数版并存**（「6 折」vs「[0]% 优惠」）。
- 另记 **G312**：官方 key 名里有拼写错误（`grammear`、`chese`）与 camelCase 混入（`aiCreditsAvailable`）⇒ 按 `.` 分段 + 小写假设生成查表代码会漏。

新增 gap **G305–G312（8 条）**。lint：ALL CONSISTENT，304 行 / max G312。
**下一刀**：`subscription.*` 276 条（已鉴定为真缺口，子族 upgrade 54 / paywall 13 / churn 12 / discount 11 / trial 5）。
**下周期仍优先**：连接器恢复 → 开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（task #13）。

## 第 20 批（2026-09-27 05:45–05:50，连接器仍卡死·第 9 次记录）

**`subscription.*` 331 条逐条重读**（`plans.md` §五之二 A–E）。先鉴定：§三/§四 已覆盖付费墙清单与 churn 主干，本批只记增量。

- ★ **免费档配额是"随时间增长"的函数**：`starter.desc`「免费创建最多 10 个文档，**此后每周获得 2 个额外的免费文档**」= `10 + 2×周数`；且**并存第二版模型** `starter.desc.block.limit.enabled`「创建任意数量的文档，最多 [0] 个区块」⇒ 官方在迁移配额模型（文档数 → 区块数），两版同时在线（G313）。
- **价格展示是 3×3 矩阵**：`{weekly, monthly, yearly}` × `{单人, 每席位, 团体总计}`，中文话术三样（「/月（一人）」「/月（整个团体）」「/月（整个团队总计）」）⇒ **Plus 按人、Family/Team 按团体总计，计费主体不同**（G314）。
- ★ **`upgrade.team.v2.*` 整套团队升级流程**（此前 0 记录，v2 说明官方重做过）：命名可跳过 → AppStore 购买 → Business 就绪 → 邀请；**`failed.appstore.subscription.and.team.creation.error` 是一个事务同时建团队+订阅、失败合并报告**；`upgrade.incomplete` 有半完成态（G315）。
- **"不可升级"两类且救济不同**：走人工 vs **「升级前请移除团队成员和待处理的邀请」**（前置条件不是错误）；席位上限两处独立键互证 ✓（G316）。
- **一批硬配额数字首次拿到**：空间上限 **25** · 备份保留 **30/180 天** · **文件数与文件大小是两条独立限制** · **上传限额可申请提额且官方备好邮件正文**（G317）。
- **导出/导入三处付费墙与 V28 实测互证 ✓**：批量 MD 导入 / **TextBundle 导出（V28 那两种导出里的墙位）** / 高级导出设置（G318）。
- **AI 请求数按套餐分级**，credits 是订阅属性（三处互证 ✓）（G319）。
- churn 补充：取消原因之一是「我想更改我的订阅套餐」（改道）、可预约通话解锁专属优惠、**挽留时发优惠码并需兑换**（有失败态）。

新增 gap **G313–G319（7 条）**。lint：ALL CONSISTENT，311 行 / max G319。
**剩余榜单**：`subscription` 与 `onboarding` 已开挖；`style` 77 / `collab` 78 / `tasks` 80 / `error` 19 / `web` 52 待逐个鉴定（预计多为聚合已覆盖）。
**下周期**：连接器恢复 → 开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（task #13）。

## 第 21 批（2026-09-27 05:50–05:56，连接器仍卡死·第 10 次记录）

**先做剩余榜单鉴定**：`style`（未覆盖多为 `style.color.*` 颜色名表＝数据面）、`tasks`（`after.1.{day,week,month,year}` 已由 §九/§八 覆盖）⇒ **均判为聚合已覆盖/数据表，不单独开挖**。`collab` 78 / `web` 52 / `error` 19 待定。

**★ 本批最大发现：i18n 值不是纯文本 —— 一份此前完全没记录的"渲染契约"**（`internals.md` §八，8.1–8.4）
- **53 条键内嵌 17 种标签**，命名风格 5 类混用：`<strong>`18 / `<highlight>`17 / `<username>`4 / `<formattedlink>`3 / `<toclink>` `<privacylink>` `<logoutlink>` `<helpsitelink>` `<guidelink>` `<domainlink>` 各 1–2 / `<name>` `<italic>` `<emojiwrapper>` `<code>` `<bold>` / `<b>` / 自闭合 `<br/>` / **PascalCase 的 `<UncoloredLink>`**。
- **6 种插值约定并存**：`[0]` · `{{plan}}` · `{0}`（AI 模板）· `<tag>…</tag>` · **`<0></0>` 数字索引 children**（`collab.invite.but.not.invited`，react `Trans` 风格）· **字面量文本**（`<b>[team]</b>` 的 `[team]` 是写死的词）。⇒ **只做 `[0]` 替换的渲染层会把标签漏到界面上**（G320/G321）。
- **每个具名链接是独立标签而非通用 `<a>`** ⇒ href 由代码按标签名注入（G322）。
- 宿主分布：**`web.*` 占 38/53** ⇒ 该命名空间是"协作活动流"文案集中地（谁 reacted / 1-2-x 三种复数形态各一版）。
- 顺带掉出硬数字：**Family 最多 5 位成员**、**Team 最多 25 名成员**（与"25 个空间上限"是两个不同的 25）、**区块配额有"已用 [0] / 共 [1]"回显条**、席位有"已添加 [0] / 可免费添加 [1]"两段话术（G323）。

新增 gap **G320–G323（4 条）**。lint：ALL CONSISTENT，315 行 / max G323。
**技能更新**：Step 1 新增 0c「扫语言包内嵌标记与插值约定」—— 这是 key 级覆盖率完全看不见的独立契约，附可直接跑的 awk 一行式。
**下周期**：连接器恢复 → 开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（task #13）。静态侧剩余可挖：`collab` 78、`error` 19、`web` 活动流形态。

## 第 22 批（2026-09-27 05:57–06:00，连接器仍卡死·第 11 次记录）

**`collab.space.*` 全量 + `error.*` 全量重读**（`collab.md` §六之二 A–F）。鉴定：§六 已记"三种离开方式"，本批只记增量。

- ★ **空间级权限只有 owner / member 两档 + 访客**，边界就两件事（改设置、邀请成员）⇒ **空间级与文档级是两套独立权限轴**，本地若合并成一套 editor/viewer 就是模型错位（G324）。
- ★ **所有者可主动放弃所有权**（自我降级，措辞「你将无法再管理此空间」，无自助升回说法）（G325）。
- **邀请 ≠ 授权**：`invites.sent.without.access`「无法将他们添加到此空间，你需要自行与他们共享」⇒ 同一动作**两种成功语义**（G326）。
- **邀请链接可轮换**（生成新链接 + 确认），删除三路径，待处理邀请两键同义（G327）。
- **空间删除是最强不可逆、不进回收站**：「永久删除**所有人的所有内容。任何人都无法恢复**」⇒ 与文档 30 天软删构成**两级可逆性**（G328，本地需核对是否误走软删）。
- **应用内有结构化崩溃报告表单**（`error.report.*` 9 键，整块此前未记）：两个结构化字段**各带示例占位符**、重复频率两问、**分 Web / Windows 两版**（G329）。
- `error.*` 另有 `reading.blocklink` 与 `document.short.link` ⇒ **blockLink 与短链接是两条独立可失败解析路径**（G330）。
- 又 3 类官方不一致：`user.removed` 里「Space」**未翻译**（另一键译作"空间"）、同义重复键成灾、同一动作三条标题措辞（G331）。

新增 gap **G324–G331（8 条）**。lint：ALL CONSISTENT，323 行 / max G331。
**静态侧结论**：`collab` 与 `error` 已挖完；剩余未覆盖多为数据表或聚合已覆盖。**下一步应转向动态**（连接器恢复后：开放残留复核 → 第 2 批任务时间语义 → 团队升级 v2 流程 → 回收站有内容布局 → 折叠块落点视觉）。
**待办**：`features.md` 索引需补上 §五之二/§五之三/§六之二/§八/§九/§十/§19–§21 等新章节的导航行。

## 批次 23（2026-09-27 06:07–06:20，静态，零浏览器预算）

**开场探活**：`browsers.list()` 7ms OK（不进队列）→ `tabs.list()` 本地 20s 超时 ⇒ 第 12 次卡死，未发任何 tab 级写命令。转静态。

**新工具**：`_harvest/findwin.mjs`（有界窗口提取，替代超时的宽上下文 grep）、`_harvest/defs.mjs`（按符号名找定义，`--file` 过滤避免同名冲突）、`_harvest/chunkkeys.mjs`（chunk → i18n 键直方图）。

**产出**：
- `tasks.md` **§十一**（日期解析链 5 小节）：chrono 七 locale + `forceGB`、严格/自然两档、异步懒加载、未来日期守卫 + 同值跳过 + 清空置 null + 归一到零点、**schedule 与 deadline 是两个并列候选项**（含 `Set Deadline to …` 未本地化）、`NxM` 生表格快捷项。⇒ **第 2 批的动态部分降级为"点一遍对答案"**。
- `internals.md` **§十**（同步层 4 小节）：21 条空间级同步事件（含 `Doc view` 服务端记浏览时间、`Folder description` 协议级）、**7 档连接状态机**、`conflict` 是一等分类、对象分层与 Sub Tier、**本地偏好 vs 服务端同步分界线**（交叉 7 个 CACHE_KEY）。附「仍未采到（同步层）」4 条。
- `longtail.md` **§22**（只存在于代码里的功能 6 小节）：CRAFT BREAKER 打砖块全规格、浏览器不兼容可绕过警告、**搜索 4 个 PUT 端点 + terms 数组 + 高亮二次请求**、灯箱全局 store 预取、懒加载边界清单、**命名覆盖 ≠ 行为覆盖**校准。附 §23 未采到 6 条。
- `gap.md` **三点二八**：G332–G348 共 **17 行**（表 323→340 行，max G348，`check-tables.mjs` = ALL TABLES CONSISTENT）。
- `features.md`：完备性口径改 **48.9%（1781/3639）/ missing 1858**，速查表 +3 行，卡死计数 11→12。

**仍未还原的开放残留**（原样保留，等连接器）：`QODER-HARVEST-20260927-tasks`（沙盒文档，CREATED-AND-ABANDONED-OPEN）。

**下周期顺序**：① 连接器恢复 → 复核该残留实际内容；② 第 2 批动线按 §十一 的预期"对答案"（三族菜单排布、快捷档写入字段、两档循环锚点的推进结果）；③ 顺路补 §22.1 的 EasterEgg 入口与 §10 的调试面板进入方式（都在 `Settings` 屏内可目视找）。

## 批次 24（2026-09-27 06:23–06:27，静态，零浏览器预算）

**开场探活**：`tabs.list()` 12s 本地超时 ⇒ **第 13 次卡死**，未发 tab 级命令。

**先查后写（避免了一批重复劳动）**：`imagine`(82) / `ideastarter`(42) 是"未覆盖最多"的两个 AI 轴。先 `grep` 现有文档 ⇒ **`imagine.*` 已在 `assistant.md` §十 完整成表**（101 键逐项落过）⇒ 审计的"未覆盖"是假缺口，**没有重写**；`ideastarter.*` 44 键确实从未成文 ⇒ 只写这一块。

**产出**：
- `assistant.md` **§十一之二**：空白页 AI 启动器全轴 —— 弹层三件套文案、**七类文档 × 四阶段进度文案表**（六枚可见芯片 + 隐形 `default`）、标题两态 `loading.title.type`、专用成功/失败 toast、**bundle 内联英文解码损坏**（`鈥` / `we鈥檒l`）佐证"关键文案以本地化 JSON 为准"。附「仍未采到（接入与启动器轴）」3 条（真实入口位置、产出的块结构、类型判定失败的可见证据）。
- `gap.md` **三点二九**：G349–G351（G351 把 `imagine` 接入中心正式登记进 gap 表，此前只在 feature 文档里、未参与打分）。
- `features.md`：假缺口清单补 `imagine` 一条。

**审计口径的新证据**：`missing-keys.tsv` 按未覆盖绝对数排序 ⇒ 前五名 `subscription` 256 / `assistant` 214 / `teamsettings` 136 / `alert` 111 / `onboarding` 104 **全部是已确认的假缺口或已覆盖轴**。⇒ 该仪器继续只适合定位"整块没读"，**排名靠前不代表该优先做**。

**下周期顺序不变**：连接器恢复 → 复核开放残留 `QODER-HARVEST-20260927-tasks` → 第 2 批动线（按 `tasks.md` §十一 对答案）→ 顺路找 `ideastarter` 弹层入口与调试面板入口。

## 批次 25（2026-09-27 06:28–06:32，静态，零浏览器预算）

**开场探活**：`tabs.list()` 14s 本地超时 ⇒ **第 14 次卡死**，未发 tab 级命令。

**目标**：把动态队列上的"⌘K 查看更多阈值"改成静态结案。结果：**结案了一半并作废一条猜测** —— `git=20` 全 bundle 只用一次，且是「最近文档」组的截断（排除当前文档 + `getDocumentSortFunction(Updated, Ascending)`），**不是**查看更多阈值 ⇒ 阈值仍未定位（记为该文件未采到第 10 条）。

**产出**：`tags-browse.md` **§九**（9.1 四端点完整形状与响应字段名不一致 / 9.2 `bit()` 多归属分组 + 跨组累计 offset 供键盘导航 / 9.3 查询串解析成日期即追加 date 结果 / 9.4 `git=20` 真实身份与旧猜测作废 / 9.5 每日笔记标题是派生值 + 未分类文件夹用哨兵 id）+ 未采到第 10 条；`gap.md` **三点三十** G352–G356（表 348 行）。

**踩坑**：`node -e "…\`…\`…"` 里的反引号会被 bash 双引号解开导致 JS 语法错（模板串炸在 `terms` 上）⇒ 多行含反引号的中文正文改用 Edit 工具，或 heredoc 写脚本文件再执行。前一条 heredoc 的 append 已成功，未产生半成品。

## 安全停放记录（2026-09-27 06:44，goal 预算耗尽，动态批次中断在第 2 批中途）

**连接器状态**：**活的**（06:33 自行疏通；接管通路 = `user.openTabs()` → `browser.user.claimTab(tabObject)`，`tabs.list()` 返回 0 个可控页属正常，`tabs.get('user-tab:<hash>')` 不吃该 id）。**下一轮无需请用户重启**，直接开工。

**唯一开放残留**：沙盒页「无标题文档」`https://docs.craft.do/editor/d/3b788e8c-7aa3-d2e8-fc70-0c112def1581`
- 内容：1 行任务「明天开会」+ 1 个空任务块；**无任何日期属性**；弹层已关；页面已被 claim 且 `markHandoff()`。
- 删除通路（已实见按钮，未点过）：右侧「信息」面板 → `动作` 区 → **`删除`（红色）** → 预期有确认框（确认框文案与按钮坐标**本轮未采**，故**不要盲点**）。CSS 坐标参考：`删除` 约 `(1290, 562)`（截图 px ÷ 1.25）。
- 删完做残留三连：① 站内搜索沙盒名/「明天开会」应为 0 结果；② `/tasks` 与 `/calendar` 不出现该任务；③ `<space>/trash` 里二次清空。

**下一轮第 2 批续跑顺序（已按 V33–V37 校正）**：
1. 点任务行**文字区**使其进入选中态（图标行是临时 affordance，失焦即消失 ⇒ **绝不能复用旧坐标**），再取日历图标新坐标开弹层。
2. 弹层内：在「日期」框输 `下周五` → **按 Enter 或点深色高亮那天**（V36 证明只打字不提交）→ 观测任务行出现的芯片是日历还是旗子 ⇒ 结案"提交落哪个字段"（G357/G253 的关键未决）。
3. 点 `提醒我…`（右侧 `+`）与 `重复…`（右侧 `›`）两条子行，对 §八/§十 的契约答案。
4. 点**旗子**图标，比较其弹层与日历弹层的结构差异（是否也有 `提醒我…`/`重复…`）。
5. 过去日期守卫：「日期」框输 `上周五`，看是否跳转/是否可提交（§11.3 的 `> Date.now() || 同今天` 条件）。
6. 收尾：删沙盒页 + 残留三连（LIFO），并把本轮 5 条 V 行的"仍未采到"合并进 `tasks.md` 未采到清单。

**本批已结案（可直接引用，不必重采）**：V33（`[] ` 转任务块 + 三枚时间图标）、V34（弹层结构 + 提醒/重复从属于日期 + 周一起始 + 非模态）、V35（实时解析投影到日历 + 两种高亮语义 + `下周五`=10-09 可复算）、V36（右上点击=关闭 + 预览不提交）、V37（图标行临时性 + 坐标复用陷阱）。

---

## 第 36 批（2026-09-27 09:35–09:58，静态：块线格式 + 任务 API + 日历分区 + 提醒网格）

**开场与停摆**：09:36 `browsers.list()` + `tabs.list()` **秒回**（3 页，2 页是沙盒文档），但 `tabs.get('1701771224') → user.claimTab() → title()` **>150s 不返回**，落盘文件未写出 ⇒ **第 18 次停摆的阻塞点是 claim，不是队列整体**（形态与前 17 次不同，见 manifest 该行）。已 cancel + 停手，全程未发第二条 tab 级命令。

**本批结案（全部零浏览器预算，证据在 `_harvest/js/` 105 个 chunk）**：

| 落点 | 内容 |
|---|---|
| `model.md` §一之八 1–6 | 块线字段全集（21 个）、`rawProperties` 被读的 9 键、**三种块的负载位置**（table→pluginData / code+whiteboard→blob / object+objectList→objectData）、**date-only 挂钟归一化 `V5`/`VE`**、三档时间口径、页面样式 6 字段、14 个日期原语（含 `zb` 20 秒容差、`Kce` 断言工厂） |
| `model.md` §一之九 1–4 | 任务 API：**`Ed = t => m1(SMe(t))` ⇒ 任务就是块**、4 个端点、**子任务 `{rootTaskBlockId, subTaskBlocks[]}` 且任务对象无 `parentTaskId`**、批量写与单任务写的 `V5` 归一化不一致（不断言是 bug） |
| `tasks.md` §10.8 | **提醒时刻 = 96 档 / 15 分钟 / 当日分钟数**；「不提醒」行**条件渲染**；`u(null)` 写 `{enabled:false}` |
| `tasks.md` §10.9 | ★ **`repeat` 无截止字段的负证据**（5 个候选键引号字面量各 0 次）⇒ 本地 `recurrenceEnd` 是有意偏差候选 |
| `tasks.md` §9.3 补 | `{selector:"last", type:"day"}` = 月末；**`day` 型下 `last` 是保留字** |
| `registries.md` §五之二 | **日历分区生成窗口**（前 5 月 + 本月剩余 + Ongoing(下界 `new Date(2024,0,1)`) + 7 逐日段 + 下周所在月剩余 + 下月 + 再 5 月 + Later）；`Ongoing`/`Later`/`day` 标题**未本地化**；**`sectionType` 非唯一键** |
| `api-contract.md` §二 | ★ **`Dh` 枚举改判**：不是"重复档位"，是**日历分区类型**；并保留一处**未调和矛盾**（describe 说不给 startDate 就不出过去月，实现无条件出 5 个过去月）⇒ 工具层还有一道未定位的过滤器 |
| `gap.md` 三点四十 | **G400–G414（15 行）**，本地列全部带文件:行号；含 4 条对旧行的修正（G267 第二句作废、V38 的 17:00 非常量、G263 子任务升级为结构覆盖、G96 措辞重读） |
| `interactions.md` V49 | 动态项 #2/#4 **改由静态结案**的标注 + 1 条留给动态的复验（默认高亮是否随时钟） |

**新掉的靶子（下一批静态首选）**：`subscription` **256/331 未覆盖（23%）** —— 目前唯一还像真缺口的整块，且纯静态。次选：`w1e` 类型分支表、`S1e`/`DU`/`_U` 表格单元格模型、`uT`/`DC` 集合 schema、`SMe` 适配器、`Gl`/`Kl` 语义。

**仪器校准新增**：`key-coverage.mjs` 把 `mondays`/`saturdays`/`weeks`/`every`/`after`/`skip`/`deadline`/`schedule`/`reminder` 等**零碎单复数键**判未覆盖，但它们已在 `tasks.md` §10.7/§10.8 成表 ⇒ 这类键直接当假缺口，别再为它开批（已写进 features.md 口径段）。

**工具新增**：`_harvest/dump.mjs`（`--pat <正则> --before/--after --file <chunk前缀>`）。**动机是一条操作教训**：`node -e "…"` 里写反引号会被 bash 当命令替换执行（本批第 4 次踩），第 35 批正是因此把 `model.md` 的 §一之七 与 `gap.md` §六-4 打成"字面量被吃掉"的残句 —— **文档正文一律走 Edit/Write，不走 shell**。

---

## 第 37 批（2026-09-27 10:00–10:06，静态：`subscription.*` 331 条重读 ⇒ **主体是假缺口**，只补 5 块真残留）

**触发与结果**：第 36 批末我把 `subscription`（仪器 256/331 未覆盖）写成"唯一还像真缺口的整块"。逐条重读 331 条后**该判定作废**：`plans.md` §一–§五之二 早已覆盖其核心（10 文档/空间、每周 +2、25 空间、家庭 5 / 团队 25、14 天试用与到期降 Free、按空间的区块上限、计价单位矩阵、`upgrade.team.v2.*`、churn 六因与优惠码子系统、席位不变量）。⇒ **仪器"未覆盖绝对数榜首"连续两次（`imagine` 82、`subscription` 256）被复核为假**。
★ **失效机理补一条**：连我"数产物里出现了多少个 `subscription.*` 键"的复核法也骗人 —— 引用时**常省命名空间前缀**（写 `over.limit.desc`），要按 tail 片段搜才算数。⇒ 判真缺口的最低门槛是"**该轴产物里找不到对应事实条目**"，不是"键名匹配数低"。

**真结案（`plans.md` §五之三 A–E，全部零浏览器预算）**：结账 5 态机（**跳出系统浏览器 + 复制链接降级 + 取消是一等终态 + 失败只给"找支持"**）；配额倒计时**跨键拼接**且天/时两粒度（`x.left.until` 是无主语续句「后即可创建新文档。」）；折扣**三代口径并存**（首计费期 / 续费锁定 / 终身 v2）+ `.lowercase`/`.short` 位置变体 + 双插值；含税价两态 + **`price.continue.to.recalculate` ⇒ 税率依赖位置**；空间创建**三分支**与 **"成员必须先在团队里"的 admin/member 两人称守卫** + 私人空间的收费点是"邀请制可见性"。gap 侧 **G415–G420**。

**顺带复核**：`teamsettings.*` **也不是 190 条的整块缺口** —— `team.md` §六之二 已重读过，剩下只有 `team.team.*` 36 + `plan.*` 20 ≈ **56 条** + §七 那 5 个具体未知 ⇒ 下一批静态首选。

**数字刷新**：key 覆盖率 1794→**1816/3639 = 49.9%**（missing 1823）、`gap.md` 406→**412 行（最大 G420）**、`check-tables` 通过。

---

## 第 38 批（2026-09-27 10:06–10:12，静态：`teamsettings.{team,plan}.*` 剩余 56 条 ⇒ **第三次假缺口**）

**触发**：第 37 批末我把 `teamsettings` 56 条列为"复核后仍可能是真缺口的下一候选"。逐条重读后**又被推翻**：`plan.per.seat.*` 与 `plan.weekly` 早在 `plans.md` §五之二 B、`plan.unknown.provider` 与 `*.renewal.new` 早在 `team.md` §六之二。⇒ **真残留仅 5 组**，写进 `team.md` §六之三 1–5 / `gap.md` G421–G426。

**★ 元结论（三连推翻后成立，已写进 `features.md` 口径段）**：`imagine` 82 / `subscription` 256 / `teamsettings` 56 全被判"未覆盖"而实际早已成文 ⇒ **覆盖率仪器不可用作选题依据**，只认键名逐条出现，而本目录写法是散文归纳 + **引用时省命名空间前缀**（写 `over.limit.desc`）。⇒ **后续选题一律以各文档「仍未采到」清单为准**；仪器只做回归（数字别倒退）。
⇒ 我自己在第 37 批还犯了一个对称错误：`features.md` 口径段第 38 行**开头**早已把 `teamsettings` 列为已鉴定假缺口，却在同段结尾把它当"真缺口首选"推荐 —— **同一文件同一段内部矛盾，动笔前没读完自己引用的那段**。

**本批 5 组真残留**：① 团队权限**只有 admin/member 两档、无自定义角色、管理员可多人**（`deactivated`/`pending` 是生命周期态；成员可见空间由"是否已加入"决定）⇒ **就地结案 `team.md` §七-2**；② 成员行三种渲染（`deactivated.members` 带 `.no.count` 变体、`pending.invites` 括号内带空格＝官方排版不一致）；③ 两条破坏性确认框四件套，**标题词≠按钮词**、确认文本带 name+email 双标识；④ 订阅三条守卫（**"该平台无法管理此订阅"**＝点了给错而非无入口 / **"要先取消 Family 订阅"**＝订阅间前置依赖 / 默认团队不可删）+ "过期"文案两版；⑤ 团队徽标点击是**可配外链**（generic/family/team 三套变体）与 **`.new` 后缀＝插值体系正在 `{{named}}`→`[0]` 迁移且新版语义退化**（"每月续订"→"按月计费"）。
⇒ **模式提炼（跨三批复现）**：官方对"正在改的东西"用**新后缀键并行发布**（配额 `starter.desc` / `.block.limit.enabled`、折扣 `tooltip` / `tooltipv2`、订阅 `*.renewal` / `*.renewal.new`）⇒ **两套同时在线**，本地只取一版会在开关切换时文案对不上。记为 G426 有意偏差候选。

**数字刷新**：覆盖率 1816→**1832/3639 = 50.3%**（missing 1807）、`gap.md` 412→**418 行（最大 G426）**、`check-tables` 通过。
**下一批（静态，按「仍未采到」清单选）**：`model.md` 遗留 —— `w1e(type, props)` 按类型分支表、`S1e`/`DU`/`_U`（表格 `tableData` 单元格模型）、`uT`/`DC`（`object`/`objectList` schema＝集合字段定义存哪一层）、`SMe` 适配器本体；以及 `api-contract.md` §二 那处**未调和矛盾**（`describe` 说不给 `startDate` 就不出过去月，实现无条件出 5 个过去月 ⇒ 中间必有一道过滤器）。

---

## 第 39 批（2026-09-27 10:16–10:24，静态：集合两层结构 + rawProperties 类型分支 + 插件式主题）

**触发合规**：本批是**第一次按新规则选题**（从 `model.md` 的「仍未采到」清单挑，不看仪器排名）。

**结案（`model.md` §一之十 1–5 / §一之十一 1–4）**：

1. `SMe` 只把 `blocks` 改名成 `subblocks` ⇒ **§一之九 的"API 字段名结论待展开"前提解除**，`deadline`/`schedule`/`todoCheckedTime`/`repeat`/`rootTaskBlockId` 都是真实线上字段名。
2. **集合分两层**：`objectList` 持 `{schema, views[]}`（★ 字段定义与视图都在表头块上）、`object` 持 `{properties, schemas, themeString}`（内存里叫 `theme`）。
3. ★ **一个记录对象可同时属于多个集合**（`schemas` 是数组 + 块级 `objectSchemaId`），且归属判定是**宽松缺省**（任一侧为 null 即通过）⇒ 本地 `CollectionItem.collectionId` 单值外键 + `onDelete: Cascade` 与之**基数相反**（G427/G428）。
4. ★ **块顺序没有字段**，靠 `subblocks` 数组下标；新建块工厂 `F1e` 默认 `rawProperties: {}`（空对象）而四个容器默认 `null` ⇒ **两类容错语义不同**；`pageStyle` 11 键除 `styleId:"luki"` 外全 null。本地 6 处以上 `order Float` 是**另一种建模选择**（G430）。
5. **页面标题就是 root 块的 `content`**，无独立 `title` 字段；`N1e` 给出建文档请求体 `{spaceId, documentId, blocks:[root], rootBlockId}`（G431）。
6. `w1e` 类型分支只有三条（媒体四型共用 12 字段包 + `image` 加 `unsplashMetaData` / `file|video` 加 `fileExtension`；`url` 型是独立块类型；`code` 只存 `language`）；7 处字段改名对照；★ **封面主色是常量 `#f2f2f2`、媒体主色是算出来的**；★ **同一容器内 date-like 有三套解析**（`parseFloat` 产 number / `parseInt`+挂钟 Date / `new Date`）。
7. ★ **文档主题是"插件"**：`S1e` 按 `pluginName ∈ Object.values(Xa)` 白名单准入，`pluginType:"card"`，带**双色渐变背景**、`userInterfaceStyle`、**随主题下发的 `isLightColor`** 与 **`themeAssetId`**（独立资产）。⇒ 本地 `themeAssetId|pluginName` 0 命中。
8. 通用约定：`j3 = (t,e,n) => t!=null && e.includes(t) ? t : n` 就是官方**枚举白名单校验**的统一写法（三处 `Object.values` 都配它）。

**本批仍未结案**：`Xa`/`Pm`/`ys` 三个枚举体（`Xa={…}` 匹配失败 ⇒ 声明写法不同、未定位）⇒ **"样式主题有哪几种""段落间距有哪几档"仍差最后一层**；`DU`/`_U` 表格单元格模型；`space_list-calendar` 的 `startDate` 过滤器；`iMe` 主色算法与 `cropMask` 形状。

**数字刷新**：覆盖率 1832→**1834/3639 = 50.4%**（missing 1805）、`gap.md` 418→**429 行（最大 G437）**、`check-tables` 通过。

**操作纪律自检**：本批写文档全程用 Edit（未走 shell heredoc）⇒ 第 35 批那类"字面量被 bash 吃掉"的事故未复发；但**连续两次**（第 36、39 批）在"替换 `## 仍未采到` 标题"时把旧列表挤成孤儿 ⇒ **正确做法是锚定"标题行 + 其后第一条 bullet"整段替换，而不是只替换标题行**。

---

## 第 40 批（2026-09-27 10:31–10:40，静态：★ 冲突解决引擎＝客户端三方合并）

**选题**：先查 `preferences.offline.mode.*` 是否成文（**已覆盖**：`settings.md` §一 / G159 的开关与「放弃离线更改」确认），再转向未采的**机制层**。⇒ 一条命令避免了一整批重复劳动。

★ **本批推翻的判断**：多个「仍未采到」清单把"离线/冲突态"标为**只能动态采**（要两个客户端才撞得出冲突）。实际**整个引擎都是 bundle 字面量**，两条 `dump.mjs` 命令结案。⇒ 写进技能失败路径表两行。

**结案（`internals.md` §十一 1–5 / `gap.md` G440–G444）**：
1. **触发判据是索引比较**：`e.blocks.length > 0 && localSyncIndex > lastSyncPatchIndex`；空补丁直接采用服务端；日志级别 `warn` ⇒ 冲突是常态路径。
2. ★ **base 由服务端随补丁下发**：`{docIdTree, oldPluginData, oldObjectData, oldTaskData}` 四个**以 `syncToken` 为键**的快照字典，缺省哨兵 `init` ⇒ 客户端不存历史也能三方合并。**本地写库协议不带旧值 ⇒ 结构上做不了**（`grep conflict|merge` 在 `src/lib/collaboration`、`src/actions/document/update.ts` 均 0 命中）。
3. **五类数据各有合并器且属可选增强**（子块 id 列表 / table / object / objectList / taskData），最终**逐槽回退服务端原值** ⇒ 可按类渐进。两个细节：表格合并要吃刚合完的 `mergedBlockIds`；★ **记录合并要额外吃父 `objectList` 的当前 schema**（字段定义本身可能同时被改）。
4. ★ **服务端补丁以 `{undoable:false}` 派发** ⇒ **远端改动不进本地撤销栈**（与 V46 合起来：栈只收本地动作）。`grep -rn undoable src` 0 命中。
5. **合并逻辑两份实现**（主线程具名参 / socket.worker 位置参 `(server, client, base)`）⇒ 改语义要两处同改；顺带解出 §一之八 里 `stamp` 的用途（**每块一个 stamp 集合**，块级因果标记）。

**数字刷新**：`gap.md` 431→**436 行（最大 G444）**、覆盖率仍 **1834/3639 = 50.4%**（本批是代码侧、未新增 i18n 键点名）、`check-tables` 通过；`internals.md` §十一 就地划掉旧未采项「`conflict` 触发后可见形态」，只留"界面有无反馈"这一子问。

**下一批（仍按「仍未采到」清单）**：`Sub Tier` 档位含义与优先级、待处理队列 `Pending` 与 `Pending (space)` 的调度关系、调试面板进入方式；块面：`$Le`/`NLe`/`ULe`/`DU`、`Xa`/`Pm`/`ys` 枚举体、`iMe` 主色算法与 `cropMask`、`space_list-calendar` 的 `startDate` 过滤器。

---

## 第 41 批（2026-09-27 10:42–10:45，静态：白板与嵌入架构，两个小 chunk 全读）

**选题依据**：按「仍未采到」清单里"白板整轴未采"这一条；挑 chunk 时**先 `wc -c`** —— `WhiteboardFocusMode` 只有 3.1 KB、`ExcalidrawPreview` 5 KB ⇒ **可以整文件读完**（而 `ExcalidrawFocusMode` 45 KB、`vendor-excalidraw` 7.2 MB 不适合本批）。⇒ **小 chunk 优先**是本轮效率最高的选题启发式，已值得复用。

**结案（`longtail.md` §24.1–24.4 / `gap.md` G445–G450）**：
1. ★ **白板在实现上是「链接预览」的一种**：`<iframe class="link-preview__embed-frame" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share; fullscreen">`，URL 经 **smartLink** 解析 ⇒ 与"粘贴链接生成的预览"共用一套外壳。
2. ★ **宿主只靠改 URL 参数传状态**（`colorMode`、`isGuest`），**chunk 内零出站 postMessage** ⇒ **切主题 = iframe 重载**，不是热更新；官方在嵌入层**只有"访客/非访客"两态布尔**。
3. **入站消息协议**：逐条 `e.origin === new URL(src).origin` 比对（不是 `*`）、未知 `type` 只 `logger().warn("UnexpectedWhiteboardMessage")`、iframe 可请求宿主弹 toast（**固定 3000ms**）与转发埋点；监听用 `AbortController.signal` + `cleanupAll()`。
4. ★ **文档内预览是"导出成图"**：三态 `loading|ready|error`；硬编码 `exportPadding: 32`、`exportBackground: false`、`exportWithDarkMode: isDark`；尺寸**等比 contain**；**四重门控**（标签页可见 && 无块在编辑态 && 数据 ready && 尺寸算完）⇒ 切回标签页会补一次重绘；ResizeObserver **300ms 防抖**；Yjs 绑定工厂 **`buildLettuce`/`buildLettuceBinding`**；提亮算法是"向白混 0.93 + 3×3 色彩矩阵"。
5. ★ **顺带掉出一个本地缺陷（G450）**：`src/lib/editor/mirror-html.ts:8` 用正则**整段删除 `<iframe>`**（测试 `mirror-html.test.ts:12` 断言的就是这个）⇒ 若按官方模型把白板/链接预览做成 iframe 嵌入，**本地导出与镜像通道会静默变空**。⇒ 这是本轮少见的"官方事实直接暴露本地既有代码缺陷"的例子。
6. 本地白板是 **tldraw** 而官方是 **Excalidraw** ⇒ 选型有意偏差，但**交互契约（导出参数/三态/门控/allow 清单）要照抄**。

**数字刷新**：`gap.md` 436→**442 行（最大 G450）**、`check-tables` 通过、覆盖率未变动（本批是代码侧）。
**下一批**：`ExcalidrawFocusMode`（45 KB，工具栏/快捷键与宿主快捷键的冲突处理）；smartLink 同步时机（谁写 `smartLinkLastSyncTimestamp`）；以及清单里的老几项（`Sub Tier`、`Pending` 队列调度、`Xa`/`Pm`/`ys` 枚举体、`$Le`/`NLe`/`ULe`、日历 `startDate` 过滤器）。

---

## 第 41 批续（2026-09-27 10:46–11:06，静态：集合单元格十个按类型编辑器，15.6 KB 全部整读）

**选题直接复用上一条启发式**：`ls -SR | tail` 找**最小 chunk** ⇒ 掉出一整族 `*Editor-*.js`（每个 1.4–1.9 KB），而 `grep -rl` 确认**没有一个在产物里被点过名** ⇒ 高信息密度 + 零重复，是本轮性价比最高的一批。⇒ **启发式定型：先按体积升序找 chunk，再按"有没有在文档里被点名"过滤**。

**结案（`model.md` §一之十三 1–6 / `gap.md` G451–G457）**：见上。四条最关键的：
1. ★ **单元格值是 `{type, theme, value}` 判别对象** ⇒ §一之七 那个对裸值做 `typeof` 的 `$Me` **形状不匹配** ⇒ `$Me` 不是写入校验器（只到"不匹配"这一事实，不断言用途）。
2. ★ **清空一律写 `null`**（multiSelect 的空数组也收敛成 null）⇒ 与 §10.8"关掉 vs 从没配过"同一哲学，但**空数组形态不存在**。
3. ★ **`linkToBlock` 落库是 `{name, url}` 而不是 blockId** ⇒ 类型名与存储形态相反，改名/移动后是快照。
4. ★ **具名浮层栈 `collection-v2-{date,select,multiselect,person}-editor`** ⇒ Esc 由全局栈按名字路由；`v2` 前缀＝集合重做过一次（与 `upgrade.team.v2.*` 同现象）。
⇒ 顺带**静态↔动态闭环一例**：`DateEditor` 的 `showApplyButton: true` 与 V38 实屏采到的「取消 / 应用」双按钮互相印证。

**数字刷新**：`gap.md` 442→**449 行（最大 G457）**、覆盖率 **1835/3639 = 50.4%**（新点名 `style.inline.link`）、`check-tables` 通过、`model.md` 新增 §一之十三 + 第 41 批未采到清单。
**下一批**：`media`/`relation`/`number` 的录入通路；四兄弟共同委托的基础输入组件；具名浮层栈实现本体；`ExcalidrawFocusMode`（45 KB）；老清单里的 `Sub Tier`、`Pending` 队列、`Xa`/`Pm`/`ys`、`$Le`/`NLe`/`ULe`、日历 `startDate` 过滤器。

---

## 第 41 批续二（2026-09-27 11:07–11:14，静态：五个小而独立的机制，`internals.md` §十二 / `gap.md` G458–G463）

**选题**：连接器仍卡在 claim 层（stall #18），继续走静态。第三次复用"体积升序 + 未被点名"启发式 ⇒ `ls -SR` 尾部挑出 8 个 **617 B–1.8 KB** chunk，`grep -rl` 确认**全部从未在 24 份产物里被点过名**。⇒ 启发式已连中三元（第 41 批 / 本批各掉出一族），正式写进技能 Step 6。

**结案（`internals.md` §十二 1–5 / `gap.md` G458–G463）**：
1. ★ **`ClipboardBoundary`（617 B 整个组件）**：`onCut`/`onCopy`/`onPaste` 接同一个 handler + `data-paste-boundary` 属性 ⇒ 官方用 **DOM 边界**表达"这块区域自己管剪贴板"。本地 `grep -rn "data-paste-boundary" src` = **0**、`grep -rn "onCopy\|onCut" src` = **0**，只有 `Editor.tsx:385` 一个编辑器级 `handlePaste` ⇒ 只有"整篇"一档作用域。**这是一个 5 行组件解决的一类 bug**。
2. ★ **「即将进行」的排序规格 = 三档分组 + 双比较器**：`T={week:0,month:1,year:2}` 同日期比跨度；`S` 让**逾期固定在前**；`W` 让**无排期排在最前**（都无排期才比 `created`）⇒ "无日期"不是沉底而是置顶。本地 `src/app/(app)/tasks/page.tsx:67-68` 只有 `active`/`completed` 两桶，`sort|upcoming|today|inbox` 在该文件 **0 命中** ⇒ 整层缺失（补上 G43 的排序规格）。
3. **命令式弹层 ↔ Promise 桥**：`show()` 返回 Promise、`submitResult`→`{type:"submitted",config}`、`cancel()`→`{type:"cancelled"}`、关闭→`{type:"closed"}`，回调用完置 `noop`（幂等、不悬挂）。本地 `new Promise` × modal/dialog/confirm 组合 **0 命中**，命令式确认只有 `window.confirm`（`VersionDialog.tsx:68`）⇒ 区分不了"取消"与"提交了什么"。
4. ★ **DnD backend 按设备拆两个懒加载 chunk**（`HTML5DnDProvider` / `TouchDnDProvider`，各 665 B，就是 `<DndContext backend=…>` 包装）⇒ "用哪个 backend"是**加载期**决定。**顺带掉出本地缺陷**：`package.json:20-22` 声明 `@dnd-kit/core|sortable|utilities` 而 `grep -rn "@dnd-kit" src` = **0** ⇒ **死依赖**；实际拖拽全手写原生事件（`src/lib/dnd/sidebar-drag.ts` 零 import、被 6 处引用）⇒ 无 backend 抽象、**无触摸专用路径**（与"触摸长按 150ms 起拖"冲突）。
5. **`UpgradePrompt` 有兜底文案键** `subscription.subscription.fallback.desc` + 按钮 `type: FilledStrong, fluid: true`；**MSAL `PublicClientApplication` 是模块级单例**（应用启动即初始化）。本地 `grep -rln "Upgrade" src/components` = 0、`msal|azure` = 0 ⇒ 付费墙与第三方 SSO 整块不在范围，但"组件文案要有兜底键"这条约定值得采纳。

**数字刷新**：`gap.md` 449→**455 行（最大 G463）**；`key-coverage.mjs` 实测 **1836/3639 = 50.5%**（上一记为 1835/50.4%，本批新点名 `subscription.subscription.fallback.desc` 使 +1，missing 1805→1803）；`check-tables` 通过；`internals.md` 新增 §十二 + 「仍未采到（机制面·第 41 批续）」5 条。
**下一批（静态）**：`ExcalidrawFocusMode`（45 KB，工具栏与宿主快捷键冲突）；具名浮层栈实现本体；`media`/`relation`/`number` 录入通路；四兄弟共同委托的基础输入组件；老清单的 `Sub Tier`、`Pending` 队列调度、`Xa`/`Pm`/`ys` 枚举体、`$Le`/`NLe`/`ULe`、日历 `startDate` 过滤器、调试面板入口。

---

## 第 42 批（2026-09-27 11:16–11:27，静态：集合输入层 + 白板预览实现本体）

**开场先探了一次连接器**（四层探针，全部带本地超时）：`browsers.list()` OK → **`user.openTabs()` 30 s 超时** ⇒ 比 stall #18 更深一层（那次 tabs.list 还能通）。已记 `manifest.jsonl`，**没有继续试探**，转静态。

**选题**：第四次用"体积升序 + 未被点名"启发式，本批把该启发式**用到见底** —— 105 个本地 chunk 里未点名者只剩 **5 个 vendor**（`react-virtuoso` 58 KB / `tanstack` 114 KB / `ds` 182 KB / `react` 342 KB / `code-editor` 3.58 MB），最后一个非 vendor 的 `ExcalidrawPreview.utils`（615 B）也在本批读掉。⇒ **此后选题只能改用各文档的「仍未采到」清单**。

**结案 A（`model.md` §一之十四 / `gap.md` G464–G471）**：
1. ★ `SimpleTextInputEditor` 就是四兄弟共同委托的基础输入组件：**`typingBuffer` 是外部持有的未提交草稿**，且**灌值只在 open 上升沿发生一次**（布尔 ref 守卫）；**trim 后空串与纯空格一律写 null**；**Enter 提交 `preventDefault`+`stopPropagation`**（显式排除 shift）；**blur 提交带 `document.contains` 守卫**；`type` 恒 `text` 只靠 `inputMode` 切键盘。
2. ★ **弹层几何三常量**：`offset = getPlacementOffset(propertyType) − 1.5`（按字段类型查表）、`skidding = −14`、`width = 锚点宽 + 2×EDITOR_OVERHANG`，另有四个 `override*` 入参 ⇒ **同组件服务非集合场景**。
3. ★ **`NumberEditor` 的 percent 是双向换算**：显示 `parseFloat((v*100).toPrecision(10))`（**`toPrecision(10)` 专治浮点尾差**），解析**先剥 `,` 空格 `%` `$`**、percent 下带不带 `%` 都接受（原文那条无括号表达式的净效果，官方代码风格缺陷但语义正确）、`isNaN ⇒ null` **静默不报错**、存回 `z/100`。**focus 分叉**：无草稿→**打开即全选**，有草稿→光标末尾 ⇒ 与基础组件恒"移到末尾"**不一致**。
4. ★ **`RelationEditor` 值 `{type:"relation", objectListId, items}`，目标集合 id 存在 `property.config`**；空 items→null；`propMeta.theme` 显式 undefined（**relation 无配色位**）；**浮层栈注册与渲染解耦**（`!open` 时仍注册名字、组件 return null），调用形态 `(name, onClose, {isDisabled})`；集合族五个名字齐。

**结案 B（`longtail.md` §25 / `gap.md` G472–G477）**：
5. ★ **615 B 的 `.utils` 只为把 7.2 MB `vendor-excalidraw` 摘出静态依赖图**（`async e => exportToCanvas(e)`）。
6. ★ **白板背景色在 `model.data.meta.viewBackgroundColor`、内嵌图片在 `model.data.assets`**；预览取图固定 `width:1200, fit:"scale-down"`，`Promise.allSettled` **单张失败只 logError 并 continue**、`version` 恒填 1。
7. ★ **暗色提亮算法定量化**（补 G449）：向白混 `0.93` + 由 `cos(π)/sin(π)` 生成的**固定 3×3 色相翻转矩阵** `[[-.574,1.43,.144],[.426,.43,.144],[.426,1.43,-.856]]` 逐通道 clamp ⇒ 本地 `color-mix(in srgb … 20%)` 差的不是系数而是**整条矩阵**。
8. ★ **预览层 `pointer-events:none` + `object-fit:contain` + ready 态 `forceMount`** ⇒ 点击白板必然落到下层块；四重门控的第二道取的是**全局** `uiStore.blockEditorState` ⇒ 文档里任何块进入编辑态都不重绘。
9. **工程约定两条**：每 chunk 顶部 Sentry `_sentryDebugIds` IIFE（本地 0 命中）；**React Compiler 全量启用**（`React.c(33)` / `memo_cache_sentinel`）⇒ **据 minified 形态反推源码结构会反推错**（G477）。

**自我更正（两处，落表前挡住）**：
- 初稿把 G474 写成"本地静态引入重依赖" ⇒ 实查 `drawing-view.tsx:27/37/45` **已在用 `void import('tldraw')` 动态加载** ⇒ 差异只剩包装形态，判类从"缺失"改"行为不同"。**这正是记忆里那条"把已实现判成缺失"的失效模式，本批在写表前被证据挡住。**
- 初稿 G477 写"本地手写 useMemo（如 `Editor.tsx`）" ⇒ `grep -c useMemo src/components/editor/Editor.tsx` = **0**，真实位置是 `math-block-view.tsx:11` / `math-inline-view.tsx` / `calendar/page.tsx` / `SharedDocView.tsx` ⇒ 已改。
- 顺带给旧行 **G448 补上目录**（原只写文件名 `whiteboard-embed-view.tsx`，实际在 `src/components/editor/extensions/`）。

**数字刷新**：`gap.md` 455→**469 行（最大 G477）**；`key-coverage.mjs` 实测 **1837/3639 = 50.5%**（新点名 `whiteboard.preview.error`，missing 1803→1802）；`check-tables` 通过；`model.md` +§一之十四、`longtail.md` +§25（各带未采到清单）；`features.md` 导航 +2 行。
**下一批**：`MediaEditor` 通路（磁盘无该 chunk，查 `ImageEditorPopup`）；浮层栈实现本体 `x(name, onClose, {isDisabled})`；`getPlacementOffset` 表体与 `EDITOR_OVERHANG` 数值；`E` 比值（导出分辨率）；`ExcalidrawFocusMode` 45 KB；以及动态清单（连接器恢复后：1b/1c/1d/8/9 + **删除残留沙盒文档**）。

---

## 第 43 批（2026-09-27 11:31–11:36，静态：弹层关闭与快捷键同源 + 几何常量表 + 表格 600 阈值）

**换轴生效**：上一批宣告"未被点名 chunk"见底后，本批改用**「拿遗留问题去 index chunk 里定点反编译」**——先从 `SimpleTextInputEditor`/`RelationEditor`/`ExcalidrawPreview` 的 import 表里把别名还原成真实导出名（`tj=sE`、`cY=ao`、`tf=S3`、`hL=le`、`tp=Qye`），再用 `dump.mjs --pat` 按定义抓八个偏移位 ⇒ **一条批处理结掉三批累积的 4 条遗留**（浮层栈实现本体、`getPlacementOffset` 表体、`EDITOR_OVERHANG` 数值、导出分辨率的 `E`）。

**结案（`internals.md` §十三 1–7 / `gap.md` G478–G488）**：
1. ★ **Esc 关闭 = 往全局焦点栈注册一条 keyDef**：`bn.pushIntoFocus({id, keyDefs:[{matcher: Vn(qs)}], allowPropagation}, aboveFocusStackId)`，`qs="Escape"`、`Vn(t)={keyCondition:na(t)}`；卸载按 id `removeFromFocus(id)` ⇒ **这才是 `collection-v2-*` 那些名字的用途**。
2. ★ **`allowPropagation` 默认 false ⇒ 栈顶独占 Esc**；★ **`isDisabled` 时根本不注册**（返回空函数 `ort`）⇒ 关闭态弹层不抢键；**`aboveFocusStackId` 让嵌套顺序显式可控（不是纯 LIFO）**；onClose 经 `N9` = useLatestRef ⇒ **注册一次、回调永远最新**。
3. ★ **快捷键是「平台双写」对象**：`Co(t)` 同时给 `{metaKey:true…}` 与 **`winMatcher:{ctrlKey:true…}`** ⇒ ⌘/Ctrl 同体；`Vn` 不约束修饰键（`Ctrl+Esc` 也会命中）、`mo` 才是显式无修饰版。
4. ★ **存在第二条并行注册面**：`zd → Gd` 把 handler 另存进 **`keys-${id}` store**（`Ai(…, {equals: In})`）⇒ **改键语义要两处同改**（与 §十一"合并逻辑两份实现"同型重复）。
5. ★ **几何常量表 `sE`**：`ROW_HEIGHT 35 / CELL_H_PADDING 10 / POPUP_WIDTH 264 / EDITOR_OVERHANG 10`；`EDIT_POPUP_OFFSET` 文本族 −10、其余 −4；`getPlacementOffset = −35 + offset` ⇒ **−45 / −39**（输入组件再 −1.5 ⇒ −46.5 / −40.5）；★ **`getPlacementSkidding` 的表值（−10/−4）被集合输入组件的 `?? −14` 覆盖** ⇒ 集合输入横向恒 −14；弹层宽 = 单元格宽 + **20px**。
6. ★ **表格降级阈值 = `rowCount × visibleColumnCount > 600`**（`p8n=600`，判据用**可见**列 ⇒ 隐藏列不计入）。
7. ★ **`E` 结案 = `window.devicePixelRatio`**（`S3` 用 `matchMedia('(resolution: Ndppx), (-webkit-device-pixel-ratio: N)')` 跟随变化 + AbortController `cleanupAll`）⇒ 预览导出分辨率 = CSS 尺寸 × DPR。
8. 另：**`design-system-popupContainer` 具名弹层容器**；**`pEe` = `KeyboardEvent.code → 显示符号` 表**（空格显示成文字 `space`、标点显示原字符、方向键/Enter/Backspace/Home/End 显示字形 ⇒ ★ **字形字符本批拿不到**，bundle 文本已 mojibake，记为未采到）。

**本批写表前挡住的误判（延续上一批的门槛）**：G486 初稿写"本地 `createPortal` 0 命中 ⇒ 弹层不 portal 会被裁切"⇒ 复查发现本地弹层走 **Base UI**（`src/components/ui/{dialog,popover}.tsx`）**自带 portal** ⇒ 差异降级为"官方有可寻名的统一容器、本地由组件库自管"。**"grep 0 命中"只证明"本地代码里没有这个调用"，不证明"这个能力不存在"** —— 这是同一批里第二次被这条挡住（上一批是 `void import('tldraw')`）。

**数字刷新**：`gap.md` 469→**480 行（最大 G488）**；覆盖率 **1837/3639 = 50.5%** 未变（纯代码侧批次，无新 i18n 键）；`check-tables` 通过；`internals.md` +§十三（含 6 条未采到）。
**下一批**：`na()` 键条件实现、`bn` 焦点栈本体（入队/遍历分发规则）、`In`/`Ai` store 语义、**`h8n` 的消费侧分支（越过 600 之后到底降级成什么）**、`m8n` 虚拟化参数、`MediaEditor` 通路、`ExcalidrawFocusMode` 45 KB。动态清单仍全部阻塞（第 19 次停摆：`openTabs()` 超时）。

---

## 第 44 批（2026-09-27 11:39–11:44，静态：★ UIFocusStack 分发算法 + 键表三档寻址 + 表格虚拟化滞回）

**换轴法第二次生效**：直接把 §十三 的 4 条「仍未采到」当工单，按别名还原（`na`/`q7`/`Vr`/`Oo`/`XI`/`bae`/`bn`/`tEe`/`nEe`/`oEe`/`sEe`/`h8n`/`g8n`/`m8n`）在 index chunk 里定点抓定义 ⇒ **4 条遗留一次结掉**，并掉出一条**本地可复现缺陷**。

**结案（`internals.md` §十四 1–5 / `gap.md` G489–G499）**：
1. ★ **`keyCode === 229` 直接跳过整条键盘分发** ⇒ **IME 组合期间官方所有快捷键都不工作（含 Esc 关弹层、Enter 提交）**。这条此前一直标"需要动态才能采"，实际是 `tEe` 第一行的字面量 ⇒ **G490：本地 `isComposing|keyCode 229|compositionstart` 0 命中**，中文输入时按 Esc/Enter 会误关弹层、误提交单元格。
2. ★ **分发是单一入口 + `document` capture 阶段**（`addEventListener("keydown", tEe, opts, true)`）；本地是 5 处 `window.addEventListener('keydown')` 冒泡监听、无优先级无栈。
3. ★ **断链规则 `if (hit || !allowPropagation) break`** ⇒ 栈顶项**即便没命中也会吃掉这条键**（默认不允许多播），比 §十三 那句"栈顶独占 Esc"更强；命中时**一项内只跑第一条 keyDef**。
4. ★ **handler 返回值即拦截控制对象**：非对象 ⇒ 默认 `preventDefault`+`stopPropagation`；**对象且缺某键 ⇒ 拦截被豁免** ⇒ 与 §十二 3 的 `{type:"closed"|"cancelled"|"submitted"}` **共用同一通道**（返回一个终态对象会顺手放弃事件拦截，**设计陷阱 G495**）。
5. ★ **键条件三档寻址**：`{type:"key"}` / `{type:"code"}` / `{type:"letter"}`，**letter 档非单 ASCII 字母直接抛错**并提示改用 `code()`；`na(t)` 把字符串自动降为 `key` 档 ⇒ 解释了非 QWERTY 布局下的可控性来源。
6. ★ **修饰键"声明了才比较"**（四个 `!= null` 门）⇒ `Vn`＝任意修饰键、`mo`＝精确无修饰（把 §十三 3 的推断升到字面确认）；★ **平台双写选路一行**：`bae(t) = isMac ? t : (t.winMatcher ?? t)`（非 Mac 且缺 `winMatcher` ⇒ 静默沿用 Mac 定义）。
7. ★ **插入位用 `id.startsWith(aboveId)`** ⇒ 栈 id 是**前缀命名空间**设计（`collection-v2-*` 整族可插位）；★ **重复 push 同 id 有专门告警 `UIFocusRePushed`** 且**把整条栈 id 列表写进日志**（官方可 dump 焦点栈）；★ **`upsertIntoFocus` 原位 `splice(e,1,t)` ⇒ 重注册不改栈序**；内部名 **`UIFocusStack`**，模块级数组 `d0`（不是 store）；`keyDefs` **可以是函数**（每次按键求值）。
8. ★ **表格虚拟化是带滞回的**：latch effect 里**只有 `Ae(true)` 没有 `Ae(false)`** ⇒ 一旦判为大表永不回落；`Le = !Se && Ie` 单表示"曾大今小"；**表格档 `overscan: 25`**（同 chunk 另有 10 / 5 ⇒ 不是全站常数）；固定高 `estimateSize: () => rowHeight` + 自定义 `observeElementOffset` + 卸载 `clearTimeout`+`cancelAnimationFrame`。
9. ★ **行高做设备像素对齐**：`g8n() = Math.round(35 × DPR) / DPR` ⇒ 防亚像素行缝；复用了 §十三 7 的 DPR hook。

**仍未证（已就地列成 G499 + §十四 未采到 6 条）**：越过 600 后**用户可感知的降级到底是什么**（只降帧？还是失去编辑/拖拽？）⇒ 需要动态（造 30×30 表看 DOM 节点数与可编辑性）；`XI` 的 `code`/`letter` 两个 case 体；`Ll` 的平台判定方式；`nEe` 重复分支后续行为；`Le` 喂给 `m8n` 的哪个入参。

**数字刷新**：`gap.md` 480→**491 行（最大 G499）**；覆盖率 **1837/3639 = 50.5%** 未变（纯代码侧）；`internals.md` §十三 的 4 条遗留已划掉、+§十四；`check-tables` 通过。
**下一批**：`In`/`Ai` store 语义（§十三 剩余）、`MediaEditor` 通路、`ExcalidrawFocusMode` 45 KB、`pEe` 字形（要从官方语言包反查而不是 bundle）。动态清单仍阻塞在第 19 次停摆。

---

## 第 45 批（2026-09-27 11:47–11:55，静态：★ 枚举区 + 两套布尔编码 + Mermaid 的真实身份）

**根因级收获（已写进技能）**：挂了三批的「`Xa`/`Pm`/`ys` 三个枚举体取不到」不是采不到，是**搜索形态错了** —— 编译后的 TS 枚举写作 `(t=>(t.X="…",t))(T||{})`，按 `Xa={…}` 必然 0 命中。改用 `[^A-Za-z0-9_$](Xa|Pm|ys)\s*=\s*[^=]` 一发命中，**并且顺带撞出一整片连续枚举区（@137400–@138532）**。⇒ 新增工具 `slice.mjs --from --to`（按字节窗口直读主 chunk），比逐条 `dump` 更适合"枚举区/常量区"这种连片内容。

**结案（`model.md` §一之十五 1–7 / `gap.md` G500–G507）**：
1. ★ **样式面板权威词表一次到位**：外观 `io={automatic,light,dark}`；**字体是"UI 档名 ≠ 存储值"的两套四档**（`h5={regular,serif,rounded,mono}` ↔ `Jt={system,system-serif,system-mono,system-rounded}`）；★ **`paragraphSpacingType` 只有 `{dynamic, fix}` 两档**（不是数值）；渐变 `Zs={topToBottom,leftToRight,radial}`；★ **卡片主题五种就是 `pluginName` 白名单** `Xa={card.large,card.wide,card.small.right,card.subtle,card.small.small.right}`；封面展示 `Zy={default,icon,sticky,booklet,collage,emojiCloud,none}` 七档；线粗细 `$t` 六档（含 `pageSeparator`）；块类型 `Xe` 13 值（`RecordObject`→`object`、`ObjectList`→`objectList`）；块宽 `r1={auto,fullWidth}`。⇒ **共 12 个 `Object.values()` 白名单集**。
2. ★ **`j3(t, whitelist, fallback)`** ⇒ 未知枚举**静默回退不报错** ⇒ **"读到未来版本的新值就当没设过"**，向前兼容是设计出来的（本地用严格 enum 校验会整块解析失败）。
3. ★ **线格式并存两套布尔编码**：`aI` 认 `"1"/"0"`、`Yq` 认 `"true"/"false"`，**同一块里混用**（`hasTransparency` 走 aI、`coverImageEnabled`/`titleEnabled` 走 Yq），且都返回 `null` 表"从没设过"；`isTodoChecked` 又被第三种编码规约成 **0/1** ⇒ **一个布尔三种形态**。本地只有两态（`toggle-block.tsx:25`）。
4. ★ **Mermaid 不是独立块类型**：`D1e = PU(t) && t.language === "mermaid"` ⇒ 就是代码块 + language 特例。⇒ **本地 `grep -rln mermaid src` = 0**，且此前"要不要进范围"的待决项依据变了：**不需要新节点类型，只需一种 language 分支**。
5. **`cropMask` = `"x|y|w|h"` 竖线字符串 + 全有或全无**；封面固定 11 字段、**同时存处理后与原始两套尺寸**、默认主色常量 `#f2f2f2`；**`primaryColor` 整型存储**，读取 `"#"+c.toString(16)` ⇒ ⚠ **短 hex 缺陷候选（静态推断，未实测）**，本地实现须 `padStart(6,"0")`。
6. ★ **`gr(t,e) = t===e ? void 0 : (t ?? void 0)`** ⇒ **生成侧补丁最小化**（相等就不进补丁），与 §一之九的 PUT 归一化问题是同一条链上游。
7. **`zPe()` 默认 pageStyle 工厂返回 10 字段全 null，不含 `styleId`** ⇒ 修正 §一之八 的表述：`styleId:"luki"` 是**块工厂另补的一层**，不是 pageStyle 默认值。

**本批写表前的两次自查**：G500 的本地列只报**已核实**的两条（0 命中的字体字面值、0 命中的段落间距），"本地外观档位是否与 `automatic/light/dark` 一致"**明确标注未核**而非下结论；G504 的短 hex 明确标"静态推断，未实测"。

**数字刷新**：`gap.md` 491→**499 行（最大 G507）**；覆盖率 1837/3639 = **50.5%** 未变；`model.md` 两处遗留划掉、+§一之十五；`check-tables` 通过；新工具 `slice.mjs`。
**下一批**：`$Le`(行)/`NLe`(表 style)/`ULe`(列 metadata)/`DU`(表格 parser 上下文)；`Fa` 枚举前段与 `S9/Xn/Nt/Ho` 四个白名单对应枚举体；`Zy` 落在哪个字段；主色**提取**算法本体；`ExcalidrawFocusMode` 45 KB。动态仍阻塞（第 19 次停摆）。

---

## 第 46 批（2026-09-27 11:57–12:11，静态：表格四解析器全集 + 「缺省即键缺失」约定）

**结案（`model.md` §一之十六 1–5 / `gap.md` G508–G514）**：
1. **行 = `{id, metadata?}`，行 metadata 唯一字段 `isHeaderRow`** ⇒ §一之十二 猜的"row 可能带 height"**证伪**。
2. **列 metadata 唯一字段 `width`**，线格式是**字符串**，解析链 `s1()` → `Is(n, v => ({percentage: v}))` ⇒ ★ **官方列宽是百分比模型**（本地 `resizable: true` 但 `colwidth|columnWidth` 0 命中 ⇒ 像素轴，且能否持久化未核实）。
3. **表 style 只有三字段**：`alternatingRowColor`（主题色 id 经 `bU` 查表）、`hasColumnsHeader`、`hasRowsHeader` ⇒ ★ 文案侧的「标题行与标题列是两个独立开关」**升级为模型证据（G091 结案）**；★ 标题行是**表级开关 + 行级标记两层并存**，本地靠 node type 名承载（`TableToolbar.tsx:27/37`）⇒ 切换要换节点类型，与 G190 同族。
4. ★ **新字段 `blockStyleModifiers`**（与 `backgroundColor` 并列成块 style 两字段）⇒ 官方"块格式 = 底色 + 一组修饰符"，不是逐属性铺开；此前 45 批都没记到它。
5. ★ **两种"缺省"表达在同一段代码里并存**：`NLe` 用 `{...(e==null?{}:{k:e})}`（**键根本不存在**）、`ZLe`/`VLe` 用 `void 0`（**键在值 undefined**）⇒ **判"有没有配过"只能用 `key in obj`**；且 JSON 序列化一次后两者又等价 ⇒ 隐蔽坑。helper 族：`Is=(t,e)=>t==null?void 0:e(t)`、`ki=(t,e)=>t!=null?e[t]??null:null`、`gr(t,e)`、`SR(t,{low,high})`。
6. ★ **穷尽分支抛 `AssertionError` 子类**，带 `ERROR_TYPE` 字符串与 `static isAssertionError(e)`（`instanceof ‖ ERROR_TYPE`）⇒ **跨 realm（socket.worker）时 `instanceof` 会失效，这就是加 `ERROR_TYPE` 的原因**，与 §十一"两份实现"呼应。
7. **日志文案三处不统一**（`Table row should be` vs `table column must be` vs `table cell must be`）⇒ 与 `alert.*` 那批同类的官方内部噪声，**记为"本地不要顺手统一"**。

**数字刷新**：`gap.md` 499→**506 行（最大 G514）**；覆盖率 1837/3639 = 50.5% 未变；`model.md` 两处遗留划掉、+§一之十六；`check-tables` 通过。
**下一批**：`_Le`（修饰符合法值）与 `bU`（主题色表体）；`DU` 上下文完整形状；`Fa` 前段 + `S9/Xn/Nt/Ho` 四个枚举体；`Zy` 落点字段；主色提取本体；`hasColumnsHeader` 与 `isHeaderRow` 的优先级；列宽 percentage 是否需和为 100。

---

## 第 47 批（2026-09-27 12:13–12:19，静态：★ 颜色打包格式 + `todoState` 三值状态机 + 枚举区收尾）

**★ 本批含一条自我更正**（`model.md` §一之十六 5 就地改写）：上一批说"`alternatingRowColor`/`backgroundColor` 经 `bU` 查表解析、存的是主题色 id" ⇒ **作废** —— `bU` 是**解码器**，颜色值是 **`#RRGGBBAA #RRGGBBAA` 空格分隔的明暗对**（只给一段则明暗同值）。教训已写进表头：**`Is(value, X)` 的第二参可以是任意 mapper**（同批 `Is(x, v=>({percentage:v}))` 已证明），**不能据调用形态假定 `X` 是表** —— 先抓定义再解释。

**结案（`model.md` §一之十七 1–3 / `gap.md` G515–G520）**：
1. ★★ **颜色线格式**：`PRe` 按 `\s+` 拆段并校验（单段 ⇒ `[x,x]`）、`Nq` 去 `#` **固定切 8 位** → RGBA、`bU` 产出 `{light:"rgba(r, g, b, a/255)", dark:…}`（`rO=255`）⇒ ★ **一个颜色字段自带两套主题取值 ⇒ 官方"暗色换色"既不靠 CSS 变量也不靠 class**（与本地 `globals.css` 的 oklch 全局变量体系正交）；⚠ **缺陷候选**：6 位 hex ⇒ `parseInt("")=NaN` ⇒ `rgba(…,NaN)`（`_R` 是否强制 8 位未取到）；**编码侧 `Oce` 却是 `padStart` 补零的** ⇒ 读写两侧 hex 位数约定不一致（与 G504 的 `primaryColor.toString(16)` 短 hex 同族 ⇒ **本地消费官方色值必须写满 8 位**）。
2. ★★ **`todoState` 三值数字枚举 `{Unchecked:0, Checked:1, Canceled:2}` + 三条反直觉语义**：① 单击切换里 **`Canceled → Unchecked`**（取消态点一下回未选、**不直接变完成**）；② **批量聚合 `dde` 是"只要有一个未选 ⇒ 整批设成已选"**（不是"混合 → 清空"）；③ **`toDoCheckedDate` 在 `Checked ‖ Canceled` 都写**（字段名与语义不符）；另有 `fallbackIfAlreadySet` 写侧回退入参与"仅 Checked 发 `todoCompleted` 埋点"。⇒ 本地 `contract.prisma:298` 是 **`isCompleted Boolean`**、`cancel` 在任务面 **0 命中** ⇒ **第三态在本地完全无落点**。
3. ★★ **`listStyle` 权威五值 `{none, bullet, numbered, todo, toggle}`** ⇒ **"折叠块"只是一种列表样式**，与 §一之八"`listStyle` 压过 `textStyle`"互证；本地 `toggleBlock` 是独立节点类型（`focus-style.tsx:20`）⇒ 换节点类型而非改字段（与 G190/G509 同族）。
4. **对齐四档 `Ho`（含 justify）**、**线型四档 `x1e={none,single,double,strong}`**（新记，`strong` 非 CSS 关键字）、**两套同构尺寸枚举 `S9`/`Xn`**（一个含 `default`、一个含 `embed`）、**`Fa` 结案为只有 2 值** ⇒ 上一批"前段被窗口切掉"的猜测**证伪**。

**数字刷新**：`gap.md` 506→**512 行（最大 G520）**；覆盖率 1837/3639 = 50.5% 未变；`model.md` +§一之十七、两处就地更正；`check-tables` 通过。
**下一批**：`_Le`（换定位法：查 `_Le` 是否 import 自其它 chunk，或在 `ZLe` 调用处看是否形参遮蔽）；`DU` 上下文形状；`S9`/`Xn` 落点字段；`fallbackIfAlreadySet` 场景；`tn` 与对外契约 `state` 的对映；`ImageEditorPopup`（`MediaEditor` 通路）；`ExcalidrawFocusMode` 45 KB。

---

## 第 48 批（2026-09-27 12:31–12:35，静态：`blockStyleModifiers` 旗标词表 + `DU` 错误收集器 + 字体穷尽映射）

**结案（`model.md` §一之十八 1–3 / `gap.md` G521–G525）**：
1. ★ **`_Le` 结案（上一批定位失败的那条）**：`function _Le(t){const e=t.split(l1e);return{isBold:wLe(e),…}}`，`l1e="|"` ⇒ ★ **修饰符是竖线分隔的标记串**：**四个单字母旗标 `b/i/s/c`**（`includes` 判定）+ **五个前缀值项**（`font*`、高亮、文本色、对齐、格式），前缀项用**工厂 `i1e = t => e => e.find(o => o.startsWith(t))`** 统一处理。⇒ 定位教训：上一批按 `X=` 与 `function X(` 都 NO MATCH，是因为 **`_Le` 前面紧贴 `l1e="|"` 没有分隔符**（`…;function _Le(t){`）⇒ `dump --pat 'function _Le\(t\)\{'` 才命中 ⇒ **"按函数名搜不到"不等于"函数不存在"，要换形态（`function name\(` / `name =` / 上下文切片）**。
2. ★ **`DU` 结案**：`class DU{constructor(e){this.blockId=e;this._errors=[];this.errors=()=>[...this._errors];this.logError=n=>this._errors.push(\`Error validating: \${this.blockId}: \${n}\`)}}`；消费侧 `const M = _U(P, pluginData); M.type==="success"` ⇒ ★ **失败不抛错，返回 `{type:"success"|"failure"}` 判别式**。⇒ §一之十六 4 那三条不一致文案的宿主到手。
3. ★★ **本批最重要的复刻口径：官方"读值宽容、渲染映射严格"两套策略并存** —— 读值走 `j3(值, 白名单, fallback)` **未知静默回退**（12 个白名单集），渲染走 `jLe` 的 `default: He(t)` **未知立即抛 AssertionError**（`System→sans-serif`/`SystemSerif→serif`/`SystemRounded→rounded`/`SystemMono→mono` 四值穷尽）⇒ **"数据里允许存在我读不懂的值"与"渲染时必须能把所有合法值画出来"是两条不同层的承诺**；`font*` 项是两步映射（`WE(e,RLe)` 抽内部值 → `jLe` 转 CSS）。
4. ★ **承载差异第 4 例**：官方把行内 `b/i/s/c` 存在**样式字符串**里（`blockStyleModifiers`），本地走 **TipTap StarterKit 的 marks**（`Editor.tsx:5/:244`）⇒ 与 `listStyle` vs 节点类型（G517）、表头 node type（G509）、块转换（G190）同族。
5. ⚠ **诚实边界行 G525**：`blockStyleModifiers` 的**唯一已证调用方是单元格 `VLe`**，字段名暗示"块样式"但**块级是否有同字段未证**（不是"块没有"）；`TLe/ALe` 走 `bU` 只是**推测**（未抓定义）。

**数字刷新**：`gap.md` 512→**517 行（最大 G525）**；覆盖率 1837/3639 = 50.5% 未变；`model.md` 三处遗留划掉、+§一之十八；`check-tables` 通过。
**下一批**：`S9`/`Xn` 两套尺寸枚举的落点字段；`fallbackIfAlreadySet` 场景；`tn` 与对外契约 `state` 的对映（§一之九）；`TLe/ALe` 是否真走 `bU`；`WE(e,RLe)` 抽取逻辑；写侧（谁把 `{isBold…}` 压回 `"b|i"`）；`ImageEditorPopup`（MediaEditor 通路）；`ExcalidrawFocusMode` 45 KB。

---

## 第 49 批（2026-09-27 12:36–12:41，静态：★ 官方块样式解析器全量 + run 模型 + color 归一）

**选题**：追 `YPe`/`XPe` 两个白名单的**消费方**（而不是继续找枚举体）⇒ 撞到 `@147474` 这处 **`j3(t?.字段, 白名单, 默认值)` 的集中区**，一次读出十个字段的词表与默认值 ⇒ **"追消费方"比"追定义体"信息密度更高**（定义只给值，消费给值+默认+归属）。

**结案（`model.md` §一之十九 1–4 / `gap.md` G526–G530）**：
1. ★ **十字段权威表**：`textStyle` 默认 `"body"`、`alignmentStyle`→四档默认 **`null`**、`listStyle`→五值 `"none"`、`lineStyle`→六档 `"none"`、`urlStyle`→`S9` **`"default"`**、`layoutStyle`→`Xn` **`"regular"`**（★ **`S9`/`Xn` 落点就此结案**）、`fontStyle`→`Jt` **`null`**、`imageFillStyle`→`Fa` **`"scaleAspectFill"`**（默认**裁满**）、`imageSizeStyle`→`r1` **`"auto"`**、`lineThemeStyle`→**另一条通路 `T1e()`**。
2. ★★ **复刻口径：`null` ≠ `"none"`** —— 默认值分两种姿态：**枚举字段给具体默认值**、**"可继承"字段给 `null`**（alignment/font/lineTheme/spacing/userDefinedListNumber）⇒ `null`＝未设跟随文档、`"none"`＝显式设成无 ⇒ **"清除样式"与"从未设置"必须能区分**，与 G501 三态布尔同一哲学。
3. ★ **行内属性是 run 模型**：`_runAttributes` 每项 `{range:[起,止], highlightColor}` 读入时**展开成 `start`/`length`**、`highlightColor` 经 `kc()` ⇒ ★ **三套行内表示并存**（run 数组＝跨行范围 / `blockStyleModifiers` 标记串＝整块级 / 渲染 mark）。本地 `runAttributes|highlightColor` **0 命中** ⇒ "跨行带范围的高亮与颜色"整层缺失。
4. ★ **`color` 旧名归一**：字面量 `"secondarycolor"` 读入时改写成 `"themeColor"` ⇒ **向前兼容第三例**（`j3` 读值回退 / `AssertionError` 渲染严格 / 本条历史名归一）。本地 `DocumentEditor.tsx:114` 的 `themeColor` 是**巧合同名的局部变量**。
5. ★ **两个"线"字段两条策略**：`lineStyle` 走 `j3`（未知静默回退），`lineThemeStyle` 走 `T1e() ?? null`（实现未知）。
6. 同批带出 4 个此前没记的字段：**`indentationLevel ?? 0`**（官方块有整数缩进层级 ⇒ `--indent-w` 的存储来源）、**`userDefinedListNumber ?? null`**（编号列表可手动指定起始号）、**`decorations ?? {}`**、**`paragraphStyle.spacingBefore/spacingAfter`**。本地这六类字段 **grep 全 0**。

**数字刷新**：`gap.md` 517→**522 行（最大 G530）**；覆盖率 1837/3639 = 50.5% 未变；`model.md` 一条遗留划掉、+§一之十九；`check-tables` 通过。
**下一批**：`T1e()` 实现；`decorations`/`themeInstanceProps` 形状；`kc()`/`Yt()`；`_runAttributes` 写侧与 run 字段集；run vs `blockStyleModifiers` 的分工边界；`u7`/`Wu` 归属；`userDefinedListNumber` 的 UI 入口。

---

## 第 50 批（2026-09-27 12:43–12:51，静态：★ 颜色子系统全貌 + **推翻上批缺陷候选** + 高亮是渐变）

**★ 本批的核心是推翻自己的结论**：上一批（47 批）写的「6 位 hex ⇒ alpha NaN 缺陷候选」**作废** —— `const _R = /^#[0-9A-Fa-f]{8}$/` 到手，**入口正则强制 8 位** ⇒ 6 位进不去 `PRe` ⇒ `bU` 返回 undefined ⇒ `Bce(t)` 主动抛 `Invalid hex color pair with opacity: <原值>`；`Nq.slice(6,8)` 永远拿得到 8 位、`parseInt("")` 不可达。⇒ 已按纪律做三处更正：`model.md` §一之十七 1 的 ⚠ 段就地改写、§一之十七 未采到列表划掉、**`gap.md` G520 整行重写**（保留的结论只剩"读写位数约定要一致"，理由从"防 NaN"改成"对齐入口谓词"）。⇒ 教训写进 §一之二十 0：**静态推断的"缺陷候选"必须在拿到入口谓词/校验后再回判一次**，否则会把"设计好的守卫"写成"漏洞"。

**结案（`model.md` §一之二十 0–4 / `gap.md` G531–G535 + G520 更正）**：
1. ★ **颜色读写闭环三函数**：写 `Ad(pair) = \`${light} ${dark}\``、读 `Yt(str)`（两段→对 / 单段→复制 / 空畸形→**`null` 不抛**）、渲染 `Xt(pair, isDark)`；三形态判定 `ig`（明暗对）/ `I2`（`colorStops`）/ 普通串 ⇒ **颜色解析从不失败**，只有 `Bce` 这个"必须成功"包装会抛。
2. ★★ **高亮是 90° 线性渐变**：`kc(t, degree=90)` 解析 **`"<色1>;<色2>;<色3>g"`**（分号分隔、末尾 `g` 标记）→ `{type:"linear", degree:90, colorStops:[{color:{light,dark}, percent100}]}`，**色标按索均分**（3 个 ⇒ 0/50/100）、**每个色标自己又是明暗对**（一值同时带明/暗两套渐变）、单色标退化普通色、全脏 ⇒ `null`。本地 `colorStops` 与 `linear-gradient`（editor/lib）**均 0 命中**，高亮是单色 mark（`markdown-shortcuts.ts:32/44` `schema.marks.highlight`）。
3. ★ **`lineThemeStyle` 的真身是对象不是枚举**：`{type:"washi", patternSource:{type:"solidColor"|"pattern", color}}`，`T1e` **只对 `type==="washi"` 就地规范化**（`m0` 大写化 → `Yt` 转明暗对写回 `patternSource.color`）并**原样返回** ⇒ 未知 `type` 既不回退也不抛 ⇒ **和纸胶带的模型真身**（与设计 token 采集记的「线 / 和纸胶带 / 涂鸦」对上）。
4. ★★ **两种解析策略按字段形态分派**：**枚举 → `j3(值, 白名单, 默认)`（未知静默回退）**；**结构化对象 → `T1e(obj)`（就地规范化 + 原样保留）** ⇒ 与 §一之十八"读值宽容/渲染严格"组合成完整策略矩阵。新工具：`oc()` 验证器工厂（`jb(t,e)=e in t` **用 `in` 含原型链**）、`kR(t,map)` **map-or-bail**（任一 null 则整批 null，与 `Is` 相反）、`U1` 递归深度比较、`bt`/`Gn`/`_u` 过滤族、`es()` 共享空数组。
5. ⚠ **本地"已有和纸胶带"但承载不同**（写表前 grep 挡住的一次误判）：`grep -rn "lineThemeStyle\|washi\|doodle" src` = **18 命中** ⇒ 本地 `pageStyle.washi` 是**字符串 id**（`PageStylePanel.tsx:246/252`、`DocumentEditor.tsx:115 getWashiGradient`、内置表 `themes/page-style` 的 `washiTapes`）⇒ **颜色锁在内置表里，官方颜色随数据走** ⇒ 差异是"配色可表达性 + 默认值 `null` vs `'none'`"，**不是"缺失"**。

**数字刷新**：`gap.md` 522→**527 行（最大 G535）**；`key-coverage.mjs` 实测 **1842/3639 = 50.6%**（missing 1802→1797）；`check-tables` 通过；`model.md` +§一之二十、4 处就地更正。
**下一批**：`C9`/`lg`/`Oce` 编码侧；`T1e` 只处理 washi ⇒ 涂鸦/线的分隔符走向；`_runAttributes` 写侧与 run 字段集；run vs `blockStyleModifiers` 分工；主色提取本体；`decorations` 形状。

---

## 第 51 批（2026-09-27 12:53–12:58，静态：★ 序列化写侧全貌 —— 读侧的镜像）

**选题**：追"谁构造 `_runAttributes` 的 `range`"（上批遗留的写侧问题）⇒ 直接撞到 `@555900–@557700` 这一整窗**线格式序列化器**，与读侧逐字段成对 ⇒ **读写闭环至此完整**。

**结案（`model.md` §一之二十一 1–5 / `gap.md` G536–G541）**：
1. ★★ **`gr(值, 默认)` 第二参就是默认值，且默认值是条件式 `n ? 默认 : void 0`** ⇒ **新建块每个枚举字段都写默认值；更新已有块时，等于默认的字段一律省略** ⇒ ★ **同一字段在"新建"与"更新"两种请求里的线格式形态不同**（新建＝完整档、更新＝最简档）⇒ 这正是读侧必须带 `j3(…, 默认)` 的原因。`n` 的确切语义未展开（列未采到）。
2. ★★ **`color` 写侧反向改名**：`styleProps.color === "themeColor" ? "secondarycolor" : E5(…)` ⇒ **线上/磁盘永远是旧名 `secondarycolor`**，`themeColor` 只是内存别名 ⇒ **按内存名写数据会写错**。
3. ★ **两向字段名不一致五组**：`indentationLevel↔indentLevel`、`userDefinedListNumber↔userDefinedOrdinal`、`secondarycolor↔themeColor`、`smartLinkLastSyncTimestamp↔lastSyncTimestamp`、`areCommentsHidden` 字符串 `"0"/"1"`↔ 布尔。⇒ **方法论价值**：本目录此前多次用"grep 同名 0 命中"判缺失 —— **官方真正的写法可能换了名字**（写入方法论记忆）。
4. ★ **run 写侧成对**：`{...z, highlightColor: MC(…), range: [z.start, z.length], start: void 0, length: void 0}` ⇒ 读 `range→start/length`、写反向；`MC` 是 `kc` 的逆。`_runAttributes` 写侧遗留结案。
5. ★ **`decorations = {focus?, block?}`**，写条件 `focus != null || block != null`（**更新恒写、新建仅有值才写**）⇒ ★ 正好对应本地 `focus-style.tsx` / `shaded-style.tsx`（**承载差异第 5 例**：本地是编辑器样式扩展，官方是持久化数据字段）。
6. ★ **布尔编码在写侧得到印证**：`gr(rI(bool), n?"0":void 0)` 与读侧 `aI` 成对 ⇒ 与 `Yq("true"/"false")`、`tn(0/1/2)` 合计**三种按字段固定编码是有意设计，不是历史垃圾**。
7. 同窗附带：**`rawObjectData: JSON.stringify(…)`**（线上新字段，本地 0 命中）、**链接类型三值 `blockLink/link/relation` + `default: He` 抛错**、**`cst`/`dst` 反向 switch 也穷尽抛错**（写侧同样"严格"，与策略矩阵一致）、url 块字段集 `{title,description,url,iconUrl,originalUrl}` + `smartLinkData` 字符串化 + `dailyNoteDate.toString()`。

**写表前的两处验证**（挡住未核实断言）：`grep -rn "userDefinedOrdinal\|indentLevel" src` ⇒ **0** ✓；`grep -rn "=== undefined\|!== undefined\|void 0" src/lib/document-codec/*.ts`（剔测试）⇒ **0** ⇒ "无字段级省略逻辑"这条判定用的是**实跑的命令**而非印象。

**数字刷新**：`gap.md` 527→**533 行（最大 G541）**；覆盖率 1842/3639 = 50.6% 未变；`model.md` 两条遗留划掉、+§一之二十一；`check-tables` 通过。
**下一批**：`n` 的语义；`E5`/`MC`/`gQ`/`h0e`/`b0e` 写侧转换器族；`rI` 与写侧数值序列化族；`rawObjectData` 读侧；`focus`/`block` 形状；主色提取（写侧已排除）；`TLe/ALE` 前缀项 mapper。

---

## 第 52 批（2026-09-27 13:01–13:18，静态：★ 序列化器两个开关 + **方向性更正** + 任务时间双编码与 repeat 写侧）

**选题**：解上批的"最终遗留" `n` 的语义（向前读序列化器签名）⇒ 撞到 `YU(t, {omitDefault, omitNonRenderProps})`。★ **第 52 批含两次自我推翻**：
1. **`n` 不是"新建块"，是 `omitDefault`** ⇒ §一之二十一 1「新建写默认、更新省略」**方向反了**，且"新建 vs 更新"的归因是猜的 ⇒ 四处同步更正：`model.md` §一之二十一 1 就地改写、`gap.md` **G536 整行重写**、`features.md` nav51 行重写、**记忆 bullet ① 段重写**。
2. **撤回一条自己的猜想**：`{months, days, dynamicDays}` 是 **`w0e`（yearly 档转换器）** 而非 `wVe`（读侧）⇒「repeat 读写两套字段名」**无证据、作废**。⇒ 教训（写进未采到清单）：**近形 minified 名 `w0e`/`wVe`/`kVe`/`vVe` 必须按完整 token 与调用位置核对，不能凭相似性配对**。

**结案（`model.md` §一之二十二 0–3 / `gap.md` G542–G545）**：
1. ★★ **两个命名选项**：`omitDefault` 决定「等于默认的字段是否省略」（`gr(值, n?默认:void0)` ⇒ `n=true` 相等即省略、`n=false` 全量写入）；`omitNonRenderProps` 把 **`documentId/createdByUserId/modifiedByUserId/createdMs/updatedMs/resourceId/stamp` 七字段整批置 null** ⇒ ★ **官方有「只传渲染所需」的传输精简开关**（审计/权限字段不过线）；本地 `grep omitDefault|omitNonRenderProps` ⇒ 0。
2. ★ **任务时间两套写侧编码**：`SVe` 走 **`V5(date)`**（日历归一）、`vVe` 走 **`getTime()`**（毫秒）⇒ **`V5` 读写两侧都出现 ⇒ 是"日历归一"通用变换而非单向解析**；**本地是第三种**：`actions/task/task.ts:186/:197` 用 `toISOString()`（ISO 8601 字符串）。
3. ★ **repeat 写侧字段全集**：`{type, frequency, interval?, startDate?(*毫秒*), daily?, weekly?, monthly?, yearly?, reminder?}`，四频档各一个转换器、**全"有才写"**；`yearly = {months, days?, dynamicDays?}`；**`dynamicDays` 元素 `{selector, type}`**；**`reminder = {enabled, dateOffset?}`**（与 `tasks.md` §10.8 读写同构 ✓）。本地 `recurrence.ts:3-11` = `{freq, days?, byMonthDay?, until?}` ⇒ 四条差异：**①`freq`≠`frequency`；②★ 本地多出 `until`（官方全 0 命中 ⇒ "超出官方"的方向性差异，待用户拍板）**；③缺四档对象与 `interval/startDate/dynamicDays/selector`；④本地 `parseRecurrence` 严格校验（任一不合法 ⇒ 整条 `null`）vs 官方 `j3` 逐字段降级。

**执行纪律（本批实做）**：写 `.mjs` 后**先 `node --check` 再 `node`**（本批又踩一次中文串内 ASCII 引号 ⇒ 这次用 `node --check` 在零写入前拦住）；四个写点的锚点**先 grep 计数确认存在**再跑脚本，避免"顺序执行的脚本只改一半就抛"。

**数字刷新**：`gap.md` 533→**537 行（最大 G545）**；覆盖率 1842/3639 = 50.6% 未变；`model.md` +§一之二十二、1 处就地更正；`check-tables` 通过。
**下一批**：`wVe` 实现体（repeat 的另一套转换器）、`y0e/C0e/x0e`（daily/weekly/monthly 三档）、`V5` 实现体、`V5` 版 vs 毫秒版分别服务哪个接口、哪条链用 `omitDefault:true`；旧清单：`E5/MC/gQ/h0e/b0e/rI`、`rawObjectData` 读侧、主色提取、表格优先级。

---

## 第 53 批（2026-09-27 13:21–13:24，静态：★ 时间归一配对 `V5`/`VE` + repeat 四档 + `omitDefault` 调用点）

**结案（`model.md` §一之二十三 1–3 / `gap.md` G546–G549）** —— 一次结掉 §一之二十二 的三条遗留：
1. ★ **`V5`/`VE` 实现体到手且双向对称**：`V5` 清零到本地 0 点后 `Lm(e, -e.getTimezoneOffset())`、`VE` 反向 `Lm(e, +offset)` 再 `fLe` ⇒ ★ **日期按「UTC 表示的本地零点」存、跨时区读回仍是本地零点**（"日期是日历日而非时间戳"的实现）；同族 `mLe`（宽松 Date 解析 NaN→`null` 不抛）、`n1e`（按毫秒去重）、`gLe` 默认 `Kh()`。⇒ **本地 `getTimezoneOffset` 0 命中 ⇒ 无时区归一**，`setHours(0,0,0,0)` 仅 3 处且全在每日笔记（`daily-notes.ts:18` / `daily-notes/page.tsx:21/:63`）⇒ **任务时间没有这套归一**（跨时区显示风险）。
2. ★ **repeat 四档字段集全图**：daily `{skipWeekends?}` / weekly `{days}` / monthly `{days?, dynamicDays?, skipWeekends?}` / yearly `{months, days?, dynamicDays?}` ⇒ **`skipWeekends` 只出现在 daily 与 monthly ＝ 文案侧「周末除外」的字段名**；本地 `grep skipWeekends|weekend` ⇒ **0**（文案与模型两层都缺）。
3. ★ **`omitDefault:true` 的唯一观测调用点**：先 `w.styleProps.runAttributes = []` → `YU(w,{omitDefault:!0, omitNonRenderProps:!0})` → `m0e(I)` → **`i.set(w.id, …)`** ⇒ **不是网络请求、是按块 id 的 Map** ⇒ **疑似索引/快照构造**（标疑似）⇒ 解释了"为何省略默认值"：**索引场景要差异化的最小载荷**。
4. 两个新 helper：`mLe`（宽松解析）、`n1e`（毫秒去重）⇒ 归入官方"容错优先"工具层（与 `Is`/`ki`/`gr`/`bt`/`Gn` 同族）。

**纪律执行**：`node --check` → `node` 的两步门**本批起正式落地**（在技能第 6 条失败行里写明）；所有写点锚点仍走"先 grep 计数"。
**数字刷新**：`gap.md` 537→**541 行（最大 G549）**；覆盖率 1842/3639 = 50.6% 未变；`model.md` +§一之二十三、3 条遗留划掉；`check-tables` 通过。
**下一批**：`wVe`（repeat 第二套转换器）、`Lm`/`fLe`/`Kh`/`m0e`/`i`（偏移工具与索引归属）、`V5` 版 vs 毫秒版分别服务哪个接口、各字段分别用哪套；旧清单：`E5/MC/gQ/h0e/b0e/rI`、`rawObjectData` 读侧、主色提取、表格优先级、`u7`/`Wu`、`In`/`Ai`、`MediaEditor`、`ExcalidrawFocusMode`。

---

## 第 54 批（2026-09-27 13:25–13:29，静态：`wVe` 结案 + 布尔四对读写 + 渐变写侧 + 日历周起始）

**结案（`model.md` §一之二十四 1–4 / `gap.md` G550–G553）**：
1. ★ **`wVe` 与 `kVe` 逐字段同构，唯一差别是 `startDate`**：`wVe` 用 `V5()`（日历归一）、`kVe` 用 `getTime()`（毫秒），与 `SVe`/`vVe` **一一配对** ⇒ ★ **「两套时间编码」＝两个接口版本，不是两代数据、更不是读写两套字段名**（此前撤回的猜想到此有正面解释）。调用方（哪条请求用哪套）仍未取。
2. ★ **布尔两对读写函数补齐**：`rI(t)=t?"1":"0"` ↔ `aI`、`Qq(t)=t?"true":"false"` ↔ `Yq` ⇒ **§一之十七 2 的「三种编码」应改为：两对读写函数 + `tn` 数字三态 + `isTodoChecked` 的 0/1 ＝ 四种形态，全部读写成对 ⇒ 按字段有意设计**。本地写侧 `grep '? "1" : \|? "true" : '` ⇒ **0**。⇒ 附带一个选题提示：**读写编码函数在源码里总是相邻成对**（`yLe`/`s1e`、`aI`/`rI`、`Yq`/`Qq`）⇒ 找到读侧就能在邻近找到写侧。
3. ★ **渐变写侧 `MC` = `色;色;…;g`**（`colorStops.map(…).join(";") + ";g"`）⇒ 与读侧 `kc` 的 `split(";")` + `filter(o!=="g")` **完全对上 ⇒ 渐变读写闭环完成**；★ 且发现**两处序列化写法不一致**（`E5`/`MC` 单色只写一段 vs §一之二十一 的 `Ad` 恒拼两段）；另见上层样式对象二态 `{type:"gradient"|"solid"…, colorMode?}`（`sVe`，未展开）。
4. ★ **`fLe` 就近归日**：跨过当日中点 `(今日0点+次日0点)/2` ⇒ 归次日（`VE` 的 `Lm(+offset)` 之后用它 ⇒ 时区偏移后仍保持正确日期）；★ **官方日历周起始是 Monday**（`AU` 里 `o.getDay()===1 ? o : B1(Yce(o),1)`）+ 区间判定 `r7(t,start,end,{includeStart,includeEnd})` ⇒ **与动态实测「中文 locale 周一起始 / `下周五→2026-10-09`」静态互相印证**。本地 `includeStart|includeEnd` **0 命中**；`daily-note.ts:6` 用 JS 默认 Sunday=0 直接取星期名、`CalendarView.tsx:34` 取当月首日 `getDay()`（**周起始档位本批未核**）、`recurrence.ts:5` 注释 0=Sunday ⇒ **口径不同但不冲突，需逐处核**。

**数字刷新**：`gap.md` 541→**545 行（最大 G553）**；`key-coverage` 实测 **1843/3639 = 50.6%**（missing 1797→1796）；`model.md` +§一之二十四、2 条遗留划掉；`check-tables` 通过；`node --check → node` 两步门连续三批生效。
**下一批**：`SVe`/`vVe` 调用方（哪条请求用哪套时间编码）、`Lm`/`Yce`/`B1`/`A4`/`vi`/`Qo`/`r7` 日期工具族、`sVe`/`J7` 样式对象二态、`AU` 的消费方（与日历分区对账）；旧清单：`E5`/`gQ`/`h0e`/`b0e`、`rawObjectData` 读侧、主色提取、表格优先级、`u7`/`Wu`、`In`/`Ai`、`MediaEditor`、`ExcalidrawFocusMode`。

---

## 第 55 批（2026-09-27 13:30–13:33，静态：日期工具族 + `SVe`/`vVe` 调用点分工线索）

**结案（`model.md` §一之二十五 1–3 / `gap.md` G554–G556）**：
1. ★ **官方日期加减工具族**：`B1(t,±n)` 天、**`ec` 与 `B1` 完全同义（重复实现）**、`uO` 年、`cg` 月、**`lLe(t,e)=ec(t,e*7)` 周＝天×7 直乘**、`Qo()=Pr(new Date)` 今天、`T5()` 明天、`bw()` 昨天 ⇒ 纯函数包 `Date` 方法；**内部重复第 N 例**（与日志文案不统一、`E5`/`Ad` 不一致同族）。
2. ★ **本地不缺失、反而更显式**：`grep setDate|setMonth|setFullYear src/lib src/components/editor` ⇒ 0，**但 `src/lib/task/recurrence.ts:200/:212` 有 `addDays(wall: WallClock, days)` / `addMonths(wall: WallClock, months)`** ⇒ **带 `WallClock` 类型抽象且不重复** ⇒ **本行判为"风格/类型化差异"，不是缺失**（本地超出方向第 2 例，第 1 例 G545 的 `until`）。
3. ★ **两套时间编码的调用分工线索**（标疑似）：`vVe`（毫秒）调用点在**冲突合并回写**（`L = _0e({clientData, serverData, baseData}); i.set(y, vVe(L))`，`_0e` 即 §十一 3 的任务合并器）；`SVe`（`V5` 归一）在**从线格式读入**处（`t.objectDataRaw`/`t.taskData`）⇒ 疑似「**读入归一 / 合并写回毫秒**」⇒ 解释了"同字段两种编码"的原因（读入要跨时区一致、合并只做差异运算）；本地 `clientData|serverData|baseData` **0 命中**（与 §十一 / G440 一致）。
4. ★ **同名不同物新一例**：官方 `t.taskData` 是线格式字段，本地 `grep objectDataRaw|taskData` 的 2 处命中全是 `calendar/page.tsx:25/:26` 的**局部变量** ⇒ 与 G538「grep 0 命中可能是换名」**构成正反两条方法论**：**命中也可能与官方字段无关**。

**数字刷新**：`gap.md` 545→**548 行（最大 G556）**；覆盖率 1843/3639 = 50.6% 未变；`model.md` +§一之二十五、1 条遗留改为"拿到线索"；`check-tables` 通过。
**下一批**：`Pr`/`r7`/`Yce`/`A4`/`vi`（`Qo`/区间/最近周一）、`SVe` 所在函数签名、`Yn`/`iQ`（合并入参）、`y0`；旧清单：`gQ`/`h0e`/`b0e`、`sVe`/`J7`、`AU` 消费方、`rawObjectData` 读侧、主色提取、表格优先级、`u7`/`Wu`、`In`/`Ai`、`MediaEditor`、`ExcalidrawFocusMode`、`pEe` 字形。

---

## 第 56 批（2026-09-27 13:37–13:45，静态：★ 日期上下界 + `day://` 第三 scheme + 严格日期解析器 + 两条读写闭环）

**结案（`model.md` §一之二十六 1–4 / `gap.md` G557–G562）**：
1. ★ **日期上下界工具**：`Pr(t)` 四次 `setX(0)` ⇒ **本地零点的今天**（`Qo()` 就是它）；`_1o(t) = ec(Pr(+1天)) − 1ms` ⇒ **当日 23:59:59.999** ⇒ 官方日范围 ＝ `[Pr(日), _1o(日)]`。本地 `setHours(0,0,0,0)` 组合仅 3 处（全在每日笔记）、`23:59` 仅 1 处字面量、`getTimezoneOffset` 0 ⇒ **这对工具本地没有**。
2. ★★ **第三个 URL scheme `day://2026.09.27`**（`e1e` 生成，点分隔 + 两位零填充）⇒ 与 `craft://`/`craftdocs://` 合计**三个 scheme**，`day://` 是每日笔记深链；本地 `craft://|craftdocs://|day://` **全 0 ⇒ 深链体系整块缺失**（此前只在 `contract.json` 桶里见过名字，本批给出生成点与格式）。
3. ★ **严格日期解析器 `TU(t, force)`**：`^(?<year>\d{4})[-.](?<month>\d{1,2})[-.](?<day>\d{1,2})$` ⇒ 允许 `-`/`.` 分隔、**强制四位年**、命名捕获组 ⇒ **§一之八「严格格式同步先试（闰年 2 月校验）」的实现体到手**；本地 `src/lib` 有 **8 处 `\d{4}` 正则待逐条对照**（列未采到）。
4. ★ **`h0e` 是 `T1e` 的逆**（明暗对 → `E5` 字符串；`pattern`/`solidColor` 一视同仁；非 washi 原样）⇒ **`lineThemeStyle` 读写闭环完成**；同处 `D5` 是 pageStyle 写侧，与 `zPe()` 读侧工厂配对。
5. ★★ **`primaryColor` 完整闭环且是独立的 6 位通道**：读 `IVe = ti(t.substr(1,6),16)`（去 `#` 取 **6 位** → 整型）、写 `iMe = "#"+toString(16)`（**不补零**）⇒ **G504 短 hex 缺陷读写双确认**；★ **修正 G520/G515 适用范围：`_R` 强制 8 位只对 color/高亮明暗对，`primaryColor` 是 6 位 RGB 无 alpha**（cover 默认 `#f2f2f2` 正 6 位）⇒ **两通道位数不同是设计如此**。
6. ★ **复制链 `TVe`**：`YU(l)` **不传选项**（**第三处印证 G543：默认不省略**）→ `m0e(r)` → `subBlocks=[]`、`tempId=原id`、`id=void 0`，`{depth:"all", includeRoot:true}` **前序遍历** ⇒ **先剥子块留 tempId、后置重分配 id**；本地 `traverseSubBlocks|PreOrder` ⇒ **0**（实现方式未核，只记官方策略）。

**数字刷新**：`gap.md` 548→**554 行（最大 G562）**；`key-coverage` 实测 **1844/3639 = 50.7%**（missing 1796→1795）；`model.md` 4 处遗留改写、+§一之二十六；`check-tables` 通过。
**下一批**：`m0e`（共同的"定型"步骤，索引链与复制链都用它）、`J7`/`D5` 完整字段表、`TU` 的 `force` 分支、**三 scheme 的读入侧**、本地 8 处日期正则逐条对照、`On.traverseSubBlocksPreOrder` 调用方族；旧清单：`r7`/`Yce`/`A4`/`vi`、`sVe`/`J7`、`AU` 消费方、`rawObjectData` 读侧、表格优先级、`u7`/`Wu`、`In`/`Ai`、`MediaEditor`、`ExcalidrawFocusMode`。

---

## 第 57 批（2026-09-27 14:08–14:15，静态：★ `m0e` 定型函数 + 两向字段名七组 + `J7` 递归剥空 + 四个 scheme）

**结案（`model.md` §一之二十七 1–3 / `gap.md` G563–G566）**：
1. ★★ **`m0e(t)` ＝内存块→线格式的定型函数**（与 `YU` 分工：`YU` 管样式与时间字段的最小子集，`m0e` 管块本体）：**四个 `JSON.stringify` 字段**（`rawProperties`→`properties`、`pageStyle`、`pageStyleProps`、**`style`→`styleAttributes`**）+ `content` + `subBlocks:[]`（**恒空 ⇒ §一之二十六 的 TVe 剥子块其实是 `m0e` 完成的**）+ 作者/软删标记；★ **两向字段名不一致五组→七组**（新增 **`parentId→parentBlock`**、**`style→styleAttributes`**）；★ 线上**至少 8 个字段是 JSON 字符串**（样式四容器 + 载荷四容器）。本地 `parentBlock|styleAttributes` **0 命中**；`JSON.stringify` 只在**导出分支**（`document-codec/index.ts:216`）⇒ 字段级序列化层缺失。
2. ★ **`J7(t)` ＝递归剥空**（对象键值 null ⇒ 删键、数组 null 元素 ⇒ 删元素、递归叶子）⇒ **§一之十六 2「缺省即键缺失」的工具层实现**；`gQ=J7` 用于 `lineThemeStyle`/`themeInstanceProps` 写前清洗 ⇒ **"写前清洗"工具层五件齐**（`Is`/`gr`/`kR`/`bt`/`J7`）。本地 `recursive|deep.*null` 在 document-codec ⇒ **0**。
3. ★★ **scheme 权威清单是四个**：**`tex://`**（公式）、**`day://`**（每日笔记）、**`craftdocs://users`**（用户级路径，常量 `_w=["tex://","day://","craftdocs://users"]` → `Cg`/`zu`/`_5`）、**`craft://`**（i18n 文案里 `[balance](craft://credit)` ⇒ **本地化文案可触发内部深链**）⇒ **比 `contract.json` 此前记的两个多两个（认知更新）**；本地四个 **全 0**。
4. ★ **`day://` 两端闭环**：生成 `e1e` ↔ 判定 `URL.protocol==="day:"` + 构造 `qZe` + **`yw(t)=TU(t.replace("day://",""))`（去前缀喂严格解析器）** ⇒ 与 §一之二十六 的 `TU` 对上。

**数字刷新**：`gap.md` 554→**558 行（最大 G566）**；覆盖率 1844/3639 = 50.7% 未变；`model.md` 2 条遗留改写、+§一之二十七；`check-tables` 通过。
**下一批**：`tex://`/`craftdocs://users` 的构造与读入点、`m0e` 的 `created:` 之后字段表、`J7` 调用方族与同窗小工具（`Oy`/`wq`/`g_e`）、`cLe`/`pk` 日期距离；旧清单：`J7` 之外的 `D5`/`sVe`/`oVe`、`r7`/`Yce`/`A4`/`vi`、`AU` 消费方、`rawObjectData` 读侧、主色提取、表格优先级、`u7`/`Wu`、`In`/`Ai`、`MediaEditor`、`ExcalidrawFocusMode`。

---

## 第 58 批（2026-09-27 14:16–14:24，静态：★★★ `lGe` 逐级退出格式降级链 + `m0e` 11 个 JSON 字段 + scheme 判定）

**★ 本批最重要的交互发现**（此前只有现象、现在拿到优先级与 action 形态）：
1. ★★★ **`lGe` ＝ 逐级退出格式的降级链**（疑为 Shift+Tab / Esc 类"退一档"）：
   ① **`indentLevel > 0` ⇒ `og(ids, -1)` 减缩进**；② **否则 `listStyle !== Nt.None` ⇒ `ir(ids, Nt.None)` 去列表**；③ **否则 `decorations.block/ focus/ 或 color != null` ⇒ `P2(ids, {block:0, focus:0})` + `fU(ids, null)` 清装饰与颜色**；返回 **三元组 `{docActions, uiActions, redoUiState}`**（与 §十三 的 26 项 action 表呼应）。⇒ ★ **`decorations` 的值是数字档位**（`{block:0,focus:0}` 而非布尔）。
   ★ **本地三处全无对应（实跑）**：`grep "'Tab'" src/components/editor` 只命中**菜单**（`emoji-suggestion.tsx:112`、`slash-menu/SlashCommandExtension.ts:91`）⇒ 正文无 Tab 缩进键位（与 G218 同源）；**Shift+Tab 只是工具栏按钮**（`tabs/FormatTab.tsx:39/40` `liftListItem`/`sinkListItem('listItem')`）⇒ 只作用列表、无键盘、无优先级链；`grep "'Escape'" src/components/editor` 5 处**全是菜单/弹层关闭** ⇒ 无"逐级清格式"。
2. ★★ **`m0e` 完整字段表到手 ⇒ 11 个字段线上是 `JSON.stringify`**（样式四 + 载荷三 + **`resourceId`/`stamp`/`blob`**）⇒ **§一之二十七「至少 8 个」按完整表修正为 11**；★ **`blob` 是 JSON 字符串不是二进制**。
3. ★ **`rVe` ＝ `fileBlockToStoredBlock` 反向定型**：id 兜底 `t.id ?? t.tempId`（**印证 `tempId` 是复制新旧 id 的桥**）、**缺 id 直接 throw** ⇒ 官方第三类严格（读值宽容 / 渲染穷尽抛错 / **结构必填抛错**）；`parentId` 兜底 `o ?? parentBlock ?? null` 三档。本地 `fileBlockToStoredBlock` 与 `parentBlock` **均 0 命中**（已实跑）。
4. ★ **scheme 判定消费方 `sGe`**：在**富文本 run 的 `linkURL` 组装**处用 `_w.some(n => linkURL.startsWith(n))` ⇒ 三前缀＝内部深链、不当外链 ⇒ **粘贴即分类**。
5. ★ **run 工具**：`ade`（替换文本时**保首段 run 样式并把 `length` 改为新长度**）、`eh`（range 包含判定，**右端点 ＝ `start+length`** ⇒ run 语义确认）、选区两形态 `{textSelectionGeom, point}` / `{textSelectionIndexBackwards, index}`。

**数字刷新**：`gap.md` 558→**563 行（最大 G571）**；覆盖率 1844/3639 = 50.7% 未变；`model.md` 2 条遗留改写、+§一之二十八；`check-tables` 通过；`G568` 本地列补实跑证据。
**下一批**：**`lGe` 的 else 分支与 `o` 的真名（哪条键触发）**、`og`/`ir`/`P2`/`fU` 四个 action 的签名与是否在 26 项表、`rVe` 的 `rawProperties:` 之后字段、`tex://` 渲染与 `craftdocs://users` 路由、`yg`/`f4`/`rde` run 组装、动作应用器（三元组消费方）。

## 第 59 批（2026-09-27 14:26–14:35，静态：★ 15 个 action 构造器 + 复制链三方闭环 + ★ 第四次自我更正 `lGe` 触发键归因）

**背景**：连接器仍是第 19 次停摆状态（`openTabs()` 30 s 超时），本批继续静态。选题来自 §一之二十八 的遗留清单两条：「`og`/`ir`/`P2`/`fU` 四个 action 的签名」与「`lGe` 的 else 分支走什么」。**两条都结案，且第二条推翻了自己上一批的归因。**

**本批关键发现**：
1. ★★ **15 个 action 构造器**（字段即协议，与 §十三「26 项分派表」对上）：`og{indentBlocks, blockIds, **delta**}`（**± 增量**，与单块绝对值 `IC{setIndentation, indentLevel}` 并存）、`ir{setListStyle, **userDefinedOrdinalOfFirst: n ?? null**}`（★ 手动列表编号在 action 层，对上 `userDefinedListNumber` 写入端）、`P2` 真名 **`setDecorStyle`**（不是 setDecorations）、`f5{setTodoState, **fallbackIfAlreadySet: n||e**}`（§一之十七 2 的写入端确认）、`sa{updateTextBlock, textContent, runAttributes}`（★ 文本与 run **一起**更新）、`bRe{updateCodeBlock, language}`、`DR{updateSmartLinkBlock, …}`、`sg{duplicateSubtree, insertlocation, idMapping}`、`mw`/`yRe`/`Dce`/`UE`（`UE` 的 type 未读全）。
2. ★★★ **复制链三方闭环**：`TVe`（前序遍历）→ `YU(l)` 默认档全量 → `m0e`（剥 `subBlocks=[]`、`id→tempId`）→ **`duplicateSubtree{idMapping}`** → `rVe`（`n = t.id ?? t.tempId`，缺则 throw）⇒ **id 重分配在 action 层完成**，`tempId` 与 `idMapping` 两处独立印证同一设计，§一之二十六 4 与 §一之二十八 2 两条推断合龙。
3. ★★ **【第四次自我更正】`lGe` 不是 Shift+Tab**：`o` 为假的分支读到的是 **Enter 分割链** —— `rGe` 从索引切开并保 `afterRuns`、`aGe` 三情形、第 5 参 **`"keepAllIncomingFormat"`**、第三种选区 `{type:"textSelectionIndex", index:0}`、★ **非文本节点按 Enter 直接 throw `"Invalid state: Enter is pressed in non-text node"`＝第四类严格（非法状态抛错）**、返回 `{docActions, uiActions:[ol({blockId, initSelection})], redoUiState:G4(i,p)}` ⇒ **§一之二十八 / G570 的「疑 Esc/Shift+Tab」归因撤回**（三段降级链事实保留，触发键待 `o` 真名）。已同步三处：`model.md` §一之二十八 末、`gap.md` **G574**、项目记忆 ① 段。
4. ★ 本地对照（实跑）：`keepAllIncomingFormat|beforeRuns|afterRuns` 与 `non-text|Enter is pressed` 在 `src` 均 **0 命中**；`'Enter'` 在 `Editor.tsx`/`extensions/*` 只 **3 处** ⇒ **Enter 分割走 TipTap 默认行为，本地无「三情形 + 格式保留模式 + run 切分」显式实现**；`src/lib/task/recurrence.ts:1-40` 只有解析、无 action 协议层 ⇒ **本地动作是「直接改 Prisma」而非「发 action 对象」⇒ 撤销粒度与协作回放缺少可重放单元**。

**数字刷新**：`gap.md` 563→**568 行（最大 G576）**；`model.md` +§一之二十九、§一之二十八 2 处就地更正；`check-tables` 通过；覆盖率 1844/3639 = 50.7% 未变（本批动的是 action 层与编辑器内部，不在 i18n key 分母内）。
**下一批**：**`o` 与 `n`/`s` 的真名**（哪个是"在块首"、哪个是选区、哪个是场景枚举）⇒ **降级链的触发键仍未定**；`aGe` 中间情形完整体与 `newBlockLocation` 全部取值；`UE` action 全名；`ol`/`G4` uiAction 族；`zy` 新建空块工厂；`J7`/`gQ` 调用方；`r7`/`Yce`/`A4`/`vi`；`sVe`/`D5`；`AU` 消费方；`rawObjectData` 读侧；主色提取体；`hasColumnsHeader` vs `isHeaderRow` 优先级；列宽百分比求和。

## 第 60 批（2026-09-28 00:25，静态：★★★ `lGe` 触发键结案＝Enter 打空块 + Backspace 六段链 + Tab 缩进含子树 + 键名/包装器解码）

**背景**：连接器仍是第 19 次停摆状态（`openTabs()` 30 s 超时）。选题取第 59 批日志的头号遗留「`o` 与 `n`/`s` 的真名 ⇒ 降级链的触发键仍未定」。**方法**：不再从 `lGe` 定义往下读，改**从调用方倒查**（`grep -o` 词边界定位 `lGe` 只有 2 处命中 ⇒ 定义 @625409 + 调用 @3646684），一击命中。

**本批关键发现**：
1. ★★★ **`o` ＝ `JO(s)` ＝「当前块完全为空」** ⇒ **Enter 的两条分支正式定名**：空块 ⇒ 三段逐级退格式（缩进→列表→装饰）、非空 ⇒ 分割成两块。⇒ **G570/G574 的触发键归因结案为 Enter**，第 59 批撤回 `Esc`/`Shift+Tab` 是对的，但真答案此前仍是未知 —— **两次猜测（58 批的 Shift+Tab/Esc）与"待查"（59 批）在同一天被同一条倒查终结**。
2. ★ **`lGe` 的选区参数 `n` 只判 `== null`、不参与分支** ⇒ **Enter 链不看光标位置**；对比 `Dsn` 明查 `f.start!==0 || f.end!==0` ⇒ 两条链守卫强度不同是有意设计。
3. ★★ **`Dsn` = Backspace 六段链**（守卫 → 列表 → 缩进 → 装饰颜色 → 删自己/删前块/合并/选中前块），后三段给出**四类落点**；合并走 **`Ece` = `{type:"mergeTextBlocks", blockId1, blockId2}`**，redo 选区 `{type:"textSelectionIndex", index: 上块文本长度 ?? -1}` ⇒ **光标落到上块末尾**；辅助函数全部定名（`Usn` 前块、`Qr` 空文本块、`z9e` 空块无类型判定、`rF` 文本块、`Wc`/`Jm` 原子内联守卫、`G5` 反向索引选区）。
4. ★★ **两条链顺序互相矛盾**：`lGe` 是**缩进→列表→装饰**，`Dsn` 是**列表→缩进→装饰** ⇒ **官方自身的不一致点**（记为 G579「有意偏差候选」，本地实现前必须选型并写明理由）。
5. ★ **Tab 缩进走 `sm`** ⇒ 收集本块 + `Ft.getIndentChildrenOfBlock` 的**全部缩进子块**再整批 `og(全部, ±1)`，且 `indentLevel+delta>=0` 才纳入 ⇒ **缩进有两个不同作用域入口**（Tab 批量 vs 降级链单块）。
6. ★ **键名常量表 @19502 与包装器族 @16804–18263 一次解码**：`mo`无修饰 / `qi`Shift / `y2`Alt / `Co`Meta / `eT`Shift+Alt（带 `winMatcher`，再印证平台双写）/ `Vn` 不限修饰键；注册表实解 `mo(oo)`=Enter→`Esn`、`qi(oo)`=Shift+Enter→`N9e`（**函数体只有 `return{preventDefault:!1}` ⇒ 官方对软换行是"显式不拦截"**）、`mo(nc)`=Backspace→`Dsn`、`mo(f1)`/`qi(f1)`=Tab/Shift+Tab→`Qte(±1)`、`mo(B4)`=Delete→`jsn`、方向键族 `Rsn`/`PP`/`Xte({skipDirection,shouldSkipFromEdgeOfBlock})`。
7. ★ **顺带结案两条遗留**：**`pEe` 字形表**（此前记"要从语言包取"，实际就在主包 @19502）；**原子内联权威四类 `math`/`day`/`mention`/`tag`**（两处独立枚举互印）。
8. ★ 本地对照实跑：正文 Enter/Backspace 键位 **0 处**（Enter 的 6 处命中全在菜单与对话框）、`mergeTextBlock|mergeBlocks|joinBackward` **0**、`'Tab'` 只有两处菜单接受键、缩进只有 `FormatTab.tsx:39/40` 的 lift/sink 单项 ⇒ **两条降级链 + Backspace 六段链 + Tab 子树语义整块缺失**；本地 extensions 节点名全集 32 个 ⇒ 四类原子缺 `day` 与 `tag`。

**数字刷新**：`gap.md` 568→**574 行（最大 G582）**；`model.md` +§一之三十、§一之二十八 与 §一之二十九 各 1 处归因就地结案；`check-tables` 通过；覆盖率 1844/3639 = 50.7% 未变（本批全在编辑器行为层，不在 i18n key 分母内）。
**下一批**：`Ece`（mergeTextBlocks）的**应用器**（文本与 run 怎么并、样式谁赢）；`jsn`（Delete）与 `Rsn`/`PP`/`Xte`（方向键族）函数体；`aGe` 中间情形与 `newBlockLocation` 全部取值；`zy` 新建空块工厂；`UE` action 全名；`ol`/`G4`/`Es`/`St`/`Et.blocks` uiAction 族；`J7`/`gQ` 调用方；`rawObjectData` 读侧；列宽百分比求和；`u7`/`Wu`；`MediaEditor`/`ImageEditorPopup`。

## 第 61 批（2026-09-28 00:30，静态：★★★★ 88 项 action 分派表 + 只读白名单 + mergeTextBlocks 合并全规则 + patch 组合规则）

**背景**：连接器仍停摆（第 19 次）。为闭合 G578 的 `mergeTextBlocks` 往下追，命中 `KYe` 时**顺带撞开 `PT` 整张分派表** —— 本批是整轮**单份最大契约产出**：88 个官方操作名。

**本批关键发现**：
1. ★★★★ **`PT(t,e,n)` 有 88 个 `case`**（正则精确计数），`default: He(e)` ⇒ 协议外类型穷尽抛错。此前 §十三 记的"26 项分派表"是**低估 3.4 倍**。域分布：文档 4 / 块结构 10 / 块内容 8 / 块样式 8 / 页面样式 5 / 任务 5 / 集合 5 / **表格 18** / **评论 8** / 链接 3 / 封面媒体 4 / 分享 3 / 历史协同 4 / 其它 3。★ 评论域同时有 `setCommentResolved` 与**独立的 `deleteCommentResolved`** ⇒ "已解决"是可单独删除的状态而非布尔翻转。
2. ★★★ **`pYe` + `fYe` ＝ 只读模式下的 action 白名单**（8 项：`loadDocument`/`addStoredBlocks`/`syncUpdateComments`/`addPendingComment`/`setCommentResolved`/`setCommentState`/`syncUpdateContributors`/**`updateRecordObjectProperty`**）⇒ **viewer 权限的客户端实现体 ＝ 能评论、能看协同者变化、能改集合属性格，不能改块本体**；越权走 `console.warn("Tried to update document store in readonly mode")` + 埋点 warn **而非抛错** ⇒ 客户端守卫是防误操作，强制在服务端。★ `updateRecordObjectProperty` 是白名单里唯一的写操作 ⇒ **权限矩阵里的非直觉格子**。
3. ★★ **`KYe` ＝ `mergeTextBlocks` 应用器全规则**：写回 `blockId1`、**样式胜负四条判定**、run 两步拼接 `f4(yg(o), yg(s))`、**三类静默 no-op**（缺块 / 非文本 / `!ex(父)` ⇒ `Cn(t)`）+ `logger.error("InconsistentDocument", "executeMergeTextWithPrevious called with missing block…")`。⇒ ★ **日志字符串把内部真函数名露出来了**（同法此前从 `tab.dev.logs` 拿到 Amplitude 事件名）⇒ **恢复 minified 名的第三词典**。
4. ★★ **`x0` ＝ patch 组合规则**：`patches: [...t, ...e]` 顺序拼接、**`inversePatches: [...e, ...t]` 反序前置** ⇒ LIFO 撤销的唯一实现处；配套 `undo`→`IXe`、`redo`→`TXe`、★ **`mergePatchesFromOtherTabs`→fJe** ⇒ 官方有"跨标签页补丁合并"动作类型（本地无对应概念）。
5. ★ **严格性第六层**：**类型穷尽抛错（`default: He(e)`）vs 数据静默降级（`Cn(t)`）** ⇒ 与 §一之十八的四类、§一之三十的"状态 throw / 渲染 warn"合成谱系：**穷尽检查用于类型，宽容降级用于数据**。
6. ★ 本地对照实跑：权限在 server action 边界（`comment.ts:11` 的 `need:'viewer'|'commenter'|'editor'`、`backlinks.ts:49`、`export.ts:27`、`favorite.ts:9/:32`、`members.ts:6` `MemberRole`）⇒ **档位名一致但层次不同**（store 层无白名单；编辑器 viewer 是否禁用输入**未核**，没写成结论）；`inversePatches|patches\b` 在 `src/lib src/stores` ⇒ **0**（唯一命中 `block-anchor.ts:144` 的 `history.replaceState`）⇒ 无补丁级撤销。

**数字刷新**：`gap.md` 574→**579 行（最大 G587）**；`model.md` +§一之三十一；`check-tables` 通过；覆盖率 1844→**1845**/3639 = 50.7%（instrument 口径，本批文本里恰好点名了一个此前未覆盖的串，**未逐项追因**）。
**下一批**：88 项里优先读**评论 8 项与表格 18 项的字段形态**（本批只有 `type` 与应用器名）；`Po` 应用器公共入口（返回形态与那两条空数组）；`ex`/`Cn`/`yg`/`f4`；`undo`/`redo`/`mergePatchesFromOtherTabs` 函数体；`updateRecordObjectProperty` 在只读集里的语义；`jsn`（Delete）与方向键族；`zy` 新建空块工厂；`UE` action 全名。

## 第 62 批（2026-09-28 00:37，静态：★★★★ 261 个 action 构造器全表 —— 一次正则扫出整个 action 协议层）

**背景**：连接器仍停摆（第 19 次）。上一批拿到 `PT` 的 88 项分派表后，本批改用**全文件正则** `function NAME(args){return{type:"T",…}}` 一次性抽取构造器 ⇒ 一条命令得到 **261 个 type / 267 个构造点**，是整轮**单位成本最高的一次检索**。

**本批关键发现**：
1. ★★★★ **action 协议层规模 261 项**（`PT` 的 88 项只是文档 store 子集，余 173 项属 UI/协同/通知/空间团队/任务视图/公式输入）⇒ 官方前端"一切变化皆 action"；★ **口径声明**：fields 列 `{}` 者是 `{type:"X", ...t}` 展开式（如 `ss(t)` 实为 `{...t}`），**不等于无字段**。
2. ★★★ **权限的权威契约**：`setDocumentAccess{documentAccess, canView, canComment, canEdit, subscription, sharedBy}` + **独立的 `setForcedViewOnlyModeAction{isReadOnly}`** + `mention{…, role, documentRole}` ⇒ **三键独立 + 两上下文 + 一只读位、且空间角色与文档角色两层**；与 §一之三十一 的 `pYe` 白名单互为表里 ⇒ **viewer ＝ role × can\* × forcedReadOnly 的乘积**。本地只有 `DocumentEditor.tsx:47` 的 `canEdit = owner||editor` ⇒ **可判定后果：`'commenter'` 与 `'viewer'` 在编辑器侧行为完全相同**（`members.ts:6` 定义了 commenter 却无处区分）。
3. ★★ **选区九形态判别联合**（文本 4 / 块 1 / 集合 3 / 表格 1），`tableSelection` 同时带 `anchor`+`focus`+`cells`；`setSelection{selection, preventAutoScroll, autoScrollSettings}` ⇒ 补上 §一之三十 里 `St(...)` 的第二三参用途。
4. ★★ **落点九族**：表格落点构造期带 `maxRow`/`maxCol` ⇒ **钳制发生在 action 层**；★ **`afterAnchor` 与 `afterAnchorVisible`/`beforeAnchorVisible` 并存 ⇒ 折叠块有"真实兄弟序 vs 可见序"两套寻址** ⇒ §一之十三 的"落点六寻址"需按九族重写。
5. ★★★ **`stopTextEdit{allowToBeRemovedWhenEmpty, backupSelection}`** ⇒ "离开编辑态时是否删空块 + 选区备份"的实现体（配套 `renderTextBackupSelection{value, backupSelectionType}`）；★ **拖拽是 `start/update/stopSelectionDragging` 三段 action**，`startBlockHasOwnDrag` ⇒ 块可自带拖拽行为。
6. ★★ **`group(t,e){actions}` ＝ 复合动作 action** ⇒ **V46「3 个动作要按 4 次 Ctrl+Z」的机制层终于有载体**（撤销栈如何计层仍需读应用器）。
7. ★★ 评论：`setCommentState{commentId,sendState}` ⇒ **评论有发送态**；`setCommentResolved{commentId,isResolved,authorId,timestamp}` ⇒ **解决是带作者与时间的事件**。表格：★ **权威命名 `hasRowHeader`/`hasColumnHeader`**（遗留项"hasColumnsHeader vs isHeaderRow"命名侧结案）；`moveRow/ColumnAction{tableId, base, rowIds, offset}` vs **`setRowsOrder{tableId,newRowIds}`（行有整批重排、列没有 ⇒ 不对称）**；`clearCellContentsByCoordinate{…, mode}`。
8. ★★ **协同三维**：光标 + `updateRTCEditingBlock{rtcId,editingBlocks,updatedAt}` + `updateRTCOpenPages{rtcId,openPages,updatedAt}`（都带 `updatedAt` ⇒ presence 有陈旧判定；`rtcId` 是会话身份）；本地实跑只有 `presence.ts` + `CursorLayer.tsx:11/:21/:37` 一维。
9. ★ 其它：`insertNewBlocks{location, blocks, strictValidation=false}`（**数据层宽容开关在 action 层**）；上传三件套 `add/update/removeMediaUploadInfo{mediaType, blockId, …}`；`navigateToPageBlock{pageId, scrollTop}`（**导航带滚动位置**）；任务视图 `setFilter`/`setSort`/`setQuickFilter` 三态分离 + 时间类 action 是**复数 `blockIds`（批量）** 而 `updateTask{blockId, changes}` 是**单数（局部）**；公式编辑器自成一套 7 项；`duplicateDocuments{spaceId, sources, folderId, targetSpaceId}` ⇒ **跨空间复制**。

**数字刷新**：`gap.md` 579→**585 行（最大 G593）**；`model.md` +§一之三十二；`check-tables` 通过；覆盖率仍 1845/3639 = 50.7%（本批全在代码层，不新增 i18n key 点名）。
**下一批**：13 个 `...t` 展开式构造器的字段全集；**173 项非文档-store action 的分派表**（各自 store 的 `case` 表）；`group` 的应用器与撤销计层；`moveRow/ColumnAction` 的 `base` 语义；表格 action 与本地字段名逐条对齐（G592 未跑项）；`undo`/`redo`/`mergePatchesFromOtherTabs` 函数体；`Po` 应用器公共入口；评论 8 项与表格 18 项的应用器实现体。

## 第 63 批（2026-09-28 00:40，静态：★★★ 全应用 60 张 action 分派表 —— 同一招第三次生效）

**背景**：连接器仍停摆（第 19 次）。承接第 62 批遗留①「173 项非文档-store action 的分派表」，改用**全文件正则 `switch(<id>.type){case"` ＋ 大括号配平计数**，一条命令拿到全应用的 action 路由图。

**本批关键发现**：
1. ★★★★ **60 张分派表**（≥4 case）。最大三张：**文档 store 88（@731642，`default:He(e)`）／UI-选区 store 65（@6377790）／应用外壳 store 63（@6686072）** ⇒ 88+65+63＝216（★ 65/63 是第 64 批重跑校正值，初记 68/66 各偏高 3 项） ⇒ **"261 构造器只有 88 项进 PT"的缺口结案：分属不同 store，不是缺失**（第 62 批遗留①直接闭合）。
2. ★★ **拖拽态是四段不是三段**：UI store 表里出现 **`setSelectionDraggingActive`**（构造器是 `...t` 展开式，故上一批正则没扫到）⇒ **修正 §一之三十二 5**，并印证"fields 为 `{}` ≠ 无字段"的口径声明是对的。
3. ★★ **集合六个菜单入口都是独立 uiAction**：@5170857（11 case）`openHeaderMenu`/`openEditProperty`/`openEditPropertyOption`/`openConfigureCollection`/`openAddProperty`/`openRowContextMenu` ⇒ 与第 41 批的具名浮层栈 `collection-v2-*` 是两层（action 决定"打开哪个"，浮层栈决定"Esc/关闭路由"）。
4. ★★ **块类型词表是六份独立裁剪表**（@553470 9／@1266942 12／@5817330 12／@3272751 9／@5267263 9／@5247235 13），取值集合互不相同（`imageRow`/`fixedGridRow`/`subpage`/`objectList` 只在个别表出现）⇒ **官方按能力面分面裁剪块集合** ⇒ 本地做一份统一枚举会与六处都不完全一致（G597 记为"实现前必须先选面"）。
5. ★ 三处枚举副产：**搜索结果分组**（10 case，含 `folder`/`space` 两个非结果项与 **`loadingMoreMentions` 加载哨兵**）；**活动日志六动词**（`create/delete/move/update/reorder/pin`，两处消费）＋ **20 项蛇形命令 id**（`document_star`…`document_move`）⇒ 动词×对象两级抽象；**视图 tab 枚举四份并存**（侧栏/任务/团队各自独立）。
6. ★ **方法论**：全量正则枚举连中三次（88 → 261 → 60）⇒ **挖协议层先枚举再深读**；取整表用大括号配平（上限 12000 字符防爆）而非贪婪正则。

**数字刷新**：`gap.md` 585→**590 行（最大 G598）**；`model.md` +§一之三十三；`check-tables` 通过；覆盖率仍 1845/3639 = 50.7%。
**下一批**：68 项与 66 项两张表的**完整名单**（本批只取计数与首 6 项）；`default:false` 的 4 张表在缺 case 时做什么；@807569 的 20 项命令 id 全集与消费方；集合 11 项 uiAction 的字段形态；`group{actions}` 应用器与撤销计层；`...t` 展开式构造器字段全集。

## 第 64 批（2026-09-28 00:44，静态：★★★ UI store 65 ＋ 外壳 store 63 分派表全文，并更正第 63 批计数）

**背景**：连接器仍停摆（第 19 次）。取第 63 批遗留①（两张大表的完整名单），用"大括号配平 + `case>:return f(` 严格匹配"重跑。

**本批关键发现**：
1. ★★ **计数更正**：UI/选区 store 实为 **65 项**、外壳 store **63 项**（第 63 批记 68/66 偏高 3 项，因初版正则把非 `case"X":return f(` 形态也算进）⇒ 三条 store 路由合计 **88+65+63＝216**。已就地更正 §一之三十三 表与合计、G594、features.md 导航行、第 63 批日志（G599 显式记录这次自我更正）。
2. ★★ **新判据**：三张 store 路由的 `default` 都是 **`He(…)`**（穷尽抛错家族）⇒ **`default:He` 存在＝"会改状态的分派器"**；无 default 的表（22 项任务数据、11 项集合菜单、8 项活动日志）是**纯映射函数**。⇒ 判"这是不是协议表"不必读实现。
3. ★★ **16 个 action 只在分派表出现、不在 261 构造器表**（`restoreTextEdit`、`openEasterEggAction`、`updateSpaceInvitesData`、`updateTeamMemberRoleAction`、`setCurrentlyFocusedSearchIndex`、`toggleWebappDebugPanelAction`… ）⇒ **协议全集必须取并集**（"两向差集"已写进技能，本批是它的实证）。
4. ★★★ **`stopTextEdit` 与 `restoreTextEdit` 成对** ⇒ "退出编辑"是**可恢复**的（`backupSelection` 的消费方在此）；★★★ **权限三项住在 UI store**（`setDocumentAccess`/`setDocumentAccessSignature`/`setForcedViewOnlyModeAction`）⇒ **权限是界面可见态而非数据态**，这解释了只读白名单为何在 store 层。
5. ★★★ **文档内搜索四态含替换**：`setIsDocumentSearchOpen` + `setDocumentSearchString` + **`setCurrentlyFocusedSearchIndex`** + **`updateHighlightedTextReplaceItemsAction`** ⇒ 官方支持替换，"当前命中"与"命中集"是两份独立 state。
6. ★★★ **全新功能面**：侧栏项目可勾选**且可排序**（`setCustomizeLeftSidebarOption` + `…OptionsOrder`）；团队/空间 13 项（成员角色可改可移除、`setTeamStatusAction`）；匿名态 2 项（未登录可用）；通知 6 项（**面板记住滚动位置**、`setNotificationsPosition`）；`updateCustomDomainsAction`（自定义域名）；**`setHasUpdatePendingAction`（SPA 待刷新提示）**；**`openEasterEggAction`（官方有彩蛋）**；移动端"编辑横幅"三态 + 单元格选择模式。
7. ★ UI store 分域表已成文（选区编辑 8／侧栏 7／搜索 4／权限 3／协同 6／上传 3／公式 7／弹层菜单 10／评论任务 5／杂项 8／移动端 4）。

**数字刷新**：`gap.md` 590→**594 行（最大 G602）**；`model.md` +§一之三十四 且 §一之三十三 三处计数就地更正；`check-tables` 通过；覆盖率仍 1845/3639 = 50.7%。
**下一批**：22 项任务数据表与 20 项命令 id 表全文（并判它们是路由还是映射）；16 个新 action 的构造器与字段；`restoreTextEdit`↔`stopTextEdit{backupSelection}` 配对细节；`group{actions}` 应用器与撤销计层；`...t` 展开式构造器字段全集；`undo`/`redo`/`mergePatchesFromOtherTabs` 函数体。

## 第 65 批（2026-09-28 00:47，静态：★★★ 任务数据 store `Unn` 22 项 ＋ `$Je` 蛇形 payload 方言 ＋ **更正第 64 批刚立的判据**）

**背景**：连接器仍停摆（第 19 次）。取第 63/64 批遗留的 @3601025 与 @807569 两张表。

**本批关键发现**：
1. ★★★ **当场推翻自己上一批写进技能的判据**：`Unn` 是货真价实的 store 路由（改 `t.documents`/`t.taskBlocks`），却**没有 `default:` 标签**，兜底写在**函数末尾 `return void 0`** ⇒ **"有无 default 标签"不能判分派器，要看函数体是否写 store**。已同步改：`model.md` §一之三十四 1 就地标注、G603、技能 Step 1 的对应条。
2. ★ **两种兜底语义不同本身是事实**：`PT`（文档）未知 type 抛 `He`；`Unn`（任务列表）静默 no-op ⇒ **同产品内不同 store 严格度不同：核心数据协议严格、列表缓存宽容**。
3. ★★ **`Unn` 22 项 ⇒ "任务"是一层独立的分页文档缓存**：6 个 upsert ＋ **3 个各自独立的 continuationToken**（documents / ongoing / upcoming）＋ `updateLoadStatus`/`setPageInfo`/`resetFetchDocumentsWithTasks` ＋ 任务写侧 6（★ **`moveTask{blockId, documentId}` 跨文档移动**、★ **`reorderTasks{blockId, afterBlockId}` 相对定位不是索引**）＋ `setFilter`/`setSort` ＋ `pinDocument`/`unpinDocument` ＋ `updateDailyDocumentIds{map}`。
4. ★★★ **任务"从列表消失"是本地剪枝，不是服务端删块**：`hb()` 重建 `taskBlocks` 时，新结果里没有但**带 `taskData.schedule` 或 `deadline` 的任务被保留**，其余剔除；并先跳过三类特殊文档（`isRestrictedTaskDocument` ‖ `inboxDocumentId` ‖ `logbookDocumentId`）⇒ ★ **收件箱与日志本各是一篇真实文档**（id 存在 store 里）⇒ 与 V22/V31 任务动线直接相关的一条机制解释。
5. ★★ **第二套 action 方言 `$Je`：`{type:"snake_case", spaceId, payload:{…}}`** ⇒ 与文档 store 的 `{type, …扁平 camelCase}` 并存；`document_star/unstar`、`document_archive/unarchive` **成对且只差一个布尔**（收藏/归档是布尔字段），`document_view` 记访问时间，`document_move{targetFolderId??null, position}`。
6. ★ **写侧三细节**：`icon===void 0 ⇒ delete properties.icon`（**删属性而非写 null**）、`description==null || "" ⇒ delete`（**空串等同删除**）、`folder_set_pinned ⇒ pinnedDocumentIds = docId ? [docId] : []`（**数组但只放 0/1 个＝单选**）。

**数字刷新**：`gap.md` 594→**598 行（最大 G606）**；`model.md` +§一之三十五，§一之三十四 判据就地标注更正；`check-tables` 通过；覆盖率仍 1845/3639 = 50.7%。
**下一批**：`$Je` 剩余 case（蛇形方言完整名单，本批读到 `folder_reorder` 被截断）；`hb` 的 `o` 分支完整剪枝条件；`Sk`/`ZJe`/`VJe`/`kk`/`qy` 实现体；`isRestrictedTaskDocument` 判据；`Unn`/`$Je` 的 dispatch 消费方；`group{actions}` 应用器与撤销计层；16 个"仅在分派表出现"的 action 构造器。


## 第 65 批续・种子数据（未成批；第 66 批据此落盘，含一处需复核的自我警告）

**取数**：`index-DiTmKH3z.js` @808850–809900（`$Je` 尾部）；本地检索 5 条于本轮实跑。

1. ★★ **`$Je` 蛇形方言的完整尾巴**（本批前半已记 `document_*` 与 `folder_create/rename/set_icon/set_description/set_pinned/move/delete`）：
   - `folder_reorder -> KJe(t, spaceId, payload.folderId, payload.orderedIds, qy(e))`
   - ★ **`subfolder_reorder -> qJe(t, spaceId, payload.parentFolderId, payload.orderedIds)`** ⇒ 子文件夹层单独有排序
   - ★★★ **`tag_pin -> QJe(t, spaceId, payload.tag)` / `tag_unpin -> YJe(...)` / `tag_reorder -> XJe(t, spaceId, payload.orderedTags)`** ⇒ **标签可置顶、可整批排序** ⇒ 标签功能面此前只采到设置里的管理界面，操作层是第一次拿到
   - ★ **`root_reorder -> JJe(t, spaceId, payload.orderedIds)` / `starred_reorder -> eet(...)`** ⇒ **侧栏至少有五个可整批排序的列表**（root / starred / folder / subfolder / tag）
   - ★ **`default: return {}`** ⇒ **兜底第三形态**（继 `He(e)` 抛错、`return void 0` 静默之后的第三种：返回空补丁）⇒ 强化 §一之三十五 1 的判据修正
2. ★★★ **`HJe(t, e)` ＝ 批量变更归一应用器**：`let n = {}; for (const o of e) { const s = {...t, ...n}; n = {...n, ...$Je(s, o.change)} } return n`
   ⇒ **一个 change 列表按序在「基态 + 已合并补丁」的快照上逐条应用，最后一次性返回合并结果** ⇒ 这正是动态遗留清单第 8 项（批量 vs 单条归一化）要找的官方实现体；`o.change` ⇒ **协同增量是「包里有 change 数组」的形态**。
3. ★★ **写入器与字段**：`Sk(t, spaceId, docId, patch)` ＝ 通用文档字段合并（⇒ `document_star/unstar/archive/unarchive` 都是往文档对象上写一个布尔）；`ZJe` ＝ `lastViewed: bD(i.lastViewed, o)` ⇒ **文档对象上有 `lastViewed`，且经 `bD(旧,新)` 合并**（合并策略待读）；`VJe` ＝ `document_move`，走 `Y2(t.spaces, ...)` 遍历 folders 并 `r.isDeleted ||` 跳过 ⇒ **软删除标志 `isDeleted`**。
4. ★ 本地实跑（本轮，5 条）：`grep -rn "quickFilter|QuickFilter" src` ⇒ **0** ⇒ 本地无快捷筛选；`grep -rni "replaceAll|查找替换|replaceText" src/components/editor` ⇒ **0** ⇒ 本地无文档内查找替换（闭合 G601 的未核项）；`grep -rn "inboxDocumentId|logbookDocumentId" src` ⇒ **0** ⇒ 本地无「收件箱/日志本各是一篇文档」概念（闭合 G605 未核项）；`grep -rln "pendingUpdate|待刷新|newVersion" src` ⇒ **0** ⇒ 无「有新版本待刷新」提示；★ **但 `grep -rn "continuationToken|cursor" src/lib src/actions` ⇒ 25 处命中**。
5. ⚠ **自我警告（第 66 批必须先处理）**：第 4 条最后一项与 **G604 的本地列措辞冲突** —— G604 里我写了「本地任务查询直读 Prisma（无游标、无 continuationToken 概念）」，而实跑得到 **25 处命中** ⇒ **G604 的本地列可能是又一次「把已有的当缺失」**（同 G538/G555 一类错误）。第 66 批第 0 步：逐条看那 25 处命中的文件:行号，判定本地游标是「任务列表分页」还是别的用途（如网盘/同步/导出分页），再改写 G604 与 §一之三十五 5 的本地列。

### 种子段结案（同一轮内完成）：⚠ 第 5 条自我警告 **不成立**，G604 维持原文

- 实跑 `grep -rn "continuationToken|cursor" src/lib src/actions` 的 25 处命中逐条看完，全部属三类无关同名：① `src/lib/authz/folder-tree.ts:18/20/21/22/23` 的**父链上溯循环变量** `cursor`；② `src/lib/collaboration/presence.ts:17/44/51/52/56/75/77` 与 `presence.test.ts:25/36/38` 的**鼠标/光标** `cursor`（协同光标，不是分页游标）；③ `src/lib/import/markdown.ts:139-165` 的**解析索引指针** `cursor`。
- ⇒ ★ **`continuationToken` 单独 grep 在 `src/lib` + `src/actions` 命中 0** ⇒ 官方三游标（documents / ongoing / upcoming）在本地确实无对应概念 ⇒ **G604 的本地列「本地无游标」成立，不需要回改**。
- ⇒ ★★ **反向教训（与 `feedback-harvest-gap-instrument-overreports` 同族的镜像错误）**：**宽松 alternation 的命中数不能当证据** —— `cursor` 一词同时命中"光标/循环变量/解析指针"三类，计数 25 会让人把**已经做对的结论**改回错误结论（差点制造一个假"已实现"）。⇒ 规矩：**计数只用于"去找候选文件"，任何"有/没有"的断言必须读命中内容**；`grep -c` 的结果永远不进产物。

## 第 66 批（2026-09-28 00:52，静态：★★★ `$Je` 16 项全集 ＋ `HJe` 批量归一应用器 ＋ 三种兜底形态定稿；含一条反向方法学教训）

**背景**：预算将尽，本批把第 65 批"续・种子段"已取回但未成批的证据正式落盘，避免协同批量与标签排序两条事实只活在日志里。

**本批关键发现**：
1. ★★★ **侧栏有五个整批排序 action**：`root_reorder`/`starred_reorder`/`folder_reorder`/`subfolder_reorder`/`tag_reorder`，全部提交 **`payload.orderedIds` 完整新顺序**（不是 swap）；★ **`tag_pin`/`tag_unpin` ⇒ 标签可置顶**（标签操作层首次到手）。⇒ "重排一律整批提交"在官方四处独立同构（含 `setRowsOrder`、`reorderTasks`）＝强产品决策。
2. ★★★ **`HJe` ＝ 批量变更归一应用器**：`for (const o of e) { const s = {...t, ...n}; n = {...n, ...$Je(s, o.change)} }` ⇒ 一串 change 在「基态＋已合并补丁」的快照上按序逐条应用、**最后一次性返回合并结果** ⇒ **协同批量是「包含 change 数组的包」**；★ **动态遗留第 8 项（批量 vs 单条归一）静态侧结案**，只剩"撤销算几步"待动态。
3. ★★ **三种兜底形态 ⇒ 判据定稿**：`PT` = `default: He(e)` 抛错；`Unn` = 末尾 `return void 0` 静默；`$Je` = `default: return {}` 空补丁保返回类型 ⇒ **判"是不是分派器"看函数体是否写 store，`default:` 只是辅助信号**（本条把第 64→65 批的判据反复彻底收口）。
4. ★★ **`Sk` 通用文档字段合并器** ⇒ `document_star/unstar/archive/unarchive` 四 case 全是"写一个布尔"⇒ **收藏与归档是文档布尔字段而非枚举**；`document_view` ⇒ 文档有 **`lastViewed`（经 `bD(旧,新)` 合并）**；`document_move` 遍历 folders 时 `r.isDeleted ||` 跳过 ⇒ **文件夹软删标志**。
5. ★ **反向教训（差点把对的改错）**：`grep "continuationToken|cursor"` 得 25 处命中，逐条读完全是同名异物（`folder-tree.ts:18–23` 父链循环变量、`presence.ts:17–77` 鼠标光标、`markdown.ts:139–165` 解析指针），单独 `continuationToken` **0 命中** ⇒ **G604 成立、不回改**；⇒ 规矩固化：**计数只用于找候选，"有/没有"必须读命中内容，`grep -c` 永不进产物**（已回写用户级记忆与技能 Step 1）。

**数字刷新**：`gap.md` 598→**602 行（最大 G610）**；`model.md` +§一之三十六；`check-tables` 通过；覆盖率仍 1845/3639 = 50.7%。
**下一批（若续）**：`HJe` 的调用方（谁攒 change 数组 ⇒ 批量触发时机与节流）；`tag_*` 应用器与标签数据宿主（space 级 vs doc 级）；`bD`/`qy` 实现体；`group{actions}` 撤销计层；16 个仅在分派表出现的 action 构造器；以及**动态批次（连接器重启后先申请授权）**。

## 第 67 批（2026-09-28 01:13–01:29，★★★ **第一个真正跑屏幕的动态批次**：块级键盘行为 A/B/D/E 结案 ＋ 官方内核是 Slate ＋ 缩进载体是占位 div ＋ 撤销栈混粒度；C/F/G/H 未跑，I 清理失败）

**背景**：用户重启扩展后，固定开场序列**首次逐层全通**（`browsers.list` → `openTabs` 9 页 → `claimTab` → **第一条 `title()` 秒回**）。用户批准「B67＝块行为全套」写入授权，新建沙盒文档 `14a17c04-0c87-4aaa-8df6-4e9304fa4421`（标题 `QODER-HARVEST-20260928-B67`）。

**中途一次停摆与结案（★ 第 21 次，形态全新）**：`goto(?nd=uuid)` 返回 OK 之后 `title()`/`domSnapshot()` 全部本地超时，**根因是 `claimTab` 拿到了非前台标签页**（`/all` 有 3 个同名重复页），导航让该页失去帧而后台页不再产新帧 ⇒ 队首堵死。**用户把该页切到前台后队列当场排空**（`screenshot` 78,084 B / `title` 秒回 / `domSnapshot` 149,316 B），**重启扩展对这一形态无效**。⇒ 已把"绝不在 `openTabs` 里按第一个匹配挑页"写进 `features.md` §十。

**本批关键发现**（全部带逐字节指纹，证据在 `_harvest/b67-*.html` 15 份 + 2 张 PNG）：
1. ★★★★ **官方编辑器内核是 Slate**（`data-slate-editor` / `data-slate-node` / `data-slate-zero-width="n"` / `data-slate-length`，全量 HTML 里 `ProseMirror` **0 次**）⇒ 本地是 TipTap（`src/components/editor/Editor.tsx:5/:244`）⇒ **这是整份复刻最根本的架构分歧**，此前所有"TipTap 默认如此"的推断都不构成与官方一致的证据。
2. ★★★ **缩进的屏幕载体＝兄弟占位 div `_indent_1oz2o_33` + `--indent-w: 28px`，每档一个**；块的 `padding-left`/`margin-left`/`--overhang-left` 缩进前后**逐字不变** ⇒ DOM 层级是**扁平**的 ⇒ "从 DOM 结构推断父子"不可用。
3. ★★★ **D 结案：Shift+Tab 不带动缩进子树**（父块 `乙段` 降档后 `丙段` 的 28px 原地不动，DOM 净 `−62 B`＝只删一个占位 div）⇒ ★ **静态 §一之三十 的 `getIndentChildrenOfBlock` 不在这条键位路径上**，本地不得实现"级联降档"。
4. ★★★ **B 部分结案：Enter 打真空块＝退一档格式而非新建块**（`176,597→176,535`，该块 `ind=28px→0`）⇒ §一之三十 的 `lGe` 空块分支屏上成立；**但第一档退的是缩进，列表档/装饰档建不出来**（见第 6 条）⇒ **G579"Enter 与 Backspace 退档顺序相反"仍未判**。
5. ★★★ **E 结案：Shift+Enter 屏幕上零变化**（两块两次 `150,894→150,894`、`152,940→152,940`，`<br>` 恒 0；**同 cell 内改按纯 Enter 立刻 +1,989 B 并新增块**＝通路对照有效）⇒ 官方连 contenteditable 默认插 `<br>` 都没有；本地 StarterKit 的 `HardBreak`（默认键位就是 `Shift-Enter`，`Editor.tsx:244` 未关）会插 `<br>` ⇒ **本地多做**（G615）。
6. ★★ **两条"建列表"通路在 web 端都不生效**：`cua.type('- ')` 与 `ax.pressKey('-')`+`Space`（后者**逐字节零增量** ⇒ 顺带得一条通路事实：**`ax.pressKey` 不投递可打印字符**）；`Ctrl-Shift-7`（`TOGGLE_LIST`）在非空块上 `174,482→174,482` **diff `−0 +0`**。★ 但撤销序列证明 `- ` **字符确实进了文档**（被逐字节退回来）⇒ 是"没触发转换"而不是"输入丢失"，**不得据此写"web 端没有 markdown 简写"**；`keyboard.md` 的 Windows 键位表需要新增"**平台可得性**"维度（与 V7 快捷键面板同族）。
7. ★★★★ **A 结案：撤销栈混两种粒度**——块级操作一步退一整块（连续八步差值恒 `2,115`/`2,200`），**打字按字符入栈**（连续三步各差 **1 字节**，文本 `丙段→-丙段→-丙段→丙段`）⇒ ★ **这就是 V46"3 个动作要按 4 次 Ctrl+Z"的机制解释**：栈按补丁粒度分层，不按用户感知的动作分层；`Ctrl+A`+`Delete` 的删除 **1 次撤销即精确复原**（`169,206→154,991→169,206`）。★ 另得一条屏幕事实：**`Ctrl+A` 选中态让 DOM 净增 14,159 B，但 `data-selected`/`aria-selected="true"` 计数为 0** ⇒ 官方选中态用未识别的其它属性表达。
8. ★★ **I 清理失败（第三次独立复现官方"删除按钮不删实体"）**：`ax.get()` 全量树（本周期 1 次，11,828 字符）拿到 `202 button Ellipsis Icon` 与 `257 button Trash Icon 删除, ID: delete` → 点 202 开菜单 → `getByText('删除',{exact:true}).count()==2` → `.last().click()` 返回 OK → **页面跳到「所有文档」、无确认框、无 toast**（与 V47 完全同形）→ 回 `/all` 复核 ⇒ ★ **B67 卡片仍在（`present=true`）、`6cc9761c` 仍在** ⇒ **未删除**。
9. ★★★ **方法论更正（差点误报清理成功）**：中间一步我用"直接 `goto(实体 URL)` 被跳走"判成"已删"——`title` 当时返回的是营销标题「Craft — A fresh take on documents」，截图是**骨架屏灰条**。但 `/all` 复核证明文档还在 ⇒ ★ **`goto(实体URL)` 判据在"实体存在但编辑器仍在骨架加载"时会假报已删**，必须**等 title 稳定或二次 goto**，并与**列表屏复核**双判据同用（已回写技能失败表候选）。

**数字刷新**：`gap.md` 602→**610 行（最大 G618）**；`interactions.md` ＋V50；`model.md` ＋§一之三十七；`check-tables` 通过；覆盖率仍 **1845/3639 = 50.7%**（动态批不新增 i18n key 点名）。

**残留（未还原，需处理）**：① `QODER-HARVEST-20260928-B67` / doc `14a17c04-0c87-4aaa-8df6-4e9304fa4421`（本轮新建，含 甲段/乙段/丙段 与若干空块）；② `6cc9761c-874a-40d7-b806-5bda1bca49a4`（上一轮"无标题文档"，V47/V48 两条通路删不掉，本轮仍未删）；③ `f4524777-abfd-41e1-97f7-5fc51212662f`（manifest 第 1 行的 `QODER-HARVEST-20260927-blocks`，本轮**未复核是否还在**）。⇒ **未改任何账户级偏好、未开分享、未邀请协作者、未支付**。

**下一批（动态，按价值排序）**：
1. **C Backspace 六段链**（本批完全没跑，是 A–I 里最大的空洞）：光标在非空块 offset 0，逐段测 列表/缩进/装饰/前块为空/前块文本/前块非文本；第 6 段要验 `{type:"textSelectionIndex", index: 上块文本长度}` 的屏上等价物（光标落点）。
2. **建列表的第三条通路**：走**插入面板/斜杠菜单/块菜单**（自绘面板不进语义树 ⇒ 用 `cua.click` 坐标 ＋ 截图读字，或先 `domSnapshot` 找 `role=menuitem` 的替代属性），成功后才能测 B 的"列表档 vs 装饰档"退序，并顺带结 G579。
3. **F 只读态（viewer）**：本批未碰。★ 需要先向用户拿"是否允许用分享页/协作者只读身份"的单独授权（**禁区**），否则只能在本地编辑器内模拟 `setForcedViewOnlyModeAction` 不可得 ⇒ 拿不到授权就改由静态结案。
4. **G 任务三时间动线 1b/1c/1d** ＋ **H 表格 >600 格降级**（H 需要新建大表＝写入授权，另开一批）。
5. **I 清理第四通路**：`/all` 屏的**批量选择模式**（顶栏 `⋯` →「选择」→ 勾选卡片 → 垃圾桶 → 确认框）——技能失败表把它列为"真正能删的那条"，前三条（信息面板 / 卡片右键 / 顶栏 `⋯`）已三次实测全部不删；删完做残留三连（站内搜索 0 结果 / 任务·日历·收藏无残留 / 回收站二次清空）。
6. **开场硬规矩**（本批新增两条）：① **claim 前必须确认前台页**（`openTabs` 有同名重复页时按第一个匹配挑 = 必踩后台页挂死）；② **`goto(实体URL)` 判残留要等 title 稳定 ＋ 列表屏双判据**。

## 第 68 批（2026-09-28 01:38–01:55，★★★ **动态第二棒：块首 Backspace 四档矩阵结案（含光标落点探针）＋ 选择模式删除走通但后效未决 ＋ 推翻"必须重新 claim"**）

**背景与授权**：上一周期末以为连接器死了（`openTabs()` 返回 0 页）。本批开场**直接试旧句柄** `globalThis.TB` ⇒ `screenshot` 354,750 B、`title` 秒回 ⇒ **完全可用**。用户批准「全部批准」＝① C 六段链（B67 沙盒文档内加块/缩进）② I 清理第四通路。★ 未改账户级偏好、未开分享、未邀请协作者、未支付。

**本批关键发现**：
1. ★★★★ **C 结案 4/6 段：块首 Backspace 是四档分派器**（逐字节，基线 149,768 B / 6 正文块）：① 前块为文本→**合并**（`149,768→149,382`＝−386，块数 6→5，`DDDD`+`EEEE`→`DDDDEEEE`）；② 本块有缩进→**只删一个 28px 占位 div**（`149,383→149,321`＝**−62**、块数不变、**不合并**）；③ 前块为空→**删掉那个空块**（`149,321→147,332`＝**−1,989**，与"新建一块 +1,989"精确对称、当前块文本不变）；④ 首个正文块→**零变化**（`147,332→147,332`，不并入标题块）。⇒ 删除语义按 **prev 类型 × 本块格式档 × 是否首块** 三因子分派，**不是单一 join**。
2. ★★★★ **合并后光标落在"上块末尾"——静态 `textSelectionIndex` 的屏上等价物首次证到**：合并得 `DDDDEEEE` 后在同位置 `cua.type('X')` ⇒ **`DDDDXEEEE`**（探针字符插在两块交界处）⇒ 官方 `{type:"textSelectionIndex", index: 上块文本长度}` 不是推断而是**可观测事实**；落点用"块 + 块内字符下标"表达。
3. ★★★ **第 4 条删除通路走通 UI、但后效与 V27 冲突 ⇒ 记未确认**：`⋯`(ax 索引 700) →「选择」**进入即自动选中首张卡片**（截图逐张读过：只有 `QODER-HARVEST-20260928-B67` 带蓝勾，其余复选框空 ⇒ 选中集已复核）→ 红色垃圾桶（`span[aria-label="Trash Icon"]`，父按钮 Base UI `_variantPlainDanger_1bml7_165`）→ 确认框逐字「删除 1 个项目 / 你确定吗？你无法撤销此操作。/ 取消 / 删除」（按钮 `FilledDanger`＝**旧 styled-components DS**）→ 点删除后 `201,263→191,895`、选择模式退出。★ **但** `goto(文档URL)` **不再打开编辑器**（落到「所有文档」，dom 120,080、`blockwrap` **0 个**），而 `/all` 在 **t+40s / t+60s 各硬刷新一次**后卡片 `220aa0d1` **仍在**、卡片数仍 **10** ⇒ **文档路由与浏览列表不同步**（与 V27「列表命中 0、卡片 9→8」直接冲突）⇒ **禁止把"列表消失/还在"当删除判据**，下一批用 ⌘K + 点卡片 + `/trash` 三判据结案。
4. ★★★ **连接器方法论（推翻一条开场假设）**：**内核存活时旧 `TB` 句柄可直接续用**，不必重走 `createBrowserAgent → openTabs → claimTab`（重走反而可能 claim 到后台页 ⇒ 第 21 次停摆）。⇒ 开场顺序改为：**先试旧句柄 `screenshot()`，不通再 claim**。
5. ★★★ **三条 SDK 通路事实（全部实测）**：① 导航在 **tab** 上（`TB.goto/reload/back/forward`），**`TB.playwright` 没有 `goto`**（只有 `goBack/goForward/evaluate/locator/getBy*/waitFor*/elementInfo/elementScreenshot/domSnapshot`）；② **`cua.type` 参数是 `{text: string}`**，裸字符串 throw `cua.type requires text`；③ **`Control+Shift+,` 在「所有文档」屏零增量**（`130,826→130,826`，`pressKey` 返回 OK）⇒ 快捷键面板键位**作用域不含浏览屏** ⇒ `keyboard.md` 需加"作用域"列（与 G617 同族）。
6. ★★ **取证缺陷修正（第 67 批的解析器一直切不到块）**：块容器是 **`id="blockwrap-<uuid>"`**（不是 `class="blockwrap-"`），同值在 `data-block-id`，标题块另有 `data-testid="editor-title"` ⇒ 改正后才拿到逐块 ind/zw/text 序列。**第 67 批凡"某块 ind=N"的表述都带 ±1 块偏移风险**（本批 M2 的 −62 B 才证明缩进确实存在，只是归属窗口重叠）⇒ 已回写 V51 §1 与 §model 一之三十八 3。
7. ★★ **`/all` 卡片属性与"预览是服务端快照"**：`data-item-id` / `data-selection-kind="document"` / `aria-expanded` / `href="/editor/d/<space>/<doc>"` / 预览图 `res.craft.do/render/document_preview/…&t=<epochMs>`。★ 本批实测：改了文档标题、点了删除，**卡片标题与存在性都不动** ⇒ **卡片来自带时间戳的服务端渲染快照**，不能当实时状态源。
8. ★ **`?nd=` 假 id 的第三次教训**：manifest 里 B67 记的 `14a17c04-…` 在 `/all` 全量 dom **0 命中**，真实 id 是 `220aa0d1-…` ⇒ 上一轮"14a17c04 文档消失"是**记错 id**，不是删除生效；`f4524777-…` 已无命中（V27 那批就删掉了），`6cc9761c-…`（无标题文档）**仍在**。
9. ★ **本地侧实跑（本轮，5 条）**：`grep -rn "Backspace|backspace" src --include=*.ts --include=*.tsx` ⇒ **0 命中**（块首退格全交 ProseMirror 默认）；`grep -rln "addKeyboardShortcuts" src` ⇒ 只有 `src/components/editor/extensions/font-size.ts`；`grep -rni "selectionMode|selectMode|batchDelete|bulkDelete|已选" src` ⇒ **0 命中**（本地无批量选择面）；`src/actions/document/delete.ts:6-18/20-30/32-40`（软删 / restore / 硬删三条动作齐）；**★ `src/components/sidebar/DocumentTreeItem.tsx:116` 直接 `await deleteDocument(doc.id)`，读上下文无确认框** ⇒ 与官方"删除必带确认框"**方向相反**（G622）。
10. ~ **仍未拿到的两段**：C 的**装饰档**与**前块为非文本块**档（需要先造出彩色块 / 代码块）；`G579` 的"Enter 与 Backspace 退档顺序相反"（两键缩进档行为相同，看不出顺序差）。

**数字刷新**：`gap.md` 610→**616 条（最大 G624）**；`interactions.md` ＋V51；`model.md` ＋§一之三十八；`check-tables` 通过；覆盖率仍 **1845/3639 = 50.7%**。
**残留状态**：`220aa0d1-…`（B67/B68 沙盒文档，本轮已点删除、后效未定）、`6cc9761c-…`（上一轮无标题文档，未动）、`f4524777-…`（V27 已删）。本轮**新建实体 0 个**（复用 B67 文档，标题内文本改为 `QODER-HARVEST-B68`，正文为 AAAA/BBBB/CCCC/DDDD/EEEE 与空块）。

**下一批（动态，按价值排序）**：
0. **★ 前置：连接器需用户解堵**（**第 22 次停摆**，2026-09-28 02:07，已记 `manifest.jsonl`）：第 68 批收尾后隔约 10 分钟复用同一 `TB` 句柄，`screenshot`/`title`/`BR.user.openTabs()` 三连本地超时，而 **`AG.browsers.list()` 秒回且 `extensionVersion=1.7.5`** ⇒ 客户端与扩展进程都活着，死的是扩展侧串行队列队首（形态同第 21 次＝目标标签页不在前台）。**解法仍是"把那个 Craft 标签页切回前台"，重启扩展无效**。⇒ 开场改为：**第一条命令用 `title()`（30 s，比 `screenshot` 便宜）**，超时即停手请用户切前台。
1. **★★ 最低成本高价值：把列表家族其余三条键位在编辑器屏上按一遍** —— `Ctrl-Shift-6`（`TODO_LIST` 待办）/ `Ctrl-Shift-8`（`BULLET_LIST` 项目符号）/ `Ctrl-Shift-9`（`NUMBERED_LIST` 编号）/ `` Ctrl-Shift-` ``（`NO_LIST`）。★ 第 67 批只试过 `Ctrl-Shift-7`（`TOGGLE_LIST`）一条就下了 `~` 结论；**若 8 能建列表则一次解锁三件事**：G617 结案、B 的列表档可测、`G579`"Enter 与 Backspace 退档顺序相反"可判。⇒ 台账已建在 `keyboard.md` §九（屏上可得性 9 条 / 未试清单）。
2. **删除后效三判据结案**（清掉 G621 与 I 的账）：⌘K 搜 `QODER-HARVEST` → 点卡片看能否打开 → `goto <space>/trash` 看是否进回收站；若仍在则**再走一次**选择模式删除并逐判据记录。
2. **C 缺的两档**：先用**插入面板**（`cua.click` 坐标 + 截图读字，自绘面板不进语义树）造一个代码块或分隔符做"前块为非文本块"；用**选中文字 → 浮出菜单颜色**做"装饰档"，然后同块再测 Enter vs Backspace 的退档顺序（结 `G579`）。
3. **`Ctrl+A` 选中态的真实 DOM 表达**（+14,159 B 但 `data-selected`/`aria-selected` 均 0）⇒ 用逐字节 diff 找新增属性名，别再用计数判。
4. **F 只读态（viewer）权限矩阵**：★ 需要先拿"是否允许开分享页/协作者只读身份"的单独授权（禁区），拿不到就改由静态 §一之三十一 白名单结案。
5. **G 任务三时间动线 1b/1c/1d** ＋ **H 表格 >600 格降级**（H 要新建大表＝另开一批写入授权）。
6. **开场硬规矩（第 68 批再补两条）**：⑦ **先试旧 `TB` 句柄再考虑 re-claim**；⑧ **块归属解析要用 `id="blockwrap-"` 切，且缩进/文本的归属窗口不能重叠**（用 `data-block-id` 精确取，别用固定字符窗口）。**（★ ⑦ 已被第 69 批推翻：旧句柄跨 turn 必被守卫拒绝，见下面第 69 批 §4。）**

## 第 69 批（2026-09-28 02:22–02:37，★★★ **只读上半批：删除后效四判据结案（G621 翻案）＋ 信息面板分区字段集（G625/G626）＋ 开场序列被推翻重写**）

**授权**：本批**纯只读**（不新建实体、不改偏好、不开分享）；A/B/C/D/E/G/H 所需写入授权**尚未申请**。
**产物**：`interactions.md` **V52**（§1 结案 / §2 残留清点 / §3 信息面板字段集 / §4 通路事实）；`gap.md` **§三点七九（G625、G626）＋ G621 改判**；`features.md` 静态/动态面行与取证边界（V1–V52）、真动态残留 10/10b/10c、当前唯一阻塞；快照 `_harvest/b69-d1-6cc9761c.html`（184,384 B）/`b69-d2-*.png`（409,467 B 截图自证）/`b69-d3-*.html`/`b69-d4-*.html`（已抹 `?s=`）。

1. ★★★ **G621 翻案结案：B67 文档确已删除，第 68 批的"卡片仍在"是假阴性**。四判据：① ⌘K 搜 `QODER-HARVEST` = 未找到结果；② 编辑器权威态 = **「此文档已被移除」**（`blockwrap` 0）；③ 回收站 = 空态「你删除的文档将显示在此处」，**无此项 ⇒ 该通路是硬删**（与确认框「你无法撤销此操作」自洽）；④ ★ **冷加载新标签页 `/all` = `未分类 5`、卡片 10→9、QODER 卡片消失**（含截图）。⇒ **新纪律：删除后效只准用「冷加载新标签页」或「编辑器权威态」判定；SPA 会话内的 `/all` 列表与 `goto` 重载一律不作数。** 这条同时**给 V47 的"信息面板删除未生效"留了疑问**（那次的判据也含"URL 仍可打开"，是真未删；但"卡片仍在"这一半不可信）⇒ 新残留 10c：**信息面板「删除」与批量「删除」是否同一条码路、`查看备份` 与回收站是否同一层**。
2. ★★ **信息面板分区字段集（空文档态，只读顺带采到）**：`统计 · 这一页` = **5 字段**（`字数`/`字符数`/`不包括空格`/`区块`/`阅读时间`，空文档 `0s`）；`动作` = `移动到…`/`创建副本`/`收藏文档`/`查看备份`/`删除`；`属性` = `已创建:`/`已更新:`/`作者:`；另有 `展示` 与顶部 **`目录` 分区带空态引导文案**「使用标题、页面或卡片创建目录。」。⇒ 本地 `InfoTab.tsx:264-266` 只有 `{wordCount} 字` ⇒ **G625（统计缺 4/5）**；本地信息面板无 `目录` 分区（`:297` 那个"根目录"是移动目标文案）⇒ **G626**。
3. ★★ **残留实体清点（LIFO）**：`f4524777` ✓ 已删（V27）；`220aa0d1` ✓ **本批结案**；★ `6cc9761c`（未分类「无标题文档」）**未删、归属待定** —— 实读只有 **1 个空标题块**、`字数 0`、`已创建 21 小时前`，三条吻合 manifest 第 8 行那篇**标题没写进去**的 `20260927-tasks` 沙盒，**但不能排除是用户自建空文档** ⇒ 按禁区停手，**要用户确认才动**（真动态残留表 10b）。
4. ★★★ **开场序列被推翻重写（本批零停摆）**：`createBrowserAgent()` → `browsers.list()`（★ 条目是**纯数据描述符**，own keys 只有 `id,name,type,capabilities,apiSupportOverrides,metadata`，**没有 `.user`/`.tabs`**）→ **`await browsers.get(id)`** 才拿到活句柄（`browserId,capabilities,tabs,user`）→ **`tabs.new({url})`** 开自己的前台页 → `title()` 秒回。⇒ **旧 `TB` 句柄跨 turn 必被守卫拒绝**（throw「**Browser Agent 只能在当前 Qoder Turn 的 Node REPL 中调用**」）⇒ 第 68 批"开场先试旧句柄"只在**同一 turn**内成立，**作废**。⇒ 对第 22 次停摆的复核：守卫是**立即 throw**、不是超时 ⇒ 与"空闲期后 `title()` 超时"是**两种形态**，别合并解释。
5. ★★★ **`tab.goto()` 在 craft.do 会静默不导航**：连发两次都 `ret=undefined`、`await tab.url()` 仍是 `/all`、DOM 一字不差（184,384→184,384）；同一目标改用 **`locator('a[href*="<docId>"]').first().click()`** ⇒ 立刻进编辑器（URL 变 `/editor/d/<space>/<doc>?s=<token>`、DOM 137,982、`data-slate-editor` 出现、`blockwrap` 1 个）。⇒ **进文档走点卡片链接**；`goto` 仅用于"同 URL 重载关弹层"。⇒ ★ 这也说明第 68 批用 `goto(文档URL)` 得到的"打不开"结论**本身就不是有效判据**（V51 §7 的矛盾有一半来自这里）。
6. ★★ **`node_repl` 两条致命形态**：① **IIFE 格必须 `await (async()=>{…})()`** —— 漏 `await` 时工具回 `[node_repl ok — no output]`，**格内 `nodeRepl.write` 全丢**（本批连踩三次，一度误判"扩展挂了"）；② **格末尾表达式抛错会吞掉之前所有 write** ⇒ 统一 `p(k,v)` 累积 ＋ `try/catch` ＋ 最后一行 `nodeRepl.write(o.join('\n'))`；③ 顶层 `await` 可用，但**顶层 `var` ＋ `await` 混写会让 kernel 报 `Unexpected identifier …_snapshot`**（语法包装失败），改回 IIFE 即可。
7. ★ **`?s=` 令牌脱敏已执行**：导航后 URL 带 `?s=<session token>` ⇒ 落盘前 `replace(/\?s=[A-Za-z0-9]+/g,'?s=<redacted>')`（已对 `b69-d4-*.html` 就地改写）。
8. ★ **本地侧实跑（本轮，3 条）**：`grep -rn "不包括空格\|阅读时间\|字符数" src` ⇒ **0 命中**；`grep -n "统计" src/components/editor/tabs/InfoTab.tsx` ⇒ 只有 `:264` 标题 ＋ `:265` 一行 `字`；`grep -rn "目录" src/components/editor/tabs/InfoTab.tsx` ⇒ 只有 `:297` 的移动目标文案 ⇒ **本地无 TOC 分区**。

**数字刷新**：`gap.md` 616→**618 条（最大 G626）**；`interactions.md` ＋V52；覆盖率仍 **1845/3639 = 50.7%**（动态批不新增 i18n key 点名）。
**残留状态**：**沙盒新建实体 0 个**（本批只读）；`220aa0d1` ✓ 结案；`6cc9761c` 待用户确认归属；`f4524777` ✓ 已删。**未提交 git**（产物全 untracked，HEAD 仍在 b746504）。

**下一批（动态下半）**：

0. **★★ 前置：连接器第 23 次停摆，需人工点掉原生弹窗**（2026-09-28 02:52，已记 `manifest.jsonl`）：在编辑器页（`6cc9761c`）执行 `locator('a[href$="/all"]').click()` 离开页面后，该 tab 的 `url/domSnapshot/locator.count` 与浏览器级 `tabs.list/tabs.selected/getJsDialog` **全部超时** ⇒ 首因假设是 **craft.do 编辑器页的 `beforeunload` 原生「离开网站?」弹窗冻结 CDP**（连读弹窗的接口也堵，无法程序化关闭）。⇒ **恢复动作**：Edge 里那个 Craft 标签页若挂着「离开网站?」就点**离开**，并把该页切前台；**重启扩展无效**。⇒ 恢复后**第一条命令只发 `tab.screenshot()`** 判形态。⇒ ★ **新硬规矩：离开编辑器页不要点 `<a href>`**，要另开 `tabs.new({url})`；沙盒动作在同一文档内做完再收尾。
0b. **★ 本批授权状态（用户已答）**：**下半批"全部批准"**（A/B/C/D/E 键盘行为批 ＋ G 任务三时间动线 ＋ H 表格 >600 格降级，只写本轮新建、命名带 `B69` 的沙盒实体，跑完 LIFO 删除并冷加载复核）；★ **`6cc9761c` 用户判定"是采集残留，删掉"** ⇒ 该删除动作**被上面的停摆打断、尚未执行**，恢复后第一件事就是删它（走已结案的批量选择通路，硬删不可撤销）。

1. **★★ 列表家族键位上屏**（`Ctrl-Shift-6/8/9`、`` Ctrl-Shift-` ``）⇒ 一次解锁 G617 ＋ B 的列表档 ＋ G579 顺序差。**进文档用点卡片链接，不要用 goto**。
2. **★★ C 的装饰档与前块为非文本块档**：插入面板造代码块/分隔符 ＋ 选中文字上颜色，再同块测 Enter vs Backspace 退档顺序。
3. **★ A 补测**：批量粘贴（多行文本一次插入）与真·多块删除（跨块选中）各算几步 `Ctrl+Z`。
4. **★ D Tab 缩进子树**：父块＋2 子块，光标在父块按 `Shift+Tab`，看子块是否随之降档。
5. **★ E Shift+Enter 复测**（V50 只证到"零增量"，需在编辑器屏复测）。
6. **★ G 任务三时间动线 1b/1c/1d** ＋ **H 表格 >600 格降级**（H 要新建大表）。
7. **10c 删除码路对账**：信息面板「删除」→ 立即查回收站与冷加载列表 ⇒ 判"软删/硬删"是否分通路。
8. **开场硬规矩（第 69 批版，取代第 68 批 ⑦）**：⑨ **每个 turn 重跑 `createBrowserAgent → browsers.get(id) → tabs.new({url})`，不复用旧句柄**；⑩ **进文档＝点卡片链接**（`goto` 会静默失效）；⑪ **node_repl 格一律 `await (async()=>{…})()` ＋ `p()` 累积输出**；⑫ **删除类判据只认冷加载或编辑器权威态**。


## 第 70 批（2026-09-28 03:13–03:24，★ 静态补账批：连接器停摆未解 ⇒ 零写入、零沙盒、无屏幕证据）

1. **开场探针（3 条后停手，按纪律没连发）**：`createBrowserAgent()` ✓ → `browsers.list()` 秒回 ✓ → `browsers.get(id)` 秒回 ✓ → `tabs.list()` **20 s 超时**。⇒ ★ **停摆 #23 的定位收窄**：不是客户端、不是代理句柄、不是单个 tab —— 是**扩展侧 tab 队列**（`browsers.*` 层活着，`tabs.*` 层全堵）。判据本身可信（同进程同句柄，只差层级）。⇒ **需要用户做的动作不变**：把 Edge 里那个 Craft 标签页切回前台 / 处理可能挂着的原生"离开站点？"对话框。
2. **转向连接器无关取证**：从 `_harvest/js/index-DiTmKH3z.js` 读到了**键位 → handler 注册表**与三张分派器全解（`Dsn` / `lGe` / `sm`），产出 `interactions.md` V53 ＋ `model.md` §一之四十 ＋ `gap.md` §三点八〇（G627–G631）。
3. ★ **B / D / E 三项结案（静态）**：`Shift+Enter` handler 是空壳（`N9e` 只 `return {preventDefault:!1}`）⇒ 官方**无软换行产品实现**；`sm` 把入参块并上缩进子块 ⇒ **缩进天生带动子树**、per-block 夹到 0；`lGe` 空块退档顺序 **缩进→列表→装饰** vs `Dsn` **列表→缩进→装饰** ⇒ **G579"官方自身不一致"结案为真**，且第三档动作组合逐字相同。
4. ★ **C 的两格补齐 ⇒ 官方块首 Backspace 是 7 档不是 6 档**：新增第 0 档闸门（`Wc`＝光标在 `math/day/mention/tag` 原子节点内 ⇒ 完全不走退档）与装饰档（**block+focus+color 一次全清**，不是逐级）；"前块为非文本块"档＝**删当前块并选中前块、不合并、不挂 undoSideEffect**。⇒ 第 68 批的四档全部被保留并解释，两处"未采到"从空白变成有码路。
5. ★★ **模型侧新事实：`前一块`取自 `subblocks` 兄弟序，不是文档展平序**（`Usn @3654478` 的 `e` 来自调用点 `当前块.parent.subblocks`）⇒ **跨父块永不合并**；同时"空"有两个谓词（`Qr` 要求 `type===Text`，`z9e` 不要求）⇒ 两把键的"空"语义不对称。
6. **顺带采到的未开发区域**（下一批候选）：`Ft` 槽表 @600860 一次导出 **表格单元格选区三态构造器**（`single` / `full` / `empty`）＋ `toggleInTableCellSelection` ＋ `cellBorderFromFormulaCellReferences` ＋ `isHiddenInToggle` / `getNextVisibleBlock`；以及 **`docActions` 数组允许 `null` 占位**（@700100）。
7. **数字刷新**：`gap.md` 618→**623 条（最大 G631）**；`model.md` §一之一~四十；`interactions.md` V1–V53；覆盖率不变（本批不新增 i18n key 点名）。
8. **残留状态**：本批**未新建任何实体**、**未改动账户偏好**、**未触碰分享**。唯一待清理项仍是 `6cc9761c`（用户已授权删除，被停摆挡住）。

### 下一批（第 71 批）队列

0. **先解停摆**：开场只发 1 条 `tab.title()`（本地超时 45 s）。超时 ⇒ 判定仍堵，**立刻转静态**，不要连发。静态候选已排队：`jsn`（Delete 分派器本体）、`o$`（`getIndentChildrenOfBlock` 定义体）、`Dsn` 里 `s`（父块 id）的赋值回溯、`lGe` 的 `aGe`/`dr`/`$8` 全展开。
1. ★ **屏上复核 V53 的四条静态结论**（这是本批最大的"未证明"）：① 光标在 `mention`/`date` 原子节点内按 Backspace 是否**直接放行**（第 0 档）；② 装饰块按 Backspace 是否**一次清三项**（含 color）；③ 光标在**父块**（带 2 层子块）按 Shift+Tab 是否**级联降档**（与第 68 批"不级联"对撞）；④ 前块为非文本块时是否**删自己并选前块**。
2. `A` 撤销计步（批量粘贴 / 多块删除各几步）＋ 新证据点：`Dsn` 的合并档 `s(Ece(...), {undoSideEffect, redoSideEffect})` 与 `Esn` 的 `undoSideEffect = vo.isRange ? ... : null` ⇒ 可预测"非范围选择时不生成 undo 选区副作用"。
3. `G` 任务三时间动线（1b/1c/1d）、`H` 表格 >600 格降级（＋ 现在多了三态选区与 `overscan:25` 可观测性）。
4. `F` 只读态矩阵——**需单独授权**（禁区：不得开对外分享）。
5. **清理结案**：`6cc9761c` 删除 ＋ 残留三连 ＋ 截图。
6. 新增小项：`Delete` 键（`jsn`）与 `Backspace` 的行为差分；表格单元格三态选区的屏上表达。

### 第 70 批·同批二次读取追加（03:27–03:31，仍零写入）

9. ★★ **两处自我修正**：① `Dsn`/`jsn` 的邻接序列是 **`currentPage.subblocks`（页级展平序列）**——由组件 `Tsn @3640560` 的 props 解构（`{blockId, dispatch, blockDataRef, toggleStatesRef, currentPage, nextBlockId, decorations}`）＋ 调用点 `m = n.current[s]?.subblocks` 证出；本批首次读到时误记为"当前块的 subblocks"，已在 V53 §2／§2 第 4 条／§一之四十 第 1 条就地更正。⇒ 结论改判为"**跨页不合并**＋**嵌套块（折叠体内 / 表格单元格内）合并档结构性不可达**"（可屏上复核）。② ★ **键位不是全局 handler，而是每块一个 React 组件**（`Tsn`）⇒ 本地用全局 ProseMirror 插件复刻时需自建"邻块查表"，并遵守"只在页级序列内找邻块"。
10. ★★ **`Delete`（`jsn` @3647994）结案**＝Backspace 的**残缺镜像**：闸门在块末尾且折叠；只有"本块空→删自己并选下块（下块是 Text 再把光标记进去）"与"下块 Text→向后合并"两档；**无列表/缩进/装饰退档**；且合并 `Ece(本,下)` **不挂 undo/redo side effect**（`Dsn` 合并档两个都挂）⇒ 新 gap **G632**。
11. ★ **首处 `Ft.singleCellSelection` 调用点**（`mo(qs)` handler）：`Ar(blockId, blocks)` 解出 `{tableId, table, cell}` → `Ro(...).coordinateOfCell(cell.id)` → `uiDispatch(St(Ft.singleCellSelection(coord, tableId)))` ⇒ 给 H 项补上"单元格归属解析＋坐标"这块拼图；但 ★ **键名常量 `qs` 仍未解析**（触发键未知）。
12. ★ **落点类型补一种**：`qte(t) = {type:"textSelectionFlatRange", selection}`（范围型，undo/redo 副作用走它）与 `F9e(t) = {type:"textSelectionIndex", index}`（点型）并存。
13. **数字刷新**：`gap.md` 623→**624 条（最大 G632）**；覆盖率不变。
14. **下一批队列增量**：屏上复核项从 4 条增至 **6 条**（新增：⑤ 表格单元格内块首 Backspace 是否**不**合并到表格外；⑥ `Delete` 与 `Backspace` 合并后各按一次 `Ctrl+Z`，看**选区恢复是否不对称**）。静态侧仍欠：`o$`（`getIndentChildrenOfBlock`）定义体、`qs` 常量、UI 侧 `decorations` 映射的权威归属。

### 第 70 批·三次读取追加（03:33–03:37，仍零写入）

15. **绕行假设否证（负结果，重要）**：`tabs.new({url:"/all"})` 在同一 cell 里 **45 s 超时**，而 `browsers.get(id)` 秒回 ⇒ 堵的是**整个 tab 层队列**（`list` 与 `new` 都堵），不是被 `beforeunload` 冻住的旧页。⇒ 第 69 批留下的"新页不受旧页影响"这条逃生门**不存在**，已在 `features.md` 就地标注作废。⇒ 下一批开场**只发 1 条 `tab.title()`**，超时即转静态，不再试 `tabs.*`。
16. ★★ **`qs = "Escape"`（@19490）⇒ §6.3 那条不明 handler 是 `Esc` 键**，其体是**三级降级**：表格单元格内 → `Ft.singleCellSelection(Ro(tableId,table).coordinateOfCell(cellId), tableId)`；有范围选区 → `eo.select({focus, anchor: focus})` 塌成光标；否则 → `St(Et.blocks([id]))` 选整块。⇒ 官方选区有**三套互不兼容表达层**。★ 本地差分查清后登记为 **G633「语义差分」**（本地 `Esc` 存在于 `collection/PropertyCell.tsx:111,145,198,363,407`、`AiBubbleMenu.tsx:80`、`block-link-menu.tsx:130`、`block-link-suggestion.tsx:70`、`math-*-view.tsx:26/21`，但**全是"取消编辑/关弹层"，没有一处做选区降级**）⇒ ★ 自我纠正：我先把它写成"本地无 Esc 绑定"，grep 后发现在而语义不同，已改为准确差分。
17. ★★★ **H 项降级门结案（静态）**：`p8n = 600`；`h8n(t) = t.rowCount * t.visibleColumnCount > 600`（@4791220）⇒ 用**可见列**、非总格数；消费者 @4857440 的开关是**单向棘轮**（`useState(门值)` ＋ `effect(门值 && !state ⇒ setState(true))`）⇒ **越过 600 后删回小表也不会关虚拟化**。虚拟化几何 `sE` @4790908：`ROW_HEIGHT: 35`（★ 固定行高，内容不撑高）、`overscan: 25`、`CELL_H_PADDING: 10`、`POPUP_WIDTH: 264`、`EDITOR_OVERHANG: 10`、`EDIT_POPUP_OFFSET(type) = TEXT|NUMBER|URL|EMAIL|PHONE ? −10 : −4`、`getPlacementOffset = −35 + offset`（★ 弹层定位是纯函数，可直抄）。
18. ★ **全站 `overscan` 按屏各异**：`5 / 5(XZt) / 5 / 5(Fqt) / 10（抽屉内 Virtuoso）/ 25（表格集合视图）/ 2（分组卡片列表，group-header 行高 `fxe = 40`）`⇒ 不存在统一值，本地若做虚拟化要按屏分别取。
19. ~ **作用域存疑（不许当成已证）**：600 门消费者的组件带 `getIsGrouped()` 与 `{header, dataRows[]}` ⇒ 更像**集合/数据库视图**；而 §一之三十九 的**文档内联表格**是 CSS Grid 全量渲染。⇒ "文档内联表是否也走这条门"**未证**，列为屏上复核第 7 项；门前置旗标 `Se` 含义未取到。
20. **数字刷新**：`gap.md` 624→**626 条（最大 G634）**；覆盖率不变。**下一批屏上复核队列：7 条**（原 6 条 ＋ "文档内联表 >600 是否裁切行节点"）。

### 第 70 批·四次读取追加（03:39–03:41，仍零写入）

21. ★★★ **A 项（撤销计步）在机制层结案**：一步的单位是 **`undoRedoPatchId`**（默认值表 `Tce` @82984 ＋ `_9.applyAction` @787300）——给 id 就**按 id 复用槽位并累加** `redo.push(patches)` / `undo.unshift(inversePatches)`，不给 id 就是新槽一步；★ 官方**跨异步边界复用同一 id**（占位 dispatch → 上传完成回填 → 失败分支删占位，三次 dispatch 共享 `const p = Zm()`），⇒ "一次用户意图＝一步撤销"是显式工程约定。**撤销栈是"指针＋稀疏字典"**（`patchIndex` ＋ `hasOwnProperty`）⇒ **索引可落在空洞**，这解释了第 67 批屏上"撤销按了像没反应/栈非单调"。⇒ 屏上复核重点改变：不再是"数几步"，而是**验证粘贴是否共享 id**（若共享＝一步；不共享＝多步）。
22. ★★★ **F 项（只读态）拿到权威判据**：只读**不是禁用 UI**，是 `fYe` **动作白名单 reducer**（@735347，逐字 8 项：`loadDocument / addStoredBlocks / syncUpdateComments / addPendingComment / setCommentResolved / setCommentState / syncUpdateContributors / updateRecordObjectProperty`）⇒ ★ 只读态**可写评论全套**＋**可改集合记录属性格**，正文 block 不可；非白名单动作**静默空 patches ＋ `console.warn` ＋ `logger.warn("UnexpectedReadOnlyDocumentStoreAction")`** ⇒ **"按了没反应且控制台有 warn"就是 F 的屏上判据**（不必猜按钮灰态）。批 reducer 按 `n.isReadOnly` **换分派函数**（@731035）。
23. ★ **本地对照实跑**：`grep -rn "History|undoInputDelay|undoDepth|groupsCountLimit" src` ⇒ 无命中（撤销走 TipTap 默认 `prosemirror-history`，时间窗分组、**无跨异步合并能力**；`VersionDialog.tsx:11,85` 的 `History` 只是图标名）；只读侧本地只有表现层锁（`DocumentEditor.tsx:43,47,77,89,252,260,289`、`Editor.tsx:380`、`RightPanel.tsx:71`），**未见 action 层白名单** ⇒ 登记 **G635（范式差分：时间窗 vs 意图 id）**、**G636（范式差分：表现层锁 vs 存储层白名单）**。
24. ★ **顺带结案两条 internals §十四 遗留**：`Le` 确为 `m8n` 的 `enabled` 实参（@4858031），且开关是单向棘轮；"越过 600 的可感知差异"部分结案（行裁切＋固定 35px 行高），**降级后功能面**仍未知。
25. **数字刷新**：`gap.md` 626→**628 条（最大 G636）**；`internals.md` 新增 §十五；覆盖率不变。**屏上复核队列 7 条不变**（A 的复核问题已改写为"粘贴是否共享 undoRedoPatchId"）。

## 第 71 批（静态补账·G 项＝任务三时间动线，2026-09-28 03:45–03:52，零写入 / 零屏幕证据）

★ **连接器状态**：开场只做一次判活探测即停 —— `AG.browsers.get()` 秒回、`tabs.list()` 超时 ⇒ 停摆 #23 仍在，堵点仍在扩展侧 tab 队列。本批 **0 次屏上操作、0 个沙盒实体、无截图无指纹**，未申请任何写入授权（无写入就不消耗授权）。

### 产出（全部 `✓静`，除非标 `~`）

1. ★★ **`repeat.type` 是封闭二值** `{fixed, flexible}`：四个频率行 onClick 都以 `d("fixed")` 开头（@5437100/@5437560/@5438300），唯一的「相对于完成」行 `{id:"flexible"}` 传 `d("flexible")` 且 `s(1)` 复位 interval（@5438700）；反序列化器缺省 `"flexible"`（@143016）。⇒ 菜单列表整体只有 `[frequency(4), flexible(1)]` ⇒ **官方重复没有任何"结束条件"档**，`tasks.md` §10.9 的 0 命中结论由弱否定升级为**构造侧封闭证据**。
2. ★★ **两档语义由文案给出**：`fixed` → `tasks.complete.task.decs`「…根据**原始计划日期**进行安排」（静态串）；`flexible` → `ajn` 组件动态拼 `tasks.task.rescheduled.to.x.later`「…在 [0] 之后」，单位来自 `rjn={daily:"day",weekly:"week",monthly:"month",yearly:"year"}`，单复数靠 `unit.<u>` / `unit.x.<u>s` 两级 key 后缀，**两级 `defaultValue:""` 兜底**。说明行外层 `ljn` 是强调色横幅（`--accent-200` / `--accent-500`）。
3. ★★★ **提醒不是偏移量，是"当日分钟数"的 96 档栅格**（@5425700–5426350）：`Ov=15`、条目数 `Math.floor(1440/15)`、第 `b` 项 `y=b*15` ⇒ `dateOffset ∈ {0,15,…,1425}`；写 `{enabled:h!=null, dateOffset:h??void 0}` 且**选完立即关菜单**；「无提醒」行仅在已有提醒时渲染（`m=r!=null`）；"有提醒"是 `enabled && dateOffset!=null` **三条件与运算**。
4. ★★★ **提醒弹层的"默认值"其实是自动定位**：`useEffect` 在 `isOpen` 时若无提醒则把游标算成 `Math.floor((h*60+min)/15)*15` 并 `scrollIntoView()`（DOM 句柄存 `useRef(new Map)`）⇒ ★ **对 V38"默认 17:00"是精确化而非重复**：17:00 只是该规则在当时时段的实例。弹层 `minWidth:236 maxHeight:200 placement:"bottom-start"`，条目 `fontVariant:"tabular-nums"`。
5. ★★ **间隔上限表 `B3={daily:31, weekly:52, monthly:12, yearly:10}`**（@5436349）＋ 钳制器 `T=An=>{const ft=n.interval??1, At=ft>An?1:ft; s(At)}` ⇒ **超上限整条复位 1，不是 clamp**；只在**切频率**时触发（输入时不钳，`~` 到顶后的界面形态未采）。
6. ★ **重复自定义面板自带具名键位作用域**：`zd("TasksRepeatConfigCustomPicker", [{key:"Enter",callback:O},{key:"Escape",callback:F}])`（@5449250）；`O=()=>{L&&(i(f),l())}` ⇒ **Enter 受门控 `L` 提交**，同一 `L` 取反作 `P_n` 的 `isConfirmDisabled` ⇒ **灰按钮 ⇔ Enter 无效**（可屏幕验证的等价对）；`F=()=>{if(j){P(!1);return}if(c){d(!1);return}l()}` ⇒ **Escape 三级降级＝子菜单 → 提醒菜单 → 面板**（与 V53 §7 的编辑器 Esc 三段同族但独立实现）。⇒ `keyboard.md` 的"作用域"维度新增两个可读字面量（本条 ＋ `"collection-v2-date-editor"`）。
7. ★ **面板是七个窄 setter**（`setTaskRepeatInterval`/`Frequency`/`DailyConfig`/`WeeklyConfig`/`MonthlyConfig`/`YearlyConfig`/`setRepeatType`）⇒ 每个 UI 动作只写一个字段；`D=!I&&p==="daily"`、`L=!I&&p==="weekly"` ⇒ **细档只在 `fixed` 下存在**（`flexible` 无日历可锚，也解释了 `Snn` 的 flexible 分支不读 `weekly.days`/`dynamicDays`）。
8. ★ **周/月/年子结构类型互不通用**：`weekly.days` 只收**字符串星期名**、`$_n` **周一起始**；`monthly.days` 只收数字；`yearly.months` 数字且 **1-based**（格式化器 `new Date(2000, months[0]-1, …)`）；`skipWeekends` **只在 daily 与 monthly** 两档；`dynamicDays` 元素 `{selector,type}` **两字段必须成对**（`v1e` 任一缺失即整条丢）。`reminder` 子对象 `mMe` 先判 `enabled` 是布尔否则整块 `undefined`。
9. ★ **两套日期提交态并存**（chunk `DateEditor-Dg3OWyqW.js` 全文 1.45 KB）：集合日期格是**当场合成的假属性** `propMeta={id:"date",…,origSchema:{type:hL.DATE,config:{}}}` 复用通用属性编辑器 `tl`，带 `showApplyButton:true` + `placementOffset:4`，注册名 `"collection-v2-date-editor"` 且关闭走 `isDisabled` 退注不卸载 ⇒ **必须点「应用」**；文档内任务日期是块上一等字段且 **Enter 即提交**（V38 ✓实测）。⇒ G 项 1c 的"提交态"两半都齐了。
10. ★ **`Owe`（schedule 族日期弹层根件）** props 并列 `scheduleDate` / `reminder` / `repeatConfig`，内部 `useState("schedule")` 且唯一切换回调只做 `schedule→reminder` ⇒ 弹层两档、默认 schedule、**该回调不提供反向切换**；`Owe` props 里**没有 deadline 字样** ⇒ V40 的"两族共用选择器"仍成立，但共用点在 `Owe` 之外（`~`）。

### 本地对照（本轮实跑 grep，均已读命中内容）

11. `src/lib/task/recurrence.ts:3-11` = `{freq, days?:number[](0=周日…6=周六), byMonthDay?, until?}` ⇒ **无 `type` / 无 `interval` / 无 `startDate` / 无 `skipWeekends` / 无 `dynamicDays` / 无嵌套 `reminder`**；`grep -n "interval\|startDate\|skipWeekend\|dynamicDays" src/lib/task/recurrence.ts` ⇒ **无命中**。`nextOccurrence:142-194` 一律以传入时刻为基准向后推 ⇒ **本地只有官方 `flexible` 语义且不可切换**。
12. ★★ **提醒语义方向相反**：官方存"当日绝对时刻"，本地 `src/actions/task/task.ts:183-186` 存"相对 `dueDate` 的提前量"（`lead = due - remindAt`，`remindAt = upcoming - lead`）⇒ 同一份重复数据重排后**本地提醒时刻会漂移**；另 `base = task.dueDate ?? task.remindAt`（`:178`）⇒ 无 `remindAt` 时 `lead=0`，**凭空造出一个提醒**。
13. ★ **本地"超出官方"两处**：`until`（`recurrence.ts:10,34,126-136,190-191`，含"裸日期算到 23:59:59.999"的自定义口径）＋ UI「重复结束于」`src/app/(app)/tasks/page.tsx:317-329` ＋ DB 列 `src/prisma/contract.d.ts:426,653,880`（`recurrenceEnd`）。⇒ 与 11 的"本地缺失"合看才是完整差集。
14. ★ **任务面板零键位**：`grep -n "Escape\|Enter\|onKeyDown" src/app/(app)/tasks/page.tsx` ⇒ 只有 `:80-81` 的 `Enter → handleAdd()`；`grep -rn "应用\|showApply\|type=\"time\"\|inputMode" src/components src/lib` ⇒ 只有 `PasscodeGate.tsx:54`（不相关）⇒ **本地无弹层级"暂存＋应用"**。
15. ★ **星期编码双重不兼容**：类型（`number[]` vs 字符串星期名）＋ 周起点（`WEEKDAY_LABELS:47` 周日打头 vs `$_n` 周一打头）。

### 数字与校验

16. **数字刷新**：`gap.md` 628→**635 条（最大 G643）**；`model.md` ＋§一之四十一；`interactions.md` ＋V54；`features.md` 导航表＋1 行、三处计数器更新。**覆盖率 1845/3639 = 50.7% → 1850/3639 = 50.8%**（V54 首次点名一批任务时间 key；余 1789 条在 `missing-keys.tsv`，按既有元结论该仪器**不再用于选题**）。
17. ★ **顺手还清了表格校验的历史欠账**：`check-tables.mjs *.md` 此前报 6 张表列数不一致（`gap.md` L573/L642/L733/L735/L1051、`model.md` L345）⇒ 全是**单元格里未转义的内嵌竖线**（`dark|light`、`first|last`、`loading|ready|error`、`|a-b|`、`"continuationToken|cursor"`）⇒ 逐条按偏移转义后归零；`features.md` 导航表 L76 那一行则是**整条缺了列分隔符**（只有首尾两个竖线），按其自身内容（chunk 解剖 → `internals.md`/`modules.md`，G458–G643 中的 G458–G463）补上落点列。⇒ ★ **教训：`check-tables.mjs` 不带参数时是空跑**（`process.argv.slice(2)` 为空 ⇒ 直接打印 `ALL TABLES CONSISTENT`），今后**必须显式传 `*.md`**。

### 下一批（第 72 批）队列

★ **开场纪律不变**：只发一条 `tab.title()`（本地超时 ≥45 s）判活；通了才准开快捷键面板与沙盒批，且**沙盒写入需重新逐批申请授权**（第 69 批的"全部批准"不延续）。

1. **屏上复核合并清单（V53 ＋ V54，共 11 条）**：① 原子节点门（`math/day/mention/tag` 内 Backspace 直接放行）；② 装饰档一次全清；③ 父块 Shift+Tab 是否级联缩进子树；④ 前块为非文本块＝删自己并选前块；⑤ 文档内联表 >600 格是否走同一棘轮；⑥ `Delete` 与 `Backspace` 的撤销选中不对称；⑦ A 改写为"批量粘贴是否共享同一 `undoRedoPatchId`"；⑧ ★ 重复子菜单**只有 5 行**（4 频率 ＋ 相对于完成）、选频率是否把 `type` 打回 `fixed`；⑨ ★ 提醒菜单是否 96 档 15 分钟步进、无提醒时是否**滚到当前时段**、未设提醒时是否**看不到「无提醒」行**；⑩ ★ 重复面板 Enter/Escape 是否按 V54 §6 生效、灰按钮是否 ⇔ Enter 无效；⑪ ★ 集合日期格是否必须点「应用」而文档日期 Enter 即提交。
2. **G 项补漏（静态）**：`L` 门控循环头、`dO()` 实现体、块级 `reminder` 是否复用 96 档组件、写侧是否补 `type`、`dynamicDays.type` 取值集。
3. **F 只读矩阵**：需单独授权（分享页/协作者身份，属禁区）。
4. **H 表格 >600 面**：需新建沙盒大表（写入授权）。
5. **I 清理**：`6cc9761c` 已获授权删除，仍被停摆挡住；删完做残留三连＋截图。
6. ★ **仍未采到的通用项**：`Ctrl+A` 选中态属性名、`data-slate-zero-width` 全取值、块类型屏幕标识、`o$`/`getIndentChildrenOfBlock` 定义体、`Se`/`k_e`/`O0e` 旗标。

## 第 72 批（静态补账·G 项 1b 结案 ＝ 提醒与排期的耦合本体，2026-09-28 04:05–04:09，零写入 / 零屏幕证据）

★ **连接器**：开场换了**一条新通路**判活 —— `globalThis.BR.tabs.selected()` **40 s 超时**（`BR` 与 `AG` 句柄都还活着）⇒ 停摆 #23 不特指 `tabs.list`，**tab 层任一调用都挂**；加上第 70 批已否证 `tabs.new` ⇒ 三条取标签通路全灭，恢复只能人工。本批 **0 次屏上操作、0 个沙盒实体、无截图无指纹**，未申请写入授权（无写入）。

1. ★★★ **耦合点本体找到**：`@3584560` 的派生函数＝`if (reminder==null || enabled===false || dateOffset==null || 排期日==null || space/doc==null) return; const c = Lm(scheduleDate, dateOffset); onCreateOrUpdateReminder(getNewBlockReminder(space, doc, block, c, title), {dueDate: c.getTime()}, patch)` ⇒ ★ **官方重复任务的提醒存的是"表达式"（排期日＋当日分钟数），真实提醒每次现算**。
2. ★★★ **对账函数 `lj`（@3584756）**：入参并列 `newRepeatConfig / oldRepeatConfig / scheduleDate / repeatingTaskReminder / locale / t / webappUiDispatch`；变化判据**只比 `dateOffset`、不比 `enabled`** ⇒ ★ 官方缺陷候选（单翻开关静默无副作用）；目标时刻 `g = Lm(Pr(scheduleDate ?? new Date()), dateOffset)`（排期空 ⇒ 兜底今天）；**两道幂等守卫**＝`g < Date.now()` return（**过去 ⇒ 静默不更新**）与 `既有提醒.dueDate === g` return；通过后 `onCreateOrUpdateReminder` ＋ ★ **`flashMessage({type:"info", title:reminders.reminder.changed, subTitle:reminders.next.reminder.time{0:dO(dateOffset,locale)}}, 3000, ui)`**；反向分支 `onDeleteReminder(r)` ＋ 同型播报 ⇒ **取消重复会级联删真提醒**。
3. ★★ **结掉 R5 挂账**：`reminders.reminder.changed` / `reminders.next.reminder.time` 两条 key 的行为语义至此定案 ⇒ **「下次提醒时间：[0]」是改后 3 秒 toast 的副标题，不是常驻字段**（`interactions.md` 汇总表 R5 从 `~` 升为 `✓静`，并留屏上复核一项）。
4. ★★ **换算三件套**：`dO@104119`（分钟→`HH:MM` 两位制式，载体是 `Qo()` 当天 ⇒ 只出时刻）、`ole(Date) = h*60+m`（反向）、`Lm(日, 分) → Date`（合成，体未读）⇒ **三者都无时区参数** ⇒ 重复提醒的"时刻"是浏览器本地墙钟。
5. ★★ **提交门控 `L` 从"未读循环头"结成为四档真值表**（@5448520）：`weekly` 要 `days.length>0`；`monthly` 要 `days` 与 `dynamicDays` 至少其一（**判据用 `&&`**）；`yearly` 要 `days` 与 `months` 都有（**判据用 `||`**）；`daily`/`flexible` 恒真 ⇒ ★ **monthly/yearly 不对称**＝官方自身不一致的第二例，且可屏验（年档只选月 ⇒ 确认键该灰）。
6. ★ **面板内 `reminder` 是整字段替换**（`D = ne => p(re => ({...re, reminder: ne}))`）⇒ 与七个窄 setter 并存。
7. ★ **块级提醒是另一个具名组件 `TasksReminderPicker`**（@5417600，`$i("TasksReminderPicker", o)`）：取消分支 `if (!y) { onReminderChange?.(null); onPickSchedule(); return }` ⇒ ★ **"提醒为空 ⇒ 必须先有排期"是代码级的档间跳转**；两条写路径（暂存 `onReminderChange` vs 直接 `lo.onCreateOrUpdateReminder(...,{dueDate},ui)`）；已存在提醒时 `{...n, dueDate}` 整体复用（谓词 `Gl` 体未取到）。⇒ **结掉 V54 §4.8 的 `~`：块级提醒不复用 96 档产物形态**，它走绝对 `dueDate` ＋ `details={type:"block",blockId,documentId}`，标题兜底 `块文本 ?? untitled`。
8. ★ **`dynamicDays` 的 UI 只写 `{selector:"last", type:"day"}`**（@5430810 唯一构造点，勾选态用 `some(...)`），格式化器里的 `selector:"first"` **只被读不被写** ⇒ 模型 > UI 的单向富余档；月份切换 `q_n`（@5433576）是 1-based 数字 **includes-toggle 多选**；空态文案 `commands.select.days.of.the.month`。

### 本地对照（本轮实跑 grep，均已读命中内容）

9. `grep -rn "Date.now()" src/actions/task/task.ts src/lib/task/recurrence.ts` ⇒ **无命中** ⇒ 官方"过去时刻静默不更新"与"同刻幂等"两道守卫本地全缺；`grep -rn "enabled" src/actions/task src/lib/task` ⇒ **无命中** ⇒ 本地提醒是裸时间戳列 `remindAt`（`src/prisma/contract.d.ts:424,651,881`），**没有开关位**，也就没有"表达式 vs 派生态"的分层。
10. ★★ **本地滚出路径主动断链**：`src/actions/task/task.ts:175-203` 的 `rollForward` 新建下一条时写 **`documentId: null, blockId: null`（`:193-194`）** ⇒ 与来源块再无指针，块级提醒与"块内完成态回写"（`:26` `if (!task.documentId || !task.blockId) return`）双双失效。⇒ ★ **更正先前记忆的旧口径**："taskItem 拿不到 blockId"只适用于**滚出的新行**；勾选通路（`:9-14` 按 `attrs.taskId === blockId` 定位节点）是可达的 ⇒ 判类降为**滚出通路单点断链**（新 gap G645）。
11. ★ **反馈环是"有基建未接线"**：`grep -rn "flash\|toast\|notify\|sonner" src/actions/task src/app/(app)/tasks/page.tsx` ⇒ 无命中，但 `src/components/ui/toast.tsx` 与 `src/components/providers/Providers.tsx` **确实提供 Toast** ⇒ 按 §4 的纪律不能写"本地无 toast 能力"，只能写**任务/提醒面未接入**（G647）。
12. **本地无字段级合法性校验**：整页 `disabled` 只有两处 —— `tasks/page.tsx:87`（新建按钮 `adding || !newTitle.trim()`）与 `:320`（「重复结束于」`!task.recurrence`）⇒ 与 G646 对照。

### 数字与校验

13. **数字刷新**：`gap.md` 635→**640 条（最大 G648）**；`model.md` ＋§一之四十二；`interactions.md` ＋V55；`internals.md` ＋§十六；覆盖率上升（本批点名 `reminders.reminder.changed` / `reminders.next.reminder.time` / `untitled` / `commands.select.days.of.the.month`）；`check-tables.mjs *.md` 绿、`key-coverage.mjs` 报数（见 manifest）。
14. ★ **本批把 V54 的两条 `~` 就地结案**（§4.8 块级提醒是否复用同一组件 ⇒ 不复用；§5.2 门控 `L` 判据 ⇒ 四档真值表），并把 R5 的一条提醒 key 升为 `✓静`。⇒ ★ **G 项（1b/1c/1d）至此在码路层全部有本体级证据**，但 §6 屏上判据仍未满足。

### 下一批（第 73 批）队列

★ **开场纪律不变**：只发一条 `tab.title()`（本地超时 ≥45 s）判活；若 `tabs.*` 三条通路仍全灭 ⇒ 直接转静态，不重复消耗预算。沙盒写入需**逐批重新申请授权**。

1. **屏上复核队列扩为 13 条**（V54 的 11 条 ＋ 本批 2 条）：⑫ `enabled` 单独翻转时官方是否真的静默不更新提醒（`lj` 只比 `dateOffset`）；⑬ `yearly` 只选月份 ⇒ 确认键是否真的灰（`monthly`/`yearly` 判据不对称）。
2. **静态待收（优先级序）**：① `getNewBlockReminder` 函数体（提醒对象完整字段集）；② `Lm` / `Pr` 函数体（分钟叠加与午夜归一口径）；③ `lj` 的**调用方清单**（排期日单独改动是否也走对账）；④ `Gl` 谓词体；⑤ `keyboard.md` 作用域列补 `TasksReminderPicker` / `TasksRepeatConfigCustomPicker` / `collection-v2-date-editor` 三个字面量。
3. **F 只读矩阵**：需单独授权（分享页/协作者身份，属禁区）。
4. **H 表格 >600 面**：需新建沙盒大表（写入授权）。
5. **I 清理**：`6cc9761c` 已获授权删除，仍被停摆挡住；删完做残留三连＋截图。
6. 承接：`Ctrl+A` 选中态属性名、`data-slate-zero-width` 全取值、块类型屏幕标识、`o$`/`getIndentChildrenOfBlock` 定义体、`Se`/`k_e`/`O0e` 旗标。

### 附带更正与结案（同批二次读取，落盘阶段）

15. ★ **自纠一处符号类别**：`$i("TasksReminderPicker", o)` 是**具名弹层**注册（`$i` / `cY` 通路），**不是键位作用域** —— 只有 `zd(name, bindings)` 注册键位作用域。⇒ V55 §3.1 与 G648 里"第二个具名作用域"的表述已就地改为"第二个具名弹层"；`keyboard.md` 的具名作用域表只因此添 `TasksRepeatConfigCustomPicker` 一行（13 → **14 个具名上下文**），并显式标注它**不在 `kbd-contexts.mjs` 的 445 站点样本里**（来自 `DateEditor` chunk 补读）。⇒ 教训：**同一产品里两种注册 API 名字相近、参数形态不同 ⇒ 认领前先读签名参数（`bindings` vs `onClose`）**，与 `w0e`/`wVe` 近形名误配同族。
16. ★ **划掉三处旧 `~`（防止下个会话重复劳动）**：`L` 门控循环头判据、`dO` 实现体、"块级提醒是否复用 96 档组件"三条，已分别在 `interactions.md` V54 末节、`model.md` §一之四十一 末节、`gap.md` §三点八二 末节**就地划线并注明结案位置**。⇒ 落盘纪律：**同一结论被新证据推翻或结案时，所有落点（正文＋表格行＋「仍未采到」＋导航行＋记忆）一次改齐**。

## 第 73 批（静态补账·提醒实体与日期原语层 ＋ **当场改判第 72 批一条核心口径**，2026-09-28 04:21–04:29，零写入 / 零屏幕证据）

★ **连接器**：04:20 单条探针（`createBrowserAgent` → `browsers.list()` 秒回、扩展仍 1.7.5 → `browsers.get()` ok → `user.openTabs()` 40 s 超时）⇒ 停摆 #23 依旧，且**连"SDK 侧缓存"的 `user.openTabs()` 现在也挂**；按纪律一条即停、不重试、不 cancel。本批 **0 次屏上操作、0 个沙盒实体、无截图无指纹**，未申请写入授权（无写入）。★ **本批能做的根因**：bundle 本地留存完好（`_harvest/js/` 105 个 chunk，主包 `index-DiTmKH3z.js` 6.8 MB）⇒ 定点反编译不依赖连接器。

1. ★★★ **改判（本批最重要）**：读到 `Lm` 本体（@104956）＝`const n=new Date(t); n.setTime(n.getTime()+e*60*1e3); return n` ⇒ 它是**"时刻加 N 分钟"的偏移器**（与加小时 `y0`、加秒 `zq` 同构），**不是**"分钟数→当日时刻"的合成器。⇒ 于是官方两条派生路必须分开：**`$W`@3584500＝`Lm(nextSchedule, dateOffset)`（相对排期时刻的偏移）** vs **`lj`@3584756＝`Lm(Pr(scheduleDate ?? new Date()), dateOffset)`（先归零 ⇒ 当日墙钟）**。⇒ ★ **同一个 `dateOffset` 在两路里量纲不同＝官方自身不一致第三例**（前两例：G579 退档序反向、§一之四十二 3 的 `monthly`/`yearly` 判据不对称）；⇒ G644 原判"本地方向相反"**降格为**"本地只做其中一路（与 `$W` 同向），缺 `lj` 路的墙钟语义＋两道幂等守卫＋`enabled` 位"。**四处落点已同步加注**（V55 §1 标题与 §1.2/§1.3、§一之四十二 1–2、§十六 1、`features.md` 导航行与 G644 判定列）。
2. ★★ **`$W` 的守卫更正为六条**（reminder 存在／`enabled!==false`／`dateOffset!=null`／`nextSchedule!=null`／`spaceId!=null`／`documentId!=null`），★ **`blockId` 不在守卫里** ⇒ 可产出 `details.blockId===undefined` 的提醒对象；入参真名 **`nextSchedule`**（不是 `scheduleDate`）。
3. ★★★ **提醒实体九字段**（`Pzt`@3127430 逐字）＝`id:Bn()`／`type:"block"`／`spaceId`／`dueDate`（**允许 undefined**）／`isCompleted:false`／`created`／`updated`／`title`（`块文本 ?? untitled`）／`details{type,blockId,documentId}`；★ **实体侧没有 `enabled`/`dateOffset`** ⇒ §一之四十二"两套形状"在实体侧逐字确证；★ `type` 与 `details.type` **双写同值**。
4. ★★ **提醒 API 面十项**（`lo`@3127560）＝`onCreateOrUpdateReminder`／`…WithResult`／`onMarkCompleted`／`onDeleteReminder`／`getNewReminderId`／`isNewReminderId`／`logReminder`／`findReminderByBlockId`／`getTitleForReminder`／`getNewBlockReminder` ⇒ ★ **存在"是否新 id"谓词** ⇒ 未落库提醒以临时 id 存在（造型函数与写入函数分离）。
5. ★★ **提醒列表是缓存投影**（@3127880）＝react-query，`pP=fromMinutes(1)` ⇒ **staleTime＝cacheTime＝refetchInterval＝1 分钟** ＋ `refetchOnWindowFocus:"always"` ＋ `retry:1` ＋ `keepPreviousData:true`；形态 `{incomplete:[], completed:[]}` **两桶**；`Izt`＝按桶**线性扫** `Gl(o) && details.blockId===blockId` ⇒ ★ **缓存未命中＝"这块没有提醒"**（新载入瞬间做完成级联会漏）。
6. ★★ **可找回判据 `Gl`@3121990**＝`type==="block" && details?.type==="block" && spaceId!=null`（三项与运算）。★ 同一段里另有 `o9=t=>t.type==="custom"` ⇒ ★★★ **提醒还有第三种 type `custom`**（不绑块 ⇒ 不被 `Gl` 认、不被 `Izt` 找回）⇒ "两套形状"要读成**两套形状 × 两种 type**；`custom` 的创建入口未采到（`~`）。
7. ★★ **完成级联 `irn`@3875820**＝`findReminderByBlockId(t,"incomplete")` → `Gl(n)` → `onCreateOrUpdateReminder(n,{isCompleted:true})` ⇒ ★ R5 的「已解决」至此有函数级出处；⇒ 官方把"任务完成"与"提醒已解决"建模成**两次独立写入**（可各自失败），不是一个事务字段。
8. ★★★ **快选六档 `rr`@3122040 逐字**＝`20min`（`Lm(now,20)`）／`1hr`／`3hr`／`tomorrow`＝**明天 09:00**（`y0(T5(),9)`）／`next_week`＝**下周一 09:00**（`y0(A4(Qo()),9)`）／`later`＝**显式 `null`** ⇒ ★★ 官方把提醒锚在 **9AM**；★ **"稍后"其实是清空**（菜单允许空值档，与 V54"「无提醒」行仅在已有提醒时渲染"同族）。
9. ★★★ **日期原语一层**（@104434–@106407）＝`Pr` 归零／`Qo` 今天零点／`T5`·`bw` 明昨零点／`B1` 加天 ＋ `sLe`"Must be positive"·`iLe`"Must be negative" **方向断言（越界抛错）**／`ec`·`lLe`·`cg`·`uO` 天周月年（后二者不归一）／`y0`·`Lm`·`zq` 时分秒／`Qce` 本周一（monday-first）／`Yce` 本周周日（sunday-first）／`A4=Pr(dg(Yce(t),8))` 下周一／`Gq{Sunday=0,Saturday=6}`·`IU` 周末判定／`aLe`＝**跳过周末档的实际落点：明天，若周六或周日则下周一**。⇒ ★★ **官方一周两套起点** ⇒ 复刻不能统一成一根 `getDay()`。
10. ★★ **排期缺省规则 `L$`@728375**＝`(repeat, schedule) => repeat==null || schedule!=null ? schedule : Qo()` ⇒ ★★★ **官方不允许"有重复但无排期"的中间态**：刚加重复且排期空 ⇒ **同一次 patch 补"今天零点"**（@5467531 面板确认、@5476567 批量两处调用逐字证实）。
11. ★★ **批量改重复配置的 action 形态**＝`W.length===1 ? W[0] : {type:"group", actions:W}` 一次派发 → **随后** `for…of` 逐条 `sp(...)` ＋ 逐条 `lj(...)` ⇒ `lj` 共 **4 个调用点**（@3586233 单任务／@5467531 面板／@5476567 批量／@6405416 多选批量）⇒ ★ **A 项新增子问：批量改重复后一次 Ctrl+Z 会不会把 N 条提醒一起带回**（取决于 `QB`/`sp` 是否共用 `undoRedoPatchId`，本批未读到）。
12. ★ **`clear-monthly-days` 结案＝不是旗标**：@5430914（年档）与 @5435110（月档）逐字 ⇒ 出现条件是**局部派生布尔**（已选日号 >1 或已有动态日）⇒ ★ **第 72 批"受旗标 `F` 控制"是误读局部变量名**（与 `w0e`/`wVe` 近形名教训同族）；清空动作一次写两字段 `{days:[], dynamicDays:[]}`。
13. ★ **`Lzt`（getTitleForReminder）@3127088**＝按块类型走 `*.in` 文案族（`file.in`／`image.in`／`drawing.in`／`video.in`／`table.in`／`whiteboard.in`，File 优先用 `model.fileName`），其余回落到块文本 ⇒ ★ 提醒标题语义是"**在某个东西里**"。

### 本地对照（本轮实跑 grep，均已读命中内容）

14. `grep -rn "Reminder|reminder" src/prisma/contract.prisma` ⇒ **无命中** ⇒ **本地没有提醒这个模型**，提醒只是 Task 上的裸列 `remindAt`（`src/prisma/contract.d.ts:424,651,881`）⇒ 无 `isCompleted`／`created`／`details`／两桶／轮询宿主（G649）。
15. `grep -rn "isCompleted|remindAt" src/actions/task/task.ts` ⇒ 命中内容里 `isCompleted` 全属 Task（`:159-161` 翻位、`:75-76`/`:86-87` 回写块 `checked`/`status`、`:132` 完成项沉底），★ **没有任何一处把提醒标记为已解决** ⇒ 官方完成级联整段缺失（G650）。
16. `grep -rniE "20min|next_week|tomorrow|later" src --include=*.ts --include=*.tsx` ⇒ 命中经阅读**全是同名异物**（`contract.d.ts:5513` 是 SQL 关键字 `lateral`、`SlashCommandExtension.ts:25` 是注释里的 "later"）⇒ 本地无提醒快选档，唯一入口是 `page.tsx:295-299` 的 `datetime-local`（G651）。
17. `src/app/(app)/tasks/page.tsx:215-217` 的 `update` 是纯合并 `onSchedule(task.id, {...schedule, ...patch})`，`:305` 选重复只发 `{recurrence}` ⇒ **本地允许"有重复无排期"**；`src/actions/task/task.ts:176` 用 `if (!parseRecurrence(task.recurrence)) return` 早退 ⇒ 与官方 `L$` 的"补今天零点"分叉（G652）。
18. 周起点与断言：本地 `src/lib/task/recurrence.ts:47` `WEEKDAY_LABELS` **Sunday-first**、`days:number[]` 语义 `0=Sunday…6` ⇒ 只有官方两套里的那一套（sunday-first），且 `grep -rn "Must be positive|assert|invariant" src/lib/task` ⇒ **无命中** ⇒ 无方向断言（G653）。

### 数字与校验

19. **数字刷新**：`gap.md` 640→**645 条（最大 G653，逐条查重无重号）**；`model.md` ＋§一之四十三；`interactions.md` ＋V56；`internals.md` ＋§十七；★ **覆盖率持平 1853/3639 = 50.9%（missing-keys.tsv 仍 1786 条）**——本批点名的 `*.in` 文案族与 `commands.deselect.all` **早已在其他产物里出现过** ⇒ "点名即升"的预期又一次落空（＝"仪器只认键名字面、不能用来选题"这条教训的第 4 次实证）；`check-tables.mjs *.md` 绿、`key-coverage.mjs` 报数（见 manifest）。
20. ★ **本批同时划掉第 72 批的三条挂账**：`Lm` 本体、`Pr` 本体、`Gl` 本体、`getNewBlockReminder` 本体（四取四得）、`F` 旗标（结案为局部布尔）、`lj` 调用方清单（4 处）⇒ ★ **验证了"定点反编译优于整读 chunk"的换轴方法仍然有效**：本批只查 9 个符号名就结掉 6 条遗留。

### 下一批（第 74 批）队列

★ **开场纪律不变**：一条 `tab.title()`（本地超时 ≥45 s）判活；`tabs.*`／`user.openTabs()` 若仍全灭 ⇒ 直接转静态。沙盒写入需**逐批重新申请授权**。

1. **屏上复核队列扩为 15 条**（V53/V54/V55 的 13 条 ＋ 本批 2 条）：⑭ 批量改重复配置后一次撤销是否带走全部提醒派生；⑮ 快选档"明天/下周一"是否确实落 09:00、`later` 是否等于清空提醒。
2. **静态待收（优先级序）**：① `QB`／`X7e`／`Dzt`／`_zt`／`EW`／`sp` 六个写入器函数体 ⇒ **提醒写入的撤销与协同粒度**（A 项）；② `custom` 提醒的产生方；③ `$W` 的调用点清单与 `lj` 的先后关系；④ `st.flashMessage` 本体（队列/去重/末参）；⑤ `Lzt` 回落分支的截断规则；⑥ `Kce` 断言是否 dev-only。
3. **F 只读矩阵**：需单独授权（分享页/协作者身份，属禁区）。
4. **H 表格 >600 面**：需新建沙盒大表（写入授权）。
5. **I 清理**：`6cc9761c` 已获授权删除，仍被停摆挡住；删完做残留三连＋截图。
6. 承接：`Ctrl+A` 选中态属性名、`data-slate-zero-width` 全取值、块类型屏幕标识、`o$`/`getIndentChildrenOfBlock` 定义体、`Se`/`k_e`/`O0e`、`repeat.type` 写侧默认、`dynamicDays.type` 全集。

## 第 74 批（2026-09-28 04:38–04:57，★ 静态补账·撤销计步器／提醒写入通路／缩进几何／表格硬上限；**零写入、零屏幕证据**）

1. 开场探针 **3 条即停手**（按停摆纪律）：① `browsers.get()` 无参 → 本地报 "requires a browser id"（参数校验先于 RPC）；② 完整开场序列 → **`browsers.list()` 抛 "Browser Agent 只能在当前 Qoder Turn 的 Node REPL 中调用。"**（**不是超时**）；③ `node_repl_reset`（generation 3、绑定全清）后**同 cell**重跑 → 仍抛同一句。⇒ ★ **停摆 #23 改判**：请求没到扩展侧 tab 队列，堵在 SDK 的 turn 守卫；**恢复动作＝换一个新 CLI 会话**，不是"把 Craft 页切前台/点掉原生弹窗"。屏上 A–I 与 `6cc9761c` 删除在本会话结构性不可得。
2. ★★ `_9.applyAction`@787543 全体：门 `(store变 || 有sideEffect) && (undoable || shouldSync)`，内层 `if(undoable)` 才入步骤表；`addStoredBlocksNoSync`@787980 是 `{undoable:false, shouldSync:false}` 的实例。
3. ★★★ 槽规则：`undoRedoPatchId` 命中则**线性扫复用**，否则建在 `patchIndex+1`；`redo.push(...)` 正序尾接、**`undo.unshift(...)` 逆序头插**；`patchIndex: Math.max(槽号, 原值)` ⇒ 融合回旧槽**不前进指针**。
4. ★★ 消费端 `IXe`/`TXe`@768409：undo 一次只动一个槽、指针 `-1`；`canUndo = hasOwnProperty(patchIndex)` ⇒ ★ **空洞即停（改判 §十六 的"可落空洞"）**。
5. ★★★ `N0e`@586609 的 `vQ`：**同一步内同一 blockId 的多条 patch 去重、保留数组末次出现者** ⇒ 一步撤销回"每块动作前态"、redo 到"最终态"；★ V46 非单调指纹序列的机制出处。
6. ★★★ `docDispatchBound`@6441016/6442030：单条 `undo|redo` 被强制 `undoable:false`（不自噬）；`isReadOnly = !documentAccess.canEdit || forcedViewOnlyMode`（★ F 项第二来源）；埋点绑 `shouldSync`；限额**写后**由 `error.userError`（`UO.SUBSCRIPTION_LIMIT_REACHED` / `..._DOCUMENT_LIMIT_REACHED`）弹 `paywall`。
7. ★★ `undoRedoPatchId` 站点逐个读过：媒体/视频/预览族@1203056–1206200、白板 `D$`@712217、tldraw 迁移@4312506/4312659（**插块＋画布＋资源＋失败回滚四段一 id**）⇒ ★ 常规编辑的"一步"只由"一次派发"决定。
8. ★★★ **`a9`@3878711（批量勾选任务）**：`c=Zm()` → 一次 `docDispatch(r.actions)` → `setTimeout(…, hnn)` 补发 `y9e(...)` **仍用同一 c** ⇒ **官方"勾一个重复任务"＝撤销 1 步**；`inboxTaskIds` 走 `completeInboxTasks` **旁路** ⇒ ★ 收件箱勾选不在文档撤销栈（新不对称）。
9. ★★★ **提醒写入通路结案**（跨四份产物的老挂账）：`QB`@3126617 是 `await X7e(...)` 转发；`X7e`@3126147 → `Gl`/`o9` 二分 → `Szt`@3123027（配额门 `Y7e` → `MA` 乐观缓存＋`abort` 回滚 → `setBlockReminder` **8 入参**）⇒ ★ **零 docDispatch**；未知类型 `logger.warn("ReminderActions","onCreateOrUpdateReminder Unknown reminder type")`。
10. ★★ **提醒形状补全**：第 10 字段 `completionDate`（`Dzt`：完成 `Date.now()`／取消 **显式 `void 0`**）；`deeplinkUrl` 用 `mn.buildDynamicDeeplinkToBlock(..., editingAllowed:true)` 现造且**不覆盖已有**；`new_reminder_` 前缀＝未落库；`Lzt`@3126690＝按块型选 `file.in/image.in/drawing.in/video.in/table.in/whiteboard.in`（参数 `{0:容器名}`）→ 才 `textContent || untitled`（**无截断规则**，结案旧挂账）。
11. ★★★ **缩进函数族@600898 首次读全**：`o$@604974`／`K0e@605060`／`nD@604447`／`G0e@604154`／`Aw`／`rze`；★ 子树＝"紧随其后、`indentLevel` 严格更大的连续段"；★ **null 档块既不算子树也不切断**；`G0e` 供删除/移动/转换级联 ⇒ D 项答案。
12. ★★ **表格硬上限** `As`@630585＝`50 行 × 15 列 / 750 格` ＋ 几何 token 一批；超限反馈 `m2e`@698700＝error toast `alert.table.size.limit.reached` ＋ 副标题 `alert.try.smaller.tables`、**4e3 ms** ⇒ H 项答案（**上限不是降级**）。
13. ★ **日期原语补账**：`Pr`@106407 全体（`setHours(0)` 后再 set 分/秒/毫秒＝冗余保险）、`_1o` 日终、`e1e`@106530 `day://YYYY.MM.DD`、`TU`@106714 解析**同吃 `-` 与 `.`**、`Kq`＝`floor(Δms/864e5)`（非日历日差）。
14. ★ **新任务弹窗键位**（`NewTaskPopup-Br4pt8ap.js` @4959）：五个 `C.*` 命令 id 映射 `openSchedule/scheduleToday/openDeadline/openLocation/remindInOneHour` ＋ ★ **`C.UNDO` 也绑在弹窗里**；`REMIND_IN_ONE_HOUR` 用 `getNewBlockReminder(..., new Date(Date.now()+3600000), ...)` ⇒ **绝对时刻**（提醒第三套量纲）；所有 callback `{preventDefault:true, stopPropagation:true}`。
15. 本地对照（实跑 grep）：`undoRedoPatchId|canUndo|patchIndex` **无命中**；撤销来自 StarterKit（`src/components/editor/Editor.tsx:244` 未关 `history`）；`indent` 编辑器侧**零命中**（唯一在 `src/lib/import/markdown.ts:113-168`）；表格上限**无命中**（建表唯一入口 `src/components/editor/slash-menu/slash-commands.ts:172`）；`paywall|quota|limit.reached` **无命中**；`inbox` 只命中页面标题 `src/app/(app)/tasks/page.tsx:73`；`day://|deeplink` **无命中**；★ 本地只读两来源 `src/components/editor/Editor.tsx:147,380` ⇒ **F 项这条改记为同构**（只欠 `forcedViewOnlyMode` 的置位方）。
16. 落盘：V57 ＋ §一之四十四 ＋ §十八 ＋ §三点八五（**G654–G661**）＋ `keyboard.md` §十 ＋ 本日志 ＋ manifest 两行；四份文件旧「仍未采到」就地打删除线（提醒写入器四个结案、`o$` 结案、`Lzt` 截断规则结案）。
17. 校验：`node _harvest/check-tables.mjs *.md` ⇒ **ALL TABLES CONSISTENT**；`node _harvest/key-coverage.mjs` ⇒ **1855/3639 = 51.0%（missing 1784 条）**；`gap.md` 行 **653**、最大 **G661**、行 id **无重复**。

### 下一批（第 75 批）队列

**优先级 0（唯一真瓶颈）**：**换一个新的 CLI 会话**重跑开场序列 `createBrowserAgent() → browsers.list() → browsers.get(id) → user.openTabs() → claimTab() → tab.title()`（≥45 s 本地超时）。若 `browsers.list()` 仍抛 turn 守卫 ⇒ **本会话外的基建问题**，直接回报用户，不再消耗批次。
通了之后按屏上清单跑（**每批开始前先申请该批写入授权**）：
1. 开场先 `ax.pressKey('Control+Shift+,')` 对照 `keyboard.md` 表 A/B/C/D/E，读完 `goto(同一 URL)` 关面板。
2. A 撤销计步：三类动作各一次（批量粘贴 / 多块删除 / **勾选一个重复任务**），`Ctrl+Z` 循环回基线，记次数＋每步 `domSnapshot().length` 序列 ⇒ 验 V57 §2 的四条预测（含"收件箱勾选不被文档 Ctrl+Z 带回"）。
3. ⑰ 提醒不进撤销栈：建提醒 → 改内容 → `Ctrl+Z` 数次，看提醒是否被带回（预期**不会**）。
4. ⑱ 缩进级联：父块＋2 子块，`Shift+Tab` 看子块是否同降；再在中间插一个无档块（图/表）重测。
5. ⑲ 表格上限：建 16 列或 51 行 ⇒ 预期**弹 4 秒 error toast**而非降级；同时数虚拟化节点，核对 `overscan:25` 与指示条 32＋8 / 24＋8。
6. B／C 余项（列表档与装饰档、六段链第 5/6 段）、D 复测、E 复测、F 只读矩阵（**不开对外分享**）、G 任务三时间（可另用三点菜单 `Obe` 入参那条通路交叉）。
7. ★ 提醒配额：在提醒面板反复加到上限 ⇒ 拿到 `Bx` 的实际数值与文案里的数字（当前唯一"数值未知"的官方上限）。
8. I 清理：`6cc9761c`（用户已授权删除）＋ 残留三连 ＋ 截图自证。

### 第 74 批·附记（05:03–05:07，★ 对 V57 §0 的**再改判**：停摆 #23 的真根因＝Edge 窗口最小化 ⇒ 渲染器节流；并找到一条不受 turn 守卫影响的备用通路）

1. **新通路**：`user-browser-use` MCP（与 SDK Browser Agent **不同的桥**）完全可用：`list_pages` 秒回（`groupId 577278463`、`activeTabId 1701771265`），`navigate_page` 把 about:blank 导航到 `https://docs.craft.do/` → **10.1 s 内重定向到 `/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/home`**（★ 登录态确实在，产物里已抹掉任何 query token；本次返回的 URL 本身无 `?s=`）。⇒ **V57 §0 的"要换新 CLI 会话"只对 SDK 桥成立，目标级结论更正：存在能驱动登录态的备用桥。**
2. **但渲染/取数面全废**：`take_snapshot`（含 `verbose:true` ＋ 写文件）⇒ **0 elements / "(empty page)"**；`evaluate_script` ⇒ **返回 `{}`**（与 `browser-design-token-harvest` 记的"playwright.evaluate 恒返回 null"同源）；`take_screenshot` ⇒ **40 s 超时**。⇒ 控制面活、内容面死＝**渲染器被节流**。
3. **根因锁定**：`computer-use list_windows` 显示承载 Craft 的窗口 **"Craft — A fresh take on documents 和另外 4 个页面 - 用户配置 1 - Microsoft Edge"（`msedge.exe`, id 263978）处于 `isMinimized:true`、bounds `(-25600,-25600)`**，且前台是别的应用（iShell Pro）。⇒ **停摆 #23（含此前 19–22 次）的最可能统一解释＝最小化窗口的 Chrome/Edge 渲染节流**，不是扩展队列、也不只是 turn 守卫。
4. **自我修复失败**：尝试 `activate_window(restore:true)` 把 Edge 恢复到前台 → 被 **`browser_url_policy`（url_verification_required / insufficient_url_confidence）在本 turn 内停止 Computer Use**，返回明确指令"停止工作并如实报告"。⇒ 已遵守：**本轮不再用 Computer Use**，也没有对官方站点做任何写入。
5. **给下一批的唯一动作**：**用户手动把那个 Edge 窗口从最小化恢复并保持可见**（不要最小化、不要被完全遮挡）。之后 `take_snapshot` / `press_key` / `take_screenshot` 应恢复，屏上队列 ①–⑲ 与 `6cc9761c` 的授权删除即可开跑；**若仍 0 元素 ⇒ 才需要怀疑扩展/桥本身**，届时再试 SDK 桥（新 CLI 会话）。
6. 纪律侧记：本附记**没有**跑 §2 的开场键位对照（`Control+Shift+,`），因为按键落在被节流的窗口上不可信（"指纹没变"无法归因）⇒ **先恢复窗口，再做键位对照**，顺序不可颠倒。

## 第 75 批·开场探针（2026-09-28 05:11–05:14，**零写入**，仍无屏幕证据 ⇒ 停摆 #24）

1. **同一失败签名原样复现**（约 4 分钟后二次采样，非一次性抖动）：`user-browser-use` 的 `navigate_page https://docs.craft.do/` **10.1 s 成功**并重定向到 `/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/home`（返回 URL 不含 `?s=`）⇒ 登录态在、控制面活；`take_snapshot` 默认（`filter: interactive`）与 `verbose:true` 落盘（`filter: all`，70 字节）**都是 0 elements / "(empty page)"**，`take_screenshot` **40 s 超时** ⇒ 绘制/可及性面仍死 ⇒ **窗口仍处于最小化（或等价遮挡）**，第 74 批附记的诊断成立。
2. **★ 新事实：连接器绑的可能不是用户那扇 Edge**。`user-browser-use list_pages` 只报 **1 个 tab（`about:blank`，标题 "New Tab"）**，而 `computer-use list_windows` 里那扇 Edge 的标题写着"和另外 4 个页面"（5 个 tab）；另一个 `browser-use` 桥同样只报 1 个 tab（"新标签页"）。⇒ 两桥各自连着**连接器自管的浏览器实例**，该实例带同一登录态（同一 space id）。**下一批要留意**：若窗口恢复后 `list_pages` 仍只有 1 个 tab，则"屏上证据"来自连接器实例而非用户界面，需要在产物里注明是哪一扇。
3. **★ 方法更正（覆盖第 74 批附记第 2 条的读法）**：`evaluate_script` 这次喂的是**返回字符串字面量的平凡函数**，仍然**秒回 `{}`** ⇒ 该桥的 `evaluate` 返回通道本身坏（与 `browser-design-token-harvest` 记的"playwright.evaluate 恒返回 null"同源）。⇒ **`{}` 不得再当作"渲染器被节流"的证据**；判节流只准用 **snapshot 元素数 = 0** ＋ **screenshot 超时**这两条。
4. **不做的事**：没跑 §2 的 `Control+Shift+,` 键位对照（同一理由：内容面取不到判据，"指纹没变"无法归因）；没申请、也没执行任何沙盒写入；`6cc9761c` 的授权删除**仍未执行**。
5. **给用户的唯一解阻塞动作**：把承载 Craft 的 **Edge 窗口从最小化恢复并保持可见**（不要最小化、不要被子窗口完全遮挡）。窗口可见后我会：① 先 `take_snapshot` 确认非空 → ② 跑开场键位对照 → ③ **再单独申请第 75 批沙盒写入授权**（A 计步 ⑯⑰、D 缩进子树 ⑱、H 表格上限 ⑲、B/E 退档序）→ ④ 执行已授权的 `6cc9761c` 删除＋残留三连。

## 第 75 批·正文（05:31–05:40，★ 行为级实测·通道＝Craft 桌面端官方 MCP；沙盒写入 1 文档 3 任务，已 LIFO 还原）

★ **本批的最大突破不是结论，是通路**：MCP 清单里有一个 **`craft` server**（`craft_read` / `craft_write`），`connection info` 报的正是同一个 `spaceId=3b788e8c-7aa3-d2e8-fc70-0c112def1581`、`timezone Asia/Shanghai`、深链模板 `craftdocs://open?spaceId=…&blockId={blockId}`。⇒ **停摆 #24 的"内容面全死"只封屏幕，不封这条**；G 项（任务写路径）与 I 项（残留清理）都在它上面结案了。

1. **开场探针复现同一签名**（05:11–05:14，停摆 #24）：`user-browser-use` 的 `navigate_page` 10.1 s 成功 ＋ 重定向到登录态 space home，但 `take_snapshot`（`interactive` 与 `verbose`+`all`）0 elements、`take_screenshot` 40 s 超时 ⇒ Edge 窗口仍最小化。★ **同时更正一条读法**：`evaluate_script` 对平凡字符串函数**秒回 `{}`** ⇒ 属该桥返回通道缺陷，**不得**再当节流证据（详见 V57 §0 附记）。☆ `list_pages` 只报 1 个 `about:blank` 而 Edge 有 5 个页面 ⇒ 连接器很可能自管另一实例，屏上证据出自哪一扇待确认。
2. **用户裁决**：对"要不要继续动态采集/写入授权"两问，答**「全部授权」**（第 75 批写入授权成立，不外推到第 76 批）。
3. **★ I 项结案**：用 `documents resolve-link` 把 web URL 尾段 `6cc9761c` 映射到 rootBlockId `d8af008b`，`blocks get` 确认是零内容空页（`content:[]`、`markdown:''`）后 `documents delete` ⇒ `--location unsorted` 已无、`--location trash` 有 ⇒ **删除确已生效**（用户早前授权的那次清理，被停摆挡了 6 批，本批完成）。★ 顺带纠正一个我差点写进去的假缺陷：`documents list` 不带 `--location` **本来就含回收站**，"删了还在列表里"是作用域口径不是缓存 bug。
4. **★★★ G 项写路径实测**（V58 §1）：fixed weekly（mon/wed/fri）勾选 ⇒ **同 id 原地** `scheduleDate 2026-09-28 → 2026-09-30`（按落点序列）；flexible weekly（mon/fri）⇒ `→ 2026-10-05`（完成日＋7 天）；两条的 `repeat.startDate` **都不前移** ⇒ ★ 官方遗留项「flexible 重排走哪条写路／startDate 是否前移」结案，且**官方根本不新建行**。
5. **★★★ 完成实例的去向**：母块 `type` 由 `text` 变 `page`，长出 **`block_logbook_<uuid>`** 子页（`markdown:"Completed tasks"`）内嵌 `- [x] 标题 (YYYY-MM-DD)` ＋ `completedAt` ⇒ logbook 是**每块内嵌**，不是全局表（本地零命中）。
6. **★★★ 第三态是 `canceled` 不是 `doing`**：`canceledAt`（UTC 毫秒）＋ markdown `~删除线~`（checkbox 不变）＋ 列表符号 `[-]`；★ 且**没有**产生 logbook 子块，与 `--help` 的「done/canceled auto-move to logbook」**矛盾** ⇒ 官方缺陷候选第 4 条（待屏上定案）。本地 `status` 词表 `todo|doing|done` ⇒ **"三态丢失"改记为"词表错位"**。
7. **★★★ 重复即自动挂提醒，默认 `dateOffset:540` ＝ 当日 09:00** ⇒ 第 73 批"锚在 9AM"从推断升级为**写侧默认值实测**；★ `reminders list --status all` 看不到它 ⇒ 重复内提醒不注册成提醒实体（两读待定）。
8. **★★ 一批此前只能靠文案的遗留，被 `--help` 与读回直接结案**：`repeat.type` 写侧默认＝`fixed`；`weekly.days` 是**全名小写字符串**（而缩写用 `mon/wed` ⇒ 日名两套拼写）；`--state` 三值 `todo|done|canceled`；`--location` 三值 `inbox(默认)|dailyNote|document`；`documents delete`＝软删＋30 天自动清除＋`move --destination unsorted` 还原；`blocks get` 的 `contentPreviewMd` 是 `--depth` 截断预览（第三个序列化开关）。
9. **★ 两条新机制事实**：① **一个文档两根 id**（rootBlockId ↔ documentId 是两个不同 UUID，`documents resolve-link` 是映射入口）⇒ 修正"URL 尾段当块根"的用法；② **分号批处理不是事务**（两条 update 的 `completedAt` 差 282 ms）⇒ MCP 逐条派发 ≠ UI 融合成一步，撤销步数不能用 MCP 代理测。
10. **纪律侧记**：本批没跑 §2 的 `Control+Shift+,` 键位对照（屏幕通路仍死）；未碰账户偏好、未开分享、未付费；除 `6cc9761c`（已授权）外**没有改任何非本批新建实体**；`QODER-HARVEST-B75` 已软删并三判据复核；产物内 URL 无 `?s=`。
11. **校验**：`node _harvest/check-tables.mjs *.md` ⇒ **ALL TABLES CONSISTENT**；`node _harvest/key-coverage.mjs` ⇒ **1855/3639 ＝ 51.0%（不变，本批未点名新 i18n key）**；gap **663 条（最大 G671）**。
12. **★ 待用户确认（禁区，未动）**：本空间还有 3 个未分类空文档 `2db38d6b`(2025-05-06)、`5376f8f3`(2026-09-21)、`74c0bb3d`(2026-09-22)，**没有 manifest 归属记录**，不能排除是用户自建 ⇒ 要删请口头确认。

### 第 76 批队列（按价值排序；★ 优先跑"不需要屏幕"的，把 MCP 通路榨干）

1. **★ 零风险·纯 `--help` 穷尽官方 MCP 契约**（写入面全表）：`blocks`/`repeat`/`reminders`/`tasks update`/`collections`/`whiteboards`/`images`/`links`/`daily notes` 逐条 `--help` ⇒ 结掉 §一之四十五 与 §十九 的"flag 全表"欠账；★ 顺带把 `reminders --help` 的"timed alerts on any block"实体形状拿到（可直接对照 G649 的九字段）。
2. **★ `repeat` 其余频率的写侧 JSON**：`tasks add --repeat daily|monthly:1,15|yearly` 与 `--repeat flexible:daily` 读回 ⇒ 结案 `interval` 字段名/缺省、`monthly.days` vs `dynamicDays`、`yearly.months`、★ 间隔超上限（31/52/12/10）在 API 侧是**拒绝还是复位 1**（V54 的钳制 `ft>An?1:An` 屏上预测可在**数据层**先结案一半）。
3. **★ 提醒实体侧**：`reminders --help` 后建**块级提醒**（非重复任务）⇒ `reminders list --status incomplete/completed/upcoming` 是否出现、`completionDate` 第 10 字段是否随勾选写入（§一之四十四 的配额两档数值可能在这里露头）。
4. **★ 集合/表侧**：`collections list/schema/views-list` ＋ `--help` ⇒ 与 §一之四十 的"集合日期需点应用"、G659 的表格上限 50×15=750 对照（API 是否同样拒绝超限）。
5. **屏幕侧（需用户先把 Edge 窗口恢复可见）**：① §2 键位对照；② A 计步 ⑯⑰（★ 注意不能用 MCP 代理，MCP 是逐条派发）；③ D 缩进子树 ⑱；④ H 表格超限 toast ⑲；⑤ B/E 退档序与软换行；⑥ F 只读矩阵（**不得开对外分享**）；⑦ I 项的"回收站二次清空"与截图自证。
6. **本地实现侧（不在采集范围，但本批已给出明确靶子）**：`status` 词表错位（加 `canceled`/去 `doing`）、`rollForward` 改原地改写、`recurrence` 由 String 改结构化 JSON、补 `canceledAt`、`recurrenceEnd` 是官方不存在的超集。

## 第 76 批·正文（2026-09-28 05:51–05:59，★★ 契约面穷尽，**零写入**）

1. **通路**：仍走 Craft 桌面端官方 MCP（`craft_write` 只用来取 `--help` 与 `blocks learn`，**未发任何写命令**）⇒ Edge 窗口最小化（停摆 #24）不影响本批；屏幕类项目继续顺延。
2. **读到的 12 份契约串**：`blocks add`、`blocks move`、`blocks delete`、`reminders create`、`reminders update`、`documents move`、`collections schema-update`、`collections items-add`、`tasks update`、`blocks learn`（顶层）、`blocks learn json limitations`、`blocks learn concepts/tables/task` 与 `richUrl|line|collection` 指南 ⇒ ★ §三点八六 遗留的「`tasks update` flag 全表」与 §十九 遗留的「各子命令 flag 全表」两条欠账**就地结案**。
3. **★ 新立的取证纪律**（本批最重要的产出）：`--help` 文案里**混着给调用方的祈使句**（"用请求者时区推算 tomorrow""DST 歧义要问用户""批量比多条命令快""移动前先记录当前位置"）⇒ **契约文案同属不可信数据**，只当"官方声明"读，不得写成"官方有此行为"；只有**写入后读回的数据形状**才是事实（第 75 批的路子）。⇒ 已回写 `internals.md` §二十 5 与 `features.md` 取证边界声明。
4. **本地对照实跑读到的文件**（每条都读了命中内容，不是只看有无）：`src/components/editor/themes/page-style.ts:1-46`（三组写死枚举：`FontPackId inter/serif/mono/rounded`、`PageThemeId` 六档单色、`WashiId` 六档固定渐变）、`src/components/editor/tabs/FormatTab.tsx:40`（缩进＝`sinkListItem('listItem')`，列表项专属）、`src/lib/import/markdown.ts:113-197`（只有缩进嵌套＋行内五种）、`src/prisma/contract.prisma:123-212`（集合五模型）、`src/components/collection/AddPropertyMenu.tsx:20-32`（13 档类型，snake_case）、`src/actions/collection/properties.ts:19-38`（无上限、无保留名、增量 PATCH、type 不可改）、`src/actions/collection/items.ts:18-68`（行 CRUD 无正文块通路）、`src/actions/document/move.ts:9-21`（三落点混一个 PATCH、无互斥/日记守卫）、`src/components/editor/extensions/divider.tsx:4`＋`Editor.tsx:246`（四档权重、无 `pageBreak`）、`focus-style.tsx:20`（`listStyle` 五值在本地是五个不同节点）、`src/lib/task/recurrence.ts:81-145`（有 DST 两趟校正但缺省 `UTC`，无"请求者→空间"回落链）、`src/actions/task/task.ts:184-187`（重排保相对提前量，与官方"改时刻即重开"相反）。
5. **落盘**：`gap.md` §三点八七（**G672–G681**，663→**673 条 / 最大 G681**）；`model.md` §一之四十六（11 条）；`internals.md` §二十（8 条）；`interactions.md` **V59**（三条状态机/语义，全标 `~`）；`features.md` 导航行＋计数器（673/G681、第 1–76 批）＋真动态残留表新增 **15/16/17** 三项＋「当前唯一阻塞」四条改写；`_harvest/manifest.jsonl` 追加**零写入**记录（无新建实体⇒无还原、无残留）。
6. **校验**：`node _harvest/check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`node _harvest/key-coverage.mjs` ⇒ 覆盖率不变（本批未点名新 i18n key）；★ **G 项编号连续、无重复**。

## 第 76 批·下半（2026-09-28 06:03–06:07，★★ 零写入：三张官方取值全集）

1. **先读 `--help` 再调用**（守 §二十 8 的纪律）：`blocks explore-themes --help` 与 `blocks explore-washi --help` 的自述都是「Browse available …」⇒ 虽住在 `craft_write` 命名空间，语义是浏览 ⇒ 才调用；实测返回纯清单、零副作用。⇒ **判某命令能否安全跑要看语义与自述，不能看在读侧还是写侧表里**。
2. **取到三张全集**：① **页面主题约 150 项具名**（`default`＋`fire-horse`/`old-money`/`golden-hour`/`paris-2024`/`gjjb-craft`/`christmas-glow`/`lovey-dovey`… 含联名与节日档），★ 官方明说「Themes loaded dynamically from S3」；② **washi 图案 6 档几何纹理**（hex/dot/stripe/diagonal/grid/wave）＋「自定义名走同一旗标」；③ **代码主题 19 档**（首档 `auto`＝跟随系统外观；`dracula`/`githubdark`/`gruvboxlight`/`tokyonightstorm`/`vscodedark`…，★ 命名全小写无分隔，与页面主题的连字符制不同）。
3. **两处词表不自洽**：① **一个旗标两套词表**（页面与代码主题都用 `--theme-id`，按块型解释）；② **字体别名映射不规律**：`sans-serif→system`（不是 →`system-serif`）、`serif→system-serif`、`rounded→system-rounded`、`mono→system-mono`，☆ 且 `explore-themes --type fonts` 的标题行**把别名集当规范名清单展示**。另 ★ **主题 id 与显示名可不同**（`fruitymalistic`→Fruity、`new-years-resolutions`→Fresh Start）⇒ 官方另有一层 id/label 双轨。
4. **★★★ 方法学收获（比单条事实更有价值）**：官方样式资源分三层——枚举值在代码里、**主题清单在 S3**、位图走 `blocks search-unsplash` ⇒ **此前 66 批静态 bundle 采集「主题名单未采到」是结构性必然，不是欠账**；复刻时后两层必须当**数据源**处理（含版本漂移与节日上下架）。
5. **本地对照**（读了命中内容才判）：`src/components/editor/themes/page-style.ts:8` 六档硬编码 vs 约 150、`:10` washi 六档是 CSS 渐变（概念不同层）；`grep -E dracula/nord/gruvbox/hljs/shiki/codeTheme` 在 `src` 的命中只有 `slash-commands.ts:107` 里 unordered 含 nord 的**子串假命中** ⇒ 本地**无代码主题子系统**（只 `extensions/code-block-view.tsx` 一个视图）；`grep -iE separator/lineStyle` 在 `src/components/editor` 无命中。
6. **落盘**：`gap.md` §三点八八（**G682–G685**，673→**677 条 / 最大 G685**）；`model.md` §一之四十七（6 条）；`internals.md` §二十 9–10；`features.md` 第二条导航行＋计数器；`manifest.jsonl` 第 56 行（零写入，无残留）。**校验**：check-tables ⇒ ALL TABLES CONSISTENT；key-coverage ⇒ **1856/3639 = 51.0% 不变**。☆ 本批曾踩一次表格转义（grep 串里的裸 `|` 把行撑成 10 列）⇒ 已修，规矩照旧：**产物表格内的正则竖线一律写 `|`**。

## 第 77 批队列（**⇒ 已逐条执行，结果见下方「第 77 批·正文」**；2026-09-28 06:15 用户授权 a–e，本批正文归档本节）

1. **★★ 写入读回类（需授权，沙盒命名 `QODER-HARVEST-B77`，逐个进 manifest、LIFO 还原）**：
   a. **单命令批量的原子性与步数**（G680／残留表 15）：`blocks add --json '[三块, 其中一块故意坏]'` ⇒ 是否部分生效；★ 但**撤销步数不能用 MCP 代理**（§十九 5），屏上才算。
   b. **样式落库形状**（G673／残留表 16）：`--text-color "#111111 #eeeeee"`、`--bg-color`、`--theme-color` 三个同时给 ⇒ `blocks get --format json` 读回是一个串还是两字段、谁覆盖谁；`--backdrop-type gradient` 缺 `--backdrop-colors` 的报错。
   c. **提醒三态与级联方向**（G675／V59 §1、残留表 17）：`reminders create --block <沙盒块>` 有时刻／`--no-reminder-time` 无时刻／`--completed true` 三读 `reminders list --status all`；★ 再看 `tasks update --state done` 是否把该块提醒推进 completed 桶（验证"任务→提醒有级联、提醒→任务没有"）。
   d. **集合上限与破坏性更新**（G676／V59 §2）：建 21 列看报错层级；★ **只做"省略一列"一次**并立刻读回，确认是否真删数据（破坏性 ⇒ 只在 B77 沙盒集合上做，做完即删该集合）。
   e. **`repeat` 其余频率写侧 JSON**（承接第 75 批）：`daily` / `monthly:1,15` / `yearly` / `flexible:daily` ＋ `interval` 越界 ⇒ 结掉 §一之四十五/四十六 两处遗留。
2. **★ 零写入仍可做的**：`blocks explore-themes --type page`、`blocks explore-washi`、`folders explore-icons`、`blocks learn` 其余 guide ⇒ 取主题名/washi pattern/图标全集；★ **先读各自 `--help` 确认无副作用再调用**（它们在 `craft_write` 命名空间下）。
3. **屏幕侧（需用户先把 Edge 窗口恢复可见）**：① §2 键位对照 `Control+Shift+,`；② A 计步（批量粘贴／多块删除，★ 不能用 MCP 代理）；③ B/C/D/E 键位链；④ F 只读矩阵（**不得开对外分享**）；⑤ H 表格 >600 格与超限 toast；⑥ I 项的"回收站二次清空"与截图自证（★ G678 已改判：API 侧永久无解）。
4. **待用户确认（禁区，不得自行处置）**：3 个无 manifest 归属的未分类空文档 `2db38d6b`／`5376f8f3`／`74c0bb3d`。
5. **本地实现侧（不在采集范围）**：`page-style.ts` 由三组枚举改 partial 属性对象（对齐 G673）、`status` 词表错位、`markdown.ts` 补 `<callout>`/`+ toggle` 两扩展、集合类型表与官方对齐（去 `formula`/`file` 或明确标"本地超集"）、`move.ts` 补落点互斥与日记守卫。


## 第 77 批·正文（2026-09-28 06:15–06:22，★★★ 授权写入 a–e ＋ ★ 停摆 #24 解除）

0. **★ 停摆 #24 解除**：用户按请求把承载 Craft 登录态的 Edge 窗口从最小化还原并保持可见 ⇒ `take_snapshot` 恢复 **30 元素**、`take_screenshot` 出 **1528×694** PNG、`navigate_page` **10.0 s** 进文档。★ **新开场纪律＝每批第一步先 `take_snapshot` 看元素数**，为空即停下报告，不要把渲染节流的超时当"官方没这个行为"。⚠ 导航后地址被追加 `?s=<session token>` ⇒ 写产物前必须剥。
1. **★★★ 三条通路同时可用是本批的方法学增量**：MCP（`craft_read`/`craft_write`）写入 ⇒ **web 编辑器无需刷新即渲染** ⇒ 屏幕可作"MCP 造素材、屏幕取证"的标准打法。但**分号批处理不是事务**（第 75 批实测）⇒ **撤销计步（A 项）不能用 MCP 代理**。
2. **a 批量原子性 ⇒ 未决（G693）**：`blocks add --json` 一次插"好块＋故意坏块" ⇒ `MCP error -32603: MCP tool invocation did not complete` ＋ 读回 `content:[]`。**两种读法都成立**（整体回滚／前置校验把整批拦下、好块本就没提交）⇒ **不断言原子**。顺延第 78 批：先用**两条全好块**确认批量头尾序，再屏上 `Ctrl+Z` 数步。
3. **b 样式落库形状 ⇒ 结案（G686）**：`blocks get --format json` 读回 `styling` ＝ **六个字段** `{fontFamily, textColor, backgroundColor, backdrop, themeId, separatorStyle}`。★ **明暗双值不拆两字段**（`textColor` 原样存成一个串 `"#111111 #eeeeee"`）；★ **`backdrop` 是被字符串化的 JSON**（`imageUrl`／`imageBlurHash`／`size:"full"`）；★ **`separatorStyle` 是自定义 DSL 串** `washi(image, <百分号编码 URL>, <blurhash>)` ⇒ **主题＝服务端模板展开的产物，不是引用**（写 `--theme-id` 后屏上即时渲染，`themeId` 与展开出的字段同时留在记录里）。☆ 剩两点未测：`--theme-color` 与 `--bg-color` 谁覆盖谁、`--backdrop-type gradient` 缺 `--backdrop-colors` 的报错形状。
4. **e `repeat` 四频率写侧 JSON ⇒ 结案（G687）**：`daily:{skipWeekends:false}` ／ `monthly:{days:[1,15]}` ／ `yearly:{months:[9],days:[28]}` ／ **`flexible` 也带 `days`**。⇒ ★ **短形态只写频率、从不写 `interval`**（"缺省即键缺失"老约定再成立）；★ **`monthly` 短形态不产生 `dynamicDays`**；★ **`yearly` 的 `months`/`days` 从创建日反推**（不是"无默认"）；★★★ **四档全部自动挂 `reminder{enabled:true,dateOffset:540}`** ⇒ 第 75 批"建重复即 09:00 提醒"从单点升为**四频率通用写侧默认**。☆ 本批**没测** `interval` 越界复位（第 71 批码路 B3 上限表的实测）。
5. **★ 长期挂账结案（残留表 14／V54・V55 的"表达式"读法升为实测）**：`reminders list --status all` 只含**显式创建**的提醒 ⇒ ★ **重复内的提醒永不物化**。本批用"读侧三态"直接对照：显式提醒有两种回执 `Incomplete; scheduled for …Z` ／ `Incomplete; saved for later (no notification scheduled)`，而带 `repeat.reminder` 的任务**始终不出现在同一列表**（G689）。
6. **c 提醒三态 ⇒ 部分结案**：有时刻／无时刻两条实测到；**`--completed true` 未测**（顺延 78 批）；★ 同时**没走** `tasks update --state done` 的级联方向那一半（"任务→提醒有级联、提醒→任务没有"仍只有码路）。
7. **d 集合上限 ⇒ 层级结案（G691）**：`error(VALIDATION_ERROR): Validation failed: properties: Collection cannot have more than 20 columns (properties)` ⇒ **结构化校验层错误 ＋ 点号路径**，不是 CLI 字符串断言、不是裸 500。★ **连带后果**：21 列先被拒 ⇒ 集合根本没建成 ⇒ **「省略既有列＝删列并删数据」这条破坏性动作本批无实体可测**，顺延 78 批（改为"建到恰好 20 列再 `schema-update` 省略一列"）。
8. **★ 契约面新例（G690／G692）**：`collections create` 的 `--name` 与 `--title` **是两个东西**（`--title` ＝ **行标题列的列名**）；`tasks add` 必填 **`--markdown`** 而非 `--title`，且★ **拒绝时会把整张旗标表打出来**（**error as documentation** ＝ 官方把文档写在错误响应里）。⇒ `--help` 示例用缩写 `mon`、实现与列表渲染用全名 `monday` ⇒ 第 76 批"两套拼写"**改判为"示例与实现不一致"**。
9. **★ §2 键位对照未达成 ⇒ 记 `~`**：`press_key('Control+Shift+,')` 返回 `Pressed key: ctrl+Shift+,`，**只证明送达、不证明生效**，面板未出现。⇒ 铁律"指纹没变≠官方没这个行为"生效，第 78 批必须换路（先把光标落进正文再按／改走帮助菜单）。
10. **☆ 还原与残留复核**：`QODER-HARVEST-B77` 已软删、两条提醒已删、`documents list --location unsorted` **干净**、`reminders list --status all` ⇒ `No reminders found`；而 `tasks list --scope all` **仍返回 B77 的 4 条与 B75 的 6 条任务** ⇒ ★ 第 75 批 **G671"任务索引不过滤已删文档"第二次复现**（不是单次偶然）。☆ 回收站二次清空按 G678 属 API 侧永久无解，本批未尝试；☆ **截图自证仅覆盖"样式渲染"与"文档存在/删除"两类，未覆盖任何键位**。
11. **落盘**：`gap.md` §三点八九（**G686–G693**，677→**685 条 / 最大 G693**）；`model.md` §一之四十八（8 条）；`internals.md` §二十一（7 条）；`interactions.md` **V60**；`features.md` 第 77 批导航行＋计数器＋残留表 14–17＋「当前唯一阻塞」整节重写；`manifest.jsonl` 第 57（建）／58（还原）行。**校验**：check-tables ⇒ ALL TABLES CONSISTENT；key-coverage ⇒ 目标 **1856/3639 = 51.0%**（本批读的是 CLI 契约与 JSON 读回，不点名新 i18n key ⇒ 分母分子都不变）。
12. **★ 本批暴露的最大缺口**：屏幕通路**已经可用**，但本批只把它用于"读回渲染"与"截图自证"，**A/B/C/D/E/F/H 的屏上证据依旧为零** ⇒ §6 判据未满足，第 78 批的重心**必须**从数据面转到屏幕面。

## 第 78 批队列（按价值排序；★ 屏幕通路已可用，优先做屏上取证；**开跑前必须重新申请写入授权**，第 77 批的"全部授权 a–e"不作废式沿用无效）

1. **★★★ 开场（零写入）**：① `take_snapshot` 元素数判活（空 ⇒ 停下报告）；② **§2 键位对照换路重试**：先点一次正文块把光标落进正文再按 `Control+Shift+,`，若仍无面板改走帮助／菜单入口；读完用 `goto(同一 URL)` 关面板（**不要找 X**）；③ 面板开着时**禁 `elementInfo` 点查与 `cua.scroll`**。
2. **★★★ A 撤销计步（屏上，§6 首要）**：MCP 造素材（沙盒文档 `QODER-HARVEST-B78`：≥5 块）⇒ 屏上做 ①批量粘贴 ②多选删除 ③跨父块移动，各 1 次，`Ctrl+Z` 循环回基线 ⇒ 记**次数 ＋ 每步 `domSnapshot().length` 序列**（允许非单调，V46／§十八 `vQ` 每块去重已给机制）。★ 另验一条新的：**MCP 写入是否进 web 撤销栈**（若进，则外部通路与 UI 通路共享 undo 栈 ⇒ 本地建模要照此）。
3. **★★ B／C／D／E 键位链（屏上复测，全部已有码路待证）**：B＝空块连按 Enter 的 **缩进→列表→装饰** 退档序（G579"官方自身不一致"是否屏上可感）；C＝块首 Backspace **七档**（第 0 档原子节点放行／第 5 档删前块／第 6 档合并且光标落 `textSelectionIndex = 上块文本长度`）；D＝`Shift+Tab` 是否带动缩进子树（★ 第 67 批屏上曾得"不级联"，与 §十八 `K0e` 位置几何矛盾 ⇒ 必须重测并定谁错）；E＝`Shift+Enter` 是否零效果。
4. **★★ F 只读态矩阵（§一之三十一 白名单 8 项，含 `updateRecordObjectProperty`）**：只看不写，采按钮灰态与集合属性格可改性，补 G584/G588/G603。**★ 禁区：不得开启对外分享或邀请协作者** ⇒ 需要分享页先问用户。
5. **★★ H 表格 >600 格**：沙盒建大表 ⇒ 数虚拟化节点、验证 `overscan:25` 可观测性与"单向棘轮"（缩回小表仍保持虚拟化）；另验 50×15＝750 硬上限的 4 s toast（G660）。
6. **★ 数据面续做（需授权）**：① 批量 `--json` **两条全好块** ⇒ 头尾序，再屏上数撤销步（结残留表 15）；② 集合**恰好 20 列** ⇒ `schema-update` 省略一列，验"删列并删数据"（做完立刻删该集合）；③ `reminders ... --completed true` 三态补齐；④ `--theme-color` vs `--bg-color` 覆盖序、`--backdrop-type gradient` 缺参报错；⑤ `interval` 越界复位（B3 上限表 31/52/12/10）的**写侧实测**。
7. **★ 零写入**：`blocks search-unsplash`、`folders explore-icons`（★ 先各自读 `--help` 确认无副作用，它们在 `craft_write` 命名空间下但可能是纯浏览）；`blocks learn` 其余 guide。
8. **待用户确认（禁区，不得自行处置）**：3 个无 manifest 归属的未分类空文档 `2db38d6b`／`5376f8f3`／`74c0bb3d`。
9. **本地实现侧（不在采集范围，按第 77 批新事实刷新）**：`page-style.ts` 三组写死枚举 ⇒ 改 partial 属性对象（**且 `backdrop`/`separatorStyle` 是字符串化产物 ⇒ 本地若只存 id 就永远对不上官方记录形状**，G686）；`status` 词表错位（`doing` vs `canceled`）；`markdown.ts` 补 `<callout>`/`+ toggle`；集合类型表对齐；`move.ts` 落点互斥＋日记守卫；`recurrence.ts` 补 `fixed` 档与"提醒是表达式不是实体"。
## 第 78 批·上半（2026-09-28 06:31–06:34，★★ 零写入：三个 browse/search 动词 ＋ ★★ 新 blocker＝连接器标签页掉到未登录态）

1. **开场**：`list_pages` ⇒ **只剩一扇标签页且是 about:blank**（第 77 批那扇登录态文档页不在连接器接管列表里）；`navigate_page` → `https://docs.craft.do/` 成功；`take_snapshot` ⇒ **23 元素（页面会渲染）**，内容是**未登录欢迎页**：`欢迎来到 Craft` / `请确认你的邮箱以继续` / `使用 SSO 继续` / 邮箱输入框＋`继续`（disabled）/ `使用 Google·Apple·Microsoft 继续` / reCAPTCHA 声明。⇒ ★★★ **判活结论＝屏幕通路"渲染活着、会话态丢了"**：这与停摆 #24（最小化节流）是**两种不同的故障**，不能用同一套恢复动作。
2. **★ 未做的事（按禁区）**：**没有代填凭据**、没有点任何登录/SSO 按钮、没有读 cookie/storage ⇒ 重新登录属账户级动作 ＋ 有 reCAPTCHA 与邮箱确认，**必须由用户做**。⇒ 已把这一条写进 `features.md`「当前唯一阻塞」与记忆，作为**停摆 #25 候选**（本批未标号：因为连接器本身没挂，扩展与渲染都正常）。
3. **零写入采集（队列第 7 项结案）**：读 `blocks search-unsplash --help`、`folders explore-icons --help` 两份契约 ＋ 两次真实调用（`explore-icons rocket` ⇒ `Icons matching "rocket" (1-1 of 1):`；`explore-icons ""` ⇒ `Please provide a search term.` ＋ 整张 usage）。⇒ **G694（图库检索双落点＋署名进模型）／G695（图标词表不可穷举）／G696（四动词能力分级）**；★ 本批**未实调 `search-unsplash`**（结果含他人作品 ⇒ 按铁律不入仓）。
4. **★ 本地对照（读命中内容，不是计数）**：`src/components/editor/panels/PageStylePanel.tsx:5`（`lucide-react` 直 import）／`:15`（`icon: string | null` 裸串）／`:31-35`（12 个写死封面色）／`:54-67`（封面＝手粘 URL 输入框 → `coverImage`＋`coverType:'image'`）／`:69-74`（纯色封面走 `coverType:'color'`）⇒ 全仓 grep 的 `backdrop` 命中**都是 Tailwind 的 `backdrop-blur` 工具类**（`AppPageHeader.tsx:22` 等），**不得**当作"本地已有背景子系统"。
5. **落盘**：`gap.md` §三点九〇（**G694–G696**，685→**688 条 / 最大 G696**）；`model.md` §一之四十九（4 条）；`internals.md` §二十二（5 条 ＋ 本节仍未采到）；`features.md` 导航行＋计数器＋「当前唯一阻塞」新增第 7 条（未登录态 blocker）；`manifest.jsonl` 第 59 行（零写入，无残留）。**校验**：check-tables ⇒ ALL TABLES CONSISTENT；key-coverage ⇒ **1857/3639 = 51.0%**（★ 实测从 1856 涨 1：本批产物文本顺带点名了一个官方 key，属命中而非采集目标；无倒退）。
6. **☆ 自我约束**：G696 明写"不判缺陷，是取证侧判据"；`--cover-attribution` 的落库键位、图标词表规模、`search-unsplash` 响应字段集三项**全部记为未采**，没有用"官方应有/必无"收口。

## 第 79 批队列（★★ 先解 blocker，再动沙盒；**开跑前必须重新申请写入授权**）

1. ★★★ **需要用户做的一个动作**：把**已登录 Craft 的那扇窗口/标签页**交给 Browser Connector（或就地重新登录），使 `list_pages` 里出现登录态页面 ⇒ 恢复后第一步仍照纪律：`take_snapshot` 元素数 → 再走 §2 键位对照（`Control+Shift+,` **先聚焦正文**，仍无效则改走帮助/菜单入口）。
2. ★★★ **A 撤销计步**（§6 首要，需屏幕）：MCP 造沙盒素材（`QODER-HARVEST-B79`，≥5 块）⇒ 屏上批量粘贴／多选删除／跨父块移动，各 1 次，`Ctrl+Z` 回基线 ⇒ 记次数 ＋ 每步 `domSnapshot().length` 序列；★ 顺带定案「**MCP 写入是否进 web 撤销栈**」（internals §二十一 遗留）。
3. ★★ **B／C／D／E 键位链屏上复测**（D 项必须定谁错：第 67 批屏上"不级联" vs §十八 `K0e` 位置几何）。
4. ★★ **F 只读矩阵**（★ 禁区：不得开对外分享／邀请协作者）。
5. ★★ **H 表格 >600 格**与 50×15＝750 硬上限的 4 s toast（G660）。
6. ★ **数据面续做（需授权）**：批量 `--json` 两条好块＋屏上数撤销步；集合恰好 20 列 ⇒ 省略一列验"删列删数据"；`reminders --completed` 三态；`--theme-color` vs `--bg-color` 覆盖序；`--backdrop-type gradient` 缺参报错；`interval` 越界复位；★ **`--cover-attribution` 写入后读回落库键位**（本批新留）。
7. ☆ **可选（零写入）**：`explore-icons` 逐词枚举以估图标词表规模（只记规模不记全表内容）；`blocks learn` 其余 guide。
8. **待用户确认（禁区）**：3 个无 manifest 归属的未分类空文档 `2db38d6b`／`5376f8f3`／`74c0bb3d`。
## 第 79 批·清账段（2026-09-28 07:18–07:19，★ 用户三答：屏幕＝"我把登录态标签页交给连接器"／授权＝"全部 A–H＋数据面 6 项"／3 个空文档＝"确认是采集遗留，删除它们"）

1. **删除前先读回内容 ⇒ 发现授权前提有错，只执行了其中 1 个**：`blocks get --depth 2` 三读 ⇒ `2db38d6b` **确实零内容**（只有空 `<pageTitle>`）；`5376f8f3` **正文有一段中文指令文本**（本仓库 1:1 复刻开发的五点要求 ⇒ 属用户自己的内容，不是遗留，★ 按"他人/非本批内容不入仓"的铁律**产物里不复述全文**）；`74c0bb3d` **正文是三个 `合集` 集合、各含三条空 `collectionItem`**（不是空页）。⇒ 只删了 `2db38d6b`，另两个**停手并把纠正后的事实回报**，请用户重新确认 `74c0bb3d`。
2. **执行与复核**：`documents delete --document 2db38d6b…` ⇒ `Deleted document … (moved to trash)`（软删）；`documents list --location unsorted` ⇒ 3 条（`Welcome to Craft` ＋ 上述两枚）；`documents list --location trash` ⇒ **4 条**（`2db38d6b`／`d8af008b`／`QODER-HARVEST-B75`／`QODER-HARVEST-B77`）⇒ 回收站二次清空仍受 G678 限制（API 结构性无解，只能 30 天自动清除）。
3. **★ 命名空间差分新条（G697）**：在同一次 `craft_write` 调用里把 `documents list` 跟在 `documents delete` 后面 ⇒ `Unknown command: documents list` ＋ **打印 write 侧 `documents` 的动词全集＝create／move／delete**（`list` 只在 read 侧）。⇒ **纪律：一次调用只走一个命名空间，读一律回 `craft_read`**；同时这是"官方 CLI 无共享常量表"的第四例。
4. **☆ 屏幕仍未就绪**：`list_pages` 只有 `https://docs.craft.do/` 一扇，`take_snapshot` 23 元素但仍是**未登录欢迎页** ⇒ 用户侧的"交给连接器"还没生效 ⇒ **本批 A–H 取证未开始**（未授权空等，也没代填凭据）。
5. **落盘**：`gap.md` §三点九一（**G697–G698**，688→**690 条 / 最大 G698**）；`features.md` 残留表 11 行改写＋计数器；`manifest.jsonl` 第 60 行；记忆刷新。**校验**：check-tables ⇒ ALL TABLES CONSISTENT；key-coverage ⇒ 报当前值（本段读的是 CLI 命令表与文档内容，不点名 i18n key ⇒ 预期不变）。

## 第 79 批·正队列（★ 授权已拿到，但**第 1 项被屏幕会话卡住**；等登录态标签页到位后立即开跑，无需再次申请授权）

1. ★★★ **开场**：`take_snapshot` 必须出现登录态内容（正文块／侧栏）而非欢迎页 ⇒ 再走 §2 键位对照（**先点正文块聚焦**再按 `Control+Shift+,`，仍无效改走帮助/菜单入口）。
2. ★★★ **A 撤销计步**：`craft_write` 造沙盒文档 `QODER-HARVEST-B79`（≥5 块，逐个进 manifest）⇒ 屏上做 批量粘贴／多选删除／跨父块移动 各 1 次 ⇒ `Ctrl+Z` 回基线，记次数 ＋ 每步 `domSnapshot().length` 序列；★ 顺带定案"MCP 写入是否进 web 撤销栈"。
3. ★★ **B／C／D／E** 键位链屏上复测（D 项定谁错）。
4. ★★ **F 只读矩阵**（★ 禁区：不开对外分享、不邀请协作者）。
5. ★★ **H** 大表 >600 格 ＋ 50×15＝750 上限 toast。
6. ★ **数据面 6 项**（不依赖屏幕，可先行）：`--json` 两条好块 ⇒ 头尾序；集合恰好 20 列 ⇒ 省略一列验"删列删数据"（做完即删该集合）；`reminders … --completed true` 三态；`--theme-color` vs `--bg-color` 覆盖序；`--backdrop-type gradient` 缺参报错；`interval` 越界复位；`--cover-attribution` 写入后读回落库键位。
7. ☆ **待用户重新确认**：`74c0bb3d`（三个空「合集」）是否删；`5376f8f3` 属用户内容 ⇒ **不动**。
8. ☆ **本地实现侧（不在采集范围）**：`page-style.ts` 对齐 `styling` 六字段与字符串化产物（G686）；`status` 词表错位；`markdown.ts` 两扩展；集合类型表；`move.ts` 落点互斥；`recurrence.ts` 补 `fixed`；图标改存官方名＋映射层（G695）；补素材检索与署名字段（G694）。
## 第 79 批·数据面（2026-09-28 07:21–07:23，★★★ 全部授权后首次执行「不依赖屏幕」的 6 项写侧探针；沙盒已 LIFO 还原）

1. **开场**：屏幕侧 `list_pages` 只有 `https://docs.craft.do/`、`take_snapshot` 23 元素但内容仍是**未登录欢迎页** ⇒ **A–H 未开跑**（用户答应的"把登录态标签页交给连接器"还没生效），⇒ **改跑队列第 6 项（数据面 6 项，不依赖屏幕）**。
2. **沙盒**：`documents create --title QODER-HARVEST-B79` ⇒ `rootBlockId b7b17b7b-5722-9a72-2ce9-ad5d040936e4`／`documentId 8845e79a-8a9e-6146-1590-173c44873090`（回执一次给全三套标识，见 §一之五十 7）；块 2 条、任务 1 条、提醒 1 条**全部本轮新建**。
3. **探针结果**（详见 `gap.md` §三点九二 G699–G704 与 `model.md` §一之五十）：批量 `--json` 两条好块 ⇒ **保序成功、原子性仍未定**；`--theme-color` vs `--bg-color` ⇒ **不互相覆盖，各成一个字段**；`--cover-url`＋`--cover-attribution` ⇒ 落进 `coverImage{url, unsplashAttribution}`（★ 自造 URL 也被记成 `unsplashAttribution` ⇒ 实现泄漏）；`--repeat weekly --interval 99` ⇒ ★★★ **读回整键消失**（不钳制、不复位，是丢弃）⇒ API 侧写不出 `interval`；`reminders update --completed true` ⇒ **`Completed at …; scheduled for …` 两刻并存** ⇒ `completionDate` 升级为实测；`--backdrop-type gradient` 缺色 ⇒ **第三种错误形状（裸文案＋`Hint:`）**。
4. **★ 通路踩坑两次**：① 在同一次 `craft_write` 里跟一条 `documents list` ⇒ `Unknown command` ⇒ **读写命名空间必须分开调用**（G697）；② 用 `--id` 调 `reminders update` ⇒ 报 `Invalid, duplicate or missing option` ＋ **中止同批后续命令** ⇒ ★ 教训：**故意失败的探针要放最后**（本批因此第一次没跑成 `--backdrop-type gradient`，第二次单独补跑成功）。
5. **还原（LIFO）与残留复核**：`documents delete --document b7b17b7b…` ⇒ moved to trash；`reminders delete --reminder 6a821d5f…` ⇒ Deleted；复核＝`documents list --location unsorted` ⇒ **回到 3 条**（`Welcome to Craft`／`5376f8f3`／`74c0bb3d`）、`reminders list --status all` ⇒ **`No reminders found`**；☆ 回收站现 **5 条**（`2db38d6b`／`d8af008b`／B75／B77／B79）⇒ 受 G678 限制**无法主动清空**。☆ 已知 `tasks list --scope all` 仍会返回已删文档的任务（G671 两次复现）⇒ 不再重复测。
6. **落盘**：`gap.md` §三点九二（**G699–G704**，690→**696 条 / 最大 G704**）；`model.md` §一之五十（8 条）；`internals.md` §二十三（5 条）；`features.md` 导航行＋计数器＋残留表 15/17；`manifest.jsonl` 第 61 行；记忆刷新。**校验**：check-tables ⇒ ALL TABLES CONSISTENT；key-coverage ⇒ 见本批运行输出。
7. **☆ 本批没做（诚实记账）**：集合"恰好 20 列⇒省略一列"的破坏面；`tasks update --state done` ⇒ 提醒级联；`--backdrop-colors` 正确写法的落库形状；A/B/C/D/E/F/H 全部屏上项。

## 第 80 批队列（★★ 屏幕优先；**开跑前必须重新申请写入授权**，第 79 批的"全部授权"不作废式沿用无效）

1. ★★★ **屏幕就绪判定**：`list_pages` 必须出现**已登录的 Craft 页面**（不是欢迎页）⇒ `take_snapshot` 元素含正文块／侧栏 ⇒ 才走 §2 键位对照（**先点正文块聚焦**再按 `Control+Shift+,`，仍无效改走帮助/菜单入口，读完 `goto(同一 URL)` 关面板）。
2. ★★★ **A 撤销计步**（§6 首要）：MCP 造 `QODER-HARVEST-B80`（≥5 块，逐个进 manifest）⇒ 屏上做 批量粘贴／多选删除／跨父块移动 各 1 次 ⇒ `Ctrl+Z` 回基线，记次数 ＋ 每步 `domSnapshot().length` 序列；★ 顺带定案「MCP 写入是否进 web 撤销栈」与「一次 `--json` 批量＝几步」（G699 的尾巴）。
3. ★★ **B／C／D／E** 键位链屏上复测（D 必须定谁错：第 67 批屏上"不级联" vs §十八 `K0e` 位置几何；C 补第 0/5/6 档）。
4. ★★ **F 只读矩阵**（★ 禁区：不开对外分享、不邀请协作者）＋ **H** 大表 >600 格与 750 上限 4 s toast。
5. ★ **数据面续做（需授权）**：集合恰好 20 列⇒省略一列；`tasks update --state done`⇒提醒是否进 completed 桶；`--backdrop-colors` 正确写法的 `backdrop` 形状；`--washi-pattern` 自定义名。
6. ☆ **零写入**：`explore-icons` 逐词估图标词表规模；`blocks learn` 其余 guide。
7. **待用户确认**：`74c0bb3d`（三个空「合集」）是否删；`5376f8f3` 属用户内容 ⇒ 不动。
8. **本地实现侧（不在采集范围，本批新增三条）**：`page-style.ts` 补 `themeColor`/`backgroundColor` **双字段并存**（G700）；素材落库用**通用 attribution 键名**、不要沿用 `unsplashAttribution`（G700）；重复规则要么支持 `interval` 要么显式丢弃，**别默默吞掉越界值**（G701）。
## 表格转义规矩修正（2026-09-28 第 79 批踩坑，两条）

- ★ 旧规矩「正则竖线一律写成 反斜杠+竖线」**是错的**：check-tables.mjs 按裸竖线切列、不认反斜杠转义 ⇒ 表格单元里出现 grep 的或运算（A 竖线 B）会把该行撑成多一列（本批 L1419 报 8 列 vs 表头 7 列）。**正确做法＝表格里的列举一律改用顿号或斜杠（A、B、C 或 A/B/C），单元格内不出现任何竖线**。
- ★ 同批一次自伤记录：在 Git Bash 里用 node -e 做批量替换时，正则里的反斜杠被 shell 吞掉，退化成逐字符匹配，把 gap.md 的 8 行表格写成「每个字符之间插一个斜杠」的形式（只影响那 8 行，已逐行按原文重写，check-tables 复绿、max G704、覆盖率 1857/3639）。⇒ **凡带反斜杠的批量替换，一律写成 .mjs 文件再跑，不要用 node -e**。

## 取证通路现状快照（2026-09-28 07:29–07:30，★★★ 三条屏幕通路全部探到边界；这一段是给下个会话省时间的，不涉及 Craft 产品事实）

1. ★★★ **§1 里记的开场序列已经过时**（SDK 随 Qoder 0.4.2 换了形状）：`createBrowserAgent()` 仍然可用，但浏览器对象上**没有 `openTabs()` 也没有 `claimTab()`**；现在的成员是 `browser.{browserId, capabilities, tabs, user, documentation, nameSession, history}` 与 **`tabs.{new, get, selected, list, content}`**，agent 根对象只有 **`{browsers, documentation}`**；`browser.capabilities` 是**空对象**。⇒ **照 §1 的字面写会直接 TypeError**，正确起手是 `br.browsers.list()` → `br.browsers.get(id)` → `browser.tabs.list()`。
2. ★★★ **`tabs.list()` 返回空数组 `[]`**，而同一条 MCP 通道 `browser-use.list_pages` 能看到一枚 `https://docs.craft.do/`（未登录欢迎页），`computer-use.list_windows` 又能看到那扇标题为「所有文档」的 Edge 窗口（`isForeground:true`、未最小化、bounds 正常）⇒ **三个观察面给出的"有哪些页"互不一致**：SDK 的共享列表为空、连接器 MCP 只有一枚未登录页、操作系统窗口层里登录态 Craft 就在前台那扇 Edge 里。⇒ **判"屏幕能不能用"必须三面对照，任何单面都不算数**（此前只按 `take_snapshot` 非空判活，会误判成"能用"）。
3. ★★ **操作系统窗口清单里没有 Craft 桌面端进程**（13 扇里只有 Edge / Qoder / Comet / WPS / Chrome about:blank / iShell / 豆包 / cc-switch / UU远程 / 设置×2 / 微信 / 文本输入），所以**"用 computer-use 直接驱动桌面端 Craft 做屏上取证"这条路当前不成立**（`craft` MCP 仍能读写同一个 space ⇒ 桌面端在跑，但没有可驱动的可见窗口）。⇒ 别再把它当备用屏幕通路。
4. ☆ **chrome 那扇 about:blank 窗口是另一枚可导航的浏览器**，但它的会话态与登录态 Craft 无关；把 Craft 深链或文档 URL 猜出来往里塞属于「猜后端协议」禁区 ⇒ 未做。
5. ★★★ **结论与下一步**：屏上取证（A/B/C/D/E/F/H）在**会话交出来之前无解**，唯一解锁动作还是用户的：**把已登录那扇 Craft 标签页交给 Browser Connector（在该页里点扩展的共享/接管），使 `tabs.list()` 或 `list_pages` 里出现带正文的 Craft 页**。第 80 批开场判活序列改为四步：`tabs.list()` 与 `list_pages` 双向对照 → `take_snapshot` 元素数 → 快照内容必须是正文而非「欢迎来到 Craft」→ 才走键位对照。

## 第 79 批·下半 B79B ＋ 第 80 批开场（2026-09-28 07:33–07:45）

1. **B79B 已结案并落盘**：集合 20 列整表替换破坏面、backdrop 逗号分隔与字符串化 JSON、separatorStyle 双形态、theme-id 一次写五字段、washi 与主题 130 条全集、任务与提醒互不级联、删文档后三索引残留、reminders create 契约、四动词读写清单。产物：gap.md 三点九三（G705 至 G716，708 条）、model.md 一之五十一、internals.md 二十四、manifest 66 行。check-tables 绿（中途踩到一次裸竖线：TS 联合类型 string 或 null 必须写死文字，已入规矩）。

2. ★★ **屏幕通路在第 80 批开场时确认恢复**（用户 07:44 报告已登录）：browser-use MCP list_pages 返回已登录标签页 docs.craft.do/s/zhangs-Space--3b788e8c…/home，take_snapshot 得到 44 个元素的中文首页树（未分类 3、最近删除 6、与我共享 0、我的模板 0），OS 层与 API 层三方对上 ⇒ 上一段记的「三面对照不通」已解除，屏幕侧 A 到 H 全部解禁。

3. ★ **第 80 批第一条键位探针失败待续**：Control+Shift+逗号 按下后返回的快照与首页逐字节一致（无 dialog、无新节点）⇒ 判为静默失效而非官方无此行为。下一轮换通路顺序：a) 同一键再按一次并立刻 includeSnapshot；b) 用 Meta+Shift+逗号（Web 端可能按 Cmd 注册）；c) 先点进编辑器任意文档体再按（焦点栈 UIFocusStack 的 229 短路只在非编辑器焦点时成立）；d) 兜底走 设置 入口进快捷键页。键盘面板读到后立刻 goto 同一 URL 关闭。

4. **第 80 批队列（按价值排序，★ 开跑前必须重新申请本批写入授权）**：屏幕侧 A 撤销计步（批量粘贴、多块删除，每步记 domSnapshot 长度序列）、B 空块 Enter 逐级退档、C 块首 Backspace 七档、D Shift+Tab 是否带动缩进子树、E Shift+Enter、F 只读态矩阵（禁区：不开对外分享）、G 任务三时间弹层、H 表格 600 格以上降级面；I 已完成（B79 与 B79B 均已 LIFO 还原，残留只剩回收站与任务索引这两层不可清）。

## 第 80 批·开场（2026-09-28 07:44–07:49，零写入、零新实体）

1. ★★ **屏幕通路确认就绪**：`user-browser-use`／`browser-use` MCP 有已登录标签页（`docs.craft.do/s/zhang…-Space--3b788e8c…/home`），首页快照 44 元素、文档态 83 元素，站内「最近删除 6」与 API 侧 `documents list --location trash` 的条数一致 ⇒ 三面对照首次同时成立，上一段记的「三面对照不通」作废。
2. ★★★ **判决性结论＝键盘通道不到页面、点击通道到**（`gap.md` §三点九四 G718）：`press_key` 发 `Control+Shift+,`（首页态与文档态各一次）、`Escape`、`?` 共三次都回 `Successfully pressed key`，但**返回快照逐字节不变**——连带 Close 按钮的浮层都关不掉；紧接 `click(uid)` 打顶栏问号，**同一工具同一页立刻**产生可观测 DOM 变化（浮层四节点消失＋新增 focused 的 `Loading Circle Icon`）。⇒ §2 的键位对照继续挂 `~`；**A／B／C／D／E（全靠键盘）在修好键盘通道前不可采**；**F 只读态、G 日期弹层、H 表格降级、信息面板、命令菜单（点击驱动）现在就能跑**。
3. ★ 顺带采到三条屏上事实：G717 进文档弹「在桌面应用中打开？」非模态提示（含账户级「记住我的选择」复选框，本轮**未碰**）、G719 首页态与文档态的侧栏与顶栏入口集不同（文档态多 `新建文档`／`任务`／`日历`／`连接`＋问号＋三档视图切换＋每行首的多选 checkbox）、G720 URL 三形态并存且 `nd` 出现在**服务端渲染的 href** 里。

4. **第 81 批队列（★ 开跑前重新申请本批写入授权）**：
   a. ★★ 先修键盘通道再谈 A–E，候选顺序＝`user-browser-use` 备份桥的按键 → Browser Agent SDK 的 `ax.pressKey` → OS 层 computer-use 键盘 → **请用户手按一下做人工对照**（能立刻分辨是「派发没到」还是「官方没绑」）。
   b. ★ 零写入即可做的 F：用 `Ellipsis`（expandable）、行首 checkbox、三档视图按钮走信息面板／多选批量条／视图切换，采按钮灰态与可点集；★ 禁区不变（不开对外分享、不勾「记住我的选择」、不改主题）。
   c. ★ G 与 H 需要沙盒写入（新建文档＋任务＋大表），等授权；「`craft` MCP 造素材、屏幕取证」的打法仍有效，但**撤销计步不能用 MCP 代理**（分号批处理不是事务）。
   d. ☆ 问号点击后那个 focused 的 `Loading Circle Icon` 是什么（帮助浮层／外链／新标签页）未再取快照 ⇒ 下批第一步先补这一眼。

5. **规模**：`gap.md` 712 条（最大 G720）、`model.md` 到 §一之五十一、`internals.md` 到 §二十四、`manifest.jsonl` 70 行（全部合法 JSON）；`check-tables` 与 `key-coverage` 见本批结尾输出。

6. ☆ **本批自伤一条（务必带走）**：用 shell 的 `printf` 追加带反引号的中文正文时，反引号被 bash 当命令替换吃掉，整段行内代码被删空并把命令名当指令执行。⇒ **凡带反引号、竖线、美元符的正文一律写进 .mjs 脚本文件落盘，不走 shell**。修补后本段即为实证。
7. ☆ **第 80 批追加两条（07:51，仍零写入）**：G721＝「在桌面应用中打开？」浮层**挡点击**（要展开文档头 `Ellipsis` 时连接器回 `Element is covered by another element at its clickable point`）⇒ 处理它才有头区可点，而它不吃键盘；G722＝备用桥 `user-browser-use` 握着**过期 tab id**（`No tab with given id 1701771266`）⇒ 用它前必须先重新绑定 tab，键盘能否在二桥生效**仍未验证**。规模改为 `gap.md` 714 条（最大 G722）。下一批第一步＝点浮层的 Close 把它消掉再碰头区按钮。

8. ★★★ **第三条键盘通路（OS 层 computer-use）被平台治理拒绝，不是 Craft 拒的**：`list_windows` 里目标窗口确实存在＝Edge 进程 `msedge.exe`、id `263978`、标题「所有文档 - 用户配置 1 - Microsoft Edge」、`isMinimized:false`、`isForeground:false`、bounds 满屏；对它发 `press_key`（X-style `Control_L+Shift_L+comma`，带 `post_action_include_screenshot`）**整轮被服务端终止**并回 `browser_url_policy`／`url_verification_required`／`insufficient_url_confidence`，消息原文要求「Stop your work … note why Computer Use ended」。⇒ **OS 通路不可用**（与第 74 批 `activate_window` 被同一策略拒绝同源）；键盘证据目前只剩「用户手按」这一条外部路径。
   ☆（第 96 批卫生项并回：本条与上面 1–7 条同属第 80 批·开场，原文因错 cwd 追加到了 `features/todo-actions.md` 根目录游离文件；manifest 侧三行同因由 `features/manifest.jsonl` 并入 `_harvest/manifest.jsonl` 尾部（现 109 行），游离文件已删。）

## 第 81 批日志（2026-09-28 08:03–08:18，★★★ 快捷键面板首次屏上穷尽（点击通路）＋ H 表格降级结案 ＋ 任务索引还原死锁；沙盒 `QODER-HARVEST-B81` 已按新流程还原）

**授权**：本批写入授权由用户于批前明确给出，范围＝仅新建 `QODER-HARVEST-B81` 文档＋任务＋大表，做完 LIFO 还原＋三索引残留复核。**实际写入清单**（全部落在该沙盒文档内）：1 个任务块、1 个误建的 text 块（管道表原文）、1 个 41×15 真 table 块。未碰任何非本轮实体、未改账户级偏好（`记住我的选择` 仍未勾）、未开分享、未付费。

**通路进展**
1. ★★★ §2 的键位对照**从 `~` 升为已完成**：面板经 `帮助菜单 → 快捷键` 点击唤出，7 个分类逐段抓全文（`_harvest/b81-panel-all.txt`），共 219 枚键帽。
2. ★★★ `browser-use.evaluate_script` **确认可返回真实页面数据**（4 次成功）⇒ 结构量测改走 evaluate，快照只用于取 uid；★ 含大表的页面**禁止 take_snapshot**（节点数千级，一次吃光预算）。
3. ★★ `take_screenshot` 报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … visibilityState=hidden` 后，窗口恢复可见即成功（`_harvest/b81-doc-initial.png`）⇒ 截图故障要分"通路"与"窗口不可见"两类；后者恢复动作永久归用户。
4. ☆ `navigate_page(/editor/d/<space>/<docId>)` **30 s 超时但导航实际成功**（`title` 与 `location.href` 证实）⇒ 大页面上该工具的超时不代表失败，下一步先用 evaluate 复核。

**结案与更正**
- ★ **推翻本地断言**：keyboard.md §八 的「分组没有默认快捷键」错（面板印 `组合 Ctrl+G`／`取消组合 Ctrl+Shift+G`）；已同步改文本身。
- ★ **H 结案**：615 格表**不降级、不虚拟化**（容器 `scrollHeight==clientHeight==1305`、560/560 值叶全在 DOM、`<table>`/`[role=gridcell]` 全 0、每格一个 `div[role=textbox]` 编辑器实例）⇒ `overscan:25` 在 web 上无可观测对象；详见 gap G728、model 一之五十二③。
- ★ **G678 表述更正**：回收站**30 天自动彻底清除**，"不可清空"仅指 API 无主动 purge；还原＝`documents move --destination unsorted`。
- ★ **新采集纪律**：LIFO 还原必须 **`tasks delete` 先于 `documents delete`**（反了会被 `Cannot modify document in trash` 卡住）。
- ★ **手按键盘复测的前置条件**：必须在**所有浮层已关**的干净态做（浮层吞键会使"没反应"失去归因能力）——本批用户那次手按即因此**不可定性**，A–E 仍待复测。

**未满足项（如实报告）**：§6 的 A–I 完成判据**未满足**。A／B／C／D／E 屏上证据仍为零（键盘通路未修）；F 需对外分享的单独授权；G 未跑（本批沙盒含大表，快照不可用 ⇒ 需另建纯净任务沙盒）；H 已跑但只到"不降级"这一结论、UI 侧扩列撞 toast 未做；I 部分：本批沙盒已清，但发现**历次批次遗留 10 条孤儿任务**（B75×4／B77×4／B79×1／B79B×1）仍在 `tasks list --scope all`，属"非本轮新建实体"，本批**未动**。

## 第 82 批队列（按价值排序）

1. ★★★ **零浏览器预算的面板对账**：读 `_harvest/b81-panel-all.txt` 七段原文，与 `keyboard.md` 表 A–E 逐条比，补完剩余 ~200 条键位的屏上确认列；顺带裁 G726（回主 chunk 重读 `Cae()` 与 `ADD_ROWS_BEFORE` 定义，判"面板 Windows 串"与"我们抄的 Mac 列"谁错）。
2. ★★★ **清 10 条孤儿任务**（需用户口头点头）：每条走 `documents move --destination unsorted` → `tasks delete --task <id>` → `documents delete --document <rootBlockId>`，做完 `tasks list --scope all` 复核；★ 注意 B75-T1／B75-T2 各有"完成实例"与"下一次实例"两条，都要删。
3. ★★ **G 任务三时间弹层**：申请第 82 批写入授权，只建 `QODER-HARVEST-B82`（**只放任务块，不放表**），走点击通路逐个开 计划／截止／提醒 三弹层，量 `taskData` 三套编码的可见变化与"重复子菜单无结束档"，配 evaluate 指纹。
4. ★★ **键盘通路修复尝试（干净态）**：先 `navigate_page(同一 URL)` 关掉一切浮层，再 `press_key('Control+Shift+,')`；若仍无指纹变化，则 A–E 定性为"本连接器不可采"，改走 `blocks learn`／bundle 静态通路，并考虑向官方报告连接器键盘派发缺陷。
5. ★ **`blocks learn`（不带参数）**枚举 topic 全集 ⇒ 一份尚未开采的平行契约文档。
6. ★ **UI 侧扩列撞 600／750 门**：在纯表沙盒里用 Alt/`Ctrl+Shift+⏎`（或点击行尾 +）扩到上限，抓 toast 文案与时长 ⇒ 补 G728 的另一半。
7. ☆ F 只读态矩阵：仍等对外分享的单独授权；未拿到前保持 `~`。
8. ☆ 长尾屏：`_viewport_1ltym_9` 表的列向溢出、表头行 DOM 是否同构、三档视图切换按钮、多选 checkbox 批量操作条。

## 第 82 批·上半日志（2026-09-28 08:24–08:30，**零写入批次**：G726 裁定 ＋ `blocks learn` 契约面 ＋ 面板逐条对账；沙盒实体＝0）

**做了什么**
1. ★★★ **G726 结案 → 键位描述符是"主描述符 ＋ `winMatcher` 第二匹配式"两件套**（直读 `_harvest/js/index-DiTmKH3z.js` 偏移 16762／16890／17138／17387／17614／17776）：`Vn`=只约束按键、`Co`={meta}配{ctrl}、`ci`={meta+shift}配{ctrl+shift}、`JI`={meta+shift+alt}配{ctrl+alt}、`zr`={meta+alt}配**{ctrl+shift}**、`y2`={alt}无 winMatcher。⇒ ① **`keyboard.md` 表E 的两列本来就没错**（分抄主描述符与 winMatcher），列名要改称"主描述符／Windows 匹配式"；② ★ **官方在 Windows 上有真实键位冲突**：`ADD_ROWS_BEFORE`(`zr`) 与 `ADD_COLUMNS_AFTER`(`ci`) 的 winMatcher 逐字段相同、按键同为 Enter ⇒ 面板把同一个 `Ctrl+Shift+⏎` 印给两条命令（gap **G732／G733**，internals **§二十六**）。★ 判类＝**有意偏差候选**：本地建议不照抄该冲突，并写清原因，否则下个会话会当成漂移改回去。
2. ★★ **`blocks learn` 是一份平行的官方契约文档**（gap **G734／G736**）：多主题一次调用可用、以 `────────` 分隔；`concepts` 主题给出 `blocks get --format json`（★ 与 `collections items-get --format` 只吃 text/markdown **不对称** ＝ 无共享常量表第六例）、`blocks update --markdown` 必须有 `--id`、JSON 载荷与 MCP 工具同 schema；`text` 主题给出**子树一次写入的 `content` 数组**、正文字段 `textStyle／textAlignment／font／cardLayout`、`listStyle` 五值封闭；★ **topic 解析会悄悄落到别的 topic**（`task` → 返回 `text`，而 `reminder` 明确告知未命中）⇒ 读 learn 结果要核对首行的 topic 名。
3. ★ **通路两条**（gap **G735**）：`blocks learn`（无参数）在本连接器上**传输层失败**（两次独立复现，`MCP error -32603`）⇒ topic 全集改走"按候选名逐个试"；`navigate_page` 30 s 超时**但导航其实成功** ⇒ 超时不等于失败，重发前先复核。
4. ★★ **面板 ↔ 表 A–E 逐条对账**由并行任务写入 `keyboard.md` **§十二**（4 列、逐条覆盖 219 枚键帽、判定四分：一致／屏上补全／语义名不同／冲突）。★ **主会话未复核前不要引用该节的判定计数** —— 下批第一件事＝读 §十二 抽样核对若干行与 `_harvest/b81-panel-all.txt` 原文是否一致（含"不许凭常识补键位"这条是否被遵守）。

**规模**：`gap.md` **728 条（最大 G736）**；`internals.md` §二十六；`features.md` 三处计数器已同步；`check-tables.mjs` → ALL TABLES CONSISTENT；`key-coverage.mjs` 基线 51.2%（1862/3639），§十二 落盘后需重跑（只许升）。**未 git commit。**

## 第 83 批队列（第 82 批下半未做，需新授权）

1. ★★ **申请第 83 批写入授权**：仅新建 `QODER-HARVEST-B83`（**只放 2–3 个任务块，绝对不放表**），走点击通路跑 **G 任务三时间弹层**（计划／截止／提醒 三个入口逐个开，屏上量 `taskData` 三套编码 ＋ 重复子菜单"无结束"档），配 `evaluate_script` 指纹与截图。★ 面板证据已给出三条独立键位入口（G727），但键盘通路不可用 ⇒ 只能靠点击找入口。
2. ★★ **复核 `keyboard.md` §十二**（抽样对照原文）＋ 把 表E 的列名从"Mac 串／Win 串"改为"主描述符／Windows 匹配式"，并在 表B 的 `RENAME ⇧⏎` 行标注"面板称「编辑页面区块」"。
3. ★★ **清账 10 条孤儿任务**（B75×4／B77×4／B79×1／B79B×1）＝需要用户点头；配方＝`documents move --destination unsorted` → `tasks delete --task <id>` → `documents delete --document <rootBlockId>`（第 81 批实测有效）。
4. ★ **干净态键盘复测**（决定 A–E 是否永久不可采）：先 `navigate_page(同一 URL)` 关掉一切浮层 → `take_snapshot` 确认无 menu/dialog → 再 `press_key('Control+Shift+,')` → 比指纹。若仍无变化，则该实验由**用户在确认无浮层后**手按一次，我再比指纹。
5. ★ **`winMatcher` 全量枚举**：扫键位注册表（偏移 3641223 一带）统计有多少条命令带 winMatcher、有多少条像 G733 那样跨命令撞车；顺带读全 `na(t)` 与 `QM(t)={...t,w...}`。
6. ★ **`blocks learn` 候选 topic 逐个试**（`line`／`code`／`toggle`／`callout`／`quote`／`page`／`image`／`collection`／`daily`），每次核对首行 topic 名是否真命中。
7. ☆ F 只读态矩阵：仍等对外分享的单独授权。

## 第 82 批·下半 B 日志（2026-09-28 08:36–08:46，★★★ **G726 结案**；`winMatcher` 全量枚举；零写入、零浏览器调用）

**做了什么**：纯本地。① 复核并行任务写进 `keyboard.md` 的 §十二（面板 ↔ 表A–E 逐条 89 行对账），采信并就地更正本文件三处旧口径（§十一 的 `Ctrl-O`／`CtrlAltShiftT`"新增"说法、§八 的「评论没有默认快捷键」）；② 回主 chunk 读**键表注册顺序**，把塌键裁定掉；③ 全量枚举 `winMatcher`（12 处，逐处读内容）；④ 本地 `src` 侧对照（无平台判定、三处修饰键 OR 折叠、无 `code` 通路）。

**新增**：gap **G739–G744**（`### 三点九八`，730→**736 条，最大 G744**）；`internals.md` **§二十七**（键表顺序表 ＋ 三条机制结论）；`keyboard.md` 表E 的 `ADD_ROWS_BEFORE` Windows 列标注"塌键且不派发"。
**结案**：★★ **G726**（Windows `Ctrl+Shift+⏎` 派发给"添加列·右"，"在前面添加行"该平台键盘不可达；两张表同序，见 G742）；★ **G733** 从"存在冲突"推进到"冲突有胜者"（原"不照抄"结论保留）；☆ 静态债"`winMatcher` 全量枚举"结掉（G740：只有十个工厂 ＋ 一条内联特例 `NO_LIST`）。
**通路/工具层**：★ 新技法＝**遇键位冲突直接读那张 `matcher:` 列表的下标顺序**（两次 `indexOf` ＋ 一段切片，成本远低于反编译 handler）；☆☆ **本批出过一次产物事故**：用 `sed 's/\\|\\|/或/g'` 清理表格转义竖线，BRE 把 `\|` 当交替 ⇒ 在每个字符间插"或"并吃掉首个命中点之后的正文。已把 `gap.md` 截回追加前的 1537 行并重写本节。⇒ 规矩：**表格单元内不写 `\|`（改写中文"或"）；改正文只用 Write／Edit 或 node 的 `split().join()`，不得用带反斜杠的 sed 模式**。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1862/3639 = 51.2%（未倒退，本轮无屏上内容故未上升）**。
**§6 进度**：A/B/C/D/E 屏上证据仍为 **0**；F 仍等对外分享的单独授权；G 的日期弹层仍未取；H 已结案（无降级）。⇒ 目标未完成。

## 第 83 批队列（按价值排序；前 3 项都需要**新的写入授权**）

1. ★★ **申请第 83 批写入授权**：仅新建 `QODER-HARVEST-B83`（**只放 2–3 个任务块，绝对不放表**），走已验证的点击通路跑 **G 任务三时间弹层**（计划／截止／提醒三个入口逐个开）＋ 重复子菜单"无结束"档，取 截图 ＋ DOM 指纹 ＋ 点击顺序；做完 LIFO 还原 ＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（合成键通路已具备，见 G737）：在沙盒块内先点出焦点，再逐条派发 `Enter`／`Backspace`／`Tab`／`Shift+Tab`／`Ctrl+Z`，每条结论标"**合成键驱动**"（置信度低于 OS 级；不表征字符输入／IME／`beforeinput`）。A 撤销计步要记每步 DOM 长度序列。
3. ★☆ **表格塌键的屏上复核**（把 G742 从"静态裁定"升为"实测"）：沙盒表格里合成派发 `Ctrl+Shift+Enter`，看实际增的是列还是行。**若与静态结论相反，以屏上为准**。
4. ☆ 孤儿任务清理（10 条，需单独口头确认）：逐条 `documents move --destination unsorted` → `tasks delete --task <id>` → `documents delete --document <rootBlockId>`。
5. ☆ 静态：`QM` 在 `ot` 具名注册表里的完整清单（判"哪些键在 Windows 根本不存在"）；三张未成表的键表顺序（正文 @3641223 一带、任务/集合列表 @6300153–6303617）；`N9e`／`Nsn`／`lF`／`zA` 函数体；`yae`／`iEe`／`lEe` 经 `ot` 使用的命令清单。
6. ☆ `keyboard.md` 遗留：⤒／⤓ 字形归属（若 ⤒ 实为 ↑ 则 文档类"选择到顶部"应对 `SELECT_TO_TOP_MAC`）；表B 内部 `MOVE_BLOCK_TOP_MAC` 与 `SELECT_TO_TOP_MAC` 的 Win 串自撞；表A 的 `TITLE`／`HEADING` 同名与 `STRONG`"强调"vs 面板"粗"两处回改；表E 列名语义改标"主描述符／Windows 匹配式"。
7. ☆ **F 只读态**：仍需要用户明确开口才能开分享页（禁区清单内）。

## 第 82 批·下半 C 日志（2026-09-28 08:48–08:57，★★★ **找到面板自己的构造源**；`ot`／`ho`／`hnt` 三张键位注册表全量枚举；零写入、零浏览器调用）

**做了什么**：纯本地读 bundle ＋ 用 `_harvest/i18n-zh.tsv` 回查文案 key。原计划只是"补三张键表顺序"，实际撞出了更有价值的东西：**面板有一份独立的数据源**（@2112400–2119000），于是"面板印了什么"从"权威事实"降级为"当前设备的可见视图"，而它反过来能解释面板与派发层的两处不一致。

**新增**：gap **G745–G751**（`### 三点九九`，736→**743 条，最大 G751**）；`internals.md` **§二十八**（`Zp`／`JX`／`k9t` 三个装配器 ＋ 三张注册表的形状差异 ＋ "判某键是否存在要看三处"的技法）；`keyboard.md` **§十三**（18 段 → 7 tab 对照表、三处平台/浏览器裁剪、`ho` 工厂归属逐条印证 表D、`ot` 66 项的 Windows 位移家族统计）＋ 表B／表C／表D 就地更正。

**结案与推翻**：
- ★★ 消解 §十二 遗留"表B 内部 `MOVE_BLOCK_TOP_MAC` 与 `SELECT_TO_TOP_MAC` 的 Win 串逐字相同、面板里没有 `CtrlShift↑` 无法裁定" ⇒ **`_MAC` 条目只在 Mac 面板出现**（`JX()` 与三处 `Ll ?` 三元证实），非 Mac 根本不进面板。
- ★★ 表D 的 Windows 列首次获得**逐条第二方对照**（`ho` 的工厂归属：`TOGGLE_DONE=YM`、`SET_CANCELLED=lEe`、`SET_CANCELLED_SLASH=QM(zr(code Slash))`…），与第 81 批屏上串全部吻合。
- ★★★ **推翻本地一条旧文案判定**：表B `RENAME` 的"官方中文＝重命名"在语言包里**没有该 key**（`commands.rename` 查无），官方文案是 `commands.edit.block.page`＝编辑页面区块 ⇒ 属本地文档错误，已就地更正；§十二 对应判定降级。
- ★ 新判定类别：**"源里有、渲染没有"**（面板源有 `assistant.assistant`＝助手，屏上「编辑」段没印）⇒ 面板条目还受功能开关裁一层；今后用面板判"官方无此绑定"要先排除这一类。
- ☆ `TOGGLE_ASSISTANT` 与 `ADD_TABLE_ROW` 描述符逐字相同（`Co(oo)`）⇒ AI 助手与"添加行"撞键，**谁赢未裁定**。

**校验**：`check-tables.mjs` 全绿；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（＋4 条，因本批把面板源里的 i18n key 逐字引入产物）**；`features.md` 的覆盖率行与 `MEMORY.md` 索引已同步。★ 另：`check-keyboard.mjs`（把 表A–E 的解码值与 `keyboard-decoded.tsv` 对照）一度因我把"塌键不派发"的注解写进 表E 的 Windows 单元而多报 1 处不一致 ⇒ 已把注解移到表下注记，回到"2 处旧转义差异"的基线（教训：**给解码对照表用的单元里不要加解释性文字**）。
**更正落盘复核（2026-09-28 09:01，追加段）**：★ 上面那句"已把注解移到表下"当时**并未生效**（patch 脚本要找的单元文本没带 `**`，匹配 MISS），本轮按 `keyboard.md:141` 的实际内容重做后才真的把 `ADD_ROWS_BEFORE` 的 Windows 单元还原为 `Ctrl-Shift-⏎`，塌键说明只留在 :153 的表下注记 ⇒ 三个仪器现全绿：`check-tables.mjs *.md` ALL TABLES CONSISTENT、`key-coverage.mjs` 1866/3639 = 51.3%、`check-keyboard.mjs` 一致=83 / 不一致=2（仅 `FOCUS_DECOR`、`TOGGLE_LEFT_SIDEBAR` 两处旧反斜杠转义差异）。☆ 同轮顺带把 `features.md` 的覆盖率行补到 51.3%，并把 `_harvest/missing-keys.tsv` 的条数按其内容订正为 1773（此前写 1783）。⇒ 规矩再加一条：**脚本里 `replace()` 成功与否必须打印，任何"已更正"的批次日志要在仪器上复跑一遍才算落盘**。
**§6 进度**：A/B/C/D/E 屏上证据仍为 **0**；F 仍等对外分享的单独授权；G 的日期弹层仍未取；H 已结案。⇒ **目标未完成，不许标 complete**。

## 第 83 批队列（更新版；1–3 需**新的写入授权**）

1. ★★ 申请第 83 批写入授权：仅新建 `QODER-HARVEST-B83`（**只放 2–3 个任务块，绝对不放表**）⇒ 走点击通路跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；截图 ＋ DOM 指纹 ＋ 点击顺序；LIFO 还原 ＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（合成键通路已具备）：沙盒块内先点出焦点，再逐条派发 `Enter`／`Backspace`／`Tab`／`Shift+Tab`／`Ctrl+Z`，结论一律标"合成键驱动"。A 要记每步 DOM 长度序列。
3. ★☆ 塌键的屏上复核（把 G742 从静态升为实测）＋ `TOGGLE_ASSISTANT`/`ADD_TABLE_ROW` 撞键裁定（同一次沙盒会话内可顺带做）。
4. ☆ 静态收尾（零写入，仍可继续产出）：① 面板源按 section 做大括号配平 → 穷尽"面板源共多少条"，并核对"文档"tab 的段标题；② `ot.tableShortcuts` 子组成员；③ `k9t` 非 Mac 分支读全；④ `MOVE_BLOCK_*_MAC` 派发点所属上下文；⑤ 平台位 `_d`／`JAe`／`gae`／`k2` 是否参与键位选取。
5. ☆ 孤儿任务清理（10 条，需单独口头确认）：逐条 `documents move --destination unsorted` → `tasks delete --task <id>` → `documents delete --document <rootBlockId>`。
6. ☆ `keyboard.md` 其余遗留：⤒／⤓ 字形归属；表A 的 `TITLE`／`HEADING` 同名与 `STRONG`"强调"vs 面板"粗"（现可判为"面板 key 与表A key 不同源"，需查表A 那两行的 key 名是否也在语言包里）；表E 列名语义改标"主描述符／Windows 匹配式"。
7. ☆ **F 只读态**：需要用户明确开口才能开分享页（禁区清单内）。

## 第 83 批·上半日志（2026-09-28 09:01–09:11，★★ **快捷键面板第二次独立复现 ＋ `Escape` 只弹一层的屏上实测 ＋ OS 级键判决收窄**；零写入，`browser-use` MCP ＋ 页内合成事件，截图仍为零）

**做了什么**：① 按 §2 开场动作复跑面板通路 —— `press_key('Control+Shift+,')` 仍唤不出（a11y 快照 97 项逐项不变、`[role=dialog]` 为 0），改走"帮助菜单 →「快捷键」"，用页内派发 `pointerdown/mousedown/pointerup/mouseup/click` 打开；② 逐个切 7 个分类，每跳记 `outerHTML.length` 与 `_variantActive_` 回读值，并 `filePath` 落盘分类原文；③ 本地写解析器 `_harvest/p83-parse-panel.mjs`（按 `._categoryTitle` / `._sectionTitle` / `._rowName` / `._rowAlternative` / `._keys` 五层类名切表）把 HTML 解成 `section｜name｜keys` 行；④ 用 `Escape` 关面板并查残留；⑤ `navigate_page` 同 URL 复原，复核 `role=menu/menuitem/dialog/group` 全部归零、`h1` 回到「所有文档」。

**新增**：gap **G752–G757**（`### 三点一〇〇`，743→**749 条，最大 G757**）；`interactions.md` **V64**（弹层栈、逐类 DOM 序列、通路判决收窄、异步判据）；`keyboard.md` §十一 追加"二次复现"段 ＋ §采集方法更正 第 5 条（仪器伪 DIFF，禁止改正文）；证据件 `_harvest/b83-panel-tab-{heji,tongyuan,wendang,renwu,bianji,yangshi,zhengli}.*`（json／unescaped.html／parsed.txt 三件套）与 `_harvest/b83-panel-dump.txt`。

**结案与收窄**：★★ **`取消 esc` 由 `~` 升为 ✓ 实测**，同时拿到更细的机制——官方弹层是栈，Esc 关栈顶后**下层帮助菜单回显**（`opacity:1`、`pointer-events:auto`，G752），本地九处各自独立的 `Escape` 关法缺这层语义；★★ **V63 的"OS 级键没进页面"判得过宽** —— 同一条 `press_key` 通道驱动了 `Escape`，只是驱动不了键表注册的 `Ctrl+Shift+,`（G753）；★ **帮助菜单六项**逐字成文，且确认「Markdown 快捷方式」是与面板并列的**第二个入口**（G754）；★ 面板 DOM 结构与七类行数（7／4／15／13／27／6／17＝89）二次复现一致 ⇒ 第 81 批不是抖动（G755）；☆ 面板默认落在上次选择的分类 `合集`，判 `~`（G756，未做重载复测）。

**通路/工具层（本批最贵的一条）**：★★ **派发合成事件后立刻取指纹会假判"静默失效"** —— 点「快捷键」当场 delta＝0，400 ms 后才出现 dialog（＋5,615 字节）。⇒ 判据改写为：**"指纹没变"必须等 ≥400 ms 之后再判**（G757）；本会话此前若干"点击静默无效"结论应按这条复核。另：`take_snapshot`（Playwright 无障碍树）**看不见**自绘菜单与面板条目，而 `evaluate_script` 看得见 ⇒ 结构判据优先走 evaluate，`take_snapshot` 只用来拿 uid。
**事故（要记住）**：用 `node -e "…split('\\\\|')…"` 清理草稿里的转义竖线时，bash 双引号把模式吞成了裸 `|`，于是**把草稿表格的每一个分隔符都替换成了"或"**（草稿 `b83-gap.md` 结构全毁，只能整份重写为 `b83-gap2.md`）。⇒ 规矩：**任何带反斜杠的匹配/替换只能写进 `.mjs` 文件再跑，绝不经 `node -e` 的双引号命令行**；产物表格单元内一律不写转义竖线。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（本轮无新增 i18n key 引用，持平）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（两处为上条所述**仪器伪差异**，已就地写明勿改正文）。
**§6 进度**：面板/弹层族首次拿到**跨两条通路**的屏上证据；但 **A/B/C/D/E 的按键效果仍为 0**，F 仍等对外分享的单独授权，G 的三时间弹层仍未取，H 已结案（无降级）。⇒ **目标未完成，不许标 complete**。

## 第 83 批·下半队列（1–3 需**新的写入授权**；4–6 零写入即可做）

1. ★★ **申请第 83 批·下半写入授权**：仅新建 `QODER-HARVEST-B83`（**只放 2–3 个任务块，绝对不放表**）⇒ 走点击通路跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 DOM 指纹序列 ＋ 新增文本集合 ＋ `data-state` 计数（截图仍受 `visibilityState=hidden` 阻塞）；做完 LIFO 还原 ＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口内顺路）：焦点先落在沙盒正文块，每条键**先 `press_key` 再合成键兜底**并在结论里标注驱动通路；A 撤销计步要记每步 `outerHTML.length` 序列（已知非单调，不能按单调判）。
3. ★☆ 塌键的屏上复核：沙盒表格里派发 `Ctrl+Shift+Enter` 看增列还是增行（G742 由静态升为实测）；同场裁 `TOGGLE_ASSISTANT` 与 `ADD_TABLE_ROW`。
4. ~~**零写入**：读「Markdown 快捷方式」那个入口的内容（一次点击 ＋ 一次 dump）；G756 的持久化复测（关面板 → 同 URL 重载 → 重开，看当前分类是否仍是 `合集`）。~~ ★ **两项均已在「第 83 批·上半尾记」做完**：入口＝站外 help center（gap **G758**），G756 **结案为 ✓ 实测**（分类选择跨整页重载保持）⇒ **不要重复跑**。
5. ☆ 静态：面板源按 section 做大括号配平以穷尽"面板源共多少条"；`ot.tableShortcuts` 子组成员；`k9t` 非 Mac 分支读全；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 两处站点的所属上下文；平台位 `_d`／`JAe`／`gae`／`k2` 是否参与键位选取。
6. ☆ `keyboard.md` 其余遗留：表A 的 `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名语义改标"主描述符／Windows 匹配式"；⤒／⤓ 字形归属（本轮屏上再次见到 `Ctrl Shift ⤒/⤓` 与 `Alt ⤒/⤓` 两族，可与 §八 对照结案）。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。

## 第 83 批·上半尾记（2026-09-28 09:12–09:26，零写入；结掉队列第 4 项，并 ★★ 推翻本批自己的判据口径）

**做了什么（三步，全零写入）**：① 菜单开着时对 `menuitem「Markdown 快捷方式」` 派发合成点击 ＋ 等待 600 ms；② `list_pages` 查受控标签 → `navigate_page` 回 Craft 列表 URL；③ 一条 `evaluate_script` 连做"点帮助按钮 → 点「快捷键」 → 读回分类/键帽计数"，随后 `press_key('Escape')` 并做最终还原复核。

**结案与新增**：
- ★★ **G756 结案**（`~` → ✓ 实测）：面板停在 `整理` 后**整页重载**，重开面板当前分类仍是 `整理`（`kbd:13`）⇒ 该选择态**活过了页面生命周期**，不是 React 组件内 state；☆ 持久化载体未证（未读 `localStorage`／IndexedDB，铁律）。
- ★ **G758 新增**：「Markdown 快捷方式」＝**站外 help center 新标签**（`support.craft.do/zh-Hans/write-and-edit/formatting/markdown-shortcuts`，标题「Markdown 快捷键 - Craft Help Center」），点击时应用内**不出任何 dialog**（DOM 只少了菜单本身）⇒ 帮助菜单六项要按"站内功能／站外文档"二分，**其余四项落点未验**，不得推广。
- ★ **G759 新增**：顶栏帮助按钮是 styled-components（`sc-a5lie2-0`／`sc-wrwa8u-4 bdLahy Plain Medium hasIcon`，宿主 `DIV[aria-label="Question Mark Icon"]`），而弹层全走 CSS Modules 哈希 ⇒ 按 class 前缀扫 DOM 会系统性漏掉顶栏；且中文界面里该 `aria-label` 仍是英文。
- ★★★ **G760 新增（判据级，本批最贵的更正）**：**绝对 `outerHTML.length` 在 craft.do 不是稳定基线** —— 同一张列表屏在**零写入**条件下先后量到 `128,211／128,349／128,617` 与 `181,832／181,930／182,077／196,591` 两档，差约 **5.3 万字节**；面板同分类跨重载绝对值也从 `130,528` 变到 `130,288`。⇒ ① V64 那条逐类序列**只在同一次页面生命周期内可比**（相邻差 `+5,615`／`−5,779` 仍可信）；② "指纹没变＝静默失效"要加限定：**同生命周期内 ＋ 同时看角色直方图与新增文本集合**；③ 下批起**判据首选角色直方图 与 新增文本集合，绝对字节只作同序列内的相对量**。
- ⇒ 规模：`gap.md` 749 → **752 条（最大 G760）**；`interactions.md` 新增 **V65**；`keyboard.md` §十一 二次复现段补尾记（V64／V65、G752–G760）＋ 本节仍未采到两条。

**还原复核（收尾三连）**：`navigate_page(同一 URL)` 后直方图 `img:3, presentation:8, button:3, checkbox:8`，`menu`／`menuitem`／`dialog`／`group` **全为 0**，`title`＝`所有文档`，`visibilityState=hidden`；`list_pages` 仅剩 **1 扇**受控标签（跳 help center 后是用 `navigate_page` 把同一扇开回来的，该桥**没有 `close_page`**）⇒ 无弹层残留、无多余受控标签、无实体写入。**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（持平，本尾记无新增 i18n key 引用）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（仪器伪差异，见 `keyboard.md` §采集方法更正 第 5 条）。
**§6 现状**：截图证据**依旧为零**（`visibilityState=hidden` 挡 `take_screenshot`），A/B/C/D/E 按键效果 0 条，F 卡在不得开分享，G 三时间弹层未取 ⇒ **目标未完成，不许标 complete**；瓶颈只剩两件事：**用户把该标签页切到前台**（截图）＋ **第 84 批写入授权**。

## 第 84 批队列（1–3 需**新的写入授权**；4–6 零写入即可做）

1. ★★ **申请第 84 批写入授权**：仅新建 `QODER-HARVEST-B84`（**只放 2–3 个任务块，绝对不放表**）⇒ 走点击通路跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取**角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数**（按 G760 改口径，别再拿绝对字节跨时刻比），截图仍受 `visibilityState=hidden` 阻塞；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口内）：焦点先落沙盒正文块，每条键**先 `press_key` 再合成键兜底**并标注驱动通路；A 撤销计步记每步指纹序列（非单调，且按 G760 只在同生命周期内比）。
3. ★☆ 塌键屏上复核：沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行（G742 由静态升实测）；同场裁 `TOGGLE_ASSISTANT` vs `ADD_TABLE_ROW`。
4. ☆ 零写入：**帮助菜单其余四项**（`意见反馈`／`最新特性`／`Web 和 Windows 版最新特性`／`常见问题`）的落点逐个判（站内／站外）；面板分类**键盘切换**与**面板内有无搜索框**；G756 的载体若允许需另开存储读取（属敏感面，要单独问）。
5. ☆ 静态：面板源按 section 做大括号配平以穷尽条数；`ot.tableShortcuts` 子组成员；`k9t` 非 Mac 分支读全；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 所属派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
6. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"；⤒／⤓ 字形归属结案。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。
8. ☆ **新**：查清整页字节基线两档（128k vs 181k）的归因（列表虚拟滚动／图片占位／相对时间文本），把"同生命周期"这条判据写成可操作前置检查。

## 第 84 批·上半日志（2026-09-28 09:36–09:43，★★★ **OS 级普通键被应用 handler 接收** ＋ ★★ **截图通路恢复**；零写入，`browser-use` MCP）

**开场就变了**：一次常规量测里 `document.visibilityState` 从整批的 `hidden` 翻成 **`visible`**（用户把窗口交给了前台）⇒ `take_screenshot` 当场可用，且它**支持 `filePath`**（图直接落盘、不进上下文）。⇒ 本批从"只能 DOM 指纹"升级成"DOM 指纹 ＋ 截图"。

**做了什么（全零写入，11 次浏览器调用）**：① 静止列表屏连采 4 次（1.5 s 间隔）做基线稳定性实验；② 合成点击开帮助菜单 → 开快捷键面板（默认落在 `整理`）→ 截图；③ `press_key('Control+Shift+,')` 复测 chord；④ `press_key('Tab')` → 读焦点与选中态；⑤ `press_key('ArrowDown')` → 读选中态/行数/键帽数/DOM → 截图；⑥ `press_key('ArrowUp')` 还原；⑦ `press_key('Escape')` ＋ `navigate_page(同一 URL)` 收尾复核。

**新增**：gap **G761–G764**（新节 `### 三点一〇一`，752→**756 条，最大 G764**）；`interactions.md` **V66**；两张截图 `_harvest/b84-panel-zhengli.png`／`_harvest/b84-panel-heji-keyboard.png`（**已肉眼核验**后才命名）。

**结案与改判（本批最贵的三条）**：
1. ★★★ **`press_key` 的普通键会进应用自己的 handler** —— `ArrowDown` 让面板选中分类 `整理 → 合集`（正文换段、`kbd 13→38`、`_row_ 6→18`、DOM `198,364→202,455`），`ArrowUp` 一步还原 ⇒ 原生按钮不响应方向键，所以这不是浏览器默认行为；而**同一批里 `Control+Shift+,` 仍然无效** ⇒ 失败面从"键盘通路"收窄到**"带 Ctrl+Shift 的 chord"**。⇒ **A–E 的做法改写**：`Enter`／`Backspace`／`Tab`／`Shift+Tab`／`Shift+Enter` 全部**先用真键盘**，只有 `Ctrl+Z` 这类 chord 才退到 V63 的合成键，且每条标驱动通路（G761）。
2. ★★ **G742 首次拿到截图级证据** —— `b84-panel-heji-keyboard.png` 里 `在前面添加行` 与 `添加列` 两行**并排印着同一个 `Ctrl Shift ⏎`**，`在前面添加列` 是 `Ctrl Alt ⏎` ⇒ 官方面板自己把两条命令印成同一组合（此前只有 DOM 串）。
3. ★★ **G760 收紧**：**同一次页面生命周期内绝对 `outerHTML.length` 完全稳定**（4 次采样恒 `182,077`，`[draggable]` 42／`a` 20／`innerText` 369 全恒定）⇒ 漂移**只发生在跨重载／跨时段** ⇒ "页面有没有被重载过"要当成显式事件记录；没重载时绝对字节可以直接当指纹（G764）。

**新增的小事实**：★ 面板**没有搜索／过滤入口**（dialog 内 `input`／`textarea`／`[role=searchbox]` ＝ 0）；★ **焦点态与选中态分离**（`Tab` 只移焦点不改选中、`ArrowDown` 只改选中不改焦点）⇒ 本地若实现面板要显式做这两条（G762）；★ `dialog` 的 `aria-label` 是中文 `快捷键`，但 7 枚分类图标的 `aria-label` 全是英文图标名（`Dot Square`／`Doc Richtext`／`Checkmark Circle`／`Text Cursor`／`Text Format`／`Square Stack3d Up`／`Table Cell`）⇒ 复刻时建议本地补中文可读名并登记为有意偏差（G763）；★ 面板右上角**确实有关闭按钮**（§2 的"不要找 X"应读作"别把它当唯一关法"）；☆ `Escape` 第三次复现"关一层露一层"（dialog 关、下层 menu 留，`198,364→196,693`）。

**☆ 新登记的仪器分歧**：`合集` 段 `[class*="_row_"]` 数得 **18** 行、按 `_rowName_` 解析得 **17** 行（截图底部那行被裁掉的「添加内容」是首要嫌疑）⇒ 裁定前两把尺子并报（G764／V66 末段）。

**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（持平，本批无新增 i18n key 引用）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 84 行全部 JSON 合法。
**§6 进度**：**截图证据从"零"变成"有"**（弹层族），但 **A/B/C/D/E 的按键效果仍为 0 条**、F 仍等对外分享的单独授权、G 三时间弹层未取 ⇒ **目标未完成，不许标 complete**。瓶颈现在**只剩一件**：**第 84 批·下半的写入授权**（通路、截图、沙盒手法都已就位）。

## 第 84 批·下半队列（1–3 需**新的写入授权**；4–6 零写入即可做）

1. ★★ **申请第 84 批·下半写入授权**：只新建 `QODER-HARVEST-B84`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 截图**；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口内）：焦点先落沙盒正文块，**每条键先用 `press_key`（普通键与 Shift 组合本批已证可达应用 handler）**，chord 类不通时退合成键并标注通路；A 撤销计步记每步指纹（同生命周期内绝对字节可直接用）。
3. ★☆ 塌键屏上复核：沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行（G742 已有"面板印两条同串"的截图，缺的是**实际派发结果**）；同场裁 `TOGGLE_ASSISTANT` vs `ADD_TABLE_ROW`。
4. ☆ 零写入：**帮助菜单其余四项**（`意见反馈`／`最新特性`／`Web 和 Windows 版最新特性`／`常见问题`）落点逐个判（站内／站外）。
5. ☆ 零写入：裁定 `合集` 行数 18 vs 17 的仪器分歧；补测面板的 `ArrowLeft`／`ArrowRight`／`Home`／`End` 与分类按钮上的 `Enter`／`Space`。
6. ☆ 静态：面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
7. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"；⤒／⤓ 两个字形（上／下箭头）的归属结案。
8. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。

## 第 84 批·下半日志（2026-09-28 09:55–10:02，★★★ **帮助菜单六项落点全部判定（不真跳）** ＋ ★★★ `合集` 18 行 vs 17 命令结案；零写入，`browser-use` MCP ＋ OS 级 `press_key`，**有截图**）

**为什么是零写入批**：第 84 批·下半的**沙盒写入授权未到手**（按 §2 不得沿用上一批）⇒ 本批只做队列 4–6 的零写入项，A–E／G 的效果面继续等授权。

**手法（本批最可复用的两条）**：
1. ★★★ **读实时 React fiber 闭包定落点**：`menuitem` 的 `__reactProps$…` 只有 Base UI 通用包装 ⇒ 沿 `__reactFiber$…` 的 `return` 链向上，深度 3 拿到应用自己的 `onSelect`、深度 9 拿到整份六个具名回调 ⇒ **不必点击跳转**就知道去哪。
2. ★★★ **拦截 `window.open` 取 URL 参数**：临时替换为"记录参数＋返回假句柄"，逐项点击，采完当场还原 ⇒ **零新标签**（本桥没有 `close_page`，真开就留残留）。
3. ★ **页内捕获阶段 `keydown`＋`keyup` 双监听 ＋ 520 ms 延迟采样** ⇒ 连按 6 个键只需"装监听＋读日志"两次浏览器调用，且每次按键都有"送达证据"。

**结案与新增**：
- ★★★ **帮助菜单六项**（gap **G765**）：`最新特性`＝`https://www.craft.do/whats-new`（闭包 `function nRt(){window.open(Yhe,"_blank")}` ⇒ **缺 `noopener`、也缺自关菜单**，实测该次点击后 `[role=menu]` 仍为 1，闭包与屏上互证）；`Web 和 Windows 版最新特性`＝`whats-new-web-windows`；`常见问题`＝`https://support.craft.do`；`Markdown 快捷方式`＝`openMarkdownShortcuts` 闭包 ↔ 第 83 批屏上 URL（双证）；`快捷键`＝唯一取不到 `onSelect` 者 ⇒ 站内 `dialog`；`意见反馈`＝`onSelect: ()=>{l(yn({id:"feedback"})),T(!1)}`，**唯一不调 `window.open`**，captured＝null／`dialog`＝0／菜单已关 ⇒ **落点未确认**（三候选）。六项 `data-ds="action"`、`disabled:false`、`data-testid` 键在值为 null。
- ★★★ **18 vs 17 裁定**（**G767**）：第 13 行首子＝`SPAN._rowAlternative_dm375_118`（文案 `或者`）⇒ 是第 12 行 `添加一行 = Ctrl ⏎` 的**别名键位行** `Shift ⏎` ⇒ **`合集`＝17 命令／18 行／38 键帽**，命令数只按主行计。
- ★★ **面板键盘导航只有纵向**（**G766**）：`ArrowLeft`／`ArrowRight`×2／`Home`／`End`／`Enter` 六次按键**全部送达**（14 条日志）但选中恒 `整理`、`kbd` 恒 13；`ArrowDown` 第 4 次复现生效且**焦点在分类按钮上时同样生效** ⇒ 与焦点落点无关。★ 判据更正：**"按了没变化"不能判失效**（`Enter` 当时焦点在**已选中**按钮上）。
- ★★ **面板按 section 各自渲染**（**G768**）：`删除行 = Ctrl ⌫` 两段各印一次；同一枚 `⌫` 分别叫「清除单元格内容」与「清除单元格值」⇒ 官方自身不一致新增一例。
- ★ **弹层是 `<body>` 级 portal**（**G769**）：根 DIV `96,272→96,299`（＋27），`body.children 29→30`，新 DIV `outerHTML.length`＝`16,066`。
- ★★ **基线漂移归因收紧**（**G770**）：同一"无弹层"直方图跨生命周期量到 `114,026`／`116,436`／`120,197`／`182,077` ⇒ **直方图相同≠基线相同**，漂移在根 DIV 内部；同生命周期内 6 次按键间 `136,254→136,372`（＋118）⇒ "同生命周期绝对字节稳定"只在秒级成立。
- ★ **结案一条 keyboard 遗留**：`⤒`／`⤓` 是「移动到顶部／移动到底部」的键帽（`Alt` 修饰，`整理` 段第 3／4 行），不是缩进或滚动指示用字。
- ⇒ 规模：`gap.md` 756 → **762 条（最大 G770）**；`interactions.md` **V67**；`keyboard.md` **§十四**（六项落点表＋`合集` 18 行逐行表＋键盘导航矩阵）。

**还原复核**：面板分类**点回 `整理`**（`sel 合集→整理`、`kbd 38→13`）⇒ `press_key('Escape')` 关 dialog（第 4 次复现"只关一层"）⇒ `navigate_page{type:"reload"}` 清掉注入监听 ⇒ 复核 `loggerGone:true`、直方图 `img:3 presentation:8 button:3 checkbox:8`、`menu`／`menuitem`／`dialog`／`group` 全 0、`title`＝`所有文档`、URL 无 `?s=`、`visibilityState=visible`、`window.open` 已还原、`list_pages` 全程只有 1 扇受控标签。**零实体、零偏好写入、零分享。**

**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（持平，本批无新增 i18n key 引用）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 85 行全部 JSON 合法。
**§6 现状**：截图证据累计 3 张（弹层族）；**A/B/C/D/E 的按键效果、G 的三时间弹层仍为 0 条** ⇒ **目标未完成，不许标 complete**；瓶颈仍＝**第 85 批的沙盒写入授权**（另有 F 分享页、10 条孤儿任务两项需单独点头）。

## 第 85 批队列（1–3 需**新的写入授权**；4–6 零写入即可做）

1. ★★ **申请第 85 批写入授权**：只新建 `QODER-HARVEST-B85`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 截图**；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口）：焦点先落沙盒正文块，**每条键先 `press_key`**（普通键已四次复现可达应用 handler），chord 不通再退 V63 合成键并标注通路；A 撤销计步记每步指纹（**同生命周期内绝对字节可用，但跨分钟会微漂 ⇒ 每步都同时记直方图**，G770）。★ 判"某键无效"前先把焦点指向**未选中项**（G766 的判据更正）。
3. ★☆ 塌键屏上复核：沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行（G742 已有两次截图级"面板印两条同串"，缺实际派发结果）；同场裁 `TOGGLE_ASSISTANT` vs `ADD_TABLE_ROW`。
4. ☆ 零写入：`意见反馈` 落点结案（同时拦截 `window.open`／`location.assign`／`<a>` 点击，并查 `mailto:`）；补测分类按钮上的 `Space`（可顺带验 Base UI `onKeyUp` 对 `key === " "` 的专门分支）；采面板键帽与关闭按钮的 `aria-label`。
5. ☆ 零写入：其余 5 个分类的**逐行形状**重采（别名行 `_rowAlternative_` 在别的分类里还有几条）⇒ 顺带把 §十二 的 219 枚键帽与"命令数按主行计"的新口径对一遍。
6. ☆ 静态：面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；`keyboard.md` 表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。

## 第 85 批·上半日志（2026-09-28 10:12–10:14，★★★ **面板七分类三口径全表** ＋ ★★ **`Space` 重置当前分类**；零写入，`browser-use` MCP ＋ OS 级 `press_key`）

**为什么仍是零写入批**：第 85 批沙盒写入授权未到手（§2 不得沿用上一批）⇒ 本批做队列 4–5 的零写入项。**本批无截图**（收尾时 `visibilityState` 又翻回 `hidden`，`take_screenshot` 会失败；证据＝DOM 三口径计数＋逐行文本）。

**手法**：**一次 `evaluate_script` 内连点七个分类**（点 → 等 700 ms → 读 `[class*="_row_"]`／`_rowName_` 主行／别名行／`kbd`／`_sectionTitle_`／逐行"命令名 ＝ 键帽串"）⇒ 全表只花 **1 次浏览器调用**，结果 `filePath` 落盘 `_harvest/b85-panel-7cat.json`（含 89 条主行明细）。⇒ 这是"面板类多标签遍历"的标准打法，成本比第 81 批低一个量级。

**新增**：gap **G771–G774**（新节 `### 三点一〇三`，762→**766 条，最大 G774**）；`interactions.md` **V68**；`keyboard.md` **§十五**。

**结案与新增事实**：
1. ★★★ **三口径全表**：`通用` 8 行＝7 主＋1 别名／16 键帽；`文档` 4＝4＋0／11；`任务` 17＝15＋2／34；`编辑` 13＝13＋0／27；`样式` 29＝27＋2／**80**（键帽最密）；`整理` 6＝6＋0／13；`合集` 18＝17＋1／38。**合计 95 行＝89 主行＋6 别名行／219 枚键帽**。
2. ★★★ **结案第 83 批遗留**："面板条目为什么只有 89 条" ⇒ **89＝主行数＝命令数**，另 6 行是同一命令的第二键位（`_rowAlternative_`），不是被开关／浏览器位／平台位裁掉的条目。
3. ★ **219 枚键帽与第 81 批完全一致**（不同手法）⇒ 可当回归基线。
4. ★ **`文档` 是唯一 `sections` 为空数组的分类** ⇒ "分段"是可选层。
5. ★ **六条别名行逐字**：`通用`「或者 Ctrl P」；`任务`「或者 Ctrl /」「或者 Delete」；`样式`「或者 Ctrl /」「或者 Ctrl E」；`合集`「或者 Shift ⏎」⇒ 只出现在 4／7 个分类。
6. ★★ **`Space` 在已选中分类按钮上＝重置回第一个分类 `通用`**（`kbd 38→16`、len `134,436→130,896`、roving 焦点跟到 `通用`），而同位置 `Enter` 毫无变化（G766）⇒ **两个"激活键"语义不同**；本地若做 no-op 需登记有意偏差。
7. ★ **面板 a11y 词表**：dialog 内 `button` 8 枚＝7 分类（`aria-label` 全 null）＋ 关闭按钮（`aria-label="Close"`、`_closeButton_hlglt_29`）；`kbd` 的 `aria-label`／`title` 全空 ⇒ 读屏拿裸字形。
8. ☆ **`意见反馈` 按"不可采"结案**：站内弹层＝0、拦截 `window.open` captured＝null、`location.href` 与 `title` 与 `body.children` 均未变 ⇒ 只剩 `mailto:`／OS 层候选，本连接器观测不到。
9. ☆ **G770 新样本**：同一分类在同生命周期内约 40 秒后 `130,890 → 130,896`（＋6 字节）。

**还原复核**：遍历后**点回 `整理`**（`active`＝`整理`、`kbd`＝13＝开场值）⇒ `press_key('Escape')` ⇒ `navigate_page{type:"reload"}` ⇒ 复核 `dialog`＝0、`menu`＝0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title`＝`所有文档`、URL 无 `?s=`。**零实体、零偏好、零分享、零多余标签。**

**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（持平）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 86 行全部 JSON 合法。
**§6 现状**：A/B/C/D/E 按键效果与 G 三时间弹层**仍为零条** ⇒ **目标未完成，不许标 complete**；瓶颈唯一＝**第 85 批·下半沙盒写入授权**。

## 第 85 批·下半队列（1–3 需**新的写入授权**；4–6 零写入即可做）

1. ★★ **申请第 85 批·下半写入授权**：只新建 `QODER-HARVEST-B85`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 截图（开场先读 `visibilityState`，`visible` 才拍）**；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口）：焦点先落沙盒正文块，**每条键先 `press_key`**（普通键／`Shift` 组合／`Space` 均已证可达应用 handler），chord 不通退 V63 合成键并标注通路；A 撤销计步记每步"直方图＋新增文本集合"（绝对字节只在秒级可用）；★ 判"某键无效"前**先把焦点指向未选中项**（G766／G772）。
3. ★☆ 塌键屏上复核：沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行（G742 已有两次截图级"面板印两条同串"）；同场裁 `TOGGLE_ASSISTANT` vs `ADD_TABLE_ROW`。
4. ☆ 零写入：把 `_harvest/b85-panel-7cat.json` 的 **89 条主行明细与 `keyboard.md` §十二 表 A–E 逐条对账**（重点＝`样式` 27 命令／80 键帽档内的同键冲突）⇒ 一次本地批，零浏览器调用。
5. ☆ 静态：`Space` 重置的机制（面板组件 handler 里是 `setCategory(0)` 还是重挂载）；别名行的数据源字段名；面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
6. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"（⤒／⤓ 归属已在第 84 批下半结案）。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。

## 第 85 批·下半日志〔零写入本地批〕（2026-09-28 10:23–10:31，★★★ **面板键位两条可推导恒等式** ＋ ★★ **两次采集 89/89 逐字互证** ＋ ★★ **本地 `Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（本轮唯一直接可修项）**；**零浏览器调用、零写入**）

**开场即说明边界**：第 85 批·下半的**写入授权仍未到手**（§2 不得沿用上一批），所以本批没有做任何屏幕动作——**A／B／C／D／E／G 的按键效果与弹层仍然零条，缺口不减**。做掉的是同一队列里第 4、5 两项零写入：把 `_harvest/b85-panel-7cat.json` 的 89 条主行明细推到"可判定"，并与 `keyboard.md` §十二 对账。

**做了什么（全部本地，node 脚本 6 次）**：① 逐类重算"主行键帽＋别名键帽" vs 屏上 `<kbd>` 计数；② 按"修饰键／非修饰键"给 208 枚键帽分桶并出直方图；③ 生成键帽字形表（49 种 token，按五类归组）；④ 程序算全"同一组合挂多条命令"的冲突矩阵；⑤ 与 §十二 的 89 行做位置对齐（命令名＋键位串＋别名行数三项）；⑥ 本地代码锚点实跑 grep（`ctrlKey`／`metaKey`／`altKey`／`shiftKey`、`kbd`、`Shortcut`）并逐个读命中内容。

**新增**：gap **G775–G781**（新节 `### 三点一〇四`，766→**773 条，最大 G781**）；`interactions.md` **V69**；`keyboard.md` **§十六**（16.1 恒等式一／16.2 恒等式二＋逐类重算表／16.3 键帽字形表／16.4 冲突矩阵／16.5 互证）。★ **结案第 85 批·上半遗留**："主行明细尚未与 §十二 对账"（旧行已划掉并指向 G781）。

**本批最值钱的三条**：
1. ★★★ **键位模型可以定形**：89 条主行的非修饰键总数**恰等于主行数**（修饰键 119＋非修饰键 89＝208）⇒ 官方面板**没有两个主键、也没有前后序列键** ⇒ 本地注册表形状直接定 `{mods:{ctrl,shift,alt}, key:string, alternatives:string[]}`，**省掉序列槽**（G775）。修饰键直方图 0／1／2／3＝13／35／39／**2**，三修饰键那 2 条是同一命令在两个分类重印 ⇒ 全面板唯一三修饰组合＝`Ctrl+Alt+Shift+T`。
2. ★★★ **`kbd` 是派生量而非独立观测量，代价是抓到第二种序列化风格**：逐类重算七类全等（合计 219）⇒ 面板数据的**自检判据**成立（重算不出 219 就是采集坏了）。但主行串带 `+`、别名行是 innerText 无分隔（`或者CtrlP`）⇒ 按 `+` 切少数 5 枚，按字符走查又把 `Delete` 数成 6 枚 ⇒ **定版：数键帽只准数 `<kbd>` 元素**（G776）。
3. ★★ **面板键位的数据面已闭合**：第 81 批（整屏文本转储）与第 85 批（逐分类 DOM 行）按分类位置对齐后**命令名 89/89、主键位串 89/89、别名行数 6=6 全等**；程序报的唯一一处"键位不一致"是 §十二 用双反引号容纳"键帽本身是反引号"造成的解析器局限，不是数据冲突 ⇒ **以后不必再花浏览器预算重采面板**，预算只该花在"键位是否真的生效"与"焦点上下文会不会换串"（G781）。

**★ 本批唯一的本地缺陷候选（P1，待用户决策）**：官方面板把 `Ctrl+K` 印成「样式·链接」（`URL`）、`Ctrl+J` 印成「任务·新任务」，而 `src/components/search/CommandPalette.tsx:33` 用 `Ctrl/⌘+K` 开搜索面板、`src/components/editor/bubble-menu/AiBubbleMenu.tsx:67` 用 `Ctrl/⌘+J` 开 AI 气泡菜单 ⇒ **同键不同义的真冲突**（官方"快速开启"其实是 `Ctrl+O`／`Ctrl+P`）。☆ 顺带一条平台缺陷：`src/components/sidebar/SidebarHeader.tsx:28-30` 把提示写死成 `⌘K`，而绑定 `meta` 与 `ctrl` 都接受 ⇒ Windows 用户看到 Mac 字形（官方面板 49 种键帽里 `⌘⌥⇧⌃` 出现 **0 次**）。

**☆ 补录 §十二 要点 3 的三处漏项**（G778）：`Ctrl+Alt+T` 的**两条不同命令印在同一分类（样式）内部**、`Ctrl+Alt+Shift+T` 一组未列、`Ctrl+⌫` 两行**连标签都相同**（⇒ 命令表主键要含分段）。☆ 另有 1 组只在**主串↔别名串合并后**才显形：`Shift+⏎` 既是「编辑·编辑页面区块」主串又是「合集·添加一行」别名串 ⇒ 反查表必须把两种形态并进同一张多值索引。

**☆ 给 G771 加了一条限定**（G780）：`文档` 分类"段标题数组为空"只有**一处观测**，"该分类真的不分段"与"它用了另一个 class 而选择器没命中"两种解释都还成立（同一次脚本其余六类都取到非空 ⇒ 倾向前者），已降格为 `~` 未确认。

**校验**：`check-tables.mjs gap.md` ⇒ 表=109 异常表=0，ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ **1866/3639 = 51.3%（持平，本批无新增 i18n key 引用）**；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）。**状态**：零写入、零浏览器调用 ⇒ 无沙盒实体、无 `manifest` 写入项、无偏好改动、无残留需还原；浏览器仍停在上批收尾态（`dialog` 0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title`＝`所有文档`）。
**§6 进度**：**未变**（A–G 屏上证据仍为零）⇒ **不许标 complete**；瓶颈仍只剩**沙盒写入授权**这一件事。

## 第 86 批队列（1–3 需**新的写入授权**；4–8 零写入／纯本地即可做）

1. ★★ **申请第 86 批写入授权**（不得沿用第 85 批）：只新建 `QODER-HARVEST-B86`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 截图（开场先读 `visibilityState`，`visible` 才拍）**；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口内）：焦点先落沙盒正文块，每条键**先用 `press_key`**（普通键与 Shift 组合已在第 84 批证可达应用 handler），chord 不通时退 V63 合成键并标注通路；A 撤销计步记每步指纹（同生命周期内绝对字节可直接用，G764）。★★ 新增判据提醒（G775）：**裸键 13 条**（`esc`／`⏎`×2／`↑↓←→`／`⌫`×3／`space`／`/`／`Tab`）在焦点位于输入域时最可能被吞，按这些键时要先确认焦点在正文块。
3. ★☆ 同一窗口内补 **面板随焦点上下文换串**（G781 唯一剩余的浏览器侧问题）：光标进表格单元格／集合行／任务视图各开一次面板，比同一标签的键帽串是否变化 ⇒ 顺带裁 `Ctrl+Shift+⏎` 两条塌键在表格焦点下是否被拆开。
4. ☆ **P1 决策**：`Ctrl+K`／`Ctrl+J` 与官方同键不同义（G777）——改本地绑定（官方"快速开启"＝`Ctrl+O`／`Ctrl+P`）还是登记有意偏差；以及 `SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形。**要用户点头才动代码**。
5. ☆ 零写入：`文档` 分类分段标题取证（G780）——`[role=dialog]` 内 `sectionTitle` 节点数 ＋ 该分类首层子元素 class 逐个打印；顺带补测面板 `ArrowLeft`／`ArrowRight`／`Home`／`End` 与分类按钮上的 `Enter`／`Space`（G766 的 Enter 仍未裁定）。
6. ☆ 静态：`Space` 重置的机制（面板组件 handler 里是 `setCategory(0)` 还是重挂载）；别名行的数据源字段名；18 个字母键帽回查 bundle modifier 描述对象的 `key` 写法（`'T'` 还是 `'KeyT'`）；数字档 `1`–`9` 是否也整体位移；面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
7. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
8. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。

## 第 86 批·上半日志（2026-09-28 10:35–10:39，★★★ **`Space` 机制翻案**（不是"重置"，是"激活聚焦项"）＋ ★★ **`Enter` 被官方抑制** ＋ ★★ **焦点与选中两套状态、方向测清** ＋ ★ **`文档` 无分段标题结案** ＋ ★ **三口径全表第三次独立复现**；零写入，`browser-use` MCP，11 次浏览器调用，**无截图**（`visibilityState=hidden`））

**开场判活**：`list_pages` 只有一扇且是登录态（`所有文档` ＋ space `3b788e8c…`）⇒ 屏幕通路活；`visibilityState` 仍 `hidden` ⇒ 本批**没有截图**（第 84 批上半那种窗口交前台的窗口期没重现）。

**做了什么（全零写入，11 次调用）**：① 页内合成点击开帮助菜单 → 开快捷键面板（默认落 `整理`，dialog 15,375）；② 单次脚本连点七个分类，逐类取"行／主行／别名／键帽／**分段标题数与逐字**／弹层自身长度／骨架 class"；③ 装 capture 阶段按键日志器（每条键在即时与 520 ms 各采一次状态指纹）；④ **焦点与选中分开放**后按 `Enter`；⑤ 改焦点再按 `Space`；⑥ `ArrowDown`（阳性对照）；⑦ `ArrowLeft`；⑧ 读日志；⑨ 把选中还原成 `整理`；⑩ OS 级 `Escape`；⑪ `navigate_page(reload)` ＋ 终态复核。

**新增**：gap **G782–G787**（新节 `### 三点一〇五`，773→**779 条，最大 G787**）；`interactions.md` **V70**；`keyboard.md` **§十七**（17.1 键盘定版矩阵／17.2 `Space` 改判／17.3 四口径表）。证据文件 `_harvest/b86-keylog.json`／`b86-sections.json`／`b86-verify.json`。

**本批最贵的三条**：
1. ★★★ **G772 作废——`Space` 不是"重置回第一个分类"**。本轮把焦点放在 `文档`（选中仍是 `合集`），按 `Space` 后选中最終变 `文档` ⇒ **`Space` 跟随焦点**，而第 85 批看到的"回到 `通用`"是"reload 后浏览器默认焦点落在第一个分类按钮 ＋ 选中项跨重载保持（G756）"两件事的合成假象。⇒ 官方面板**没有任何重置分支**。⇒ 通用纪律入册：**按键实验必须先记 `document.activeElement`，否则"命令语义"可能只是"焦点默认值"的投影。**
2. ★★ **`Enter` 在分类按钮上不激活**（焦点 `通用`／选中 `合集`，四个采样点全不变）⇒ 原生 `<button>` 本该在 Enter keydown 合成 click，这里没有 ⇒ 官方**主动抑制 Enter**；面板键盘可达性只剩 `Space`（激活焦点项）与 `ArrowUp`/`ArrowDown`（移选中）。⇒ 附带可及性缺陷候选（只用 Enter 的读屏／键盘用户切不了分类），本地若做得更友好要登记有意偏差（G783）。
3. ★★ **焦点与选中彻底分离，方向测清**：`ArrowDown` 让选中 `文档`→`任务`（`rows 17`／`kbd 34`／弹层 18,432），但 `activeElement` 仍是 `文档`、class 保持 `_variantDefault_` ⇒ **面板没有 roving tabindex**。⇒ 本地规格＝`{selectedIndex, focusedIndex}` 两个独立 state，Arrow 只动前者、`Space` 只读后者（G784）。

**新增小事实**：★ `ArrowLeft` 第三次复现 no-op（焦点明确在分类按钮上）⇒ G766 由 `~` 升 `✓`；☆ `ArrowRight`／`Home`／`End` 本轮未重测（仍 `~`）。★ **三口径全表第三次独立复现**（95 行＝89 主＋6 别名／219 枚键帽，与第 81、85 批逐数相同）＋ **`文档` 分段标题 0 结案**（同一次脚本其余六类 2/2/5/5/2/2，两类骨架 class 逐字相同）⇒ 复刻时"分段标题"是可选字段。☆ **第四口径新增**＝弹层自身 `outerHTML` 长度（14,753–23,678，`样式` 最长）比整页长度更适合当弹层指纹，但仍限同生命周期。★★ **`Space` 生效只出现在 520 ms 采样点** ⇒ 再次印证"派发后等 ≥400 ms 才能判静默失效"（第 83 批判据）。☆ **仪器效应登记**（G787）：页内 `element.click()` 不搬 DOM 焦点 ⇒ "点 `整理` 后焦点仍是 `文档`"是工具假象，不得引用为官方行为。

**还原复核**：选中项已当场改回开批时的 `整理`（`active=["整理"]`、`rows 6`、`kbd 13`、分段＝移动所选区块／组合与取消组合）＋ OS 级 `Escape` ＋ `reload`；终态 `dialog`／`menu`／`menuitem`／`group` **全 0**、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title`＝`所有文档`、URL **无 `?s=` 令牌**、`loggerGone:true`、`list_pages` 仍只一扇。无沙盒实体、无账户级偏好改动（主题／语言／排序／显示开关一律未碰）、无对外分享。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1866/3639 = 51.3%（持平，本批无新增 i18n key 引用）；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异，第 85 批下半已补计数级判据）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：面板键盘导航面**已定版**（A–I 里唯一由零写入批能补的部分补完了），但 **A/B/C/D/E 的编辑器按键效果与 G 的任务三时间弹层仍为零条** ⇒ **目标未完成，不许标 complete**；瓶颈只剩一件：**第 86 批·下半的沙盒写入授权**。

## 第 86 批·下半队列（1–2 需**新的写入授权**；3–6 零写入／纯本地可做）

1. ★★ **申请第 86 批·下半写入授权**：只新建 `QODER-HARVEST-B86`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 弹层自身 `outerHTML` 长度（新第四口径）**，开场先读 `visibilityState`（`visible` 才拍截图）；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口）：焦点先落沙盒正文块，**每条键先用 `press_key`**，并**先记 `document.activeElement`**（本批教训）；chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹序列。★☆ 同场补塌键屏上复核（沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行，G742 已有面板印刷级证据、缺实际派发）。
3. ☆ 零写入：`Space` 生效延迟拆档（200／400／520 ms 三点采样）；`ArrowRight`／`Home`／`End` 重测；分类按钮上的 `Tab`/`Shift+Tab` 真实落点（需窗口前台＋坐标点击）。
4. ☆ 零写入：**面板是否随焦点上下文换串**（正文／表格／集合／任务视图内各开一次面板比同一标签的键帽串）⇒ §十二／G781 唯一剩余的浏览器侧问题。
5. ☆ 静态：`Space`/`Enter` 在面板组件里的 handler 源码（`_action_1j891_1` 所在 chunk）；别名行数据源字段名；18 个字母键帽回查 modifier 描述对象的 `key` 写法；数字档 `1`–`9` 是否整体位移；面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
6. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。
8. ☆ **P1 决策**（本地代码，要用户点头）：`Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（G777）⇒ 改绑定还是登记有意偏差；`SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形。

## 第 86 批·下半日志〔零写入屏幕取证〕（2026-09-28 11:53–12:13，★★★ **面板键帽串不随焦点上下文换串**（列表屏 vs 任务视图，7 分类逐行全等）＋ ★★ **`Space` 生效＝keyup 同帧 <58 ms，上一批"520 ms 才变"是仪器效应（连带修订 ≥400 ms 判据）** ＋ ★☆ **弹层长度跨重载只在高内容四类出现 +629 的结构性台阶** ＋ ★ **`Close` 不关下层菜单 ⇒ 还原复核要报四计数**；零写入，`browser-use` MCP ＋ OS 级 `press_key`，14 次调用，**无截图**）

**开场判活**：`list_pages` 只一扇＝`所有文档`（登录态）；`visibilityState` 收尾仍是 `hidden`（中段一度翻 `visible` 又翻回）⇒ 本批**没有截图**。

**做了什么（全零写入）**：① 列表屏开面板逐分类取 `命令名｜键帽串`；② 侧栏点「任务」（SPA 切到 `…/tasks/inbox`，只读导航）再取同表；③ 本地逐字比对两档；④ 装 capture 相位按键日志器（`keyup` 后 7 点采样）并把焦点放到未选中项 `通用`；⑤ 按 `Space`；⑥ 读日志、关面板、导航回列表屏；⑦ 把面板选中项还原成开批时的 `整理` ＋ `reload` ＋ 终态复核。中间有一次**作废的第一轮**（900 ms 采样菜单懒渲染取空 `n=0`，日志 0 条）⇒ 重装重跑，作废原因已入册（G792）。

**新增**：gap **G788–G792**（新节 `### 三点一〇六`，779→**784 条，最大 G792**）；`interactions.md` **V71**；`keyboard.md` **§十八**（18.1 两档上下文比对表／18.2 `Space` 时机采样表／18.3 还原四计数口径／18.4 跨重载台阶）。

**本批最贵的三条**：
1. ★★★ **面板键帽串是全局静态数据**：列表屏与任务视图两档下 **89 主行＋6 别名行逐字相同**（连分段数、行数、`contentChildren`、弹层长度都相同）⇒ §十二／G781 的"随焦点上下文换串"之问在这两档上是"不换"；本地做面板**不必**接焦点上下文信号。☆ 覆盖边界：正文／表格／合集三档焦点仍未测。
2. ★★ **`Space` 的生效时刻＝`keyup` 同帧（真实 dt58 ms）**；上一批"只有 520 ms 点变化"是我的采样挂在 capture 相位、**早于浏览器合成 click** ⇒ 仪器效应，不是官方延迟。⇒ **判据修订**：第 83 批的"≥400 ms 才判静默失效"要加"采样须在事件链结束后（≥50 ms）"的限定，否则 capture 相位监听必然读到"未生效"假象（G789）。
3. ★☆ **弹层自身长度跨重载出现"分类分档台阶"**：`任务`/`编辑`/`样式`/`合集` 各 +629，`通用`/`文档`/`整理` 逐字节恒定，而行数/分段数/键帽数/`contentChildren` 全同 ⇒ 结构性差异（`_sections_` 内多出约 629 字节）**但未定位** ⇒ 强化"绝对字节只在同生命周期可比"，且它同样适用于弹层（G790）。

**☆ 还原复核口径（G791）**：点 `Close` 关掉 dialog 后**立刻**读到 `menu:1`／`menuitem:6`／`group:1` 残留 ⇒ `Close` 不关下层帮助菜单（`Escape` 只关一层的老结论在 `Close` 通路同样成立），残留挂到 `reload` 才清 ⇒ **以后复核必须同时报 `dialog`／`menu`／`group`／`menuitem` 四项全 0**。
**☆ 仪器两条入册（G792）**：帮助菜单在**任务视图**首次点开要留 **1.4–1.5 s**（列表屏 700–900 ms 够，懒渲染）；`visibilityState` **同一批内会来回翻**（中段 `visible`、收尾 `hidden`）⇒ 截图要现场读，不能沿用上次结论。

**还原复核（零写入）**：面板选中项当场点回 `整理`（复核 `active=["整理"]`、`rows 6`、`kbd 13`）→ 关 dialog → 侧栏回 `所有文档` → `navigate_page(reload)` → 终态 `dialog`／`menu`／`group`／`menuitem` **全 0**、直方图 `img:3 presentation:8 button:3 checkbox:8`（＝开批基线）、`title`＝`所有文档`、URL **无 `?s=`**、`loggerGone:true`、`visibilityState=hidden`。无沙盒实体、无账户级偏好改动（主题／语言／排序／显示开关一律未碰）、无对外分享。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1866/3639 = 51.3%（持平）；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**A／B／C／D／E 的编辑器键位效果与 G 的任务三时间弹层仍为零条** ⇒ **目标未完成，不许标 complete**。面板侧的零写入问题已基本穷尽（键位文本、导航矩阵、上下文不变、时机、还原口径都结了），**下批只能靠沙盒写入**推进 A–G。

## 第 87 批队列（1–3 需**新的写入授权**；4–7 零写入／纯本地可做）

1. ★★ **申请第 87 批写入授权**（不得沿用第 86 批）：只新建 `QODER-HARVEST-B87`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开）＋ 重复子菜单"无结束"档；每项取 **角色直方图 ＋ 新增文本集合 ＋ `data-state` 计数 ＋ 弹层自身 `outerHTML` 长度（第四口径）**；开场先读 `visibilityState`（`visible` 才拍截图）；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋ 三索引残留复核。
2. ★★ **A–E 正式跑批**（同一授权窗口）：焦点先落沙盒正文块，**每条键先记 `document.activeElement`**（第 86 批教训），**先用 `press_key`**（普通键已证可达 handler），chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹（同生命周期内绝对字节可用）；★☆ 同场补塌键屏上复核（沙盒表格内派发 `Ctrl+Shift+Enter` 看增列还是增行，G742 已有面板印刷级证据）。
3. ★☆ **正文／表格／合集三档焦点上下文开面板比键帽串**（G788 的剩余三档，表格与合集档需要沙盒表或用户确认的既有实体）。
4. ☆ 零写入：`ArrowRight`／`Home`／`End` 重测（第一轮因菜单懒渲染取空作废；本次要留 1.4–1.5 s 开菜单）；分类按钮上的真实 `Tab`/`Shift+Tab` 序列落点（需窗口前台＋坐标点击）。
5. ☆ 静态：**`Space`/`Enter` 在面板组件里的 handler 源码**（`_action_1j891_1` 所在 chunk，读"为什么 Enter 被抑制"）；G790 的 +629 字节定位（跨重载前后存 `dialog.outerHTML` 做 diff）；别名行数据源字段名；18 个字母键帽回查 modifier 描述对象 `key` 写法；面板源按 section 大括号配平穷尽条数；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
6. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）；★ **P1 决策**（本地代码，要用户点头）：`Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（G777）＋ `SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形。

## 第 87 批·上半日志〔零写入·**被环境阻断**〕（2026-09-28 12:42–12:51，★ **窄视口 648×578 下顶栏帮助按钮不在 DOM ⇒ 面板唤出入口缺失，队列第 4 项无法开跑**；零写入，9 次浏览器调用，**无截图**）

**要做什么**：重测 `ArrowRight`／`Home`／`End`（上一轮第一轮日志因菜单懒渲染取空作废）＋ 补 `Tab`／`Shift+Tab` 的真实焦点落点（队列第 4 项，零写入）。

**结果：三条唤出通路逐一穷尽，面板唤不出来**
1. 顶栏 `DIV[aria-label="Question Mark Icon"]` **在 DOM 里不存在**（全页 40 个 `aria-label` 无任何 question/help/快捷键 项）；同一选择器在**同一路径**的第 84 批与第 86 批·上半都一次命中 ⇒ 差异指向环境：本轮实测 **`innerWidth×innerHeight = 648×578` CSS px**（DPR 1.25），顶栏只剩 6 个按钮（Minus／Star／Folder／Trash／`获得 Craft`／右上 `⋯`）。
2. 点顶栏 `⋯` 开的**列表屏视图菜单** 12 项（网格视图／瀑布／列表视图／名称／上次浏览／创建日期／更新日期／显示每日笔记／导入／导出为 Markdown／导出为 TextBundle／空间设置）**不含「快捷键」**。
3. chord `Ctrl+Shift+,` 在 OS 级 `press_key` 上本就不通（第 83/84 批已判）。
⇒ **该环境下面板完全唤不出** ⇒ 队列第 4 项（`ArrowRight`／`Home`／`End` 重测、`Tab` 落点）**如实记为未测**，不许当已测。

**新增**：gap **G793–G794**（新节 `### 三点一〇七`，784→**786 条，最大 G794**）；`interactions.md` **V72**；`keyboard.md` §十八 末补「入口可用性台账」。
- **G793（P2，`~`）**：入口缺失**原因未证**——648 px 视口下帮助按钮不渲染是"宽度门控"还是"窗口状态"所致，需放大视口后复测 `hasQM` 才能结案。★ 对复刻的含义：官方窄视口下只剩 chord ⇒ 本地若做面板**必须**同时给一个窄视口仍在的入口并登记**有意偏差**（原因＝官方此处可及性更差）。
- **G794（P3）**：**菜单类弹层的关闭通路也不唯一** —— 打开视图菜单后 OS 级 `Escape` ＋ `body.click()` **都没关掉**（复核仍 `menu:1`／`menuitem:12`／`group:6`），最后靠 `reload` 才清；与 G761"关一层露一层"同源但更糟（可能一层都关不掉）。★ 复核口径再获实证：`dialog===0` 而 `menu` 残留时直方图是 `img:8 checkbox:9 menuitem:12`（开批基线 `img:3 checkbox:8`），**reload 后四项全回基线** ⇒ 四计数口径必要。

**还原复核（零写入）**：`navigate_page(reload)` ⇒ 终态 `dialog:0`／`menu:0`、角色直方图 `img:3 presentation:8 button:3 checkbox:8`（＝开批基线）、`title`＝`所有文档`、URL **无 `?s=`**、`list_pages` 仍只一扇、`visibilityState=hidden` ⇒ 本批**无截图**。无沙盒实体、无账户级偏好改动、无对外分享。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%（持平）；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变**——A/B/C/D/E 的编辑器键位效果与 G 的任务三时间弹层**仍为零条** ⇒ **不许标 complete**。本批额外暴露的**环境级阻断**（入口缺失）与授权一起构成下一批的两个前置。

## 第 87 批队列（更新：1 需**新的写入授权**；2 需**用户把视口恢复到正常宽度**（顺带解锁截图）；3–6 零写入／纯本地可做）

1. ★★ **申请第 87 批写入授权**（不得沿用第 86 批）：只新建 `QODER-HARVEST-B87`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每条键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`（`visible` 才拍截图）；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后**：复测 `hasQM`（结案 G793 成因）→ 开面板重测 `ArrowRight`／`Home`／`End` ＋ `Tab`／`Shift+Tab` 焦点落点（补第 87 批·上半的未测项）→ 顺带拍关键弹层截图。
3. ☆ 零写入：焦点上下文换串的**表格／合集**两档（需沙盒或用户确认的既有实体）；G790 的 +629 字节定位（跨重载前后各存一次 `dialog.outerHTML` 并 diff）。
4. ☆ 静态：**面板组件里 `Space`/`Enter` 的 handler 源码**（`_action_1j891_1` 所在 chunk，回答"为什么 Enter 被抑制"）；别名行数据源字段名；18 个字母键帽回查 modifier 描述对象 `key` 写法；面板源按 section 大括号配平；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
5. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
6. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）；★ **P1 决策**（本地代码，要用户点头）：`Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（G777）＋ `SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形。

## 第 87 批·下半日志〔零写入·**面板组件源码首探**〕（2026-09-28 12:56–13:00，★★★ **源码定位到主 bundle 两个偏移区** ＋ ★★★ **G776 改判：「别名行第二种序列化风格」是仪器效应不是官方差异** ＋ ★ 行渲染结构与平台过滤；零 UI 交互（3 次 `evaluate_script` ＋ 页内 `fetch`），**未动页面状态**）

**为什么这么走**：第 87 批·上半被窄视口挡住（面板唤不出），队列第 4 项无法开跑 ⇒ 转做队列第 5 项里**不需要面板的静态子项**：读面板组件源码回答"为什么 `Enter` 被抑制"。

**手法（新，记入工具纪律）**：面板 CSS 全在 `index.css.CP00jDAy.css` ⇒ 组件在主 bundle `index-DiTmKH3z.js`（6,841,180 B）；**页内 `fetch` ＋ 页内 `indexOf` 定位**，只回传**偏移表（几十字节）与小窗口片段（几 KB）**，原文留系统 Temp、不进仓库 ⇒ 解决"bundle 大文本不能进上下文"的老问题。

**新增**：gap **G795–G799**（新节 `### 三点一〇八`，786→**791 条，最大 G799**）；`interactions.md` **V73**；`keyboard.md` **§十九**（19.1 模块边界偏移表／19.2 行渲染结构逐字／19.3 平台过滤／19.4 导航二态）。

**本批最贵的三条**：
1. ★★★ **G776 改判（第 85 批的结论作废）**：源码显示**所有行同一结构**（`span.rowName`／`span.rowAlternative` 纯文案 ＋ 兄弟 `span.keys` 挂多个 `<kbd>`）⇒ **主行与别名行的 `innerText` 同样没有分隔符**，"两种序列化风格"是我第 85 批**两条读取路径不对称**造成的（主行走 `+` 拼 kbd、别名行走整行 innerText）。⇒ **作废句**：官方数据里并存两种序列化风格；**保留且更强的结论**：数键帽只准数 `<kbd>` 元素（因为文本对主行也不承载分隔）。⇒ 判据入册：**同一批对同一概念用两条读取路径时，必须先在结构上对齐再比较**（与 G787「页内 click 不搬焦点」同族的仪器效应）。
2. ★★★ **面板模块内 `onKeyDown` 出现 0 次**（模块 2,092,143–2,117,306；全包 37 处最近的在 1,060,903 与 2,197,928，均在模块外）⇒ **`Enter` 抑制与 `ArrowLeft` 未注册都不是面板代码做的** ⇒ 下一步去全局键处理器／`vendor-ds` 按钮里找（`tabIndex` 全包仅 12 处）。⇒ 否定结论**成立的前提**是先算出模块边界并确认窗口内计数为 0。
3. ★ **行渲染结构逐字拿到**：`S===0 ? rowName : rowAlternative(文案 key=or)` ＋ `span.keys` 内 `kbd` 由 **`G9t(descriptor)`** 生成；`y.shortcuts.map(w=>v9t(Cae(w))).filter(w=>w.length>0)` ⇒ **平台过滤发生在"描述符→显示串"阶段**，组件层不判平台 ⇒ 本地"按平台隐藏第二键位"应做在描述符层（承 §十三）。

**☆ 顺带结案队列第 5 项的四条静态子项**：`Space`/`Enter` handler **不在面板模块内**；别名行**没有独立字段**（＝第二个 display）；`keyboard.md` 的别名行风格结论**作废改判**；两条新 i18n key ＝ `preferences.keyboard.shortcuts` 与 `or`。
**☆ 导航二态**（`nav.compactNav`＋`Npe(value/onValueChange)` vs `nav.sidebar`）＝响应式开关存在但条件未定位（`~`），与 G793 同族。

**状态（零写入复核）**：本批**完全没碰页面状态**（只有 `fetch` 与只读 DOM 遍历），无需还原；浏览器仍是第 87 批·上半的收尾态（`dialog` 0／`menu` 0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图）。
**☆ 临时残留（应清理）**：系统 Temp 里 `craft-index-locate.json`／`craft-keymap.json`／`craft-panel-window.js`／`craft-panel-rows.js` 是 bundle 片段，**与仓库无关**。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 覆盖率（两条新 i18n key 会小幅变动，以脚本输出为准）；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变**——A/B/C/D/E 的编辑器键位效果与 G 的任务三时间弹层**仍为零条** ⇒ **不许标 complete**。本批只推进了静态机制面。

## 第 87 批队列（更新：1 需**新的写入授权**；2 需**用户恢复视口到正常宽度**；3–6 零写入／纯本地）

1. ★★ **申请第 87 批写入授权**（不得沿用第 86 批）：只新建 `QODER-HARVEST-B87`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每条键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`（`visible` 才拍截图）；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复**：复测 `hasQM`（结案 G793 成因）→ 开面板重测 `ArrowRight`／`Home`／`End` ＋ `Tab`／`Shift+Tab` 焦点落点 → 顺带拍关键弹层截图。
3. ☆ 静态（零浏览器）：**`Enter` 抑制与 `ArrowLeft` 未注册的实现位置**——看全局键处理器偏移 1,060,238／1,060,903／2,197,928／2,247,538 与 `vendor-ds` 按钮；读 `i`／`Cae`／`v9t`／`G9t`／`Npe` 定义；读 `hlglt`（dialog 外壳）模块；**清理系统 Temp 的 4 个 bundle 片段**。
4. ☆ 静态（其余）：焦点上下文换串的表格／合集两档（需沙盒或用户确认的既有实体）；G790 的 +629 字节定位（跨重载前后各存一次 `dialog.outerHTML` 并 diff）；18 个字母键帽回查描述符 `key` 写法；面板源按 section 大括号配平；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
5. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
6. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）；★ **P1 决策**（本地代码，要用户点头）：`Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（G777）＋ `SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形。

## 第 88 批·上半日志〔零写入·**源码续挖：键位导航与字形常量表**〕（2026-09-28 13:03–13:08，★★★ **官方菜单导航 hook `MRt` 拿到（含 `Home`/`End`、不含左右）** ＋ ★★ **`Home`／`End` 待验 ⇒ 推翻第 84 批的低可信判定** ＋ ★★ **字形权威常量表与匹配链结案 §十六**；零 UI 交互（5 次 `evaluate_script` ＋ 页内 `fetch`），**未动页面状态**）

**为什么继续**：面板唤出入口仍被窄视口挡住（G793 待用户恢复视口），第 87 批队列第 3 项的静态部分（找 `Enter`／`ArrowLeft` 的实现）还有余量 ⇒ 继续用"页内 fetch ＋ 页内 `indexOf`"挖主 bundle（6,841,180 B），原文一律留系统 Temp、不入仓库。

**新增**：gap **G800–G803**（新节 `### 三点一〇九`，791→**795 条，最大 G803**）；`keyboard.md` **§二十**（`MRt` 逐字／字形常量表／匹配链／排除性结论表）。

**本批三条最贵的**：
1. ★★ **`Home`／`End` 待验（G801）**：官方菜单 hook `MRt` 的白名单是 `Set(["ArrowDown","ArrowUp","Home","End"])` ⇒ **`Home`/`End` 是标准键**；而我第 84 批判"送达但未注册"时**焦点状态未知**（承 G766 判据更正）⇒ 面板上这两键**可能其实有效**。★ 两种候选互斥：(a) 分类按钮带 `role=menuitem` 且接了 `MRt` ⇒ 四键全通、纵导航来源也一并解释；(b) 不是 ⇒ 面板纵导航另有出处、`Home/End` 仍无效。⇒ **视口恢复后第一件事＝带 `activeElement` 记录重测 `Home`／`End` 并读 `role`**。
2. ★★ **字形权威常量表结案 §十六**（@19,540）：键名常量（`qs="Escape"`／`oo="Enter"`／`ms="ArrowDown"`／`XM="Home"`…）＋ 字形表 `pEe`（`space`／`↓↑←→`／`⏎⌫`／`⤒⤓`／`[ ] / \ ' ` , -`）⇒ **§十六 的"三套字形风格并存"就是这张表决定的**；`dEe` 转换链说明**键名是 `KeyboardEvent.code` 族**（`Digit*`／`Key*`／`BracketLeft`…）；`rEe` 判据＝单字母看 `key`、其余 `code===KeyX`；**`Ll` ＝ Mac 标志，标签 join `Ll?" ":"-"`（Mac 空格／Win 连字符）** ⇒ 本地 `keycap()` 必须实现这三条（P1）。
3. ★ **排除性结论（G803）**：`"ArrowLeft"` 全包**仅 1 次（字形表）** ⇒ 左右键在主 bundle **无任何 handler 引用**（源码级否定证据）；9 处 `"Enter"` 逐处排除（含 2,246,965 的**邮箱列表** `onKeyDown`：`key!=="Enter"||shift/meta/ctrl/alt → preventDefault + 聚焦下一行`）⇒ **`Enter` 抑制仍未定位**，候选收窄到全包 **37 处 `onKeyDown`**。

**☆ 另拿到两条**：`MRt` 的选择器 `nee='[role="menuitem"]:not([data-disabled])'`（挂载聚焦首项、环绕、`focus({preventScroll})` ＋ `scrollIntoView nearest`）＝**菜单四键导航的权威行为规格**；5,456,645 的 `(ArrowDown||ArrowUp) → preventDefault + open()` ＝某下拉的"方向键展开"（与面板无关）。

**状态（零写入复核）**：本批只做 `fetch` 与只读 DOM 遍历，**页面状态未变、无需还原**；浏览器仍是第 87 批·上半收尾态（`dialog` 0／`menu` 0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图）。
**☆ 临时残留（应清理，均不入仓库）**：系统 Temp 现有 6 个 bundle 片段（前 4 ＋ `craft-index-locate`／`craft-keymap`／`craft-panel-window`／`craft-panel-rows`／`b87-enter-regions`／`b87-enter2`／`b87-arrow`／`b87-navhook` 中的大件）。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 覆盖率（以脚本输出为准）；`check-keyboard.mjs` ⇒ 一致 83／不一致 2（已知仪器伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变**——A/B/C/D/E 的编辑器键位效果与 G 的任务三时间弹层**仍为零条** ⇒ **不许标 complete**；本批只推进了静态机制面。

## 第 88 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3–6 零写入／纯本地）

1. ★★ **申请第 88 批写入授权**：只新建 `QODER-HARVEST-B88`（**2–3 个任务块，绝对不放表**）⇒ 跑 **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每条键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`（`visible` 才拍截图）；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后第一顺位**：**带 `activeElement` 记录重测 `Home`／`End`**（结案 G801）＋ **读分类按钮的 `role`**（判 `MRt` 是否挂在面板上）＋ 复测 `hasQM`（结案 G793 成因）＋ 重测 `ArrowRight`／`Tab` 落点 ＋ 拍关键弹层截图。
3. ☆ 静态（零浏览器）：**37 处 `onKeyDown` 逐个看**（找 `Enter` 抑制）与**面板纵导航出处**；`MRt` 的调用方（谁把 `onKeyDown` 接到哪个容器）；`i`（compact 导航条件）／`Cae`／`v9t`／`G9t`／`Npe` 定义；`hlglt` dialog 外壳模块；**清理系统 Temp 的 bundle 片段**。
4. ☆ 静态（其余）：焦点上下文换串的表格／合集两档（需沙盒或用户确认的既有实体）；G790 的 +629 字节定位；面板源按 section 大括号配平；`ot.tableShortcuts` 成员；`k9t` 非 Mac 分支；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；18 个字母键帽回查描述符 `key`/`code` 写法。
5. ☆ `keyboard.md` 其余遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标"主描述符／Windows 匹配式"。
6. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）；★ **P1 决策**（本地代码，要用户点头）：`Ctrl+K`／`Ctrl+J` 与官方面板同键不同义（G777）＋ `SidebarHeader.tsx:28-30` 的 `⌘K` 是否按平台切字形 ＋ G802 的三条 `keycap()` 规格落地。

## 第 88 批·下半日志〔零写入·**37 处 `onKeyDown` 全包指纹分类**〕（2026-09-28 13:12–13:15，★★ **主包唯一的列表导航＝DS Menu、`MRt` 调用方找到** ＋ ★ **`vendor-ds` 内 `Enter` 字面量 0** ⇒ 抑制点候选再排除一个；零 UI 交互（2 次 `evaluate_script` ＋ 页内 fetch），**未动页面状态**）

**做了什么**：队列第 3 项——① 主包 37 个 `onKeyDown` 偏移**逐个 ±700 B 窗口指纹**（`Enter`／箭头／`preventDefault`／`addEventListener("keydown"`／`menuitem` 计数，原始表 `_harvest/b88-kdmap.json`）；② `vendor-ds-C1RQ3Y31.js`（181,813 B）内 `Enter`／`onKeyDown` 计数（`_harvest/b88-vendor-enters.json`）。

**新增**：gap **G804–G806**（新节 `### 三点一〇一〇`，795→**798 条，最大 G806**）；`keyboard.md` **§二十 新增 20.4**。

**本批两条排除性结论**：
1. ★★ **主包里含箭头/`Home`/`End` 的 `onKeyDown` 只有 2 处**：**2,631,502＝DS Menu 使用点**（`{onKeyDown:s,width:i,…,ref:c}=t, d=useRef(null) … f=S=>{I6e.has(S.key)&&T6e(d.current), s?.(S)} … const h=MRt(…)` ⇒ **`MRt` 的调用方找到了**，白名单四键先过 `T6e` 滚动辅助再进 `MRt`）与 5,457,081＝胶囊下拉"方向键展开"。★ 且 **`document`/`window` 级 `addEventListener("keydown")` 为 0** ⇒ **主包没有全局键盘监听** ⇒ "主包层面唯一列表导航＝DS Menu"成立 ⇒ 若分类按钮带 `role=menuitem`，实测 `ArrowUp/Down` 就由 `MRt` 解释、`Home/End` 也应生效（**G801 的正面候选**）；若不带，面板纵导航必在其他 chunk。
2. ★ **`Enter` 抑制的候选再收窄**：37 处里只有 2 处含 `"Enter"`（邮箱列表 props 2,247,538、textarea 5,193,724，都是局部组件），**`vendor-ds` 里 `"Enter"` 字面量 0、`onKeyDown` 1** ⇒ 抑制既不在面板、不在主包、也不在 DS chunk ⇒ 候选改按**三通道**搜：`window.onkeydown=` 赋值式监听／`vendor-react` root listener 的应用侧回调／其他 211 个 app chunk 的懒加载组件。

**★ 结案队列第 3 项的两个子项**：`MRt` 的**调用方**（2,631,502）；`Space`/`Enter` handler 的**排除范围**（面板／主包／`vendor-ds`）。
**状态（零写入复核）**：仅 `fetch` 与只读 DOM 遍历 ⇒ **页面状态未变、无需还原**；浏览器仍为收尾态（`dialog` 0／`menu` 0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图）。
**☆ 临时残留**：系统 Temp bundle 片段增至 7 个（**不入仓库**，队列挂"用完清理"）。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零）。

## 第 89 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3–5 零写入／纯本地）

1. ★★ **申请第 89 批写入授权**：只新建 `QODER-HARVEST-B89`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后第一顺位**：**带 `activeElement` 重测 `Home`／`End` ＋ 读分类按钮 `role`**（结案 G801，两个互斥候选一次裁）→ 复测 `hasQM`（结案 G793）→ 重测 `ArrowRight`／`Tab` 落点 → 拍关键弹层截图。
3. ☆ 静态：**`Enter` 抑制三通道**（`window.onkeydown=` 赋值、`vendor-react` root 回调、懒加载 app chunk 里的 `"Enter"`）；33 处其余 `onKeyDown` 按需抽读；面板纵导航出处（若 G801 判为"不带 menuitem"则必须再查）；`i`／`Cae`／`v9t`／`G9t`／`Npe` 定义；**清理 Temp 7 个 bundle 片段**。
4. ☆ 静态（其余）：焦点换串的表格／合集两档（需沙盒或用户确认的既有实体）；G790 的 +629 字节定位；`ot.tableShortcuts`／`k9t` 非 Mac 分支／`MOVE_BLOCK_*_MAC`／平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。＋ 孤儿任务清理（10 条，需单独确认）；F 只读态（需明确开口）；★ P1 决策：`Ctrl+K`／`Ctrl+J` 同键不同义（G777）、`⌘K` 平台字形（G777 附）、`keycap()` 三条规格（G802）。

## 第 89 批·上半日志〔零写入·**`Enter` 检查点穷尽**〕（2026-09-28 13:16–13:19，★ **主包里"检查 Enter"的地方总共只有 2 处、且都不是全局抑制** ＋ ★ **`keyCode` 只在键位条件库里出现**；零 UI 交互（2 次 `evaluate_script` ＋ 页内 fetch），**未动页面状态**）

**做法**：`Enter` 在键位库里的最小化别名是 **`oo`**（§19 常量表 `oo="Enter"`），因此按**别名**与**数字 keyCode**两条通道反查主包；结果落到 `_harvest/b88-oo.json`／`b88-k13.json`。

**新增**：gap **G807–G808**（新节 `### 三点一〇一一`，798→**800 条，最大 G808**）；`keyboard.md` **§二十 新增 20.5**。

**本批两条**：
1. ★ **`===oo` 全包仅 1 处 @5,411,289**＝输入框组件（`key===oo` → 未选中 `preventDefault`，选中则提交）；**`===13` 全包仅 1 处 @5,193,557**＝DS 文本域（`enterKeyCallback ? cb : preventDefault`）。⇒ **都是输入类组件自身语义，都不在文档/窗口级、都不触及 `<button>`** ⇒ **`Enter` 在面板不激活的原因仍未在代码里找到**。
2. ★ **`keyCode` 全包仅 16 次**，集中在 **14,736–19,884（＝键位条件库 `$N.keyCondition`）** ＋ styled ⇒ **"数字 keyCode 全局拦截"这条候选在主包内也排除**；顺带拿到建模规格：官方键位条件有 **`keyCode`（数值区间）型**与 **`code`（`KeyX`/`DigitX`/`BracketLeft`…）型**两种。

**⇒ G803 第三次候选收窄（五条已排除，剩三条）**：已排除＝面板模块／主包 37 处 `onKeyDown`／`vendor-ds`／主包 `===oo`+`===13`+`keyCode` 通道；**剩余 (a) 分类按钮的 `role` 与复合组件**（读 `role` 即可判，与 G801 同一动作）、**(b) 其他 211 个 app chunk**、**(c) `window.onkeydown=` 赋值式监听**。

**状态（零写入复核）**：仅 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；浏览器仍为收尾态（`dialog` 0／`menu` 0、直方图 `img:3 presentation:8 button:3 checkbox:8`、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图）。
**☆ 临时残留**：系统 Temp bundle 片段 9 个（**不入仓库**，队列挂"用完清理"）。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零）。

## 第 89 批队列（更新：1 需**新的写入授权**；2 需**用户恢复视口**；3–6 零写入／纯本地）

1. ★★ **申请第 89 批写入授权**：只新建 `QODER-HARVEST-B89`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后第一顺位**：**带 `activeElement` 重测 `Home`／`End` ＋ 读分类按钮 `role`**（一次动作同时裁 G801 与 G807 的候选 (a)）→ 复测 `hasQM`（结案 G793）→ 重测 `ArrowRight`／`Tab` 落点 → 拍关键弹层截图。
3. ☆ 静态：`Enter` 剩余候选 **(b) 懒加载 app chunk 里的 `"Enter"`** 与 **(c) `window.onkeydown=` 赋值式监听**；33 处其余 `onKeyDown` 按需抽读；面板纵导航出处（若 G801 判"不带 menuitem"）。
4. ☆ 静态（其余）：`i`／`Cae`／`v9t`／`G9t`／`Npe` 定义；`hlglt` dialog 外壳模块；焦点换串的表格／合集两档（需沙盒或用户确认的既有实体）；G790 的 +629 字节定位；`ot.tableShortcuts`／`k9t` 非 Mac 分支／`MOVE_BLOCK_*_MAC`／平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平；**清理 Temp 9 个 bundle 片段**。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J` 同键不同义（G777）、`⌘K` 平台字形（G777 附）、`keycap()` 三条规格（G802）。

## 第 89 批·下半日志〔零写入·**焦点栈 44 注册点全表 ＋ 面板纵导航出处结案 ＋ G756 载体结案**〕（2026-09-28 13:28–13:55，★★★ 三个挂账一次结；零 UI 交互＝3 次 `evaluate_script` 页内 fetch ＋ `indexOf`，**未动页面状态**）

**做了什么**：队列第 3／4 项的定点反编译——① `pushIntoFocus` 全包 **44 处**全量落盘（每处取 id／keyDefs／`allowPropagation`／前后文，`_harvest/b89-pushfocus.json`）；② `.onkeydown=` 赋值式三模式全包搜；③ 定点抽 `Lo`／`z1`／`eEe`／`XI`／builder 族定义（`_harvest/b89-defs.json`／`b89-defs2.json`）。

**新增**：gap **G809–G813**（新节 `### 三点一〇一二`，800→**805 条，最大 G813**）；`keyboard.md` **§二十 新增 20.6**（六小节）；`interactions.md` **V74**。

**本批五条**：
1. ★★★ **面板纵导航出处结案＝`tJ="CategorizedShortcutsPanel"` @2,118,334**（组件 `qZ`，CSS 模块 `dm375`）：焦点栈条目＝`Esc`／`ot.TOGGLE_KEY_SHORTCUTS` 关闭 ＋ `↑→idx−1`／`↓→idx+1`，索引 `Math.min(Math.max(cur+y,0),len-1)` **夹紧不环绕**、handler **只改选中不搬焦点**（G782 代码级解释）、**无 `Home`/`End`/左右键** ⇒ G801 三键 no-op ＋ 首末夹紧 no-op ＋ `Ctrl+↑` 宽松也切 三条新屏上预测。
2. ★★ **G756 载体结案＝localStorage key `shortcutsPanelLastActiveCategory`**（`Lo` @36,201＝localStorage 封装：`setItem`/`getItem`+`JSON`、`storage` 事件跨标签、`topApi.broadcastStorageChange` 跨窗口；读写经 `z1` @37,643；无效值回落首分类）⇒ **本地 per-browser、不跨设备**；运行时存储按铁律未读。
3. ★★ **分派器全文与 API 面到手**：`bn={initialize,pushIntoFocus,upsertIntoFocus,removeFromFocus}`、注册 `eEe(t){zn.document.addEventListener("keydown",tEe,t,!0)}` @14,301、`XI`（修饰 `==null` **不校验** ⇒ `Vn` 宽松/`mo` 严格两档并存；`key` 型带 `toUpperCase()` 兜底）＋ builder 全家族（`q7`/`Vr`/`Oo`/`yae`——**数字必须走 `code()`**／`Co` ⌘↔Ctrl／`QM` Mac-only／`bae` 平台选择）＝G808 完整化。
4. ★★ **✎ 口径更正（G813）**：§20.4／§20.5／G804 的「`document`/`window` 级 `addEventListener("keydown")`＝0 ⇒ 主包没有全局键盘监听」是**窗口口径的过度推广**——全包实测 **7 处**（本轮逐一读过内容）：document 级 4＝分派器 @14,301／Tab 焦点陷阱 @1,377,493／交互观测组合 @4,890,138（handler `L` **未读**）／`keydown+keyup` @6,316,375（handler `vqn` **未读**）；元素级 3。两行就地加 ✎ 标注。
5. ★ **G803 第四次收窄**：`.onkeydown=` 赋值式三模式全包 **0** ⇒ 候选 (c) 主包内排除；**新增 (d) `L`@4,890,138 与 (e) `vqn`@6,316,375** 两条未读 document handler。顺带 `wO(t)=setIsShortcutsModalOpen`＝面板开关是 store action；`HelpButton` 也注册 `TOGGLE_KEY_SHORTCUTS`。

**状态（零写入复核）**：仅 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；浏览器仍为收尾态（`dialog` 0／`menu` 0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图）。
**☆ 临时残留**：系统 Temp bundle 片段 9 个（**不入仓库**），队列挂"用完清理"。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零）。

## 第 90 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3–5 零写入／纯本地）

1. ★★ **申请第 90 批写入授权**：只新建 `QODER-HARVEST-B90`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后第一顺位（一批全裁）**：带 `activeElement` 重测 `Home`／`End`／`ArrowLeft`／`ArrowRight`（G801）＋ **首/末分类的 `↑`/`↓` 夹紧 no-op**（G809 预测）＋ **`Ctrl+↑` 是否也切分类**（`Vn` 宽松预测）＋ **读分类按钮 `role`／tag**（G803 候选 (a)）＋ 复测 `hasQM`（G793）＋ 自 toggle `Ctrl+Shift+,` 关面板 ＋ 拍关键弹层截图。
3. ☆ 静态：**document handler `L`@4,890,138 与 `vqn`@6,316,375 的函数体**（G803 候选 (d)／(e)）；`k9t` 分类清单构造器（箭头函数，搜 `k9t=t=>`）；`ot.TOGGLE_KEY_SHORTCUTS` 完整修饰式；`Lo.migrateValue` 分支；**清理 Temp 9 个 bundle 片段**。
4. ☆ 静态（其余）：`Enter` 候选 (b) 211 懒 chunk；焦点换串的表格／合集两档；G790 的 +629 字节定位；`ot.tableShortcuts`／`MOVE_BLOCK_*_MAC`／平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J` 同键不同义（G777）、`⌘K` 平台字形（G777 附）、`keycap()` 三条规格（G802）、**Base UI Tabs roving vs 官方"改选中不搬焦点"的有意偏差选边**（G809）。

## 第 90 批·上半日志〔零写入·**视口探针 ＋ `qZ` rail 双态 ＋ G803 (d)(e) 读正文排除 ＋ `ot` 片段首采**〕（2026-09-28 14:06–14:12，★★ Enter 悖论改写为两类通路假设 ＋ ★ `resizeTo` 程序侧不可解；1 次视口探针 ＋ 3 次页内 fetch＋`indexOf`，**零 UI 交互、未动页面状态**）

**做了什么**：① 视口探针＝`resizeTo(1440,900)` 读前后 `innerWidth`＋四计数＋`help` 按钮在场；② `qZ` 面板全函数体 6.8 KB 窗口（rail 渲染、`Npe`/`a6` 分支、关闭与滚动区）；③ `k9t`／handler `L`／`vqn`／`TOGGLE_KEY_SHORTCUTS` 8 处消费点定点抽取；④ `vendor-ds` 取回读唯一 `onKeyDown` 正文＋Enter 形态四模式计数；⑤ `zr`／`JI`／`hn`／`Npe`／`a6` 定义补齐（`_harvest/b90-static.json`／`b90-ds.json`／`b90-defs2.json`）。

**新增**：gap **G814–G819**（新节 `### 三点一〇一三`，805→**811 条，最大 G819**）；`keyboard.md` **§二十 新增 20.7**（五小节）；`interactions.md` **V75**。

**本批六条**：
1. ★ **视口探针＝程序侧不可解**：`resizeTo` 静默无效果（648×578→648×578、`err=null`）；同次复现 G793（`help:false`）＋四计数基线全 0 ⇒ **窄视口与截图两个锁只能由用户解**（与 #24 同类）。
2. ★★★ **`qZ` rail 双态**：sidebar＝`a6` DS 按钮（`onClick` 直连 setter、**无 role/onKeyDown/tabIndex 覆写**，屏上 `BUTTON._action_1j891_1` 佐证）／compact＝`Npe` 图标分段控件；条件 `i=hn()`（**未定位**）⇒ **G803 候选 (a) 静态清白**（真 button ＋ 三处零 Enter 拦截）⇒ **代码-屏上悖论**。
3. ★★ **(d)(e) 读正文排除**：`L`@4,890,138＝框选组件、**只处理 `Escape`**（仅框选中）；`vqn`@6,316,375＝打字/Shift 的 **body-class 开关**、无 `preventDefault` ⇒ document 级 4 处已读 3 处全部与 Enter 无关。
4. ★★ **`vendor-ds` 唯一 `onKeyDown`@71,888＝Tab 焦点陷阱**（`TreeWalker(tabIndex>=0)` 首尾互跳＋DS 陷阱栈）；全 chunk `keyCode===13`/`key==="Enter"`/`which===13` 均 0 ⇒ **DS 侧 Enter 嫌疑清零**。
5. ★★ **`k9t`@2,109,810 结案**：7 分类×sections 全结构、**`documents` 无 `getTitle`＝屏上"唯一无段标题分类"的源码解释**、`JX`＝**Mac 才追加 `*_MAC`**（§13 函数名到手）、`ot.tableShortcuts` 字段实存、Mac-only 分支逐字。
6. ★★ **`ot` 片段 @884,935 首采**：`TOGGLE_KEY_SHORTCUTS:zr(Vr("Comma"))`（**物理 Comma 码**；`zr`＝Mac ⌘⌥ ↔ **Win Ctrl+Shift** 完整 winMatcher）＋ 9 条命令描述符实读 ＋ `TOGGLE_FOCUS_MODE:yae(".")`＝**无修饰⇒宽松** ＋ `JI`/`YM`/`lEe` winMatcher 补全；`TOGGLE_KEY_SHORTCUTS` 三消费点（面板／`HelpButton`／全局底座）＋ editor 级 @6,297,695。

**⇒ G803 第五次收窄（排除法打完，改两类通路假设）**：剩余＝**(f) `press_key('Enter')` 通路本身**（VK code／事件形态；Space 走 keyup、Enter 走 keydown 激活，要求不同）＋ **(g) 焦点落已选中项的 no-op 混淆**；另保留 (b) 211 懒 chunk（优先级下调）。**两者都要视口恢复后带 `activeElement`＋页内 keylogger 屏上裁。**

**状态（零写入复核）**：仅探针＋`fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**☆ 临时残留**：系统 Temp bundle 片段 12 个（**不入仓库**），队列挂"用完清理"。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零；两个外部锁＝第 91 批写入授权 ＋ 视口恢复）。

## 第 91 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3–4 零写入／纯本地）

1. ★★ **申请第 91 批写入授权**：只新建 `QODER-HARVEST-B91`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层**（计划／截止／提醒逐个开 ＋ 重复子菜单"无结束"档）＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹；**Enter 复测＝(f)(g) 一次裁**：按键前挂页内 keylogger 确认事件到达＋确认焦点在**未选中**分类上）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后一批全裁**：`Home`／`End`／`ArrowLeft`／`ArrowRight`（G801）＋ 首/末分类 `↑`/`↓` 夹紧 no-op（G809）＋ `Ctrl+↑` 宽松也切（G809）＋ 分类按钮 `role`／tag 读取（G814）＋ `Enter` 悖论 (f)(g) 复测（G803 第五次收窄）＋ rail 双态分界（`hn()` 屏上判）＋ 复测 `hasQM`（G793）＋ 拍关键弹层截图（`visibilityState` 应为 visible）。
3. ☆ 静态：`hn()`（compact/sidebar 条件，搜 `function hn`／`hn=` 放宽守卫）；`lEe` winMatcher 尾部；`TOGGLE_FOCUS_MODE:yae(".")` 的修饰显示来源（描述符→显示串管线里 `yae` 如何补修饰）；211 懒 chunk 的 `Enter`（候选 (b) 收尾）；**清理 Temp 12 个 bundle 片段**。
4. ☆ 静态（其余）：焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J` 同键不同义（G777）、`⌘K` 平台字形（G777 附）、`keycap()` 三条规格（G802）、**Base UI Tabs roving vs 官方"改选中不搬焦点"选边**（G809）、**本地 dialog 补 Tab 焦点陷阱与否**（G816）。

## 第 90 批·下半日志〔零写入·**`yae` 全文 ＋ 显示管线闭环 ＋ `lEe` 归属更正**〕（2026-09-28 14:19–14:24，★★★ 87 批挂账的 `Cae`/`v9t` 结案 ＋ ★★ `TOGGLE_FOCUS_MODE` 修饰来源结案 ＋ ★★ `keyboard.md:370` 一处错账就地改正；1 次页内 fetch＋`indexOf`，**零 UI 交互、未动页面状态**）

**做了什么**：队列 91 第 3 项定点——抽 `yae`／`lEe`／`hn`／`Cae`／`v9t` 五个定义（`_harvest/b90-lower-defs.json`）；本地回读 `keyboard.md` 平台表与 370 行做归属对账。

**新增**：gap **G820–G822**（新节 `### 三点一〇一四`，811→**814 条，最大 G822**）；`keyboard.md` **§二十 新增 20.8** ＋ **370 行就地 ✎**。

**本批三条**：
1. ★★ **`yae`＝`primaryCharacter()` 全文**：返回 Mac `{meta}`／winMatcher `{ctrl}` ⇒ **Mac ⌘+字符 ↔ Win Ctrl+字符** ⇒ **`TOGGLE_FOCUS_MODE:yae(".")` 屏上 `Ctrl+.` 结案**（G818 关闭）；错误文案自曝规范名 `primaryCharacter()`/`letter()`/`code()`，且数字必须 `code("Digit*")`。
2. ★★★ **显示串管线闭环（87 批挂账 `Cae`／`v9t` 结案）**：`Cae`＝平台挑 matcher → 按条件类型取键名（**`keyCode` 型 ⇒ 返回 `[]` ⇒ 面板不显示**）→ `dEe` 字形兜底 → token 列表（**meta 的 Win 标签＝`"Win"`**）；`v9t`＝**仅 Mac** 按 `ctrl,alt,shift,meta` 重排修饰段、Win 原样返回 ⇒ 本地 `keycap()` 三条 P1 规格（Win meta 标签／`keyCode` 不显示／Mac 修饰序）。
3. ★★ **`lEe`＝⌘⇧⌥↔Ctrl+Shift+Alt 三键全带**（与平台表 178 行一致）⇒ **`keyboard.md:370`"经 `lEe` 映射成 Ctrl-Alt-S"自相矛盾**（照 `lEe` 应显示四键帽、屏上是 `CtrlAltS` 三键帽）⇒ **工厂只能是 `JI`**（⌘⇧⌥↔Ctrl-Alt）⇒ 就地 ✎ 更正；教训＝**屏上串反推工厂必须逐字段对 `winMatcher`，`JI`/`lEe` 是同 Mac 串、Win 差一个 Shift 的孪生构造器**。

**状态（零写入复核）**：仅 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**☆ 临时残留**：系统 Temp bundle 片段 13 个（**不入仓库**），队列挂"用完清理"。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零；两个外部锁＝第 91 批写入授权 ＋ 视口恢复）。

## 第 91 批队列（更新：1 需**新的写入授权**；2 需**用户恢复视口**；3–4 零写入／纯本地）

1. ★★ **申请第 91 批写入授权**：只新建 `QODER-HARVEST-B91`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹；**Enter 复测＝(f)(g) 一次裁**：按键前挂页内 keylogger 确认事件到达＋确认焦点在**未选中**分类上）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后一批全裁**：`Home`／`End`／左右键（G801）＋ 首/末分类夹紧 no-op ＋ `Ctrl+↑` 宽松切（G809）＋ 分类按钮 `role`／tag（G814）＋ **Enter 悖论 (f)(g) 复测**（G803 第五次收窄）＋ rail 双态分界（`hn()` 屏上判）＋ `hasQM`（G793）＋ 关键弹层截图。
3. ☆ 静态：`hn()` **换搜法**（import 别名 ⇒ 查 `hn` 在消费点的 import 表还原导出名，或搜 `isCompact` 赋值）；**`ho` 注册表里 `SCHEDULE_FOR_TODAY` 的工厂原文**（确认 `JI`，闭合 G822 的反推）；211 懒 chunk 的 `Enter`（候选 (b) 收尾）；**清理 Temp 13 个 bundle 片段**。
4. ☆ 静态（其余）：焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J`（G777）、`⌘K` 字形（G777 附）、`keycap()` 三条规格（G802，**90 批·下半又补三条＝Win meta 标签／`keyCode` 不显示／Mac 修饰序**）、roving 选边（G809）、dialog Tab 焦点陷阱（G816）。

## 第 91 批·上半日志〔零写入·**`ho` 注册表片段直读（G822 闭合）＋ `hn()` 画像 ＋ Temp 清理**〕（2026-09-28 14:23–14:27，★★ `SCHEDULE_FOR_TODAY:JI(Oo("s"))` 原文确认 ＋ ★ 9 条工厂实读 ＋ ☆ 别名表纪律二次验证；2 次页内 fetch＋`indexOf`，**零 UI 交互、未动页面状态**）

**做了什么**：队列 91 第 3 项——① `SCHEDULE_FOR_TODAY`／`as hn`／`hn` 定义模式／`REMIND_IN_ONE_HOUR` 定点抽取（`b91-static.json`）；② 尾部别名表动词＋`wr` 本体＋`hn(` 全部使用点（`b91-hn.json`）；③ **系统 Temp 原文残留清理**（5 个文件）。

**新增**：gap **G823–G824**（新节 `### 三点一〇一五`，814→**816 条，最大 G824**）；`keyboard.md` **§二十 新增 20.9**。

**本批三条**：
1. ★★ **G822 反推→原文**：`ho` 片段 @901,613 直读 **`SCHEDULE_FOR_TODAY:JI(Oo("s"))`** ⇒ 屏上 `Ctrl+Alt+S` 与 Mac `⌘⇧⌥S` 全链闭合；同段 **9 条工厂实读**（`OPEN_NEW_TASK_POPUP:Co`／`OPEN_SCHEDULE_DATEPICKER:ci`／`OPEN_DEADLINE_DATEPICKER:ci`／`OPEN_TASK_LOCATION:ci`／`REMIND_IN_ONE_HOUR:JI`／`TOGGLE_DONE:YM`／**`TOGGLE_DONE_SLASH:yae("/")`＝`yae` 第二例**／**`EDIT_START:mo(oo)`＝严格裸 Enter**／`TOGGLE_STATE`·`CREATE_NEW:mo(vd)`）逐条对屏 ✓ ⇒ 表D 工厂累计实读 11+ 条。
2. ★ **`hn()` 使用面画像**：无参全局响应式查询 hook（12 处采样：select／拖拽把手／icon-picker→`tut(w)`／色选／upgrade／pricing／**面板 rail 双态**）⇒ 疑似移动端/紧凑判定；**本体未定位**（四搜皆非）；`wr as hn` 所在**尾部大别名表动词未裁**、`wr` 本体＝24×24 SVG 图标 @3,587,019 ⇒ **"别名表只能读表头动词、不能按字母猜"纪律第二次验证**（第 85 批"按加号切"同型）。
3. ☆ **Temp 清理完成**：`craft-index-locate.json`／`craft-keymap.json`／`craft-panel-rows.js`／`craft-panel-window.js`／`craft-index.css` 共 5 个原文残留已删（`crafty-e2e-pg-*` 属 e2e 基建未动）。

**状态（零写入复核）**：仅 `fetch`＋只读遍历＋本地删 Temp ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零；两个外部锁＝第 91 批写入授权 ＋ 视口恢复）。

## 第 91 批队列（更新：1 需**新的写入授权**；2 需**用户恢复视口**；3–4 零写入／纯本地）

1. ★★ **申请第 91 批写入授权**：只新建 `QODER-HARVEST-B91`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹；**Enter 复测＝(f)(g) 一次裁**：页内 keylogger 确认事件到达＋焦点在**未选中**分类上）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后一批全裁**：`Home`／`End`／左右键（G801）＋ 首/末分类夹紧 no-op ＋ `Ctrl+↑` 宽松切（G809）＋ 分类按钮 `role`／tag（G814）＋ **Enter 悖论 (f)(g) 复测**（G803 第五次收窄）＋ rail 双态分界（`hn()` 屏上判）＋ `hasQM`（G793）＋ 关键弹层截图。
3. ☆ 静态：**`hn()` 本体**（接受任意右值的 `hn=` 扫描／从 `tut(` 消费点反查）；**尾部别名表动词**（读 6,832,700 前的 `import{`/`export{` 表头）；211 懒 chunk 的 `Enter`（候选 (b) 收尾）；33 处其余 `onKeyDown` 语义抽读。
4. ☆ 静态（其余）：焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J`（G777）、`⌘K` 字形（G777 附）、`keycap()` 六条规格（G802＋90 批下半三条）、roving 选边（G809）、dialog Tab 焦点陷阱（G816）。

## 第 91 批·下半日志〔零写入·**尾部别名表动词结案＝`export{}` ＋ `hn` 定义收窄到两形态**〕（2026-09-28 14:28–14:32，★ "别名表先读动词"纪律落地执行；1 次页内 fetch＋`indexOf`，**零 UI 交互、未动页面状态**）

**做了什么**：91 上半仍未采到的两个子项——① 尾部大别名表的表头动词（搜 6.8M 后 `import{`／`export{`／`from"`）；② `hn=` 放宽扫描（含标识符右值）＋`const/let/var hn` 声明（`_harvest/b91-lower.json`）。

**新增**：gap **G825**（新节 `### 三点一〇一六`，816→**817 条，最大 G825**）；`keyboard.md` **§二十 新增 20.10**。

**本批两条**：
1. ★ **别名表动词结案**：@6,828,250 逐字 `…afe();export{DG as $,x6e as A,…,wr as hn,O2 as ho,…}` ⇒ 表＝**主包自己的 `export{local as exportName}`**（延伸至文件尾 6,841,180；6.8M 后 `import{`/`from"` 零命中）⇒ **动词到手前两侧推断一律作废**的纪律正式落地；export 面 `hn`＝图标 `wr`（24×24 SVG @3,587,019）的导出名，与内部 `hn()` 调用**同名不同物**。
2. ★ **`hn` 本体收窄到两形态**：内部 12 处 `hn()` 调用必有本地绑定，而 `function hn(`／独立 `hn=`（非标识符右值）／`const hn`（唯一命中＝`hno` 假阳性）全空 ⇒ **只剩 `class hn` 与 `hn=<标识符>` 别名式两形态未搜**（下批一发即裁）。

**状态（零写入复核）**：仅 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`check-keyboard.mjs` ⇒ 83／2（已知伪差异）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变** ⇒ **不许标 complete**（A–G 效果面仍为零；两个外部锁＝第 91 批写入授权 ＋ 视口恢复）。

## 第 92 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3–4 零写入／纯本地）

1. ★★ **申请第 92 批写入授权**：只新建 `QODER-HARVEST-B92`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A–E 正式跑批**（每键先记 `document.activeElement`、先 `press_key`、chord 不通退 V63 合成键并标注通路；A 撤销计步记每步指纹；**Enter 复测＝(f)(g) 一次裁**：页内 keylogger 确认事件到达＋焦点在**未选中**分类上）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`）＋三索引残留复核。
2. ★☆ **等视口恢复后一批全裁**：`Home`／`End`／左右键（G801）＋ 首/末分类夹紧 no-op ＋ `Ctrl+↑` 宽松切（G809）＋ 分类按钮 `role`／tag（G814）＋ **Enter 悖论 (f)(g) 复测**（G803 第五次收窄）＋ rail 双态分界（`hn()` 屏上判）＋ `hasQM`（G793）＋ 关键弹层截图。
3. ☆ 静态：**`hn` 本体两形态**（`class hn` 与 `hn=<标识符>`，一发即裁）；211 懒 chunk 的 `Enter`（候选 (b) 收尾）；33 处其余 `onKeyDown` 语义抽读。
4. ☆ 静态（其余）：焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；面板源按 section 大括号配平。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J`（G777）、`⌘K` 字形（G777 附）、`keycap()` 六条规格（G802＋90 批下半三条）、roving 选边（G809）、dialog Tab 焦点陷阱（G816）。

## 第 92 批·上半日志〔零写入·**`hn` 结案＝747px 断点 ＋ Base UI `useButton`＝Enter 第一嫌疑 ＋ 已加载 chunk Enter 扫描**〕（2026-09-28 14:34–14:40，★★★ 三个悬案一次推进；3 次 `evaluate_script`（含 1 次 40-chunk 页内扫描），**零 UI 交互、未动页面状态**）

**做了什么**：队列 3 的 `hn` 本体两形态一发裁掉 ＋ G803 候选 (b) 收尾（已加载 JS 资源全扫）。

**新增**：gap **G826–G828**（新节 `### 三点一〇一七`，817→**820 条，最大 G828**）；`keyboard.md` **§二十 新增 20.11**；`interactions.md` **V75 就地 ✎**（视口分界结案）。

**本批三条**：
1. ★★★ **`hn` 结案**：命中在**第 4 种未搜形态＝别名式赋值 `hn=V0e(zo)`**@589,268 ⇒ `V0e=t=>()=>md(t)`、`zo="(max-width: 747px)"`（`$0e=748`）⇒ **rail 双态＝纯宽度断点**；伴生 `wa`(min-width:748)／`H0e`·`Z0e`(always·never)／`Bc`·`DWe`(pointer)／`EWe`(Android UA)／`Xh=48,Jh=56`。**教训：上一批的 `hn=` 守卫把"右值以标识符开头"的那一类过滤掉了 —— 守卫口径先于正文**；新屏上预测＝648＜747 ⇒ 面板应渲染 compactNav。
2. ★★★ **Base UI `useButton`（`vendor-BZCR0rqu.js` @993,321）＝悖论第一嫌疑**：旗标解出 `native:Pr=!0`（默认）、`fa=Ir??(CompositeRootContext!==void 0)`、`va=onClick`；keydown＝`Ua&&(!Pr&&(Ia||qa)&&preventDefault, !Pr&&qa&&va?.())` ⇒ **真值表**：`native:true`＝不拦 Enter（与屏上矛盾）；`native:false`＋onClick 未经 `getButtonProps` 接线＝**Enter 死、Space 靠 composite 分支仍活**（与屏上完全吻合）⇒ **本地映射**：`src/components/ui/button.tsx:1` 同一库 ⇒ 本地从未实测按钮 Enter。
3. ★ **候选 (b) 会话域关闭**：本会话 45 个 JS 资源、实扫 40（跳过主包）⇒ `"Enter"`±260B 内含 `preventDefault` 只 3 处且**全在 vendor**（Base UI composite／G827 的 `useButton`／CodeMirror keymap）⇒ **已加载 app chunk 零命中** ⇒ 未加载 chunk 不可能在当前会话生效。

**状态（零写入复核）**：仅 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**校验**：`check-tables.mjs` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 见下半。
**§6 进度**：**未变** ⇒ **不许标 complete**。

## 第 92 批·下半日志〔零写入·**`a6`＝Base UI Button 薄封装结案（`nativeButton=render==null`）＋ compact 态真实控件与双态屏上判据 ＋ keycap 第 7 条 ＋ Assistant 可见性判据 ＋ `u8` 表格命令表**〕（2026-09-28 14:41–14:52，★★★ G827 最后一问裁掉、G803 悖论出口收窄到两条；2 次 `evaluate_script` 页内 `indexOf`（bundle 已页内缓存 ⇒ 第二次零下载），**零 UI 交互、未动页面状态**）

**做了什么**：沿队列"下一发读 `a6` 的 jsx root"一路做到底 —— `a6` 定义体 → `zre` 别名 → `nativeButton` 全部用法点 → 面板 rail 用法点逐字 → compact 分支真实控件 → 同段 CSS module 表与载体 → 顺带撞出 `Q0` 判据与 `u8` 注册表。

**新增**：gap **G829–G834**（新节 `### 三点一〇一八`，820→**826 条，最大 G834**）；`keyboard.md` **§二十 新增 20.12（20.12.1–20.12.4）**；`interactions.md` **V76**；原始表 `_harvest/b92-lower.json`。

**本批五条**：
1. ★★★ **`a6` 接线结案**：return＝`a.jsxs(zre,{type:C,render:r,nativeButton:S,"data-ds":"action",…})`，**`S = r == null`**；`zre`＝import 表 @5,881 的 `ec as zre`＝**Base UI Button** ⇒ **`nativeButton` 全包只有 2 处**（@2,094,829 DS Action／@1,540,180 DS Button）。⇒ **`native:` 三处命中全是色板 token `neutralContrast.native`**（@1,070,879／@1,079,286／@2,117,559）＝**假阳性**；★ **纪律：找 prop 名要找 DS 封装层的对外名（`nativeButton`），不是库内部参数名（`native`）**。
2. ★★★ **决定性：面板 sidebar 态 rail @2,119,491 逐字不传 `render`** ⇒ `nativeButton:true` ⇒ **真值表第 (1) 行＝keydown 不拦 Enter ⇒ sidebar 态"官方抑制 Enter"这一支排除** ⇒ **G803 第七次更新＝出口只剩 (h) compact 态观测对象错／(f) press_key 事件形态**（候选面：(a) 面板 (b) 懒 chunk (c) 主包检查点 (d)(e) document handler (i) DS 侧 (j) `native:false` 全部打完）。
3. ★★ **compact 态真实控件＝DS 分段控件**：`Npe`→`a.jsx(TIe,{"data-ds":"segmented-control",value,onValueChange})`，items 只有 `{value,icon,ariaLabel}`（**无文本 DOM**）；**同段 CSS module 表 `Aa` 到手** ⇒ **屏上判据：`[class*="_compactNav_"]` vs `[class*="_sidebar_"]` 一发裁 G826**；渲染出口 `className:$e(Aa.dialog,{[Aa.isCompact]:i})` ＋ `!i&&g` ⇒ `i=hn()` 一处定三事。
4. ★★ **keycap 第 7 条 ＋ 载体逐字**：`W9t={meta:"⌘ Cmd",ctrl:"⌃ Ctrl",alt:"⌥ Opt",shift:"⇧ Shift"}`、`z9t={[qs]:"esc"}`、`G9t=t=>t.kind==="modifier"?(Ll&&W9t[t.modifier]||t.label):(z9t[t.key]??t.label)` ⇒ **修饰符号仅 Mac、Win 落 `label`；`Escape` 唯一小写特例**；`V9t=new Lo("shortcutsPanelLastActiveCategory",null,Z9t)`＋`[r,c]=z1(V9t)`＋`d=l.find(b=>b.id===r)??l[0]`（G810 升级为面板内逐字）。
5. ★★ **Assistant 分类可见性判据结案（G833）**：`Q0` 的 `hideFromUI=(market?.toUpperCase())==="CN"||Nr()||z0()` ⇒ ★ **第一版误写成"market 缺失也算 CN"，回读原文后更正**（真身是 `n==null?void 0` ⇒ 缺失时第一项为假；`sA=!0` 只作用于空间开关默认值）＝**自我更正，落盘为证据**；★ **`u8` 表格命令注册表 5 条工厂**（`qi(oo)`／`Co(Oo("d"))`／`Co(Oo("a"))`／`Vn(nc)`／`Co(nc)`＋`w9t=Co(oo)`）⇒ 表D 工厂实读累计 17 条。

**状态（零写入复核）**：仅页内 `fetch`（缓存）＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**校验**：`check-tables.mjs *.md` ⇒ **ALL TABLES CONSISTENT**；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%（本批新增的 5 条 `collections.*`／`table.delete.row` key 早已被集合章节引用 ⇒ 覆盖率不涨，属真实现象不是仪器故障）；`manifest.jsonl` 全部行 JSON 合法。
**§6 进度**：**未变**（A–G 效果面零条）⇒ **不许标 complete**。

## 第 92 批·补录日志〔零写入·**`useButton` 全文 ＋ Enter 的"库内 no-op"机制候选 ＋ `TIe` 出处判否 ＋ `nc` 结案**〕（2026-09-28 14:53–15:02，★★★ Enter 悖论第一次拿到"不需要 Craft 侧抑制"的解释链；3 次 `evaluate_script`（主包常量表／vendor chunk 取回与扫描／定点窗口），**零 UI 交互、未动页面状态**）

**做了什么**：把队列 3 的三项一次做完（`TIe` 语义、`nc` 常量、`a6` 上游 `nativeButton`），并在读 `vendor-BZCR0rqu.js` 时拿到 `useButton` 的完整 handler 全文。

**新增**：gap **G835–G837**（新节 `### 三点一〇一九`，826→**829 条，最大 G837**）；`keyboard.md` **§20.12.5**；`interactions.md` **V77**；原始表 `_harvest/b92-lower-2.json`（并档）。

**本批四条**：
1. ★★★ **`useButton` keydown／keyup 全文**：Enter 的**唯一入口是 `!Pr`（＝`nativeButton:false`）** ⇒ `true` 时 Base UI 一行都不执行；**`onClick` 经 `getButtonProps` 接线**（`props:[fa,da]`）⇒ **G827 真值表"onClick 未接"子分支在 Button 本体上不成立**；**规格 ＋2 条**＝`role` 三类特例（`menuitem*`／`option`／`gridcell` 在 `defaultPrevented` 时早退）＋ `nativeButton:false` 时补 `role:"button"`（a11y 补偿）；`nativeButton:ca=!0`→`useButton({native:ca})` 映射逐字。
2. ★★★ **Enter 悖论的"库内机制候选"（G836）**：`ComboboxItem` 默认 `nativeButton:!1` ＋ Listbox／Combobox 的 Enter＝`activeIndex==null` 即 `return`（静默 no-op）、有高亮项才 `listRef.current[i].click()` ⇒ **与第 86 批"焦点与选中两套状态互不跟随"咬合** ⇒ **"官方主动抑制 Enter"降级为待否假设**，(h) 升为具体机制候选；屏上裁定动作改写＝判档 → 读 `role`/`data-ds` → 按 Enter 并同读是否有高亮项。
3. ★ **`TIe` 出处判否（G837）＝定界失误**：该 vendor chunk（3,888,008 B）内 `TIe` 零命中、export 头是混合库（`serialize`／`tinycolor`／`dedent`）⇒ 上一步"从别名向后取第一个 `from"`"不可信 ⇒ **纪律：import／export 别名表必须先定界（向前 `import{`、向后 `}from"`）再取值**（同坑第三次）。
4. ☆ **主包键名常量表 @19,528 到手** ⇒ **`nc`＝`Backspace`**（G834 结案：清除单元格＝裸 `Backspace`、删行＝`⌘/Ctrl+Backspace`；`Delete` 另属常量 `B4`）；`XM` 之后被窗口右界截断。

**状态（零写入复核）**：仅页内 `fetch`＋只读遍历 ⇒ 页面状态未变、无需还原；收尾态＝四计数 0/0/0/0、`title` 所有文档、URL 无 `?s=`、`visibilityState=hidden` ⇒ 无截图。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`manifest.jsonl` 全部行合法。
**§6 进度**：**未变**（A–G 效果面零条）⇒ **不许标 complete**。

## 第 93 批队列（1 需**新的写入授权**；2 需**用户恢复视口**；3 零写入／纯本地）

1. ★★ **申请第 93 批写入授权**：只新建 `QODER-HARVEST-B93`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A–E 正式跑批**（每键先记 `document.activeElement`；先 `press_key`，chord 不通退 V63 合成键并标注通路；A 撤销计步记每步 `domSnapshot().length`；Enter 复测按新计划：先读 `[class*=_compactNav_]` 判定当时渲染的是哪一档，再对**未选中**的分类项按 Enter ＋ 页内 keylogger 同时记事件是否到达）；指纹＝角色直方图＋新增文本集合＋`data-state`＋弹层自身长度；开场读 `visibilityState`；做完 LIFO 还原＋三索引残留复核。
2. ★☆ **等视口恢复后一批全裁**：**G826 compact 判定（`[class*=_compactNav_]`）**＋ `Home`／`End`／左右键（G801）＋ 首/末夹紧 no-op ＋ `Ctrl+↑` 宽松切（G809）＋ **Enter (h)／(f) 二选一裁定**＋ rail 双态截图 ＋ `hasQM`（G793）。
3. ★ **静态一发即裁（不需授权、不需视口）**：**`TIe`（DS 分段控件）的 `Enter`／`Space` 语义**＝(h) 假设成立与否的关键（读 `TIe` 定义体＋其 item 渲染的 role／onKeyDown）；`nc` 常量身份（`Delete` vs `Backspace`，读主包键名常量表）；`a6` 上游是否有 `nativeButton:!1`（DS Button 调用方）；`Aa.dialog`／`Aa.isCompact` 两 class 字面量。
4. ☆ 静态（其余）：`md(` hook 定义；`Nr()`／`z0()` 两旗标；33 处其余 `onKeyDown` 语义抽读；未加载的 5 个 JS 资源；焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`。
5. ☆ `keyboard.md` 遗留：表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标；`u8` 五条命令的屏上对账（并入队列 1）。
6. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J`（G777）、`⌘K` 字形（G777 附）、**`keycap()` 七条规格**（G802＋90 批下半三条＋G832）、roving 选边（G809）、dialog Tab 焦点陷阱（G816）、**本地是否引入 747px 断点的 compact 导航档**（G826／G831，本地 `src/components/ui/` 无 segmented 组件）。

## 队列 3 修订（第 92 批·补录后 15:02）

原队列 3 的四项里三项已做完并结案（`nc`＝`Backspace`＝G834 附带项；`a6` 上游**无一处**传 `nativeButton:false`＝G835；库内默认 false 的是 `ComboboxItem`＝G836）。**剩最后一项改写**：`TIe` 真实出处＝**定界法重做**（向前找最近的 import 左花括号、向后找配平的右花括号再加 from 关键字，取到 chunk 路径），进该 chunk 读 `TIe` 定义体与其 item 的 role／`onKeyDown`＝**G836 机制是否命中的判定点**；另补两条＝`XM` 之后的键名常量（`Home`／`End`…）、`Aa.dialog` 与 `Aa.isCompact` 两个 class 字面量。

## 第 93 批·上半日志〔零写入·**`TIe` 结案＝Base UI `TabsRoot` ＋ ✎ G837 作废 ＋ 双态判据带 hash ＋ 视口复核**〕（2026-09-28 15:30–15:33，★★★ Enter 悖论嫌疑收敛到 (f)(i) 两条；2 次 `evaluate_script`（视口＋主包定界／vendor 缓存回读），**零 UI 交互、未动页面状态**）

**做了什么**：把上批队列 3 的"`TIe` 真实出处（定界法）"做完，顺带复核视口并修一条自己给的 DOM 判据。

**新增**：gap **G838–G841**（新节 `### 三点一〇二〇`，829→**833 条，最大 G841**）；`keyboard.md` **§20.12.6／§20.12.7**；`interactions.md` **V78**。

**本批四条**：
1. ★★★ **`TIe`＝`TabsRoot`**：定界法逐字（起 @5,288、止 @6,600、`}from"./vendor-BZCR0rqu.js"`）⇒ 导出名 `ei`；vendor export 表逐字 `TabsTab as ef,TabsList as eh,TabsIndicator as eg,TabsRoot as ei` ⇒ **compact 态分段控件＝Base UI Tabs**；`TabsTab` 的 `nativeButton` **默认 true** ＋ roving 把 `Enter`／`Space`／空串都算到末尾键。⇒ **两档 rail 都不该吞 Enter ⇒ (h) 削弱、嫌疑只剩 (f) 与 (i)**。
2. ✎★★ **G837 的"判否"作废＝自我更正**：错在拿主包本地名去 vendor 搜（应搜导出名）；chunk 路径本来就对。⇒ **纪律写死：跨 chunk 追别名先在发起侧定界取左侧名，再到对面搜**（同型失误累计四次）。
3. ★ **双态 DOM 判据修正（仪器事实）**：`[class*="_sidebar_"]` 在列表屏命中 `_sidebar_dpkxs_58`＝app shell 侧栏（另一模块）⇒ **判据必须带 hash `_dm375_`**，否则把 compact 误判成 sidebar。
4. ☆ **视口复核＋通路盘点**：`648×578`／`mq747=true`／`visibilityState=hidden`／顶栏 help 按钮不在 DOM（G793 复现）／`dialog`·`menu`＝0 ⇒ **用户已答应恢复但尚未执行**；`mcp_list` 查 `craft` ⇒ **0 个工具** ⇒ 本会话数据面写入不可用 ⇒ 沙盒只能走屏幕创建（更要等可见性）。

**状态（零写入复核）**：仅页内 `indexOf`＋只读 DOM 查询 ⇒ 页面状态未变、无需还原；`URL 无 ?s=`。
**校验**：`check-tables.mjs *.md` ⇒ ALL TABLES CONSISTENT；`key-coverage.mjs` ⇒ 1867/3639 = 51.3%；`manifest.jsonl` 全部行合法。
**§6 进度**：**未变**（A–G 效果面零条，授权已到手但被环境卡住）⇒ **不许标 complete**。

## 第 94 批队列（1 需**视口实际恢复**（授权已到手）；2 零写入／纯本地）

1. ★★ **窗口就绪后一次跑完第 93 批已授权子批**：新建 `QODER-HARVEST-B93`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A 撤销计步** ＋ **B Enter 逐级退格式** ＋ **C 块首 Backspace 六段链** ＋ **D Tab 缩进子树** ＋ **E Shift+Enter**；每键先记 `document.activeElement`，先 `press_key`、chord 不通退 V63 合成键并标注通路；A 记每步 `domSnapshot().length`；**Enter 裁定动作定稿**＝判档（`[class*="_compactNav_dm375_"]` vs `_sidebar_dm375_`）→ 焦点指向**未选中**分类 → 页内 keylogger 读事件到达与 `defaultPrevented` → 再判有无变化；开场读 `visibilityState`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`，`documents` 无 restore ⇒ `move --destination unsorted`）＋三索引残留复核＋关键弹层截图。
2. ★ **静态下一发（不需授权、不需视口）**：`TabsList`／`TabsTab` 的 `onKeyDown` 全文（roving 具体动作＋`activateOnFocus` 默认值）＝(i) 假设的静态收口；`isMainOrientationToEndKey` 调用方；`XM` 之后的键名常量；`Aa.dialog`／`Aa.isCompact` 两 class 字面量；`md(` hook；`Nr()`／`z0()`；33 处其余 `onKeyDown`；未加载的 5 个 JS 资源。
3. ☆ 其余台账：焦点换串的表格／合集两档；G790 的 +629 字节定位；`MOVE_BLOCK_*_MAC` 派发上下文；平台位 `_d`／`JAe`／`gae`／`k2`；`keyboard.md` 表A `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名改标。
4. ☆ 孤儿任务清理（10 条，需单独确认）；**F 只读态**（需明确开口，禁开对外分享）；★ **P1 决策**（要用户点头）：`Ctrl+K`／`Ctrl+J`（G777）、`⌘K` 字形（G777 附）、**`keycap()` 九条规格**（G802＋G821 三条＋G832＋G835 两条）、roving 选边（G809）、dialog Tab 焦点陷阱（G816）、**本地是否引入 747px 断点的 compact Tabs 档**（G826／G831／G838）。

---

## 第 94 批·上半日志（2026-09-28 16:45–16:55，零写入）

**做了什么**：窗口 `visibilityState=hidden`（宽度已 956≥748、`Question Mark Icon` 入口回到 DOM）⇒ 已授权的 B93 沙盒子批**没有开始**（写入 0，manifest 无沙盒条目），改为把静态队列 2 打完：`TabsList`／`TabsTab` 全文＋`activateOnFocus` 两侧默认值＋`Npe` 装配＋`useFocusableWhenDisabled` 吞键＋`ACTIVE_COMPOSITE_ITEM` 字面值。5 次页内 `indexOf`／切片，零导航、零 UI 交互。

**产出**：gap **833 → 839 条（最大 G847）**；keyboard **§20.13**（四小节，含屏上判据选择器表）；interactions **V79**；原始窗 `_harvest/b94-tabs.json`／`b94-tabs2.json`／`b94-tabs3.json`／`b94-comp.json`。

**★ 本轮最大产出（口径级）**：**G803「Enter 不激活分类」静态面结案**——Craft 在 @2,097,804 **主动**把 `activateOnFocus` 从库默认 `!1` 改成 `!0`（自动激活），于是方向键即已切换分类，`TabsTab` 的 `onClick`／`onFocus` 都以 `Oa`（已选中）早退 ⇒ **"Enter 无反应"是设计不是抑制**；`TabsTab` 里根本没有任何 `onKeyDown`（只有 `onKeyDownCapture` 置 ref）。⇒ **"官方抑制 Enter"这一路叙述正式作废**，只剩 (f)（宽栏真 `<button>` 上 Enter 是否到达）需要一次屏上 keylogger 裁定。**教训（要复用）**：判"官方有没有做 X"之前，先把**库的默认值**与**产品的显式 prop**都拿到手——**两侧默认值相反时，行为差异的归属就变了**（本轮从"产品缺陷／我方假象"改判为"产品设计"）。

**下一批（第 94 批·下半）队列**：
1. ★ **窗口一旦 `visibilityState=visible`：先跑 §2 开场动作**（`Control+Shift+,` 快捷键面板 ↔ `keyboard.md` 交叉验证，读完 `goto(同一URL)` 关），然后**一次跑完第 93 批已授权子批**：新建 `QODER-HARVEST-B93`（**2–3 个任务块，绝对不放表**）⇒ **G 任务三时间弹层** ＋ **A 撤销计步** ＋ **B Enter 逐级退格式** ＋ **C 块首 Backspace 六段链** ＋ **D Tab 缩进子树** ＋ **E Shift+Enter**；每键先记 `document.activeElement`，优先真实 `press_key`，合成键（V63）要标注通路；A 记每步 `domSnapshot().length`；做完 LIFO 还原（先 `tasks delete` 再 `documents delete`，`documents` 无 restore ⇒ `move --destination unsorted`）＋三索引残留复核＋关键弹层截图。**授权只覆盖该子批（2–3 个任务块），不得再沿用。**
2. ★ **同批次内顺带裁 (f)**（零额外授权）：开面板 ⇒ `[class*="_compactNav_dm375_"]` 判档 ⇒ 读 `[data-composite-item-active]` 与 `[aria-selected="true"]` 是否同元素 ⇒ 页内 keylogger 记 Enter 的 `defaultPrevented`。**V79 已把动线写成三步可照做。**
3. 静态下一枪（无需授权／无需视口）：`useCompositeRoot` 主 `onKeyDown` 全文（方向键／Home／End 拦截与 `stopEventPropagation`）；`isMainOrientationToEndKey` 调用方；`--active-tab-*` 属性全集＋Craft CSS 是否消费；`md(`(max-width: 747px)` 的 hook 本体；`Nr()`／`z0()` 两个 flag；剩余 33 处 `onKeyDown`；5 个未加载 JS 资产。
4. 仍要单独开口头确认才能做：**F 只读 viewer**（绝不开对外分享）；孤儿任务清理（10 条）；P1 决策（`Ctrl+K`/`Ctrl+J`、`⌘K` 字形、keycap 9 规则、roving 侧选择、dialog Tab 焦点陷阱、本地是否加 747px compact 档——**本批新增子问：加了就得决定是否跟官方 `activateOnFocus:!0`**）。

---

## 第 94 批·下半日志（2026-09-29 00:32–00:36，零写入）

**做了什么**：`list_pages` 只剩 `about:blank` ⇒ 试"重新导航"这条自修路（1 次 `navigate_page`）⇒ 拿回登录态（侧栏文本读回）；随后一次自包含页内裁定脚本因**顶栏未渲染**在第一步就 return（`helpFound:null`，附带把整屏按钮名字枚举回来）。`visibilityState` 全程 `hidden` ⇒ 没截图、没按真键、没开面板、没写任何东西。

**产出**：gap **839 → 842 条（最大 G850）**；interactions **V80**；manifest 第 105 行。

**★ 两条口径级修正（要被下个会话看见）**：① **通路可自修**——第 74/80 批写的「恢复动作永久归用户」只在必须复用那扇既有标签时成立，**允许重新导航时连接器自己就能恢复登录态**（代价＝页内 bundle 缓存与 React 态清零）。② **入口存在性只准按名字枚举读回**——本会话同一通路先报 `helpBtn:true`，实扫名字表里没有 `Question Mark`，那是选择器假阳性（§4 铁律"命中数不进产物"的第 N 次应验，这次是我自己踩的）。

**下一批队列（第 95 批）**：
1. ★ 进**文档屏**取顶栏：点侧栏卡片链接（不用 `goto`）⇒ 重新枚举 `button` 名字找 `Question Mark` ⇒ 开面板 ⇒ 立刻跑 V79 三态裁定（`aria-selected` vs `[data-composite-item-active]`）＋ 真 `press_key('Enter')` 的 `defaultPrevented`（合成键不能替代，见 G850）。零写入，不需要授权。
2. ★ 若要跑已授权的 B93 沙盒子批：**必须重新申请该批写入授权**（第 93 批的授权不得沿用）；子批内容与还原程序不变（G 任务三时间弹层＋A 撤销计步＋B/C/D/E，LIFO 还原＋三索引残留复核＋关键弹层截图）。
3. 静态下一枪（无需视口／无需授权，但要重取页内 bundle 缓存，因为已清空）：`useCompositeRoot` 主 `onKeyDown` 全文；`isMainOrientationToEndKey` 调用方；`--active-tab-*` 全集＋Craft CSS 消费点；`md("(max-width: 747px)")` hook 本体；`Nr()`／`z0()`；剩余 33 处 `onKeyDown`；5 个未加载 JS 资产。
4. 仍要单独口头确认：F 只读 viewer（绝不开对外分享）；孤儿任务清理（10 条）；P1 决策（`Ctrl+K`/`Ctrl+J`、`⌘K` 字形、keycap 9 规则、roving 侧选择、dialog Tab 焦点陷阱、本地 747px compact 档＋该档是否跟官方 `activateOnFocus:!0`）。

---

## 第 95 批·上半日志（2026-09-29 00:36–00:42，零写入）

**做了什么**：执行上批队列第 1 项（进文档屏取顶栏）⇒ 侧栏卡片点击引发**真导航**、执行上下文销毁 ⇒ 落在官方帮助中心中文站。在该站跑自包含 `evaluate_script`：第一次因 `nm(undefined)` 抛错，第二次拿到 34 条导航链接＋可访问名表＋2 个 dialog 文本；标题因 `String(el)` 失误空手（G854）。全程零写入、未动用户数据。

**产出**：gap **842 → 846 条（最大 G854）**；`longtail.md` 第十五节；interactions **V81**；manifest 第 106 行。

**★ 口径级收获**：取证通路第三条＝**帮助中心**（零登录、零 visibility 依赖）。它解锁「功能分类与命名对账」，**不解锁**行为证据 ⇒ A–I 仍只能在 app 屏上做。

**下一批队列（第 95 批·下半）**：
1. ★ 修仪器再取键表：用 `el.textContent` 抓 `h1/h2/h3`；探测 `[class*=key]`／grid／`code`／`dt,dd` 找 `markdown-shortcuts` 的键表载体；顺带抓 块与页面、`find-replace`、`surround-selection`、`reminders`、`daily-notes`、`version-history` 六页正文（**必须与 bundle／屏上对账后**才进 `keyboard.md`／`interactions.md`）。
2. ★ app 屏上裁定（需窗口可见或顶栏渲染）：进文档屏 → 顶栏 `Question Mark` → 面板 → V79 三态（`aria-selected` vs `[data-composite-item-active]`）→ 真 `press_key` 打 Enter 后读 `defaultPrevented`。
3. ★ 若要开沙盒（G 任务三时间动线／A 撤销计步／B/C/D/E）：**必须重新申请写入授权**，第 93 批那份不得沿用。
4. 静态下一枪（页内 bundle 缓存已随导航清零，需重取）：`useCompositeRoot` 主 `onKeyDown` 全文；`isMainOrientationToEndKey` 调用方；`--active-tab-*` 全集；`md` 断点 hook 本体；`Nr()`／`z0()`；剩余 33 处 `onKeyDown`；5 个未加载 JS 资产。
## 第 96 批·上半日志（2026-09-29 09:26–10:20，★★ 行为级依旧零条＝视口最小化 `0/0`；产出＝静态队列五项结案 ＋ 已授权清账 11 行归零 ＋ 卫生项做完）

**做了什么**：冷启动（features §十 接管快照 6 条＋五份批次日志＋manifest 尾 5 行＋两个技能全文，含 `browser-feature-interaction-harvest` 末尾「行为级采集：五条跨项目方法学」）⇒ 开场探针（1 次 `navigate_page` 拿回登录态 ＋ 逐次 `evaluate_script` 读 `visibilityState`／`innerWidth`／顶栏可访问名枚举／四计数）⇒ **连续 9 次读数 `hidden` 且 `innerWidth/innerHeight=0/0`（往批最差 648×578）＝窗口最小化**，`Question Mark` 不在 DOM ⇒ §2 开场动作与 A–G 全部不可执行 ⇒ 按铁律**停下报告并改跑 §5 ＋ 不依赖屏幕的已授权项**；期间向用户拿到四项授权（视口／B96 沙盒／F 只读／清账），**但只有清账可用，沙盒未建**（避免无证据残留）。静态侧＝重取页内 bundle 缓存（`__b96.main` 6,841,180／`__b96.vbase` 3,888,008；⚠ 第一次 `vendor` 正则挑到了 `vendor-react`＝341,982 假阳性，改按字面名重取）后按 `filePath` 落盘 9 份原始窗，逐窗读内容而非计数。

**产出**：gap **846 → 863 条（最大 G871，新节 `### 三点一〇二四` 17 行）**；interactions **V82**；keyboard **§20.14**（九小节）；internals **§二十九**；model **§一之五十三**；longtail **第十六节**；manifest **109 → 114 行**；卫生＝根目录游离 `todo-actions.md`／`manifest.jsonl` 并回后删除（manifest 106→109 逐行 `grep -F` 核对）、Temp `qoder-harvest/b94-*` 四枚经 md5 与仓库副本全等后清掉。校验见本批结尾。

**★ 本轮最大产出（三条口径级，都会被下个会话直接拿来用）**

1. **★★★ V79 的屏上判据被推翻并替换（G857／G858）**：`TabsTab` 里 `[ACTIVE_COMPOSITE_ITEM]: Oa ? "" : void 0` 与 `"aria-selected": Oa` **共用同一个 `Oa`（＝自身 value === 根选中值）** ⇒ 两属性**永远同元素**，用它判"自动激活是否生效"＝恒真、零信息 ⇒ 正确判据换成 **`[tabindex="0"]`（`useCompositeItem` 的 roving 高亮）对照 `[aria-selected="true"]`（选中）**，灰态再用 `[data-disabled]`（CSS `opacity:.4;cursor:default`）与 `[data-whatintent=keyboard]` 焦点环（`outline:2px solid var(--accent-500); outline-offset:-2px`）两面夹住。**教训（要复用）**：写判据前先问「这两个属性是不是同一个布尔驱动的」——同源属性对照永远测不出分离。
2. **★★ 两侧默认值相反的第二个案例（G856）**：`useCompositeRoot` 这个 hook 默认 `stopEventPropagation:!1`，而包它的 `CompositeRoot` 组件默认 **`!0`** 并透传 ⇒ 走组件树的方向键**不冒泡到 document 级和弦分发器**；同批 `md()`／`$0e=748` 那条结案也解释了第 91 批「`hn` 本体四搜未定位」＝**断点是模板串生成的 `max-width: ${748-1}px`，字面量搜不到**。⇒ 教训两条：**同一 prop 在 hook 层与组件层可能默认相反**；**搜字面量之前先想它是不是模板串拼出来的**。
3. **★★★ 归因方向被纠正（G860／G864／G865）**：① `isMainOrientationToEndKey`（含 `Enter`／`Space`／空串"即末尾键"）**属于 Floating UI 的 `useListNavigation`**（三处调用方全在该函数体内，同区 `getFloatingFocusElement`／`useFloatingTree` 为证），**与快捷键面板的 Base UI composite rail 无关** ⇒ G836 的"Enter 机制候选"作废一条；② `k2` 结案＝**Android UA** ⇒ 块编辑器 `onKeyDownBound` 首行 `if(k2)return` 是"移动 Web 不分发块级键定义"而非功能开关；③ **`tableId != null ? [] : uF`** ⇒ 表格单元格内 markdown／块级快捷输入整体失效，`allowBlockStyling` 为假 ⇒ `cne` 整个不调用（只读 UI 总门），IME 组合期 `pushIntoFocus({keyDefs:[],allowPropagation:!1})` 摘键（**第二处实装**，此前只知 `keyCode===229`）。

**✓实测（数据面，非屏幕）**：孤儿任务**实测 11 行**（台账记 10 ⇒ 差一行＝B75 勾选完成实例嵌在母块 logbook 子页 ⇒ **命名条数≠行为条数**）全部删除；★ 官方跨实体写约束拿到动词级证据＝`Failed to delete task: Cannot modify document in trash. Restore it first.`；★ `tasks delete` 自述永久删不可撤销（与 `documents delete` 软删 30 天两套语义）；★ 还原路径官方措辞到手＝`To restore from trash, move it out: documents move --document <rootBlockId> --destination unsorted`；四判据复核＝QODER 任务 0 条／unsorted 4／trash 7／reminders 空。**G731 结案**。

**✎ 通路改判（G871）**：已登录会话里**地址栏直达** `docs.craft.do/zh-Hans/<路径>` 两次都被 app 接回 `/s/<space>/home`（`nav a` 空、`#root` 文本长度 92、`scrollWidth/Height` 0）⇒ 第 95 批的"第三条通路不受阻塞"降级为**零登录门槛、但有路由门槛**，且与视口锁互斥（点卡片那条路要屏幕先渲染）。☆ 仪器抖动一条＝`blocks get --format markdown` 报 `MCP error -32603`、同参数第二次与 `--depth 1` 都成功 ⇒ **报错也可能是抖动**，不得立官方缺陷。★ 新残留＝未分类空页 **`73dc4026-15eb-439c-a0f6-8a1681eb556d`**（`blocks get` 读回零内容、manifest 全文无该 id）⇒ **按禁区未动，待用户确认**。

**下一批队列（第 97 批）**：
1. ★★★★ **开场只做一件事**：把 `features.md` §十 第 10 条那段话读给用户，请他**把那扇 Edge 窗口从最小化还原并保持可见**；然后按新纪律判活＝`take_snapshot` 元素数非空 ＋ **`window.innerWidth > 0`** ＋ 按可访问名枚举到 `Question Mark` 三条同时成立才算解锁（宽 0 时 `matchMedia` 与档位读数全部作废）。
2. ★★ **零写入、无需再申请授权即可做的 5 件事**（窗口一到立即跑）：① 官方快捷键面板 ↔ `keyboard.md` 交叉验证（`Control+Shift+,` 或顶栏 `Question Mark` 两条路）；② **改写版 V79 动线**（判档 → 读 `[tabindex="0"]` vs `[aria-selected="true"]` 是否同元素 → 焦点指向未选中分类 → keylogger → 真 `press_key('Enter')`）；③ P-1＝`Alt/Shift+ArrowDown` 应无反应；④ P-2＝`Home`/`End` 应无反应；⑤ P-3＝方向键后 `document.activeElement` 是否搬（一发行裁 G858 的 rail 归属）。每项都要**截图＋四计数＋键次**三件证据。
3. ★ **A–G 与 F 的沙盒取证**（**必须重新申请写入授权**，第 96 批那份虽未动用也不得跨批沿用）：`QODER-HARVEST-B97`＝1 文档＋3 任务块，不放表；A 撤销计步／B／C／D／E／G 三时间弹层照 `features.md` §十 的动线；F 只读另开口头同意（禁开对外分享）。★ 本批新掉出的两条**优先做**（各自一次输入即可证伪，且直接影响本地 P0 缺陷）：**表格单元格内输 `# ` 不应生效**、**中文 IME 选词期间快捷键应整体失效**。
4. 静态下一枪（无需授权／无需视口，⚠ 页内缓存会被真导航清零 ⇒ 先重取）：`uF` 表尾与 `cne` 本体（@3,777,934）；`allowBlockStyling`／`forcedViewOnlyMode` 的赋值来源；`_dm375_` 其余 18 处 CSS 命中；六位数字码输入组（6,559,6xx／6,611,8xx）的**用途与入口**（本轮只认出形状）；`ho` 注册表 `PREV_TASK/NEXT_TASK` 的屏上键帽对照（表D 需按命令名分列）；剩余未加载 JS 资产。
5. ☆ 待用户确认的两件事：**`73dc4026` 空文档**是不是他的（不是采集遗留 ⇒ 不动；确认是遗留才可删）；**P1 决策包**（`Ctrl+K`／`Ctrl+J` 同键不同义、`⌘K` 平台字形、**`keycap()` 规格**、Base UI roving vs 官方「改选中不搬焦点」选边（**本批把天平推向"官方 rail 会搬焦点"，G855**）、dialog Tab 焦点陷阱、**本地 compact 档要不要跟官方 747px**（本地现在是 767px ⇒ `use-is-mobile.ts:5`）、**新增子问：本地只读要不要补"匿名/外空间/allowBlockStyling"三个来源**、**新增子问：本地要不要补 IME 摘键与表格内禁快捷输入**）。


## 第 96 批·下半日志（2026-09-29 10:38–10:52，★★★ 取证通路拓扑改判＝`browser-use` 是 Qoder 内置浏览器而非用户的 Edge＋★★键盘两桥同时证伪＋★★★ G854 结案（帮助站 markdown 键表 25 条全量）；**用户数据写入 0**）

1. ★★★ **本批最大产出不是采集，是"靶子找错了"**：用户按前 4 批的请求把 Edge 窗口还原并截图（截图实测 1910×867、`isMinimized:false`、bounds `-7,-7,1550x838`），但连接器读到的仍是 `hidden / 0x0` —— 因为 **`browser-use` 这条桥从来不是用户的 Edge**：`press_key` 工具描述＝「in the selected **in-app browser** page」，`take_screenshot` 报错原文＝`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE: In-app Browser did not provide a visible surface … Open the in-app Browser before retrying this visual action. take_snapshot remains available for structural inspection.`，且两边 `document.title` 不同（连接器＝「Craft — A fresh take on documents」/`/home`，可见窗口＝「所有文档」/`/all`）。⇒ **恢复动作永久改写为：请用户打开 Qoder 的内置浏览器面板**（旧措辞"还原 Edge 窗口"作废，别再发）。
2. ★★ **两条桥的能力面第一次被逐项实测并互补**：桥 A（内置）＝`evaluate_script` 真数据 ✓／`take_snapshot` 44 元素 ✓／`click(uid)` ✗ 需绘制面／`press_key` ✗／截图 ✗；桥 B（可见 Edge）＝`navigate_page` ✓／`take_screenshot` ✓／`click(uid)` ✓ 落地／`take_snapshot` △ 残缺／`evaluate_script` ✗ 恒 `{}`。⇒ **没有任何一条桥能同时给出「截图＋DOM 判据＋按键」**，这是 A–I 连续 4 批为零的真结构性原因（不是"窗口没开"这么简单）。
3. ★ **纪律新增（写死）**：桥 B 的 ref→坐标映射不可信 ⇒ **未标注可访问名的 ref 一律禁点**。实测 `ref_75`（快照里是无标签 button，按 DOM 顺序最像顶栏右三图标）落在 CSS (1370,538)＝信息面板滚动条区，**其下方约 40 px 就是「删除」行**；本轮后果仅＝面板滚动、文档无恙。
4. ★★ **键盘通道两桥同时证伪**：桥 A 先装 `window` 捕获监听（回 `installed:true,n:0`）再 `press_key ArrowDown` ⇒ 监听计数**仍为 0**；桥 B `press_key Tab` ⇒ 与基线截图做像素差，diff bbox `(7,10)-(202,104)` **全在浏览器工具栏带内、页面区零差**。⇒ 第 84 批"OS 级普通键被应用 handler 接收"的结论**在两桥上都不能复现**，须在有绘制面的内置浏览器上重测才能恢复该口径。
5. ★★★ **无绘制面时唯一可用的"点击"＝页内合成 pointer 序列**（`pointerover/pointerenter/pointerdown/mousedown/pointerup/mouseup/click` ＋ `clientX/clientY/pointerId:1/pointerType:'mouse'/isPrimary/bubbles/cancelable/composed`）：在 `[aria-label="Question Mark Icon"]` 上成功开 `role=menu`＋5 个 `menuitem`；**单独 `el.click()` 完全无效**。⇒ 这条手法把"读菜单项全集"从"必须有屏幕"降级为"只要有 DOM"，第 97 批可直接用它穷举 `⋯`／插入面板／右键菜单的条目名。
6. ★★ **帮助浮层菜单 5 项全量到手且与第 81 批冲突**（无「快捷键」入口）⇒ 本桥处于 `width=0` 的 compact 档（该 `?` 的 rect＝`[14,971,20,20]`＝底部条），**按 §4 不得判官方删除**，桌面档复验列为第 97 批第 1 项。
7. ★★★ **G854 结案**：帮助站 `Markdown 快捷键` 页的键表载体＝**`<li>` 内的 `<code>`**（`code:36 / li:90 / kbd:0 / table:0 / dt+dd:0/0 / [class*=key]:0`），25 条触发→结果全量已入 `keyboard.md §20.15`；标题层级用 `el.textContent` 抓全（推翻第 95 批 `String(el)` 得到的 14 个 `[object HTMLHeadingElement]`）。⇒ **§5 第 1 项"先修仪器"完成，且六页里价值最高的一页已到手**。
8. ★★ **本表掉出 7 条可执行缺口**（对照本地 `src/components/editor/extensions/markdown-shortcuts.ts` 全文 6 条规则 ＋ `Editor.tsx:244-251` 的 `codeBlock:false / horizontalRule:false / heading.levels=[1,2,3,4]`）：`####`→**Strong**（本地造 H4，P1）／`+`→可折叠列表**整体缺失**（P1）／裸 `x`→待办缺／`|`→引用块别名缺／`::text::`→高亮别名缺／`$$text$$` 官方归"特殊行内元素"而本地当**块级** math／分隔线官方 5 档 vs 本地注释自述 4 档。⚠ 全部是**文档级**证据，改动前须屏上或 `uF` 对账（其中 `####`／`+`／`>`与`|`／`(\d+).` 四条已有 bundle 静态印证 ⇒ 这四处可信度最高）。
9. ★★ **帮助站可达性收窄（G871 升级）**：只有应用菜单按钮能进（点「Markdown 快捷方式」＝同标签整页导航落地 `/zh-Hans/write-and-edit/formatting/markdown-shortcuts`）；随后 `navigate_page` 与页内 `location.href` 两条直连路**都被弹回 `/s/<space>/home`**（后者还先抛 `Inspected target navigated or closed`＝G851 的上下文销毁）。⇒ **帮助站 34 页在登录态下可直取的范围＝那 2 个按钮指向的页**，§5"六页正文"据此重排优先级。
10. ☆ 仪器自记：① 桥 B 的 `take_snapshot` 表头写「76 elements shown」实列 21、`verbose:true` 落盘那份**把角色名全丢了**（只剩 `[ref_N]` 空标签）⇒ **桥 B 的快照不能当结构源**；② `mcp_call` 的 `evaluate_script` **不接受 `pageId`**（多余属性直接校验失败），它只作用于 selected page。

### 第 97 批队列

1. ★★★ **开场第一句就该问的话改成：请把 Qoder 的内置浏览器面板打开**（不是 Edge）。打开后立刻按顺序跑：① 读 `visibilityState`/`innerWidth` 确认脱离 compact；② **桌面档复验帮助浮层是否含「快捷键」入口**（本批第 6 项的冲突）；③ 跑 **V79 新判据**＝`[tabindex="0"]`（高亮）vs `[aria-selected="true"]`（选中）＋三条预测 P-1 修饰键 no-op／P-2 Home·End no-op／P-3 焦点经 microtask 落位。
2. ★★ 若屏幕仍不可得，**改跑"合成键＋合成 pointer"的 handler 级取证**（本批第 5 项手法已打通点击）：页内派发 `new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})` 读 `document.activeElement` 与两属性 ⇒ 能在无绘制面下裁掉 P-1/P-2/P-3，**但必须在产物里标"handler 级、非原生按键链路"**。
3. ★★ A 撤销计步／B Enter 逐级退格式／C 块首 Backspace 六段链／D Tab 缩进子树／E Shift+Enter／G 三时间弹层 —— **全部仍需屏幕＋键盘**；沙盒 `QODER-HARVEST-B96` 那份授权**不得跨批沿用**，开跑前重新申请。
4. ★ F 只读 viewer 灰态矩阵（禁开对外分享）：本批已证 `[data-disabled]`＋`[data-whatintent=keyboard]` 两判据可读，屏幕一到即可跑。
5. ☆ 帮助站剩余价值页：只能靠帮助浮层的「常见问题」按钮换页（本批未试它的落地页）；`Markdown 快捷方式` 已做完。
6. ☆ 静态尾巴（不变）：`uF` 表尾部、`cne` 本体 @3,777,934、`allowBlockStyling`／`forcedViewOnlyMode` 来源、剩余 18 处 `_dm375_` CSS、六位数字码输入面用途、5 个未加载 JS 资产。
7. ☆ 待用户一句话的残留：`73dc4026-15eb-439c-a0f6-8a1681eb556d`（本批在桥 B 里以「无标题页面／未分类／字数 0／区块 0」二次见到，仍无 manifest 归属 ⇒ 按禁区未动）。

**规模**：`gap.md` 863 → **871 条（最大 G879）**；`keyboard.md` 新增 **§20.15**；`interactions.md` 无新 V 号（本批无行为级取证，通路事实记在 G872–G875 与 `internals.md` 通道纪律）；`manifest.jsonl` 不追加（**零写入**）。


## 第 96 批·尾记附（2026-09-29 11:12–11:25，★★键盘通道打通后的第一次行为取证尝试＝**卡在"面板必须保持前台"**；沙盒已建并**留存未还原**）

1. ★★★ **通路解锁链已闭合到只差一步**：用户打开内置浏览器面板 ⇒ `visibilityState:visible`、`innerWidth:638`、`dpr:1.25`、`take_screenshot` 出 798×721 ⇒ `press_key ArrowDown` **进页面捕获监听**（`n:2`）。⇒ 连续 4 批的"键盘不可用"结束（G880／G884）。
2. ★★★ **但组合键的 `code` 是空串** ⇒ 官方 `zr(Vr("Comma"))` 这类按 `code` 匹配的绑定在本通路**结构性打不到**，`Control+Shift+,` 三次按下修饰位全真而 `dialog` 恒 0 ⇒ **§2 开场动作判为仪器不可用，不得记成官方无此绑定**（G881）。普通导航键 `code` 正常 ⇒ **A–E 里方向键／Enter／Tab／Backspace 可用真按键**（G882）。
3. ★★ **新发现的第四道闸＝前台归属**：`navigate_page` 之后读数翻回 `visibilityState:"hidden"`、`hasFocus:false`、视口仍 638×578；对 `contenteditable` 派发完整合成 pointer 序列后 `document.activeElement` **仍是 BODY、`getSelection().rangeCount` 仍是 0** ⇒ **文档不可获得焦点 ⇒ 编辑器类取证（A/B/C/D/E）全部不可跑**。⇒ 与第 84 批"同批内 visibilityState 会来回翻"是同一现象，但本批给出了它**为什么致命**的判据（焦点进不去），并划出解锁条件＝**面板与聊天并排可见（分屏），使面板既是 active tab 又不被聊天夺走前台**。
4. ★ 638 px 仍 <748 ⇒ compact 档；帮助浮层在真实窄宽度下**仍是 5 项、仍无「快捷键」**（G883）⇒ V79 裁定还差"桌面档"这一格。
5. ⚠ **沙盒留存未还原**（按"中断即停"如实报，不盲目重试删除）：`QODER-HARVEST-B96` ＝ 文档 `60970136-fb8c-8b73-1293-dec8412c36ba`（documentId `bc1adab2-e191-5c81-7582-f1a48d82814e`）＋ 3 个任务块 `3c324f8f…`／`4066475f…`／`99b8343f…`，位置 unsorted，**无表格、无分享、无对外可见性改动**。还原命令＝`documents delete --document bc1adab2-e191-5c81-7582-f1a48d82814e`（软删，30 天自动清除，`documents move --destination unsorted` 可还原）。**刻意保留**：下一批可直接复用，省一次建沙盒；屏上一眼可见（`/editor/d/<space>/bc1adab2…` 已验证能直达并正确渲染三块）。
6. ☆ 通路踩坑两条：① 首次 `documents create` 回 `MCP error -32603`，**先用 `documents list --location unsorted` 复核确认未创建**再重试 ⇒ 抖动没有产生隐形实体（第 96 批·上半"抖动不得立缺陷"的正向执行）；② 直达编辑器的 web URL 形态实测可用＝`/editor/d/<spaceId>/<documentId>`（**不是** rootBlockId），页面标题即文档名。
7. **规模**：`gap.md` 871 → **875 条（最大 G884）**；`manifest.jsonl` 114 → **115 行**（新增 B96 文档一条，含"首次 -32603 未落库"注记）。

### 下一批（第 97 批）开场三件事

1. ★★ **请用户把 Qoder 内置浏览器面板与聊天分屏并排**（不是"打开一下就切回来"）⇒ 判据＝`visibilityState:"visible"` **且** `document.hasFocus()` 为 true **且** 对 `contenteditable` 派发 pointer 后 `getSelection().rangeCount > 0`。三条不齐就不要开行为批。
2. ★★ **请用户把面板宽度拉到 ≥748 px** ⇒ 脱离 compact 档，才能验"桌面档帮助浮层是否有「快捷键」"，进而跑 **V79 裁定**（真按键方向键已可用，`code` 正常）。
3. ★ **`code` 族键位一律改走"请用户手按"或"点击面板读 DOM"**，不得再用 `press_key` 判"官方没绑"。


## 第 96 批·尾记八（2026-09-29 13:03–13:10，★★★**G 项（任务三时间）结案＝两个弹层而非三个**；沙盒 `QODER-HARVEST-B96D` 建→用→**已还原**）

1. ★★★ **G 项闭合**：`Ctrl+Shift+S` 与 `Ctrl+Shift+D` 各开一个日历弹层，**同一个 styled class `sc-st2m8s-0 WAcGA`**，差别全在底部入口集＝日程层 **6 枚按钮（今天／3 枚无名／提醒我…／重复…）、232×413、15,518 B、placeholder「日期」** vs 截止层 **4 枚、232×332、11,383 B、placeholder「截止日期」**。高度差 81 px／字节差 4,135 B／按钮差 2 枚**三者互相对上** ⇒ 提醒与重复的**入口**只挂在 schedule 上。
2. ★★★ **与码路对账后自我收窄（重要，避免把 UI 限制误读成 schema 约束）**：`model.md` §一之十九 的 `SVe` 逐字是 `{assignee, deadline, schedule, repeat, reminder}` **五字段同一个扁平对象** ⇒ "截止日期带提醒"在**数据层合法、只是没入口**。⇒ 本地 `TaskSchedule`（`src/actions/task/task.ts:205-210`）平铺四字段**与官方 schema 一致，不算差分**；G917 由 P1 **降到 P2**，产物里同步写明（`model.md` §一之五十四）。
3. ★★★ **零 ARIA 弹层＝本批第一次误判的来源**：第一发 `Ctrl+Shift+S` 后读 `role=dialog/menu/listbox/grid/cell` **全 0** ⇒ 我记成"chord 没生效"。第二发装了键日志后读数 `activeElement=INPUT/日期` ＋ `body` 尾部新增「今天 九月 一 二 三…」⇒ **弹层第一下就开了**。⇒ 判"弹层开没开"的三路有效判据＝**新增文案集 ＋ `activeElement`（标签名＋placeholder）＋ 容器 `outerHTML` 长度**；角色直方图在 Craft 自有弹层上不可用（G918，P0 方法学；与 G903 的 `paddingLeft` 盲区同族，本目录第二次自我纠正）。
4. ★★ **焦点栈作用域首获屏上证据，且不是 `preventDefault` 型**：层开着按 `Ctrl+Shift+D` ⇒ 日志 `d|KeyD|c1s1a0|t=INPUT|pd=false`（修饰齐、`code` 正常、**默认动作未被阻止**），层没换、文案与字节零差；`Escape` 关层后同一条 chord **立刻能开截止层** ⇒ 归因＝**该命令不在栈顶条目的键定义表里**，而不是被吃掉。⇒ `internals.md` §三十 给归因顺序**新增一问**（"键是否在当前栈顶条目的键表内"，排在 §二十九 四道闸门之后、`preventDefault` 之前），并把日期弹层记为 `bn.pushIntoFocus` 的**第三个使用者**（前两个＝内联编辑器、IME 摘键）。
5. ★ **字母 chord 可达性实证（收窄 G885）**：`KeyS`／`KeyD` 的 `code` 齐全 ⇒ `press_key` 能打字母族组合键；标点族（`Ctrl+Shift+,`）仍因 `code=""` 不可达 ⇒ **可达性按"chord 末键是否字母"分档**。★ 附带一条＝**同一 chord 在层已开时再按一次不关闭** ⇒ 打开命令**非 toggle**（本地若写 `setOpen(v=>!v)` 即分歧）。
6. ★ **任务块上无常驻日期入口**：全域按 `aria-label`／`data-testid` 扫日期词，只命中**侧栏**的 `calendar-link`（`x=-278` 屏外）与 `Calendar Icon`；按可见文本扫＝**空**。⇒ 只有 chord 与块菜单两条路（后者本批未试，G921）。⚠ 本地**方向相反**＝`tasks/page.tsx:263-273` 有常驻 `CalendarClock` 按钮 ⇒ 有意偏差、登记不删。
7. ~ **提醒子选择器未采到＝如实挂账**：对「提醒我…」发合成 pointer **五连发**（`pointerdown/mousedown/pointerup/mouseup/click`）后**整个弹层关闭**、`body` 连"提醒"都不剩 ⇒ 二级面板既没拿到也没排除（G922，P1 待复测）。⚠ 按铁律"指纹没变＝点击静默失效，不是官方没这个行为"，**不得**记成官方无提醒子层。
8. ☆ **卫生与还原**：本批**未提交任何日期值**（避免沙盒留时间脏数据）；`documents delete --document 72ecb7de-25cd-19bd-f672-70293c8d9cd8` → `moved to trash`，`documents list --location unsorted` 复核＝**原 4 条逐 id 相同**。★ 本批累计回收站 ＋4（B96／B96B／B96C／B96D），均无 purge 动词、30 天自动清除。⚠ 历史残留 `73dc4026`（空未分类页）仍在，按禁区等用户一句话。
9. ☆ 仪器自记：① **转录回查救回一处口述误差**＝我原以为点击通路是"七连发"、实际代码是 **5 个事件**，产物按转录写；② 首次 `documents create` 在本批**一次成功**（无 `-32603`）；③ 调用计数实测＝2 `craft_write`／7 `press_key`／9 `evaluate_script`／1 截图／1 `navigate_page`。
10. **规模**：`gap.md` 908 → **915 条（最大 G923）**；`interactions.md` 新增 **V85**；`model.md` 新增 **§一之五十四** ＋ **§一之五十五（补记尾记六／七）**；`internals.md` 新增 **§三十** ＋ **§三十一（补记尾记六／七）**；`longtail.md` 新增 **§十七**；`manifest.jsonl` 125 → **126 行**（B96D 建与还原齐）。校验＝`check-tables.mjs` 七份产物 **ALL TABLES CONSISTENT**（gap 138 表／interactions 38／model 27／internals 10／longtail 10／keyboard 40／features 9，异常 0）；`key-coverage.mjs` **1870/3639＝51.4%（与上批持平，未降）**。⚠ **两处口径改判**：① 计数行起用脚本实测（此前手写"898／902"属手计漂移）；② **节标题时分＝manifest UTC＋8**（尾记五／六／七 三节误用 UTC＋9，已在 `gap.md` §三点一〇三三 写明换算，历史节不回改）。⚠ **流程缺陷登记**＝尾记六／七 当时漏了 §6 契约要求的 model/internals 两节，本批补齐 ⇒ 队列加第 11 项"每批收尾自检五份产物齐不齐"。

### 第 97 批队列（刷新）

1. ★★★ **开场三判据齐了才开行为批**：`visibilityState:"visible"` **且** `document.hasFocus()` **且** 对 `contenteditable` 派发 pointer 后 `getSelection().rangeCount > 0`。⇒ 需要用户把 **Qoder 内置浏览器面板与聊天分屏并排**（不是"打开一下"）。
2. ★★★ **Enter／Space 原生激活（G890）只能请用户手按**：`press_key` 结构性产不出浏览器默认动作 ⇒ 面板里对着分类按钮/任务块**手按 Enter 与空格**，我读 `[tabindex="0"]` vs `[aria-selected]` 与选区两路。这是本目录唯一还挂着"仪器不可达"的行为项。
3. ★★ **提醒子选择器补测（G922）**：换通路＝① 用户手点「提醒我…」（桥 B 有绘制面时 `click(uid)`）② 或面板保持前台后用 `click` 真点。⚠ 若仍整层关闭，才允许升级为"官方此处有缺陷"。顺带跑「重复…」二级面板（同一盲区）。
4. ★★ **选中日期后的字段回写**（本轮刻意没做）：沙盒里选一天 → `blocks get --format json` 读 `schedule`／`deadline`／`reminder` 哪个被写、值形态是午夜对齐还是毫秒 ⇒ 对上 `model.md` §一之十九 的 `V5`/`getTime` 双通路。**需要新的写入授权**（会留下日期）。
5. ★★ `REMIND_IN_ONE_HOUR`（`Ctrl+Alt+R`）与 `OPEN_TASK_LOCATION`（`Ctrl+Shift+O`）两条 chord 的落点；块菜单里是否有日期入口（G921 第二条通路）。
6. ★ **装饰档触发条件（G914）**：造"有选区的加粗块"再按块首 Backspace ⇒ 裁"装饰档是否需要选区"。同批跑**拖拽移动的撤销步数**（`drag` 通路未试）。
7. ★ F 只读 viewer 灰态矩阵——**造只读态必须先开对外分享＝禁区**，需用户单独口头同意；未同意前保持未开跑（不是不可行）。
8. ☆ 桌面档（≥748 px）复验帮助浮层是否含「快捷键」＋ **V79 新判据**三条预测（P-1 修饰键 no-op／P-2 Home·End no-op／P-3 焦点经 microtask 落位）。
9. ☆ 静态尾巴（不变）：`uF` 表尾部、`cne` 本体 @3,777,934、`allowBlockStyling`／`forcedViewOnlyMode` 来源、剩余 18 处 `_dm375_` CSS、六位数字码输入面用途、5 个未加载 JS 资产。
10. ☆ 待用户一句话的残留：`73dc4026-15eb-439c-a0f6-8a1681eb556d`（空未分类页，无 manifest 归属 ⇒ 按禁区未动）。
11. ★★ **每批收尾自检（本批补上的硬动作）**＝§6 契约五份产物**逐份确认有新节**：`interactions` 新 V／`model` 新 §一之NN／`internals` 新 §NN／`longtail` 新 §NN／`gap` 新 §三点一〇NN，再加 `features.md` §十计数行＋本文件批次日志＋manifest＋项目记忆与 `MEMORY.md` 索引。⚠ 尾记六／七 就是漏了 model/internals 两节、拖到尾记八才补 ⇒ 收尾时**用 `grep -c` 数不动、要看节标题是否存在**（计数行已被证明会漂）。计数一律脚本化：`grep -cE '^\| G[0-9]+ \|' gap.md`。


## 第 96 批·尾记九（2026-09-29 13:16–13:22，★★★ **第一次拿到桌面档（1088≥748）行为读数＝V79 裁定结案**；**零写入**，1 次 `navigate_page` ＋ 6 次 `evaluate_script` ＋ 2 次 `press_key`）

1. ★★★ **视口自己变宽了**：尾记八 收尾后复测＝`visibilityState:"visible"`、**`innerWidth:1088`**（往批 638／648）、`innerHeight:578`、`hasFocus:false`、`rangeCount:0`。⇒ 本目录**第一次**拿到桌面档（≥748）读数，直接解锁第 97 批队列第 1 项②与第 8 项。
2. ★★★ **V79 裁定结案＝桌面档分类 rail 没有 `aria-selected` 这回事**：快捷键面板 7 枚分类按钮逐枚读数＝全 `BUTTON`、全 `tabindex="0"`、**`aria-selected` 全 `null`**、**`data-composite-item-active` 不存在**、`data-disabled` 不存在；选中**只由 CSS 变体类表达**（`_action_1j891_1 _variantAc…` vs `_variantDe…`）。⇒ 第 94 批与第 96 批·上半 先后立的两条判据**在这条 rail 上都无物可读** ⇒ **唯一有效双判据＝`_variantActive_1j891_*`（选中）＋ `document.activeElement`（焦点）**。⇒ 与第 90 批静态咬合：sidebar 态 rail＝`a6` DS 按钮（无 role/onKeyDown/tabIndex 覆写）、compact 态才是 `Npe`/`TIe` Tabs ⇒ **两档是两套组件，判据必须分档写**。
3. ★★★ **焦点与选中分离第三次独立复现（首次桌面档）**：面板刚开 `activeElement`=通用、选中＝整理（上次离开的分类）⇒ 第 86 批那个"reload 后默认焦点在第一项 ＋ 选中跨重载保持"的合成假象**正面实证**；`shortcutsPanelLastActiveCategory`（G756）第三次印证。
4. ★★ **`ArrowDown` 夹紧不环绕首获屏上证据**：连按两次 ⇒ 选中 整理→**合集**→**仍合集**（末档不动），焦点全程＝通用 ⇒ 第 89 批静态 `tJ`「idx±1 夹紧不环绕」成立。⚠ 本地若用 modulo 环绕即分歧。
5. ★★ **桌面档帮助浮层含「快捷键」＝老冲突结案**：按可访问名枚举到 `Question Mark Icon`（`x=1046`），合成 pointer 七连发 ⇒ `role=menu:1`／`group:1`／**6 项逐字**（意见反馈／最新特性／Web 和 Windows 版最新特性／常见问题／**快捷键**／Markdown 快捷方式）。⇒ 尾记附与下半看到的"5 项无快捷键"**归因＝视口＋页面态（compact 档／已删文档缓存屏）**，不是官方删了入口 ⇒ 与第 81 批一致（G927）。
6. ★★★ **推翻本批上一段刚立的判据（第 96 批内第二次）**：尾记八 写的"行为批三件套＝`visible`＋`hasFocus`＋`rangeCount>0`"**过严** ⇒ 本轮 `hasFocus:false`＋`rangeCount:0` 下 `ArrowDown` 两次都被面板 handler 接收。⇒ **正确分档＝面板／外壳级键只要 `visible` 可驱动；编辑器内容级（A–E）才需要 `hasFocus` ＋ `rangeCount>0`**（G928，P0）。⇒ 纪律补一条：**新立判据必须同时写"作用域"，否则会把能跑的批次误停**（与 G903／G918 同族＝判据越界）。
7. ☆ 路由契约新形状（G929）：`/s/<spaceId>/home` 被 app 改写成 `/s/<空间名--空间id>/all` ⇒ 路由段是 slug 化的 `名称--id`、`home` 非合法视图名；⚠ 原串含个人空间名 ⇒ **产物只记形状**。★ 同批见到已删文档的编辑器路由**仍渲染标题＋5 个 `contenteditable`**（`Trash / QODER-HARVEST-B96D`）＝第 69 批 SPA 缓存同族的**编辑器侧**新例。
8. ☆ 卫生：本段**零写入**、无新建沙盒；面板开着没关（`role=dialog` 残留），下次开批先读四计数（dialog/menu/group/menuitem）再动。
9. **规模**：`gap.md` 915 → **921 条（最大 G929）**；`interactions.md` 新增 **V86**；`model.md`／`internals.md`／`longtail.md` 本段**无新节**（本段无模型/机制/长尾新事实，V79 是判据结案）；`manifest.jsonl` 不追加（零写入）。校验＝`check-tables.mjs` **ALL TABLES CONSISTENT**、`key-coverage.mjs` **1870/3639＝51.4%（持平不降）**。

### 第 97 批队列（再刷新，覆盖上一版）

1. ★★★ **开场判活改分档**（承 G928）：先读 `visibilityState`／`innerWidth`／`hasFocus`／`rangeCount` 四项 ⇒ **面板级键**（方向键／Esc／Tab 在外壳与面板内）只需 `visible` 即可开跑；**编辑器级**（A/B/C/D/E）必须 `hasFocus:true` 且派发后 `rangeCount>0`，不齐就**请用户把内置浏览器面板与聊天分屏并排并保持面板在前台**。
2. ★★★ **请用户手按 Enter 与空格**（G890／G803 的最后一格）：面板开着时对着分类按钮手按 ⇒ 我读 `_variantActive_…` 与 `activeElement` 两路。这是 `press_key` **结构性不可达**的唯一残余（浏览器默认动作不执行）。
3. ★★ **桌面档补齐 V79 剩余四键**：`ArrowUp`／`Home`／`End`／`←`／`→`（尾记九 只测了 `ArrowDown`×2）⇒ 静态 `I6e` 白名单只含四键、`tJ` 无左右键 ⇒ 可一次裁掉。
4. ★★ **提醒子选择器（G922）换通路补测**：面板 visible 时先试 `click(uid)`（有绘制面了），不行再请用户手点；顺带跑「重复…」二级面板。
5. ★★ **选中日期后的字段回写**：需**新的写入授权**（会留下日期值）⇒ 沙盒选一天 → `blocks get --format json` 读 `schedule`/`deadline`/`reminder` 哪个被写、值是午夜对齐还是毫秒 ⇒ 对账 `model.md` §一之十九 的 `V5`/`getTime` 双通路。
6. ★ **面板 rail 两档判据分表写**：桌面档＝`_variantActive_1j891_*`＋`activeElement`；compact 档＝`x8v9o` hash＋`aria-selected`（第 94 批）。⚠ 别再跨档共用一条判据（本批两次踩坑的根因）。
7. ★ F 只读 viewer 灰态矩阵——**造只读态必须先开对外分享＝禁区**，需用户单独口头同意。
8. ☆ 静态尾巴（不变）：`uF` 表尾部、`cne` 本体 @3,777,934、`allowBlockStyling`／`forcedViewOnlyMode` 来源、剩余 18 处 `_dm375_` CSS、六位数字码输入面用途、5 个未加载 JS 资产。
9. ☆ 待用户一句话的残留：`73dc4026-15eb-439c-a0f6-8a1681eb556d`（空未分类页，无 manifest 归属 ⇒ 按禁区未动）。
10. ★★ **每批收尾自检五份产物节标题存在性**（不是数条数）：`interactions` 新 V／`model` 新 §一之NN／`internals` 新 §NN／`longtail` 新 §NN／`gap` 新 §三点一〇NN ＋ `features.md` 计数行 ＋ 本日志 ＋ manifest ＋ 记忆；计数一律 `grep -cE '^\| G[0-9]+ \|' gap.md`；**时分开销＝manifest UTC＋8**。


## 第 96 批·尾记十（2026-09-29 13:36–13:40，用户「全部同意」后的授权执行段＝孤儿空页清账 ＋ 现场遗留待确认）

1. ★★ **历史残留 `73dc4026-15eb-439c-a0f6-8a1681eb556d` 结案（按"删除类授权先读回内容再动手"执行）**：**两次独立读回**＝① `blocks get --format markdown` → `<page id=…><pageTitle></pageTitle></page>`（无子块）② `--format json` → `{type:"page", textStyle:"page", markdown:"", content:[]}` ⇒ **确为空页**（此前只有屏上"字数 0／区块 0"一条证据，这次拿到结构侧双证）。⇒ `documents delete` → `moved to trash` ⇒ `documents list --location unsorted` 读回 **3 条**（`DFF43C2D` Welcome／`5376f8f3`／`74c0bb3d`）。⚠ **另两条已知非空、未动**（第 79 批教训：不能按"看起来是空的"扩大授权范围）。★ 还原命令＝`documents move --destination unsorted`（30 天内有效）。⇒ **本目录"待用户一句话的残留"队列项清空**，manifest 126 → **127 行**。
2. ★★ **提交入库前扫出个人标识 ⇒ 停手等确认**（不按"全部同意"直接 commit）：`docs/craft-ref/features/*.md` 里含 **空间 id `3b788e8c…` 共 20 处**（`interactions.md` 13／`gap.md` 2／`features.md` 2／`model.md` 2／`internals.md` 1）＋ **账户持有人姓名／空间名 `zhang` 共 11 处**（`gap.md` 5／`interactions.md` 6，含信息面板里的"作者: zhang meng"）。⇒ 与本仓库**已立的既有边界冲突**＝`.gitignore` 原文注释"craft.do 参照截图采自已登录会话，**含个人内容，只留本地对照，不入库**"（`screens/` 与 `_harvest/` 正因如此被忽略）。⇒ 三条路交给用户选：① **先脱敏再提交**（id→`<spaceId>`、姓名→`<账户持有人>`，脚本可逆、产物事实不损）② 原样提交（仓库私有则风险自担）③ 继续不提交。⚠ 未提交期间**这 921 条与全部批次日志只存在本地磁盘**。
3. ☆ **现场遗留未还原**：快捷键面板**开着**（`role=dialog` 残留）⇒ 下批开场先读 dialog/menu/group/menuitem 四计数（第 86／87 批口径）。
4. ☆ **仍等用户单独点头的一件事**＝F 只读 viewer 灰态矩阵：**造只读态必须把沙盒文档 visibility 改成对外分享**（＝铁律禁区里"即便已授权也要单独口头确认"的那一项），且采完要立刻关回。⚠ "全部同意"是打包答复 ⇒ 按铁律**重新单独问过**再动。


## 第 96 批·尾记十一（2026-09-29 13:44–14:02，★★★ **用户单独点头后开了一次对外分享并当场关回＝分享面首采**；沙盒 `QODER-HARVEST-B97` 建→用→**已还原**）

1. ★★ **授权与执行边界**：用户先「全部同意」，我把其中两件按铁律**重新单独问过**——① 提交方式（用户选**先脱敏再提交**）② 是否开分享（用户选**用新沙盒页开一次再关回**）。⇒ 历史授权不沿用的纪律执行到位；分享只作用在**本轮新建的 B97**，没有动任何既有文档。
2. ★★ **孤儿空页 `73dc4026` 结案**（详见尾记十）：结构侧双证为空 ⇒ 软删 ⇒ `unsorted` 3 条。⚠ 另两条非空文档未动。
3. ★★ **脱敏落地并提交**：`_harvest/sanitize-pii.mjs` 做 33 处替换（空间 id 21／空间名 11／账户持有人 2／本机 Temp 路径 1）⇒ 后置断言"禁物为零 ＋ 标记都在"通过 ⇒ `check-tables` 与 `key-coverage` 复跑不变 ⇒ 提交 `963a442`（26 个文件＝.gitignore ＋ 25 份产物；`_harvest/` 与 `raw/` 仍被忽略）。⇒ **提交前二次扫描**：无 JWT／Bearer（`KeyJ` 是假阳性）、无邮箱真值（`example.com`／`support@craft.do` 是官方文案）、残留 13 个文档/块 UUID（空间 id 已遮蔽 ⇒ 单独不可解析），如实记为已知残余、留给用户决定是否深脱敏。
4. ★★ **写侧 MCP 没有分享动词**：`craft_write --help` 全表读回（folders/documents/tasks/reminders/collections/comments/whiteboards/blocks）⇒ **无 share／publish／visibility／collaborator** ⇒ 分享只能走屏幕。这是继"不能代理撤销计步"之后**第二条 MCP 能力边界**。
5. ★★★ **分享浮层首采**（96 批从未碰过的面）：入口＝顶栏文案「共享」的按钮（**无 `aria-label`**）；浮层＝「邀请协作」＋「即使没有 Craft 帐户，也能轻松与任何人协作」＋`input[placeholder="添加邮箱以邀请"]`＋权限 BUTTON(312)＋「复制链接」(104)＋「共享功能如何使用？」；**`role=dialog`／`menu` 全 0**（本目录第四次印证 Craft 自有浮层零 ARIA）。
6. ★★★ **权限恰好三档、逐字到手**＝「仅限有访问权限的协作者」／「知道链接的人都可以查看」／「知道链接的任何人都可以编辑」＋说明「将链接设置为"查看"或"编辑"以方便协作，无需 Craft 帐户。」⇒ **选档后唯一屏上判据＝触发器文案改成所选档名**（没有"已分享"徽标）。
7. ★ **两次点击教训**：第一次把事件打在样式壳 DIV（`sc-st2m8s-0 WAcGA`）上＝**静默失效**（触发器没变）；改用 `elementFromPoint` 命中到真实 `BUTTON.sc-14qg8m-5` 才生效。⇒ **纪律补条：合成 pointer 必须用 `elementFromPoint(标签中心)` 取命中目标，不能拿 `textContent` 那层元素或它的样式壳直接发**（本目录第三次踩同一类）。
8. ★★ **自我纠正一条因果误判（G936）**：我一度记「选到查看档后`复制链接`从禁用转可用」；关回之后顺手复读，发现**两档下 `disabled === false` 都成立** ⇒ 该按钮不受档位门控，前面的说法作废。⇒ 教训＝**先后不等于因果，必须回测反例**。
9. ★★★ **结案 G671 的待定项＝任务读侧两套口径**：`tasks list --scope all` 14 条（含 **5 条属于已删沙盒文档**）vs 屏上 `/tasks/all`「带任务的文档」只有 `Welcome to Craft` 4 项 ＋ `Craft Handbook` 4 项、「未归档」空态 ⇒ **API 含 trash、UI 不含**。⇒ ① 历次采集串**没有污染用户屏上任务面**（此前只能间接推断）；② 本地读侧 `src/actions/task/task.ts:106/117` 只把 `documentTitle` 置空、**不滤行** ⇒ **P1 差分**。
10. ~ **`复制链接` 不走 `navigator.clipboard.writeText`**（拦截器装了、点两次、数组为空）⇒ 实现未定位；`readText()` 被 `NotAllowedError` 拒 ⇒ 剪贴板在本桥既写不进也读不出，**不能当取证通路**。
11. ★★★ **F 项仍没拿到只读渲染证据，但原因改判**：不是没授权，而是**两桥共享登录 cookie、我没有访客身份**（G937）。⇒ 下批首试**应用内版本／备份预览**（信息面板动作区「查看备份」，天然只读）作替代证据源；⚠ 它不是分享访客态，只能部分覆盖 `fYe` 八项白名单，产物里必须分开标。
12. ☆ **隐私观察（只记形状）**：第三方分析端点 `gtm.craft.do/g/collect` 的 `dl=` 参数原样带着 `?s=<40 字符令牌>` 的完整文档 URL（`dr=` 是无令牌形态）⇒ 给"产物 URL 必剥 `?s=`"补上第一方理由。⚠ 令牌值是被连接器返回的请求列表带出来的，**未读 cookie／storage／token、未进任何产物**。
13. **规模**：`gap.md` 921 → **930 条（最大 G938）**；`interactions.md` 新增 **V87**；`manifest.jsonl` 126 → **129 行**（孤儿清账 1 行＋B97 建 1 行＋B97 还原 1 行）；`model.md`／`internals.md`／`longtail.md` **本段无新节**（分享面的结构与文案属交互／gap 层；`api-contract.md` 的 MCP 能力边界一条随 G930 记）。校验＝`ALL TABLES CONSISTENT`、覆盖率 **51.4% 不降**。
14. ⚠ **本段现场**：`Escape` 关掉了分享浮层与快捷键面板；屏上停在 `/tasks/all`；B97 已删。**分享状态已关回并从触发器读回确认** ⇒ 对外链接不残留。

## 第 96 批·尾记十二（2026-09-29 17:31 读回，**零写入**＝2 次 `evaluate_script` ＋ 用户手按 `↓`／`Enter`，页内日志器新增 4 条）

1. ★★★ **本轮唯一的有效新事实＝分类导航不要求元素持焦**：面板已切后台（`visibilityState:hidden`、`hasFocus:false`、`activeElement` 归 `BODY`）时用户按 `↓` ⇒ 日志 `keydown|ArrowDown|ArrowDown|00|BODY:You ne|0`，**选中仍从「整理」推进到「合集」**（`_variantActive_1j891_*` 下标 9→10）、`defaultPrevented=0`、末档不环绕（复现 V86）。⇒ 键处理在**文档／容器级**、选中是纯逻辑态、焦点只是它的下游副作用；与第 94 批静态 `activateOnFocus:!0` 和尾记九"选中反推高亮"三方咬合＝**官方从不把焦点当输入**。（G939／`model.md §一之五十六`／`internals.md §三十二`）
2. ★★★ **G890（`Enter`／`Space` 原生激活）判为无效轮、不据此定案**：同一周期紧接着的 `Enter` 目标也是 `BODY` ⇒ 而"Enter 激活聚焦 `<button>`"是**浏览器默认动作**、结构上要求那枚按钮持焦；前提缺失时必然无反应，**按铁律不得记成"官方抑制 `Enter`"**。⇒ 立硬门槛：**凡"原生激活类"取证，指纹必须含 `activeElement === 目标元素`**，`visibilityState` 与 `hasFocus` 都不能代替（尾记九已证 `hasFocus:false` 下键仍送达 ⇒ `hasFocus` 对本通路不敏感）。复测六步协议写进 `interactions.md V88`。（G940）
3. ★★ **桌面档 rail 的键盘可达面补全**：7 枚分类按钮逐枚读回＝`aria-selected` **全 `null`**、`tabindex` **全 `"0"`**、选中只有类名 ⇒ 官方桌面档**不做 roving tabindex**，`Tab` 能逐枚走完 7 枚；compact 档（Base UI Tabs `x8v9o`）相反 ⇒ **两档 `Tab` 序列长度不同**，判据之外**可达面也不可跨档共用**。（G941）
4. ☆ **过程纪律**：本轮我一度准备把"Enter 没反应"写成官方结论，是"读日志器 `target` 字段"这一步把它拦住了 ⇒ 六段式日志一条读数同时答**送达／目标／状态／能否下结论**四问，成本 1 次调用。**教训固化**＝"原生激活类"取证前必须先答"目标是谁"。
5. **规模**：`gap.md` 930 → **933 条（最大 G941）**；`interactions.md` **V88**；`model.md` **§一之五十六**；`internals.md` **§三十二**；`longtail.md` **本段无新节**（无效轮只有判据、没有新的视觉或文案长尾，不硬造一节）；`manifest.jsonl` **不追加**（零写入、零沙盒、零残留 ⇒ 无需还原三连）。
6. ⚠ **现场遗留（本段结束时）**：快捷键面板**仍开着**、桌面档、选中停在「合集」；页内 `window` 捕获级日志器**仍在装**（`location.reload()` 即清）。⇒ 原计划"留着等 G890 复测"，用户随后选**选项二＝收尾不复测** ⇒ 见下条第 7 项的还原动作。
7. **尾记十二·收尾段（17:50，用户选"先提交、再按选项二收尾"）**：① 提交 `e49d597`（5 个产物文件＝features／gap／interactions／internals／model，92 增 1 删）；② `press_key Escape` ⇒ **面板当场关闭**（`dialog/menu/group/menuitem` 四计数复核 0、7 枚分类按钮离场、选中下标 －1），且日志器记到 `keydown|Escape|…|BODY:You ne|0` ⇒ **关闭类键与导航类键同属"文档级可达、不要求持焦"**（G942）⇒ 门槛正式拆成三条＝编辑器内容级／面板级导航与关闭／**默认动作类必须持焦**；③ `location.reload()` ⇒ 复核 `typeof window.__b97log === 'undefined'`（监听已清）、屏上回到 `/all`；④ 截图自证 `_harvest/b97-closed.png`（223 KB，`_harvest/` 仍被忽略）；⑤ ☆ **歧义未裁（G943）**＝`press_key` 之后 `visibilityState` 由 `hidden` 翻 `visible`、截图恢复可用 ⇒ 是"连接器按键自带 surface 激活"还是"用户同时在切窗口"未定 ⇒ **下批开场用 `Shift` 单键探针裁**（若按键能自唤绘制面，则"恢复动作永久归用户"这条纪律要加限定）。⇒ 规模 `gap.md` 933 → **935 条（最大 G943）**、`manifest.jsonl` 仍 **129 行**（收尾段同样零写入）。

### 第 97 批队列（最终版，覆盖前四版）

1. ★★★ **F 项改走替代通路**＝进任一文档点信息面板「查看备份」/版本预览 ⇒ 读 `contenteditable` 数量、`+` 插入栏、斜杠菜单、拖拽手柄是否消失，再试正文键入是否被吞 ⇒ 这是**无需任何分享**就能拿到的只读态；⚠ 产物里标"备份预览只读态"，**不得写成访客态**。
2. ★★★ **访客态若要真采**＝需要用户同意"在该浏览器里登出一次"（破坏会话、需重新登录）⇒ 默认不做，列为待用户决定。
3. ★★ **`/shared-with-me` 屏**（侧栏入口文案「与我共享」、计数 0）⇒ 只读取结构与空态，零写入。
4. ★★ **提醒子选择器（G922）补测**＝现在分享弹层证明**合成 pointer 能开 Craft 自有浮层**，故换"命中校正版"打法重试「提醒我…」。⚠ 仍不得把失败判成官方无此层。
5. ★★ **`ArrowUp`／`Home`／`End`／`←`／`→` 桌面档**（尾记九只测了 `ArrowDown`×2）。
6. ★★ **选中日期后的字段回写**＝需新一轮写入授权（会留日期值）。
7. ★ **本地两条待裁项**＝① 任务读侧要不要按 UI 口径滤掉已删文档的行（G934）② 快捷键面板本地要不要补（G924）。
8. ★★★ **Enter／Space 原生激活（G890）**＝仍只能请用户手按，但**必须严格按 `interactions.md V88` 的六步协议**：面板切前台 ＋ 不得点分类 ＋ 现场断言 `activeElement` 是那 7 枚按钮之一 ＋（若焦点与选中未分离）先按一次 `↓` 造分离 ＋ 按 `Enter`（`Space` 另起一轮）＋ 读回日志新增条目与 `activeElement`。缺任一步即判该轮作废（尾记十二就是被第 3 步缺失废掉的）。⚠ **现场已还原**＝面板已 `Escape` 关掉、日志器随 `reload` 清空 ⇒ 本项**要重新开面板、重新装日志器**才能跑。
9. ☆ 静态尾巴不变：`uF` 表尾部、`cne` @3,777,934、`allowBlockStyling`／`forcedViewOnlyMode` 来源、18 处 `_dm375_` CSS、六位数字码输入面、5 个未加载 JS 资产。
10. ☆ **待用户决定**＝残留的 13 个文档/块 UUID 要不要一起深脱敏（空间 id 已遮蔽 ⇒ 单独不可解析）。
11. ★★ **每批收尾自检五份产物节标题存在性**（不数条数）＋ 计数用 `grep -cE '^\| G[0-9]+ \|' gap.md` ＋ 时开＝manifest UTC＋8。
12. ★☆ **开场第一条探针（裁 G943）**＝面板 `hidden` 时送一次**无副作用键**（`Shift` 单键，官方无绑定），读回 `visibilityState` 与 `take_screenshot` 是否可用 ⇒ 判定"连接器的 `press_key` 是否自带 surface 激活"。若成立＝**恢复动作不再必须等用户**（此前 15 批的"永久归用户"要改成"先试按键、再请用户"）；若不成立＝该纪律维持，且顺带把"按键送达但绘制面缺失"的形态钉死。

## 第 97 批日志（2026-09-29 20:12–21:14，UTC 12:12–13:14；1 个沙盒＝`QODER-HARVEST-B97-INDENT`，已 LIFO 还原）

**开场三条探针**：① 计划用的 `Shift` 单键**结构性不可执行**（连接器 `press_key` 白名单拒绝 `Shift`／`ShiftLeft`／`F13`／`Insert`，一律 `Unsupported key`）⇒ 改用无弹层时零副作用的 `Escape` 作载体 ⇒ **G943 裁定＝按键不自唤绘制面**：`hidden`＋`innerWidth:0`＋`attached:false` 时 `press_key` 返回成功但**页内日志器新增 0 条**（同次调用里向 `body` 派发合成 `KeyboardEvent` 作 canary ⇒ ＋1，证明监听有效）；而可见性翻成 `visible` 发生在 `press_key` **之后**的两次读屏之间、紧接 `press_key` 的那次读回仍是 `hidden`。★★★ 再补一刀精化＝面板打开过一次之后再切回后台，`hidden`＋`innerWidth:1206`＋`attached:true` 时 `press_key ArrowUp` **照常送达并生效** ⇒ **真正的闸门是"有 attached 正视口"，不是 `visibilityState`** ⇒ 恢复动作仍归用户、但**只需开一次面板**，此后只有截图需要前台。② 顶栏已渲染（`Craft Logo`／`Magnifyingglass Icon`／`Square And Arrow Up Icon`→拉宽后是「共享」／`Bell Badge Icon`／`Question Mark Icon`／`Sidebar Right Icon`），`role=dialog/menu/group/menuitem` 四计数**全 0**（面板已关、上一批日志器随整页导航已失）。③ 视口＝开场 **638＝compact 档**，经用户拉宽后 **1206＝桌面档** ⇒ 本批行为读数**全部在桌面档**，compact 档只在 638 段做过一次"右侧栏点了没开"的观察、未据此下任何官方结论（**严禁跨档共用判据**这条本批执行到位）。

**跑完的队列项**（§2 的 1–6 与 8 全跑，7 跑两条、一条未跑）：

1. **★★★ 队列 1（F 项替代通路）＝跑完，是否定性结论**。信息面板动作区六项逐字到手（「展示」「移动到…」「创建副本」「收藏文档」「查看备份」「删除」），点「查看备份」⇒ **modal 层 600×553、内容只有四行**（「历史版本」／「选择要恢复的版本。」／「较早」／「升级即可获得 30 天或 180 天的备份。 查看计划」）、**零版本条目**、容器不可滚、层内 22 个元素里可点的只有 `Close`＋「查看计划」。⇒ **进不去版本预览 ⇒ 采不到只读渲染态**（`contenteditable` 全程 5 枚）。⚠ 产物按纪律标**「备份预览只读态（未达成）」、没有写成访客态**；并补一条官方自述＝副标题是**恢复导向**，即便有条目也不能默认它是只读渲染。防假阴性做了三条复核（可点元素枚举／`scrollHeight` vs `clientHeight`／`[contenteditable]` 计数）。
2. **★★★ 队列 2（G890 原生激活复测）＝正面结案**。V88 六步首次全部满足（面板前台＋**没点过任何分类**＋现场断言 `activeElement`＝rail0「通用」＋焦点≠选中天然成立＋两轮分开＋读回日志器/`activeElement`/选中类名）。**用户手按 `Enter`** ⇒ `sel 1:文档 → 0:通用`、`kbd 11→16`、伴随 `isTrusted:true／detail:0` 的 `click`；**用户手按 `Space`** 同前提同效果。⇒ **官方不抑制**；第 94 批"Enter 无反应是设计＝`onClick` 早退"**被推翻**（早退只在焦点项已选中时发生）；尾记十二那轮作废的真因落定＝`activeElement` 已归 `BODY`。★ 新采集手法＝**用 `detail` 区分点击来源**（真鼠标 `detail:1`、键派生 `detail:0`、`isTrusted` 都 true）——本批正是靠它发现用户在 `Enter` 前先点了一下面板标题区，于是把那一轮判为"前提被污染"、**自己重建分离态（连接器按 `↓`）后补了一轮干净的 `Enter`**，没有把污染轮当结论。★ 另外先把"连接器注入 `Enter`"钉成仪器阴性：两轮送达（`pd=false`、目标就是持焦 `<button>`）但**页内 `click` 捕获监听 0 次触发**，同次读回用 `el.click()` 作对照证明监听工作。
3. **★★ 队列 3（桌面档 rail 剩余键）＝7 键全裁**。`ArrowUp` 有效（6:合集→5:整理、焦点不搬、夹紧不环绕第四次复现）；`Home`／`End`／`ArrowLeft`／`ArrowRight` **送达但零变化**＝未绑（阴性有效性靠 G944/G946：送达已证＋效果窗口 520 ms 已由同序列里的 `ArrowUp` 标定，**不是"静默失效"那一类**）；`Tab`／`Shift+Tab` **逐枚搬焦点、不改选中** ⇒ G941"7 枚常聚焦、无 roving"从静态推断升为**屏上实证**。☆ 附带可用指纹：**分类内容区 `kbd` 数**＝通用 16／文档 11／样式 80／整理 13／合集 38（与第 82 批「通用 16／合集 38」逐字复现）。
4. **★★ 队列 4（G922 提醒子选择器）＝结案**。先踩出一条新的仪器边界（G952）＝**编辑焦点只能靠连接器真 `click` 拿到**（对任务块 SPAN 发命中校正版七连发 ⇒ `activeElement` 仍 `BODY`、`rangeCount` 仍 **0**；改 `click(uid)` ⇒ `DIV[contenteditable=true]`、`rangeCount` **1**）。拿到 §4 编辑器级三件套后 `Ctrl+Shift+S` 开层（232×413／15,518 B，V85 第二次独立复现）⇒「提醒我…」用**命中校正版**七连发 ⇒ **同一容器视图替换**（`232×336`／8,365 B、两枚入口消失、底部新增「取消／应用」`216×48`）⇒ 那枚时间钮默认**「22:00」** ⇒ 点它开 **`112×300` 三级列表、内容总高 3,088 px、行距 32 px ⇒ 约 96 档／步长 15 分钟／`00:00` 起** ⇒ 与静态 `repeat.reminder.dateOffset` **首次屏上对上**。⇒ ★★ 语义结论＝**提醒是两步提交**（日期是即选即写，两者在同一层里混用）；G922 的"尚不能当需求"作废，本地 `datetime-local` 可正式登记为行为差分。⚠ **零提交**＝用 `Escape`／「取消」退出后 `blocks get --format json` 复证六块 `markdown` 逐字未变、无 `schedule`/`deadline`/`reminder`。⚠ 上一批"外层整个被点掉"的归因随之更正＝命中目标错误（G903 同族第四次），不是官方"独立弹层"。
5. **★★ 队列 5（`/shared-with-me`）＝跑完**。`href` 是**唯一不带空间段**的侧栏路由；主区＝`H1`「与我共享」＋右上 2 枚无文本图标钮＋`_docGrid_6sjpd_59`（`870×2166`）里的 `203×253` 空格子；**空态零文案**（`body.innerText` 总长 130）＝与侧栏计数 0 一致 ⇒ ★ 官方空态话术**不均匀**（任务面／星标／标签各有一句，这屏一句都没有），本地别统一套模板。★★ 一条仪器教训＝**首读时 `H1` 与网格都还不在 DOM**，第二次读才有 ⇒ **判"这屏没有 X"必须二次读**（主区懒渲染）。
6. **★★ 队列 6（本地两条待裁项）＝两条判定到手**（派了只读子代理实扫，承重 6 条我逐条回验过 `文件:行号`）。**G934＝应该滤**：最小改动在 `src/actions/task/task.ts:114-119`（`:116` 已把 doc 查出来，命中 `doc.isDeleted` 就 `continue`）；**判据必须是 `isDeleted`、不能是"无标题"**（`Task.document` 是 `onDelete: SetNull` ⇒ 硬删后 `documentId` 为 `null`，与 `createTask` 造出的收件箱任务**不可区分**）；**上批欠的那条 UI 补验做完了＝没有隐藏无标题行**（`src/app/(app)/tasks/page.tsx:248` 的 `task.documentId && task.documentTitle` **只包住"文档链接"那一小块**，行本体 `:152-154` 无条件渲染）；消费面**两处**（`tasks/page.tsx:30` ＋ `calendar/page.tsx:25` 共用同一 action）；`isDeleted` **是真实列**（`prisma/contract.prisma:71`，生成类型里有 ⇒ `:117` 的 `as any` 只是本文件通篇风格，**不是绕过错字段**，性质＝口径分歧而非写错判断）；本地**确有回收站 UI 但它只列文档不列任务**（`src/app/(app)/trash/page.tsx:12` ＋ `src/actions/document/get.ts:71`）⇒ 一律过滤不造成功能缺失；★ 顺带查出 **`getTasksForDay`（`task.ts:240-261`）零调用方＝死代码**；**e2e 无覆盖**（缺"文档内任务 → 回收站 → 断言 `/tasks` 无该行"这条链）。**G924＝低成本纯展示层可补，但必须双列渲染**：本地无任何面板壳（设置面 13 分区 `use-settings-store.ts:3-17`、`SettingsModal.tsx:31-59` 导航、`SettingsPanels.tsx:119` switch 里**没有键盘分区**，也没有帮助菜单）；本地真正可称快捷键的**只有约 10 条**（`Editor.tsx:509-514` 的 `Ctrl/Cmd+S`、`CommandPalette.tsx:32-36`、`SettingsModal.tsx:94-96`、`AiBubbleMenu.tsx:66-86`、**全仓唯一一处 `addKeyboardShortcuts`＝`extensions/font-size.ts:67-77`**，加 StarterKit 默认 5 条；`editorProps`（`:381`）**无 `handleKeyDown`**；`markdown-shortcuts.ts:7` 那 6 条是输入规则不是快捷键）；**没有可当数据源的命令注册表**（`slash-commands.ts:40-47` 接口**无 `keys` 字段**、`CommandPalette.tsx:116-121` 只 1 项）；数据源现成＝`keyboard.md` 表A–E 已机器可读 ⇒ 官方 89 条 vs 本地约 10 条 ⇒ **面板必须"官方声明／本地实装"双列**，否则一上面板就摊开 79 条假承诺；入口还需**另补帮助菜单**。⚠ 未改任何实现。
7. **★ 队列 7（缩进与撤销尾巴）＝三条里跑了两条**。**缩进无 3 档上限**＝顶层 A1 连按 4 次 `Tab` ⇒ `indentationLevel:4` ＋ `markdown` 前导 **8 空格**（每档 2 空格）＋ 几何 x 337→449（4×28 px）／宽度 515→403，**双读数咬合**；☆ 反例＝4 枚平级兄弟**不跟随** ⇒ 级联作用域＝连续子树（G912/G913 未被推翻）。**装饰档（G914）第四候选排除**＝把 D1 改成**整块同构加粗**、`click` 进入、`Home`、现场断言 `startOffset=0`＋`isCollapsed=true`，按一次 `Backspace` ⇒ **仍直接合并**（D1 id 消失、A4 变 `"B97 A4 plain**B97 D1 fully bold**"`、加粗完整保留）⇒ 与第 96 批"局部装饰"凑成两条同形状样本 ⇒ ★ **可以据此建模＝块首 `Backspace` 只有"退缩进→退列表→合并"三档，不清装饰**；另在键表侧排除"清格式动词"这条候选（官方 89 条里 `Ctrl+\`＝切左栏、`Ctrl+Shift+\`＝焦点、`Ctrl+Shift+\``＝取消列表格式，**没有清除格式**）。**未跑＝拖拽移动的撤销步数**——⚠ **不是通路缺、也不是等授权**：连接器 `drag` 可用、`Ctrl+Z` 已证可送达，缺的是本批调用预算（要 1 次 `drag` ＋ N 次 `Ctrl+Z` × 每次配 1 次 `blocks get --format json`，且 §4 既有纪律＝**计步不能用 MCP 代理**）。动线已写进 `interactions.md V89` 与下批队列第 1 项。
8. **☆ 队列 8（静态尾巴）＝六条里五条结案**（子代理盘上直读 ＋ 我回验字符计数／偏移／调用点）。`uF` 整表 **18 条**、trigger 去重 **4 个**、尾部 6 条逐条到手；`cne` 本体＝**markdown 快捷输入分发器**（不是键定义表，11 参、只吃第一条命中、有选区就不跑、`isApplicable` 假时不 `preventDefault`）⇒ ★ **`allowBlockStyling` 只门控它**且是硬编码 prop（普通块 `!0`、**页面标题块 `!1`** ⇒ 官方标题块永不做 markdown 快捷输入）⇒ **修正 §三十一 的过宽说法**；`allowBlockStyling`／`forcedViewOnlyMode` 来源＝**只读真正的闸门是 `features.inlineEditing`**，`forcedViewOnlyMode` 的 creator 全仓仅 1 个传假调用点＋不在 export 表 ⇒ **web 构建里永不为真**＝G937 的机制解释；剩余 `_dm375_`＝JS 侧 16 个类名扫完、**净新增 4 项**（含 `_scrollRoot_77` ⇒ 面板内容是**虚拟滚动** ⇒ 历次 `kbd` 数是"视口内"数量），但**CSS 本体缺文件**（本地无官方 CSS）⇒ 几何／颜色**需要回站点取**；「5 个未加载 JS 资产」＝**历史从未落名册**（只记了 45／40 两个计数），改成可判定口径＝本地 105 个 `.js`、`all-chunks.txt` 118 个唯一名、**14 个不在本地且全是 worker／三方／懒媒体** ⇒ **对键结论零影响，可不再为它开批**；焦点栈 id 生命周期补完（`textEditor-${++instanceCount}`、`+"disabled-for-ime"` 无分隔符、`keyCode===229` 跳过、同 id 重推＝`UIFocusRePushed` 原地替换、`aboveFocusStackId` 用 `startsWith`）。★★★ **附带查出一条会让历史条目失效的资料卫生问题**＝盘上副本 6,844,206 字符（非 ASCII 10,291 个、mojibake）比历史页内 `fetch().text()` 的 6,841,180 **多约 3,026** ⇒ **所有历史 `@` 偏移都不能拿去盘上文件直接定位**（`cne` @3,777,934 → 盘上 @3,780,925）。
9. **☆ 队列 9（收尾自检＋现场还原＋残留三连）＝做完**（见下）。

**规模**：`gap.md` 935 → **958 条（最大 G966）**；`interactions.md` 新增 **V89**；`model.md` 新增 **§一之五十七**；`internals.md` 新增 **§三十三**；`longtail.md` 新增 **§十八**；`features.md` 计数行刷新；`manifest.jsonl` 129 → **131 行**（建 1 ＋ 还原 1）；`keyboard.md`／`api-contract.md` 本批无新节（键表资料全部来自既有面板与帮助站，本轮是行为与码路侧）。

**校验**：`node _harvest/check-tables.mjs *.md` ⇒ `ALL TABLES CONSISTENT`；`node _harvest/key-coverage.mjs *.md` ⇒ 覆盖率**只升不降**；`node _harvest/sanitize-pii.mjs` ⇒ `SANITIZE OK`（在 `docs/craft-ref/features` 下跑）。

**现场还原（残留三连全做完）**：① **LIFO**＝先 `tasks delete --task c3214350-…`（任务块）**再** `documents delete --document 20bf7dc9-…`（rootBlockId）→ `moved to trash`，`documents list --location unsorted` 读回**原 3 条**（`DFF43C2D`／`5376f8f3`／`74c0bb3d`，后两条非空未动）；② 屏上 `/tasks/all` 全文搜 `QODER-HARVEST|B97|B96` ⇒ **0 命中**，「4 项待办事项」×2 与「你的 Inbox 为空！」原样；③ `reminders list --status all` ⇒ `No reminders found`（**两次独立调用同结果**）。面板与弹层＝快捷键面板 `Escape` 关、备份 modal `Escape` 关、日程／提醒层 `Escape`＋「取消」关，四计数复核 0。注入物＝三条页内监听（`__b97x`／`__b97log`／`__b97ch`）导航后一律 `typeof undefined`。截图自证 3 张＝`_harvest/b97-backups-modal.png`、`b97-g890-enter-space.png`、`b97-restored-tasks-screen.png`。★ **本批踩到的新通路坑**＝`documents delete --document` 要的是 **rootBlockId**，把 app 链接里的 `documentId` 传进去报 `Document not found`（正确做法＝先 `documents resolve-link` 或一开始就记 rootBlockId）。
⚠ **未提交 git**（铁律：未经明确要求不 commit）。

**报告但**未**自动清理的历史残留**（铁律）：`tasks list --scope all` 本批 **15 条**，其中 **5 条属历次已删沙盒文档的采集任务串**（`QODER-HARVEST-B96 T1/T3`、`B96B T1`、`B96D G1`、`B97` 的 `R3 task`）⇒ 它们在回收站文档里、**屏上任务面不可见**（正是 G934 那套口径），**30 天后随回收站自动彻底清除**；要不要提前 `tasks delete` 请单独点头。另：`_harvest/pre-sanitize-bak/` 仍在（§7④ 未点头，未删）。

### 第 98 批队列（覆盖本批开头那版）

1. ★★ **拖拽移动的撤销步数**（第 97 批唯一因预算没跑的行为项，**通路不缺**）＝新建 `QODER-HARVEST-B98-DRAG`（1 文档 4–5 块）⇒ `take_snapshot` 拿 uid ⇒ 连接器 `drag` 把某块移到另一位 ⇒ `blocks get --format json` 记顺序 ⇒ **逐次 `Ctrl+Z`（每次配一次 `blocks get`）**直到回基线，判"一次拖拽算几步"。⚠ 铁律＝**计步不得用 MCP 代理**；每步都要几何＋结构双读数；做完 LIFO 还原＋残留三连。
2. ★★ **只读态对照的第二条路**＝**已删文档的编辑器**（第 96 批尾记九量到"已删文档的编辑器仍能渲染标题＋5 枚 `contenteditable`"）⇒ 若能造出 `documentAccess.canEdit` 为假的入口，就按 G949 的清单读"只读态下 ＋／手柄／斜杠菜单是否消失"（⚠ 先对块发 `pointerover` 再判，静止态本就不挂载＝G949 附注那条假差分）。
3. ★★ **`Ctrl+Alt+T` 与任务完成态**、`Ctrl+Shift+'`（块）／`Ctrl+Shift+\``（取消列表格式）三条尚未屏上验过的字母族 chord（可达性按"末键是否字母"分档，这三条都在可达档）。
4. ★ **`Sync Status`／「报告同步」两枚菜单项的落点**（会走站外，本桥**没有 `close_page`** ⇒ 点之前先记基线标签数，采完用 `navigate_page` 回同一 URL）；顺带裁「报告同步」是不是机翻。
5. ★★ **需要用户点头才能做的三件**（§7 原样顺延，历史授权不沿用）＝① 提交一次真实提醒值以裁"写 `reminder` 还是 `repeat.reminder`"（会留值）；② 在该浏览器登出一次采**真访客态**（破坏会话；★★ 第 97 批已给出更强的反对理由＝`forcedViewOnlyMode` 在 web 构建里永不为真，见 G962，**登出能否造出只读本身存疑**）；③ 产物残余 13 个文档/块 UUID 的深脱敏；④ 删 `_harvest/pre-sanitize-bak/`；⑤ 任何 `git commit`。
6. ★☆ **回站点补两份资料**＝官方 CSS（`internals.md §三十三/6`、`longtail.md §18/8` 都要它才能裁几何／颜色）＋ **未损坏的主包副本**（`uF` 第 9 条 pattern 被 mojibake 吞了 `]`）；顺带把「5 个未加载 JS 资产」的名册用 `performance.getEntriesByType('resource')` 落一次。
7. ☆ **静态下一枪**＝`ks.*` 虚拟滚动组件的第三方身份回溯；`d0` 焦点栈在**编辑器内容级**键上的 `defaultPrevented` 分布；`_dm375_` 之外剩余 15 处 `_1j891_` 类名的组件归属。
8. ★★ **每批收尾自检＝五份产物新节标题存在性**（`grep -c '^### 三点一〇NN'`／`^## VNN`／`^## 一之NN`／`^## NN`／`^## NN`），计数用 `grep -cE '^\| G[0-9]+ \|' gap.md`；**节标题时分＝manifest `ts`（UTC）＋8**。
9. ☆ **纪律提醒（本批新添）**＝① 按键类结论开场先读日志器条数判"送达"，`hidden`＋`innerWidth:0` 时 `press_key` 恒零送达；② 判"官方抑制某键"前先答"注入还是手按／哪类默认动作"；③ 编辑焦点必须用连接器 `click`，合成 pointer 只够开浮层；④ 主区懒渲染 ⇒ 判"这屏没有 X"要二次读；⑤ 产物里 `detail` 字段可区分点击来源（真鼠标 1／键派生 0）；⑥ 盘上偏移≠历史偏移。



## 第 97 批·尾记日志（2026-09-29 21:2x–21:3x，**零写入、零沙盒、零屏幕动作**＝纯盘上 `node -e` 静态取证）

**做了什么**：把 §2 队列 8 里最后一条没跑的子项——**「六位数字码输入面用途」**——裁完。做法＝在盘上主包里 `indexOf('inputMode:"numeric"')` 穷尽命中（**13 处**），再对两组各 6 格分别取 ±8000 字符窗口、抽出全部 i18n 键集合当**判别子**比对。中途差点误判"两组共用 `onboarding.code.confirm.title` ⇒ 是同一屏的两份拷贝"，是 `browse.login.was.not.initiated.in.this.browser` 这一条把它拉开的。

**裁出的三条**（`gap.md` **G967–G969**、`longtail.md` **§十九**）：
1. ★★★ **用途结案**＝这六个格子是**邮箱一次性验证码**，且是**同一机制的两份实现**＝第一组（组件 `k8`，盘上 6,562,678–6,563,343）**注册／入驻**流程（邻接 `alert.registration.is.unavailable` ＋ 一整片 `onboarding.menu.*`）；第二组（`v8`，6,614,874–6,615,539）**浏览器侧登录**流程（邻接 **`browse.login.was.not.initiated.in.this.browser`**／`browse.logging.in`／`browse.sign.in.failed`／`browse.back.to.login`／`login.start.welcome`／`login.start.sign.in.with.craft(.to.continue)`／`onboarding.your.email`／`onboarding.continue`／`web.onboarding.accept.terms.and.privacy`）。★★★ **四条候选全部排除**＝与 2FA／TOTP／恢复码／邀请码**无关**：`twoFactor`／`totp`／`verificationCode`／`confirmEmail` 在 105 个本地 JS 里 **0 命中**；`recovery` 唯一命中 @507,038 是解析器生成器报错串、`otp` 唯一命中 @5,941,901 在 base64 数据块内部 ⇒ 都是噪声。⇒ **应用内（已登录态）永不出现这六个格子 ⇒ 不构成 1:1 复刻缺口**；本域该补的账只有 **G307**（邮箱变更五态子流程，本地直提无验证码环节）。★ 这条判定的价值＝**把下批的一个假靶子划掉了**（`longtail.md:478` 原来写"★ 新功能面候选"）。
2. ★★ **码面契约**＝逐格 `inputMode:"numeric"`＋`maxLength:1`＋`id:"input1"…"input6"`＋**三个独立 handler** `onChange`／`onPaste`／`onKeyDown` ⇒ **整串粘贴与逐格键盘导航是两条代码路径**；六格共用一个 ref 回调 `ref:g`（焦点推进由父级持索引）；每格展开 `{...Ba.noAutoFillInputAttributes}`＝**`{autoComplete:"off",…}`**（@4,003,894）⇒ **官方主动拒绝浏览器的 OTP 自动填充**；几何＝格间距 `gap:4`、组宽 `$maxWidth:384`、页面 `contentWidth:588`、`k8` 样式 **`font-size:30px`／`text-align:center`／`border-radius:10px`／`box-shadow: inset 0 0 0 1px <色>`**（★ 边框走 inset shadow 不是 `border`）；☆ 校验中是把**整排格子换成 32×32 转圈**（不是禁用）；☆ 失效态**至少六条**（`alert.{invalid,expired}.code`／`code.already.verified`／**`account.locked`**／**`too.many.attempts`**，另 `error.occurred`／`registration.is.unavailable`）。
3. ★ **一条计数更正 ＋ 一条"别用"命名**：第 **13** 处 `inputMode:"numeric"` @4,005,225 **不是码面**，而是通用数字输入工厂 `Kan()={type:"number",min:"0",inputMode:"numeric",pattern:"[0-9]*"}`，它在 helper 表 `Ba` 里的导出名是 **`numberInputAttributesDontUse`**（＝官方源码自己写"别用"）。⇒ ① 历次按 `inputMode` 关键词归类的读数**要减 1**；② **`inputMode:"numeric"` 不是码面的可靠指纹**，可靠组合是 `maxLength:1` ＋ `id:"inputN"`。☆ 同表 `Ba` 兄弟项全量抄到（含 `emailInputAttributes` 的 `placeholder:"e.g. john.doe@craft.do"`、`onChange:zan(t)={onChange:t,onBlur:t,onInput:t}`＝**三事件同一 handler**）⇒ 官方把输入框脏活集中成一组 helper，本地逐处手写＝**组织方式差**（P3，不开批）。

**就地留痕的一处冲突更正（非静默改写）**：`dialogs.md:105` 原写"验证码四态"，实扫该窗口邻接区还有 **`alert.account.locked`／`alert.too.many.attempts`** ⇒ 已在那一行后追加 ✎ 更正（失效态至少六条，早先的"四态"是照文案清单摘的、漏了**限流与锁定**两类），并把判别子与 G967–G969 交叉引用写上。

**偏移口径再添一个数据点**：本区段盘上 6,562,678 − 历史 6,559,643 ＝ **＋3,035**（G960 当年测的是 ＋3,026）⇒ **错位不是固定常数、逐区段不同** ⇒ 复用旧偏移必须**逐处 `indexOf` 重测**（已写进 G968）。

**规模**：`gap.md` 958 → **961 条（最大 G969）**；`longtail.md` 新增 **§十九**；`dialogs.md` **1 行 ✎ 更正**；`features.md` 计数行刷新；`interactions.md`／`model.md`／`internals.md` **本段无新节**（如实写原因＝本段零屏上行为读数，素材全属"输入面清单＋文案＋契约"层，只有 `longtail` 有货；不硬造 V 号／模型节／机制节）；`manifest.jsonl` **不追加**（零写入、零沙盒、零残留 ⇒ 无需还原三连，屏上现场仍是上一段还原后的 `/tasks/all`，本段**没有动浏览器**）。

**校验**（本尾记落盘后**实跑**输出）：`ALL TABLES CONSISTENT` ／ 覆盖率 **1876/3639＝51.6%**（**较上一段的 1870/3639＝51.4% 上升 6 条**＝本尾记把 `browse.*`／`login.start.*`／`alert.*` 一批键逐字抄进了 `longtail.md §十九`）／ `SANITIZE OK`（`files rewritten = 0/25`）。

### 第 98 批队列（把本尾记划掉的一条移除后刷新）

1. ★★ **拖拽移动的撤销步数**（唯一因预算没跑的行为项，通路不缺）＝新建 `QODER-HARVEST-B98-DRAG`（1 文档 4–5 块）⇒ `take_snapshot` 拿 uid ⇒ 连接器 `drag` 移位 ⇒ `blocks get --format json` 记顺序 ⇒ **逐次 `Ctrl+Z`、每次配一次 `blocks get`** 直到回基线 ⇒ 判"一次拖拽算几步"。⚠ 计步**不得**用 MCP 代理；做完 LIFO 还原＋残留三连。
2. ★★ **只读态对照的第二条路**＝已删文档的编辑器（尾记九量到它仍能渲染标题＋5 枚 `contenteditable`）⇒ 若能造出 `documentAccess.canEdit` 为假的入口，按 G949 清单读"只读态下 ＋／手柄／斜杠菜单显隐"（⚠ 先对块 `pointerover` 再判，静止态本就不挂载）。
3. ★★ **三条还没屏上验过的字母族 chord**＝`Ctrl+Alt+T`（折叠块／任务完成同键分派）、`Ctrl+Shift+'`（块）、`Ctrl+Shift+\``（取消列表格式）。
4. ★ `Sync Status`／「报告同步」两枚菜单项的落点（点前先记基线标签数，本桥无 `close_page`）。
5. ★ ☆ **已从队列移除**：~~六位数字码输入面用途~~ ⇒ **本尾记结案、判定为复刻域外**（下批别再挖它；要挖本域只能挖 G307 邮箱变更五态）。
6. ★★ **需要用户点头的几件**（历史授权不沿用）＝① 提交一次真实提醒值以裁写 `reminder` 还是 `repeat.reminder`（会留值）；② 登出采访客态（★ 本批已给出更强反对理由＝`forcedViewOnlyMode` 在 web 构建永不为真，G962 ⇒ **登出能否造出只读本身存疑**）；③ 产物残余 13 个文档/块 UUID 深脱敏；④ 删 `_harvest/pre-sanitize-bak/`；⑤ 任何 `git commit`；⑥ **提前清掉回收站里那 5 条历次采集任务串**（第 97 批报告、未自动清理）。
7. ☆ 回站点补两份资料＝**官方 CSS**（`_dm375_` 几何／颜色）＋**未损坏主包副本**（`uF` 第 9 条 pattern 被 mojibake 吞了 `]`）；顺带用 `performance.getEntriesByType('resource')` 把"5 个未加载 JS 资产"的名册真正落一次。
8. ☆ 静态下一枪＝`k8`/`v8` 的 `onPaste`／`onKeyDown` **分流规则细节**（自动前进？退格回前格？粘贴超 6 位怎么截断）；`resend` 动线的键名与冷却；`ks.*` 虚拟滚动组件的第三方身份；`d0` 焦点栈在编辑器级键上的 `defaultPrevented` 分布；剩余 15 处 `_1j891_` 类名的组件归属。
9. ★★ 收尾自检＝五份产物**新节标题存在性**（`### 三点一〇NN`／`## VNN`／`## 一之NN`／`## NN`／`## NN`）＋ `grep -cE '^\| G[0-9]+ \|' gap.md` ＋ 节标题时分＝manifest `ts`（UTC）＋8。
10. ☆ 纪律（本批新增／强化六条，开场先读）＝① 按键类结论**先读日志器条数判送达**，`hidden`＋`innerWidth:0` 时 `press_key` 恒零送达；② 判"官方抑制某键"前先答"注入还是手按／哪类默认动作"；③ **编辑焦点必须连接器 `click`**，合成 pointer 只够开浮层；④ 主区懒渲染 ⇒ 判"这屏没有 X"要**二次读**；⑤ 页内注入物**随任何整页导航丢失** ⇒ 每次导航后重装，并用 `typeof` 区分"没送达"与"监听没了"；⑥ **盘上偏移≠历史偏移**（且非固定常数）。


## 第 97 批·尾记二（2026-09-29 22:0x–22:2x，**零写入、零沙盒、零屏幕动作**＝盘上 CSS/JS 定点取证 ＋ 名册交叉核对；★★★ **官方 CSS 本体首次落盘，把历次"几何／颜色拿不到"的尾巴整条清偿**）

1. ★★★ **官方 CSS 落盘**＝`_harvest/css/index.css.CP00jDAy.css`，**297,080 字符、非 ASCII 0 个** ⇒ 与主包不同，**这份没有 mojibake**，偏移与字符串可逐字引用；`@layer` 声明 86 处、层名三个（`base`／`components`／`utilities`）。⇒ **`internals.md §三十三` 末段那条"几何／颜色一律拿不到＝本地没有任何 craft.do 官方 CSS ⇒ 需要回站点取 CSS"已就地加 ✎ 更正宣告清偿**（不静默改写）。☆ 顺带钉死一个口径：主包 JS 侧"18 处字面量／16 类名"与 CSS 侧"18 个类名／16 个 hash／22 次出现"**是同数不同义**，历次"剩余 18 处 `_dm375_` CSS"按名数结案。
2. ★★★ **通道化配色全表到手 ＋ 纠正一条误记**＝前景族 20 档（`0→0%｜25→2%｜50→3%｜100→4%｜150→6%｜200→8%｜250→10%｜300→12%｜350→18%｜400→25%｜450→32%｜500→40%｜550→48%｜600→55%｜650→62%｜700→70%｜750→78%｜800→85%｜850→92%｜900→100%`），**`--foreground-050` 与 `-950` 不存在**（此前口径里出现过 `-050` ⇒ 作废）；★★★ **本轮补测出的最大陷阱＝官方有两套标度不同的阶梯**：`--accent-{blue,gray,green,pink,purple,yellow}` 六族各 10 档且逐字同构＝`50=6%｜100=12%｜150=18%｜200=24%｜250=32%｜300=40%｜350=55%｜400=70%｜450=85%｜500=100%` ⇒ **同一个后缀 `-100` 在前景族是 4%、在强调色族是 12%**，强调色满值后缀是 `-500` 而非 `-900`；★ 强调色切换＝**18 条别名重指**（`--accent-100: var(--accent-blue-100)`，由 `[data-accent=…]` 整块改指）＝语义层＋通道层两跳；☆ `--base-*` **只有 1 档**、且 `--base-overlay: rgb(252 252 252 / 100%)` **写死不跟随 `--base`**（暗档 `--base: 30 30 30` 时不变）。
3. ★★★ **控件五态阶梯首次有官方数值**（`_1j891_`＝DS 的 action 组件，21 类名／6 变体）＝`Active` 静止 4% → hover／`[data-popup-open]`／键盘焦点／`_forceHover`／`[data-highlighted]` **五种条件共用同一条**升到 6% → `@media (pointer: fine)` 的 `:active` 到 8%；`Default` 静止无背景 → 4% → **8%（跨过 6%）**；`:not(._isStatic_1j891_31,[data-disabled])` 例外；`[data-disabled]{opacity:.4}` 是**一条全局属性规则**；图标 `--foreground-800` 比正文 `-900` 淡。⇒ **选中与 hover 只差 2% 不透明度**＝历次"屏上选中态几乎看不出"的官方侧量值根据，也是"判据必须靠类名"的新支撑；★ hover 门控写法＝`[data-whatintent]:not([data-whatintent=touch])`（pointer 与 keyboard 都算，touch 排除）。
4. ★★★ **六位码面的三条路径逐字结案**（清偿尾记一留的"仍未采到"）＝① 规范器 `Cve`@6,558,535＝`replace(/[^0-9]/g,"")` 剥非数字后要求 `ti(e,10)!=null && e.length===6` ⇒ **粘贴超 6 位不是截断、是整串拒绝**；② 分发器写完每格调 `I.blur()` **而不是 `focus()`** 再提交，提交在飞时直接返回 true 吞掉；③ `onChange` 只在"填满一格"时动作、非数字清空不前进、六格全满才提交、否则 `w[S+1].focus()`（**只有这一条路径是自动前进**）；④ `onKeyDown` **只认 `Backspace`**、当前格非空即短路、空格时清空本格并聚焦前一格、**第一格不退**，且**没有方向键／`Delete`／`Home`／`End` 分支**。⇒ 写成 `interactions.md V90`（标"盘上静态、未屏上验证"，该面在应用内已登录态不可达）。☆ 两条可迁移判据＝"整串粘贴"与"逐格输入"必须分开验（本例两焦点行为相反）；格子顺序身份靠显式 `id`（`input1..6`）而非 DOM 顺序（本例布局是**两行三格**、`de{gap:4}`）。
5. ★★ **资源名册其实有两份、口径不可互换**＝① 静态清单 `_harvest/all-chunks.txt`（200 行／118 唯一 basename／与本地 105 个 js 交叉缺 **14**，**逐字复现 G965**）② 运行时名册本轮新落盘 `_harvest/b97-resource-roster.json`（250 资源／`.js` 61 条／去重 54／缺 **10 唯一名＝17 条目次**，差 7 因 `sw.js` 出现 7 次、`gtm.js` 2 次；⚠ **该文件是双层 JSON 字符串、`JSON.parse` 要解两次**）。⇒ 两份互补：运行时名册含**跨源外部脚本**（`appleid.auth.js`／`gtm.js`／`profitwell.js`／`cc.js` 都不在静态清单；`uc.js` 在清单＝应用自备），静态清单含**本会话未加载的懒加载库**（`vendor-jszip`／`katex`／`mammoth`／`pdf`／`react-cropper`／`csv-parse`／`blurhashEncoder.worker`／两个 hook chunk；`socket.worker` 在本地、不属缺项）。⇒ **今后凡写"资源名册"必须带来源**。★ 新旁证＝官方 web 构建自带 **Apple ＋ Azure/MSAL(Microsoft) ＋ Sentry** ⇒ 三方身份与观测 SDK 走外部／懒加载，与登录页"SSO·Google·Apple·Microsoft"文案互印。☆ 运行时后缀分布 `.js 61｜无扩展 80｜.ico 65｜.woff2 24｜.css 13｜.json 5｜.html 2`（合计 250 自洽）。
6. ★★ **三条实现约定**（`internals.md §三十四`）＝① `jo`@60,786 **不是 `AbortController`**＝`cleanupAll(){invokeAll(); removeAll()}`，形状兼容 `addEventListener` 的 `signal`、但多一层"执行登记的清理回调"；② `zn.window` 是 **window 包装器**（粘贴与 `storage` 监听都走它）⇒ 别按 `window.` 直接 grep；③ 数字解析惯例＝`ti(t,e=10){parseInt; isNaN?null:n}`@53,972（＋兄弟 `s1`＝`parseFloat` 同形）⇒ **官方把 `NaN` 换成 `null`，所以全仓判失败一律 `!=null`**，这不是随意写法。
7. ★☆ **官方也有实现重复 ＋ 硬编码文案**＝六格码面在包里是 `k8`（@6,560,4xx–6,563,3xx）与 `v8`（@6,613,2xx–6,615,5xx）两份**逐字同构**实现、仅压缩变量名不同，共享的只有属性表 `Ba.noAutoFillInputAttributes` ⇒ **官方的复用做在属性层、没做在组件层**；☆ 两句错误文案 **不走 i18n**＝`"Login was not initiated in this browser"`／`"Wrong login code"`（中文包查无）⇒ 本地**不必模仿**；☆ 同区码→key 的 switch 净新增三条 `alert.error.{invalid.params, auth.token.missing, extension.not.installed}` ⇒ **官方存在一个"需安装的浏览器扩展"参与认证链路**（本目录此前未记）。
8. ★★ **本地实扫（本轮全部带 `文件:行号`）**＝① 本地自有 CSS **只有 `src/app/globals.css` 一个**（排除 `node_modules/`／`.next/` 后全仓 `.css` 共 2 个，另一个就是本轮官方件），旧口径"8 个"未标是否计入构建产物 ⇒ 按可判定口径重测；② 本地**没有 `rgb(var(--X) / N%)` 通道写法**（`grep -rn 'rgb(var(--' src` ⇒ 0 命中），半透明走 `color-mix`（`globals.css` 内 21 处，例 `:158-163`）＋ oklch 斜杠 alpha（`:122`、`:168`），前景是 `oklch(0.2252 0.0049 248)`（`:60`）／暗 `oklch(0.9821 0 0)`（`:231`）⇒ **两套体系、映射必须按百分比表走、不能按名字猜**；③ 圆角 `sm/md/lg/xl` 与官方**逐字相同**（`globals.css:44-47`，`:99` 注释已抄过官方五档）但**本地没有 `--radius-full` token**（胶囊形靠 `rounded-full` 工具类硬写，`button.tsx:11`），且本地多 `-2xl/-3xl/-4xl` 三档＝官方没有；④ **本地零意图门控**（`grep -rn 'whatintent\|hoverOnlyWhenSupported\|pointer: fine' src` ⇒ **0 命中**）⇒ 触屏上本地 hover 背景会焊住、官方不会；⑤ **禁用不透明度 50% vs 官方 40%**，且本地逐组件重复（`button.tsx:6`／`calendar.tsx:59,64`／`checkbox.tsx:12`／`command.tsx:82` ≥5 处）vs 官方一条 `[data-disabled]`；⑥ 键盘焦点态形状不同＝官方 `… :focus{outline:none}` ＋ 背景加深，本地 `focus-visible:ring-3 ring-ring/50` ⇒ **本地多一圈 ring**；⑦ 本地**无分格码输入组件**（`maxLength={1}`／`onPaste` 在 `src/components` ⇒ 0 命中）⇒ V90 属域外、不构成缺口，真正该补的仍是 **G307**。
9. **规模**：`gap.md` 961 → **971 条（最大 G979，本段 ＋10＝G970–G979）**；`interactions.md` 新增 **V90**（1927→1957 行）；`internals.md` 新增 **§三十四**（990→1000 行）＋ `§三十三` 末段 ✎ 更正；`styles.md` 新增 **§九**（72→90 行）＋ `§八` 第 4 条 ✎ 部分清偿；`longtail.md` 新增 **§二十**（566→575 行）；`features.md` 计数行刷新；本日志 ＋ 第 98 批队列更新；`manifest.jsonl` **不追加**（本段零写入、零沙盒、零屏幕 ⇒ 无需还原三连）。★ `model.md` **本段无新节**，原因如实写＝本段全是**呈现层与输入面**证据，内容模型（块／任务／提醒／集合）零新字段（按 §5"确无可采时须写明原因"执行）。
10. **三条校验实跑值**（cwd＝`docs/craft-ref/features`）＝`node _harvest/check-tables.mjs` → **`ALL TABLES CONSISTENT`**；`node _harvest/key-coverage.mjs *.md` → **1877/3639＝51.6%**（较上一段 1876 ＋1，**不降**；未覆盖清单 1762 条）。☆ 归因如实写＝本轮点名的三条 `alert.error.{invalid.params, auth.token.missing, extension.not.installed}` 现均**不在**未覆盖清单，但净值只 ＋1 ⇒ 其中两条此前已被别处提及，**不强行把 ＋1 记到某一条头上**；`node _harvest/sanitize-pii.mjs` → **`files rewritten = 0/25, replacements = 0` ＋ `SANITIZE OK`**（⇒ 本段产物**零新增 PII**，无需再脱敏）。
11. **现场状态（本段结束时）**＝浏览器仍在 `/tasks/all`、`role=dialog/menu/group/menuitem` **四计数 0/0/0/0**、三条页内注入监听复核仍全 `undefined`（未重装）、屏上采集串 **0 命中**、`innerWidth` 1154（仍桌面档）；沙盒零新建（`unsorted` 仍 3 条、回收站仍 5＋1 已结案孤儿）、提醒 0、分享早在尾记十一关回。⇒ **无需还原三连**。
12. ☆ **过程纪律一条**：本段两次差点把"未测的数"写成"测过的数"（`--spacing-5` 与 `--foreground-050`），是"落笔前用脚本重测一遍"拦住的 ⇒ 凡是**阶梯类**结论必须一次性枚举手（`new Set` 全量），不能靠单条 `grep -oE` 抽样——抽样只给了 6/20 档，才导致上一段误记 `-050`。

### 第 98 批队列（最终版，覆盖上一版）

1. ★★★ **其余 12 份 CSS 落盘**（名册 `.css` 共 13 个，本轮只有主样式件）⇒ 目标＝`Filled`／`Danger`／`Accent`／`DangerSubtle` 四变体的静止值、`--shadow-xs` 以上完整阶梯、`--spacing-7` 之类缺档是否在别处定义、`style.color.*` 那 24 个**具名色→三元组**（`styles.md §八` 第 4 条的剩余部分）。手法＝屏上读 `document.styleSheets`／`performance` 名册拿 URL，再页内 `fetch` 落盘（承 §一〇三九 的 CSS 通路）。
2. ★★★ **拖拽移动的撤销步数**＝唯一未跑的行为项；需**新沙盒 `QODER-HARVEST-B97-DRAG` 授权**（属新的具名实体）。计步只能屏上做（MCP 不能代理撤销），每步配一次 `blocks get --format json` 双读数。
3. ★★★ **G890 已结案，但"默认动作三档门槛"要在真编辑器上复验一次**＝编辑器内容级 `Enter`／`Space` 是否仍不合成 click（本轮只在面板里验过），需沙盒正文持焦 ＋ `hasFocus` ＋ `rangeCount>0` 三件套。
4. ★★ **`u()`／`p()` 提交体**（六位码面六格填满后调的函数）未读其体＝只证到调用点；若要判"是否立刻发请求"需再定点读（**属登录域，默认不开批**）。
5. ★★ **本地三条待裁项**（本轮新增 ＋ 沿袭）＝① 任务读侧要不要按官方 UI 口径滤掉已删文档的行（G934，本地 `src/actions/task/task.ts:106/117` 只置空标题不滤行）② 快捷键面板本地要不要补（G924；现在**几何与配色已有官方值**＝`styles.md §九` ＋ G973，成本比上一轮低）③ **要不要把本地中性色改成官方的"通道 ＋ 20 档"体系**（G971；⚠ 别按名字映射，两套标度不同）。
6. ★★ **`Sync Status`／「报告同步」两枚菜单项落点**＝走 React fiber 零导航法（承 `internals.md §三十四` 前一批的手法）。
7. ★ **只读态**＝F 项在应用内三条通路都堵死（G937／G962：登录 cookie 共享、版本条目缺失、`forcedViewOnlyMode` 在 web 构建永假）⇒ 剩余唯一路＝请用户在该浏览器登出一次（**破坏会话，默认不做**）。
8. ☆ 静态尾巴：`uF` 表尾部（已 18 条全量）、`cne` 本体（已结案）、`allowBlockStyling`／`forcedViewOnlyMode` 来源（已结案）、**六位码输入面（本批整条结案，从队列移除）**；仍剩 `I_e.invokeAll` 的回调登记处、`zn` 包装器本体、`ti()` 之外的解析惯例。
9. ☆ **待用户决定四件**＝① 13 个文档/块 UUID 要不要深脱敏；② `_harvest/pre-sanitize-bak/` 要不要删；③ 要不要 `git commit`（本段 8 份产物 modified 未提交）；④ 回收站里 5 条历次采集任务串要不要提前清（30 天自动清除，不处理无后患）。
10. ★★ **每批收尾自检五份产物新节标题存在性**（不数条数）＋ 计数用 `grep -cE '^\| G[0-9]+ \|' gap.md`（本轮实跑 **971**）＋ 时开＝manifest UTC＋8；★ **本段新增一条自检项**＝"阶梯类／全量类结论必须枚举手后再写，不许抽样"（见上条 12）。

## 第 98 批（2026-09-29 22:40–23:0x 本地＝UTC 14:40–14:5x，★★★ **队列里最后一个未跑的行为项跑通＝拖拽移动的撤销粒度**；沙盒 `QODER-HARVEST-B97-DRAG`＝1 文档＋4 块，**已按 LIFO 还原**）

1. ★★★ **拖拽一次＝撤销一步**（双读数）：连接器 `drag(手柄 → B 的中心)` ⇒ 数据面 A,B,C,D → **A,C,B,D**、几何 `6e85948d@209`／`aed7e860@245`；**一次 `Ctrl+Z`** ⇒ 两侧同时回到 A,B,C,D；**一次 `Ctrl+Shift+Z`** ⇒ 两侧同时回到 A,C,B,D。⇒ 官方不把它拆成"删一步＋插一步"，也不需要连按两次。
2. ★★★ **块 id 全程恒定**＝`b8a2c7ea`／`aed7e860`／`6e85948d`／`f35ca062` 在移动、撤销、重做后都是同一组 ⇒ 撤销是"还原位置"不是"重建块"（`model.md §一之五十八`，与历次"按块还原快照"第四次咬合，本次首次拿到 id 层证据）。
3. ★★★ **通路破解（本轮最大增量）**＝① 合成 `DragEvent` 三种打法全部做到 `dragover`／`drop` 的 `defaultPrevented=true` 且预览幽灵画出，**但数据面零变化** ⇒ 判为**仪器边界（疑 `isTrusted` 闸）**、不得写成官方缺陷；② 唯一可达打法＝**连接器 `hover` 用真鼠标挂出手柄 → 临时给它 `aria-label`＋`role`＋`tabindex` → `take_snapshot` 拿 uid → `drag`**（真鼠标序列让 Chromium 产生可信 dragstart）；③ 采完 `removeAttribute` 三个属性并复核 `leftover:0`。★ 本目录第一次**改写 DOM 属性**取证 ⇒ 立规：**只允许在沙盒页面上做、同生命周期内撤销**。
4. ★★★ **新判据盲区（第六条）＝拖拽预览幽灵带同一个 `data-block-id`**＝拖拽期间 `div[data-block-id]` 数到 5 条、`6e85948d` 重复（原件 `x=358,w=670`，幽灵 `x=432,w=686`＝**x＋74／w＋16**）；我自己先中招一次——a11y 的 `value` 里多出 `DRAG-C charlie`，我一度判"插了重复块"，是 `blocks get` 证伪的 ⇒ **拖拽期间禁止用"按 id 计数／按文本数次数"作判据**。
5. ★★ **官方负载真相**＝`dragstart` 写进 `application/json` 的是字符串 **`"[object Object]"`**（未 `JSON.stringify`）⇒ drop 端不靠 `getData`、靠 provider 内存状态（与懒加载 chunk `HTML5DnDProvider-C6oAI5bn.js` 吻合）。☆ 对照本地＝`InsertTab.tsx:40-42` 用自定义 MIME ＋ `JSON.stringify`、`src/lib/dnd/sidebar-drag.ts:40` 还注释了"`getData` 只在 drop 里可读"⇒ **本地比官方规范，切勿"照抄官方"**。
6. ★★ **手柄几何与实现**＝`[draggable=true].sc-1iqnrwp-0`，**24×29～31**、`x=330`（正文 `x=358` ⇒ 手柄**左缘**比正文靠左 28px），内层图标 `sc-1iqnrwp-1` 16×16（`draggable=false`）⇒ **抓取热区是整块 24×29**；类名是 **styled-components（`sc-`）而非 CSS Modules** ⇒ 编辑器内部件要按 `sc-` ＋ `data-block-id` 找，按 `_xxxx_` hash 找会落空（`internals.md §三十五`）。☆ 手柄**零可访问名**＝本目录第七次印证 Craft 自有控件零 ARIA。
7. ★★ **一次判废的第二次拖拽（如实记）**＝拿上一轮快照里的手柄 uid 再拖 ⇒ 连接器回成功、数据面与几何均无变化 ⇒ 归因＝该 uid 指向的手柄是**合成 pointerover 挂的旧节点／且归属行由真实鼠标位置决定**（实测：想挂 C，手柄中心 y=261 落在 B 的行）⇒ **判为静默失效轮**；⇒ 副产出一条复测协议八步（见 `interactions.md V91` 第三节）。★ 由此**两个问题仍未采到**＝跨 3 档以上长距离拖拽是否仍 1 步；连续两次拖拽是否被 undo 组合并。
8. ★★ **撤销的焦点门槛在拖拽支复现**＝拖完 `hasFocus:true` 但 `rangeCount:0` ⇒ 先连接器 `click` 进 DRAG-A（`rangeCount:1`、`startContainer="DRAG-A alpha"`）再 `Ctrl+Z` ⇒ 生效；且撤销后选区不变 ⇒ **三档门槛（编辑器内容级需持焦＋`rangeCount>0`）再获一证**。
9. ★★ **本地对账（本轮实扫，全带路径行号）**＝① `src/components/editor/drag-handle/DragHandle.tsx:148-168` `performMove`＝**单个 tr** `delete(from,to)`＋`insert(insertPos, slice.content)` ⇒ ProseMirror 天然算**一步** ⇒ **与官方形状一致 ✅**；`:153` 有"落点落在自身范围即 return"守卫；`:167` 拖完 `view.focus()`（官方拖完 `rangeCount:0` 不抢焦点 ⇒ 轻微差）。② ★ **一条未对齐风险**＝`src/components/editor/Editor.tsx:265` `undoRedo: collaborative ? false : {}` ⇒ 用 StarterKit **默认历史**（`depth 100`／`newGroupDelay 500ms`）⇒ 两次操作间隔 <500ms 会被**并入同一 undo 组**，而官方是否合并**本轮未采**（第 7 条判废所致）⇒ 要么实测官方合并边界、要么把 `newGroupDelay` 写死并注明依据。③ `Editor.tsx:259-261` `dropcursor:{width:2}`＝本地落点指示是 **2px 竖线**，官方是**整块幽灵副本** ⇒ 可见形态差。④ `src/prisma/contract.prisma:58` `content Json?` ＋ 全仓无 Block 表 ⇒ 块序靠数组位置，**与官方一致**；☆ 文档级有 `order Float`（`:60` 等 9 处）⇒ 官方文档次序依据未测，不判差。⑤ ☆ **资料卫生更正**＝历次产物有 **3 处**把契约写成 `prisma/contract.prisma`，真实路径是 **`src/prisma/contract.prisma`** ⇒ 本轮已批量改正（行号 `isDeleted:71`／`deletedAt:72`／`@@index:102`／`SetNull:310` 复核无误）。
10. **规模**：`gap.md` 971 → **981 条（最大 G989，本段 ＋10＝G980–G989）**；`interactions.md` **V91**（1957→1982 行）；`model.md` **§一之五十八**（2732→2740 行）；`internals.md` **§三十五**（1000→1009 行）；`longtail.md` **§二十一**（575→584 行）；`features.md` 计数行刷新；`_harvest/b98-drag-moved.png`（重做后的 A,C,B,D 态）；**`manifest.jsonl` 131 → 133 行**（建 1 ＋ 还原 1，本批是有写入批次）。
11. **还原三连全过**＝`documents delete --document 4a4052ca-…`（rootBlockId，非 app link 的 documentId）→ `moved to trash`；`documents list --location unsorted` ＝ 原 3 条（`DFF43C2D`／`5376f8f3`／`74c0bb3d`）；`reminders list --status all` ＝ `No reminders found`；屏上 `/tasks/all` 的 `innerText` 搜 `QODER-HARVEST` 与 `DRAG-[A-D]` **均 0 命中**、四角色计数 0/0/0/0、注入属性 `leftover:0`；沙盒内**从未建任务／提醒** ⇒ 还原计划第 1 步天然 no-op。☆ 回收站由 5 条增至 **6 条**（本轮 DRAG 加入），30 天自动清除、还原＝`documents move --destination unsorted`。
12. ★ **同批顺带完成的用户授权四件**（详见下一条起各节）＝① 产物残余 UUID 深脱敏；② 删 `_harvest/pre-sanitize-bak/`；③ 回收站提前清除的可行性判定；④ `git commit`。⇒ 这四件是用户以"都同意"打包批准的**具名清单**，清单里每件都写明了对象与后果，故按一次一签执行、不再扩大范围。

### 第 99 批队列（本批收尾后刷新）

1. ★★★ **连续两次拖拽是否被并入同一 undo 组**＝直接决定本地 `src/components/editor/Editor.tsx:265` 的 `newGroupDelay`（默认 500ms）要不要写死；手法＝按 `interactions.md V91` 第三节八步协议，两次拖拽之间**刻意不等待**，然后一次 `Ctrl+Z` 看还原几步。需新沙盒（建议 `QODER-HARVEST-B99-UNDOGROUP`）。
2. ★★★ **跨 3 档以上长距离拖拽的撤销步数**（同一沙盒可顺带）＋ **中心 vs 边缘落点是否产生子级**（官方预览已显示 x＋74 的"缩进感"，但本轮两次落点都只是重排 ⇒ 必须换落点位置再测）。
3. ★★ **手柄 hover 态的颜色／阴影、暗档色值、compact 档是否有手柄、幽灵 z-index／透明度**（`longtail.md §二十一` 尾）＝纯量测、零写入。
4. ★★ **其余 12 份 CSS 落盘**（沿袭上一版队列第 1 项）＝补 `Filled/Danger/Accent/DangerSubtle` 四变体静止值、`--shadow` 全阶、`--spacing-7` 缺档、`style.color.*` 24 具名色→三元组。
5. ★★ **本地验收项两条**＝① 跑一次本地 e2e 验证"移动→撤销→块 id 不变"与官方 G981 对照（若本地 id 变即 P0）；② 本地拖拽 e2e **必须用 `page.dragAndDrop()`**（可信事件），不要用 `dispatchEvent(new DragEvent)`——官方侧已证合成序列不收（G982）。
6. ★★ **`Sync Status`／「报告同步」落点**（沿袭，React fiber 零导航法）。
7. ★ **只读态**＝F 项三条通路仍堵死（G937／G962），唯一剩余＝用户同意登出一次（破坏会话，默认不做）。
8. ☆ 静态尾巴＝`I_e.invokeAll` 回调登记处、`zn` 包装器本体、`HTML5DnDProvider` chunk 本体（未取回）、`uc.js`／`cc.js` 用途。
9. ★★ **每批收尾自检**＝五份产物新节标题存在性（不数条数）＋ 计数 `grep -cE '^\| G[0-9]+ \|' gap.md`（本批实跑 **981**）＋ 时开＝manifest **UTC**、节标题＝本地 UTC＋8 ＋ ★ **阶梯类／全量类结论必须 `new Set` 枚举手，不许抽样**（承第 97 批·尾记二教训）。

## 第 98 批·尾记（2026-09-29 23:0x–23:2x 本地＝UTC 15:0x–15:2x，**零写入、零沙盒**＝回收站通路判定 ＋ 用户"都同意"打包授权的四件收尾）

1. ★★ **回收站屏首采**（`/s/<空间名--spaceId>/trash`，标题与 H1 都是「最近删除」）＝**15 行、每行是一个 `<A href="/editor/d/<spaceId>/<documentId>">` 链接**；把屏上所有可点项全量枚举手（`button`／`[role=button]`／`a[href]` 去重 30 项）**无一命中删除语义**；⇒ ⚠ **但不得判成"官方没有清空回收站"**＝`gap.md` G233 早就记着命令表里注册了 **`commands.empty.trash`** ＋ `commands.restore` ⇒ 准确口径＝**动词存在、入口本轮没找到**（MCP 写侧无 ＋ 屏上无控件 ⇒ 剩命令面板／选中态工具栏两条候选）。⇒ `gap.md` 新节 **§三点一〇四二（G990–G992）**。
2. ★★ **点开回收站行＝直接进编辑器路由打开那篇已删文档**＝URL `/editor/d/<spaceId>/<docId>`、`title` 变该文标题、`contenteditable` 结点到 4；★★ **不触发还原**（点完 `unsorted` 仍 3 条、`trash` 仍 15 条，逐字与点前一致）；☆ 页面上**没有任何"已删除／回收站"提示文案**（`innerText` 搜三个关键词为空）⇒ 复刻启示＝本地若照这个形状做，要自带横幅，否则用户以为在编辑、实际改的是已删副本。⚠ **未判定可否写入**＝我**没有**在已删文档里键入（属"改非本轮新建实体"禁区），这条如实留在"仍未采到"。
3. ★ **一次判废的合成点击**＝想点行左缘 `x+12` 进选择模式，结果命中 `<A>` 本身＝**导航**；复选框在静止态不出现（承"`+` 插入栏／拖拽手柄静止态不在 DOM"同族）⇒ 判为手法轮、不作官方结论；⇒ 教训复用：**回收站行整体是链接，任何"点行"操作都是打开文档**，想进选择模式必须找 hover 才出现的复选框。
4. ★★ **范围纪律（G992）**＝回收站 15 条＝**12 条具名 `QODER-HARVEST-*`** ＋ **3 条无标题**（`2db38d6b`／`d8af008b`／`73dc4026`）；前两条按"删除类授权先读回内容再动手"做了结构双证（`pageTitle` 空 ＋ 零子块），第三条是第 96 批·尾记十结案的孤儿；⇒ 但**"结构为空"≠"属本轮采集"** ⇒ **任何 purge 授权的覆盖面只有那 12 条具名沙盒**，且 `empty.trash` 语义是清空整个回收站 ⇒ **本批判为不执行**（不是做不到，是不该在含非授权项时做）。☆ 现状＝等 30 天自动清除；☆ 采集串**不污染**屏上任务面（第 97 批 G934 已证 UI 读侧不含回收站任务）。
5. ★★★ **深脱敏落地（用户点头的第①件）**＝`_harvest/sanitize-pii.mjs` 加了一条**全 UUID 掩码通路**：正则枚举手产物里的完整 UUID ⇒ **16 个不同 id／17 处**（此前口径"13 个"是更早的快照，本轮按实扫更正）逐一改写成稳定 token `<objId:1>`…`<objId:16>`，**逆向表写进 `_harvest/uuid-map.json`**（`git check-ignore -v` 复核＝由 `.gitignore:70` 的 `/docs/craft-ref/features/_harvest/` 覆盖 ⇒ 不入库）；后置断言改为**"产物内完整 UUID 残留 0 ＋ `<objId:N>` 标记确实落地"**，实跑 `SANITIZE OK`、`check-tables` 仍 `ALL TABLES CONSISTENT`、覆盖率 **1877/3639＝51.6%** 持平。⚠ **一条必须如实说的边界**＝掩码只影响**今后的 HEAD**；早先用户批准的那次提交（`963a442`）里**仍含当时的全量 id**，要彻底抹掉得重写历史 ⇒ **不在本次授权范围，需要单独点头**，本批没动。
6. ★★ **删除 `_harvest/pre-sanitize-bak/`（用户点头的第②件）**＝删前读回＝**26 个文件**（25 份产物 ＋ `feature-catalog.md`，共约 2.8 MB，时间戳 14:56＝上一轮脱敏前的副本）；★ 删前依赖检查＝先确认空间 id `3b788e8c-…` 完整值仍留在 **4 份项目记忆**里（`project-craft-official-model-facts`／`project-crafty-verification-env`／`project-crafty-screen-path-live`／`project-crafty-replica-progress`）⇒ 未来批次仍能用它调 MCP，**删掉这份副本不会自断通路**；删后复核＝目录不存在、`git status` 只列 8 份 modified 产物、**无被跟踪文件消失**（该目录本就被 `.gitignore` 排除）。
7. ☆ **提交（用户点头的第④件）**＝见本日志末尾"提交记录"一行；`git commit` 前跑齐三条校验并确认 `SANITIZE OK`。
8. ☆ **本段没做的事**＝没点任何"删除／清空"控件、没在已删文档里键入、没读 cookie／storage／token、产物 URL 一律剥 `?s=`、没重写 git 历史、没扩大任何授权范围。
9. **规模**：`gap.md` 981 → **984 条（最大 G992）**；`interactions.md`／`model.md`／`internals.md`／`longtail.md` **本段无新节**（原因如实写＝本段是通路可行性判定＋范围纪律，没有新的操作动线／模型字段／机制读数；G991 的开屏形状只到"结构"层且未证可写性，不足以支撑一节规格）；`features.md` 计数行刷新；`manifest.jsonl` **不追加**（零写入、零沙盒）。
10. **现场（本段结束时）**＝屏上回到 `/s/<空间名--spaceId>/all`；`unsorted` 3 条／`trash` 15 条（＝12 具名采集沙盒 ＋ 3 无标题，本轮**未清除、未还原、未新增**）；四角色计数 0；页内无注入属性与监听器（上段收尾已复核）；`_harvest/` 新增 `b98-drag-moved.png` ＋ `uuid-map.json`（两者均被忽略）。

### 第 99 批队列（尾记后刷新，覆盖上一版；只列增量与顺序调整）

1. ★★★ **找 `commands.empty.trash` 的屏上入口**＝命令面板与选中态工具栏两条候选；⚠ **只许"找到并读出"、不许触发**（回收站里有 3 条非授权项）⇒ 若要真的清，需要用户按"具名 12 条"重新点头，且先确认官方没有"仅清所选"的动词。
2. ★★★ 沿袭：连续两次拖拽是否被并入同一 undo 组（决定本地 `src/components/editor/Editor.tsx:265` 的 `newGroupDelay` 是否写死）＋ 跨 3 档长距离拖拽 ＋ 中心／边缘落点是否产生子级。手法照 `interactions.md V91` 第三节八步协议，需新沙盒 `QODER-HARVEST-B99-UNDOGROUP`。
3. ★★ **本地两条新裁项**＝① 本地 `src/actions/document/delete.ts:32` 的 `permanentDeleteDocument` 是**官方 web 侧本轮没有入口**的动词 ⇒ 判"保留并加二级确认"还是"移除"；② 本地回收站打开已删文档时是否要加"已删除"横幅（官方没有 ⇒ 若 1:1 就别加，但要说清风险）。
4. ★★ 其余 12 份 CSS 落盘（沿袭）。
5. ★★ 手柄 hover 态色值／暗档／compact 档手柄／幽灵 z-index（纯量测、零写入，沿袭）。
6. ☆ **待用户单独点头两件**＝是否重写 git 历史以抹掉 `963a442` 里的全量 id；是否登出一次采真访客态（破坏会话）。
7. ★☆ 开场第一条探针沿袭＝面板 hidden 时判绘制面能不能自唤——⚠ **`Shift`／`ShiftLeft`／`F13`／`Insert` 都不在连接器 `press_key` 的键白名单**（第 97 批开场实测＝G945"计划探针结构性不可执行"）⇒ 改用**有语义但当前无浮层可关**的键（如 `Escape`）或先 `list_pages`＋`take_snapshot` 判活；G943 已裁定"按键不自唤绘制面、真正闸门是 surface attached＋正视口"，本条只是把探针载体固定下来。
8. ★ **每批收尾自检**＝五份产物新节标题存在性 ＋ `grep -cE '^\| G[0-9]+ \|' gap.md`（本批实跑 **984**）＋ 三条校验 ＋ ★ 阶梯类／全量类结论必须 `new Set` 枚举手 ＋ ★ **新增一条**＝引用旧结论前先 `grep` 原文核对（本批我差点把"官方没有清空回收站"写死，是 G233 的 `commands.empty.trash` 拦住的＝"命名覆盖≠行为覆盖"的反向用法：**注册表里有的名字，也不能反推屏上入口存在或不存在**）。

## 第 98 批·尾记二（2026-09-29 23:3x 本地，**一次我自己引入又当场修掉的工具缺陷，如实留痕**）

1. ★★ **缺陷**＝给 `sanitize-pii.mjs` 加"全 UUID 掩码"时，我把"写逆向表 `uuid-map.json`"写成了**无条件覆盖** ⇒ 第一次跑出 16 条映射（正确），**第二次跑（收尾复核三条校验时）因为产物里已无完整 UUID，`idMap.size=0`，于是把逆向表覆写成 `[]`＝映射丢失**。⇒ 这是"幂等脚本的副作用文件被空结果覆盖"型缺陷，与既有纪律"`.replace()` 之后必须 `includes()` 断言"同族：**写文件之后也必须断言写进去的不是空**。
2. ★★ **修复两处**＝① 脚本改为 `idMap.size > 0 ? 写新表 : 原样回写旧表`（`sanitize-pii.mjs`，`writeFileSync` 那一行）；② 用 `_harvest/b98-rebuild-map.mjs` **从 git HEAD 的脱敏前文本重放同一次遍历**（`readdirSync('.md')` 顺序 ＋ first-seen 编号）重建映射，交叉核对＝HEAD 侧各文件 UUID 数＝工作树该文件 `<objId:N>` 数（gap 10／interactions 4／longtail 1／model 2，合计 17 处、去重 16 个）⇒ **无一条 MISMATCH**，逆向表已还原。☆ 重建脚本留在 `_harvest/`（被忽略）作证据。
3. ☆ **本段的三条校验终值**＝`ALL TABLES CONSISTENT`；`key-coverage` **1877/3639＝51.6%**（持平）；`sanitize-pii` → `files rewritten = 0/25, replacements = 0` ＋ `uuid masking: 0 distinct ids across 0 files`（＝幂等，不再改产物）＋ `SANITIZE OK`。★ **产物内完整 UUID 残留＝0**（`grep -oE` 复核）。
4. ☆ **提交前扫描**＝diff 里无空间 id、无账户姓名、无完整 UUID、无 JWT／Bearer、无本机路径；`_harvest/`（含 `uuid-map.json`、截图、批次日志）由 `.gitignore:70` 排除，**不入库**。

## 第 99 批（2026-09-29 23:4x–23:5x 本地＝UTC 15:4x–15:5x，**零写入、零沙盒、零偏好改动**＝队列第 1 项「找 `commands.empty.trash` 的屏上入口」结案）

1. ★★★ **入口定位成功**＝回收站屏右上 `⋯` ＝ `BUTTON[data-testid="browse-sort-button"]`（bounds `1106,60,28×28`）→ 展开 `[role=menu]._content_16nf6_9`（`874,96,260×88`，内含 `role=group:2` ＋ `role=menuitem:2`）＝两项：**「选择」**（`880,102,248×32`）＋ **「清空最近删除」**（`880,146,248×32`），两项**都不灰**、**都没有键位列**。⇒ ★ **上一批（第 98 批·尾记）那条"屏上无任何删除语义控件"就地作废**＝那次"可点项全量枚举手"只覆盖**静止态 DOM**，浮层内的项不在其中；已在 `gap.md` **G990** 加 ✎ 更正（判定列与"仍未采到"两处同改），并在 `gap.md` **§三点一〇四二** 的"仍未采到"首项标注结案指向 **G993**。⇒ ⚠ **按队列原文与铁律，全程只"找到并读出"、没有点「清空最近删除」**。
2. ★★★ **还有第二个动词，而且它是"范围正确"的那个**＝点「选择」进选择模式后，工具条出现两枚图标按钮＝**`Arrow Uturn Backward Icon`（还原所选，`912,64,20×20`）** ＋ **`Trash Slash Icon`（永久删除所选，`944,64,20×20`）** ⇒ **"精确只清那 12 条具名采集沙盒、放过 3 条无标题"从上一批的"通路不可行"改判为"通路可行"**（选中 12 行 → `Trash Slash`）。⚠ **本批未执行**：这是**不可逆**动作，且**上一批"都同意"里的第⑤件是"提前清除"的旧授权、历史授权一律不沿用** ⇒ 需要用户按"具名 12 条"重新单独点头。⇒ `interactions.md` **V92 §二／§四**（含一份可照抄的四步复测协议）。
3. ★★ **一条会造假阳性的新判据门槛**＝**静止态每行就恒有一个 `role=checkbox`**（回收站 15 行 ⇒ 15 个节点在场）⇒ **数 checkbox 判不了"是否进入选择模式"**；唯一有效判据＝工具条上的**「已选 N 项」文案**（进入模式立刻出现「已选 1 项」）。⇒ 与既有"_ghost_ 带同一个 `data-block-id`"（第 98 批）、"按前缀 grep 少数键"（第 96 批）同族＝**第四／五条"计数类判据不可用"清单**，已写进 `internals.md` §三十六 与 V92 §三。
4. ★★ **"进入即默认选中一项"是一个真实误删风险面**＝点「选择」后**没有任何一次点击**就已是「已选 1 项」，且全选框是**三态**（`SPAN[role=checkbox]` `822,65,18×18`，内层 `Minus Bold Icon`＝indeterminate）⇒ 用户随手再点一次「Trash Slash」就会永久删掉一行。⚠ **"已选 1 项到底是哪一行"未采到**（需要读该行样式态或截图对比，本批没做，挂在"仍未采到"）。⇒ 本地复刻启示＝**进入选择模式必须零选中**，或至少给"当前选中集"的可见清单。
5. ★★ **回收站卡片预览会渲染已删文档正文**＝三档（暗档／网格档／桌面档 `innerWidth:1154`）观察下卡片摘要带正文文本；☆ 顺手给第 97 批"块首 `Backspace` 合并 A4＋D1"补上**第二次独立印证**（预览里两条文本以合并形态出现）。⇒ 归入 `longtail.md` §二十二；⚠ **摘要到底是"删除时快照"还是"实时读"未分**（要改文档再看卡片才能裁，属禁区，不做）。
6. ★ **`data-testid` 属性名结案**＝官方用 **`data-testid`（无连字符）**，不是 `data-test-id`；本批第一次按 `[data-test-id=…]` 取到 `null` 并抛 `TypeError`，改双属性兜底选择器才命中 ⇒ 纪律：**查属性名要现场读回，不能按习惯拼**。☆ 另＝Craft 自有浮层**分两档**＝菜单类（`role=menu`／`group`／`menuitem` 齐）**有** ARIA、此前采的日期弹层／插入面板类**无** ARIA ⇒ 判"这是不是官方菜单"可读 `role`，判"浮层是否开着"仍要新增文案集＋`outerHTML` 长度。
7. ★ **`Escape` 两段行为**＝第一次关菜单、第二次退出选择模式（与第 96 批·尾记十二"面板级键不要求元素持焦"一致）；退出后 **`unsorted` 仍 3 条／`trash` 仍 15 条**，逐条 id 与进屏前相同 ⇒ **本批零数据变化**。☆ 命令面板通路本轮**不需要**（入口已在 ⋯ 菜单找到），故未尝试。
8. ★ **本地侧实扫**＝`src/components/document/TrashList.tsx`（70 行）**只接了 `restoreDocument`**（`:5` import、`:21` 调用、`:36` map），**没有多选、没有批量、没有永久删除入口**；`src/actions/document/delete.ts:32` `export async function permanentDeleteDocument(id: string)` **在全仓零调用点**＝**只有壳没真接线**（判定类别＝"缺失＋壳"双差分）。⇒ `gap.md` G999。
9. **规模**：`gap.md` 984 → **991 条（最大 G999，本段 ＋7）**；`interactions.md` **V92**；`internals.md` **§三十六**；`longtail.md` **§二十二**；★ **`model.md` 本段无新节**，原因如实写＝没有内容模型新字段（G997 的卡片摘要属**呈现层快照行为**，已归 `longtail`；块字段／实体关系零变化）；`features.md` 计数行刷新为 991／G999 ＋ 本批一句话摘要；★ **`manifest.jsonl` 不追加＝133 行不变**（零写入、零沙盒、零偏好改动）。☆ 三条校验实跑＝`ALL TABLES CONSISTENT`；`key-coverage` **1877/3639＝51.6%**（持平，本批除 `commands.empty.trash` 外未点名新 key）；`sanitize-pii` → `files rewritten = 0/25, replacements = 0` ＋ `uuid masking: 0` ＋ **`SANITIZE OK`**。
10. **本批没做的事**＝没点「清空最近删除」、没点 `Trash Slash`、没点「还原所选」的任何一次实际执行、没有在已删文档里键入、没改任何账户级偏好（暗档／网格档只是**读**既有态，未切档）、没读 cookie／storage／token、产物 URL 一律剥 `?s=`、没提交。☆ **现场（本段结束时）**＝屏上回到回收站静止态（`Escape` 已退出选择模式与菜单）；`unsorted` 3／`trash` 15（12 具名 ＋ 3 无标题，**未清、未还原、未新增**）；页内无注入属性与监听器残留。

### 第 100 批队列（**第 99 批上半段**后刷新；⚠ 已被本批·尾记版覆盖，见文件末尾同名小节）

1. ★★★ **待用户单独点头的一件**＝是否执行"选中 12 条具名 `QODER-HARVEST-*` → `Trash Slash` 永久删除"（**不可逆**、通路已在 V92 §四 固化；3 条无标题**不在范围**）。若不点头则维持现状＝等 30 天自动清除，本目录不再碰回收站。
2. ★★★ **撤销分组（上一批队列第 2 项顺延）**＝连续两次拖拽是否并入同一 undo 组（决定本地 `src/components/editor/Editor.tsx:265` 的 `newGroupDelay` 是否写死）＋ 跨 3 档长距离拖拽 ＋ 中心／边缘落点是否产生子级。手法照 `interactions.md V91` 第三节八步协议，需新沙盒 `QODER-HARVEST-B99-UNDOGROUP`。
3. ★★ **V92 的两条欠账**＝① "进入选择模式时已选的到底是哪一行"（读该行样式态或截图对比）② 全选框三态的**第三次点击**行为（indeterminate → 全选 → 还是全不选）；③ 零选中时两枚图标按钮是否变灰（本批进入即有 1 项选中，**没能构造零选中态**）。
4. ★★ **两条本地待裁项（继续挂着等用户定）**＝① `permanentDeleteDocument`（`src/actions/document/delete.ts:32`，零调用点）＝接进 UI 加二级确认 vs 移除；② 回收站打开已删文档是否加"已删除"横幅（官方无 ⇒ 1:1 就不加，但风险要写清）。
5. ★★ 其余 12 份 CSS 落盘（沿袭）＋ `_16nf6_` 家族其余类名与菜单色值／阴影几何（V92 只量了几何）。
6. ★★ 手柄 hover 态色值／暗档／compact 档手柄／幽灵 z-index（纯量测、零写入，沿袭）。
7. ☆ **待用户单独点头的另一件**＝是否重写 git 历史以抹掉 `963a442` 里的全量 id（现 HEAD 已掩码）。
8. ★ **每批收尾自检（沿袭并新增一条）**＝五份产物新节标题存在性 ＋ `grep -cE '^\| G[0-9]+ \|' gap.md`（本批实跑 **991**）＋ 三条校验 ＋ 阶梯类／全量类结论必须 `new Set` 枚举手 ＋ 引用旧结论前先 `grep` 原文核对 ＋ ★ **新立一条**＝"全量枚举"必须写明**覆盖范围是否含浮层内项**（本批推翻上一批的教训正是枚举只到静止态）；另＝**属性名／键名一律现场读回**（`data-testid` 一例）。

## 第 99 批·尾记（2026-09-30 00:0x–00:2x 本地＝UTC 16:0x–16:2x，★★★ **用户点头后执行了 12 条具名沙盒的永久删除＝本目录第一次跑不可逆动作**；`manifest.jsonl` 133 → **134 行**）

1. ★★★ **执行内容**＝回收站屏 ⋯ →「选择」→ 点全选（15）→ **逐条反选 3 条无标题**（滚动 → 重读 rect → `elementFromPoint` → 七连发）→ **闸门**读回 `chosen:12 / namedChosen:12 / untitledChosen:0 / notChosen=[3 无标题]` → 截图并核看 → 点 `Trash Slash`（`_variantPlainDanger_1bml7_*`）→ 确认框「**删除 12 个项目 你确定吗？你无法撤销此操作。**」→ 用**实时 rect** 定位「删除」（`658,327`）落刀。
2. ★★★ **五判据复核全部通过**＝① `documents list --location trash`＝**3**，逐 id＝保留集（`2db38d6b`／`d8af008b`／`73dc4026`）② `unsorted`＝**3 且逐 id 与执行前相同**（`Welcome to Craft` ＋ 两篇用户自己的文档，**零损失**）③ `reminders list --status all`＝0 ④ `search QODER-HARVEST`＝**No matches found** ⑤ **硬重载回收站屏**＝3 张卡片、标题全是「无标题文档」。⇒ 采"精确范围破坏"的判定链条闭合。
3. ★★★ **最有价值的行为事实＝永久删除连带抹掉任务行**＝`tasks list --scope all` **14 → 9**，消失的 5 条正是嵌在被删文档里的 `B96 T1/T3`／`B96B T1`／`B96D G1 task`／`B97 R3 task` ⇒ 与 G671（软删保留行且 API 仍返回）＋ G934（屏上任务面不显示）合成**三态完整对照**；⇒ 本地 `src/actions/task/task.ts:106/117` 的"只置空标题"在永久删路径下会留孤儿行（G1001，P1）。
4. ★★★ **给既有铁律加了一条例外（方向是更保守）**＝点掉 `Trash Slash` 后 `[role=dialog]`／`[role=alertdialog]`／卡片数／「已选 N 项」**三指纹同时"没变"**，按常规推定该判"点击静默失效 ⇒ 换通路重试"——**而在这里重试＝二次触发不可逆动作**。真相＝确认框零 ARIA（承 G622），**唯一信号是 `body.innerText` 多出「确定」「无法撤销」**。⇒ 新门槛＝**破坏性动作之后禁用"指纹没变⇒重试"推定，改按"新增文案集"判反馈**（G1003、`internals.md §三十七` 第 2 条）。☆ 我确实差点判废并换通路，是"搜文案"这一步救回来的。
5. ★★ **反选优于正选（协议级）**＝1 次全选 ＋ 3 次反选＝**4 次点击**，而逐行勾选 12 条＝12 次点击 ⇒ 误点面小 3 倍；★ 但**闸门不能只看「已选 N 项」的 N**，必须读回**选中集的标题前缀**（N 对得上而选错行完全可能）⇒ 协议八步固化在 `interactions.md` V93 第三节。
6. ★★ **坐标只在"单次读→单次用"内有效（同一次操作内就会漂）**＝全选框 mixed→true 时自身 x **822 → 815**（`Minus` vs `Checkmark` 图标宽度不同）；`scrollIntoView` 后卡片复选框 y 变；确认框「删除」按钮落刀前重取 rect。⇒ 已写进 `longtail.md §二十三` 第 2 条。
7. ★ **一条主动放弃的采集项（如实登记）**＝本可"选 1 项 → 开确认框 → 点取消"去读确认框按钮的 class 族／DOM 代际，但执行后屏上**只剩 3 条非授权文档** ⇒ 误点代价不可逆 ⇒ **判为不采**，留在"仍未采到"（G1007）。☆ 同因：`commands.empty.trash` 那条通路的确认框**今后也不该再点**（无差别清空会带走那 3 条）。
8. ☆ **通路成本**＝本段 12 次 `evaluate_script` ＋ 1 次 reload ＋ 2 张截图（都核看过）＋ 3 次 craft 读 ＋ **0 次 `press_key`／0 次 `ax.get()`／0 次 `cua`**；⚠ 全程未改任何账户级偏好（暗档／网格档是既有态，只读）。
9. **规模**：`gap.md` 991 → **1000 条（最大 G1008，本段 ＋9）**；`interactions.md` **V93**；`internals.md` **§三十七**；`longtail.md` **§二十三**；★ `model.md` 本段无新节（原因＝实体字段零变化，G1001 属级联行为、已归 interactions/gap）；`features.md` 计数行刷新为 1000／G1008 ＋ 本段摘要；★ **`manifest.jsonl` ＋1 条 `kind:"purge"`（133 → 134）**＝本段是写入批，与上半段"零写入不追加"的口径分别写清、不互相矛盾；☆ 就地 ✎ 三处＝V92 §二"确认框形态未采到"／V92 末"仍未采到"／`gap.md` §三点一〇四三 末"仍未采到"首项，全部改指 V93／G1002。
10. ☆ **三条校验实跑**（本段落盘后）＝见下一条命令输出记录（`check-tables`／`key-coverage`／`sanitize-pii`）。
11. ☆ **提交**＝按用户"提交"指令执行；提交前扫描＝diff 无空间 id／账户姓名／完整 UUID／`?s=`／JWT／本机路径，`_harvest/`（含两张截图与 `uuid-map.json`、manifest）由 `.gitignore` 排除不入库。

### 第 100 批队列（尾记后刷新，覆盖上一版）

1. ★★★ **撤销分组（顺延）**＝连续两次拖拽是否并入同一 undo 组（决定本地 `src/components/editor/Editor.tsx:265` 的 `newGroupDelay` 是否写死）＋ 跨 3 档长距离拖拽 ＋ 中心／边缘落点是否产生子级。手法照 `interactions.md V91` 第三节八步协议；⚠ **需要新沙盒 `QODER-HARVEST-B100-UNDOGROUP`＝写入批，按纪律要先拿到具名口头授权**（第 99 批的"执行"只覆盖回收站清除，不覆盖新建实体）。
2. ★★ **V92／V93 的三条欠账**＝① 三态全选框**第三次点击**去向（mixed→all→? ）② **零选中态**下 `Trash Slash`／`Arrow Uturn` 是否变灰（构造方法＝全选后逐条反选到 0，未试）③ 批量还原（`Arrow Uturn Backward`）动线；⚠ ③ 现在只能在**含 3 条非授权文档**的屏上做 ⇒ 选择模式类实验今后一律"只进不退、不点破坏按钮"，或先建沙盒再删（需授权）。
3. ★★ **本地两条待裁项（继续等用户定）**＝① `permanentDeleteDocument`（`src/actions/document/delete.ts:32`，零调用点）接线方式＝官方形状是"多选＋计数回显确认框"，本地 `TrashList.tsx` 目前只有单条还原；② 回收站打开已删文档是否加"已删除"横幅。
4. ★★ 其余 12 份 CSS 落盘（沿袭）＋ `_16nf6_`／`_1bml7_`／`_1fgll_` 三族其余类名与 variant 全集（本轮各只读到 2～3 个）。
5. ★★ 手柄 hover 态色值／暗档／compact 档手柄／幽灵 z-index（纯量测、零写入，沿袭）。
6. ★ **新课题（本段掉出来的）**＝确认框浮层本体属哪一代 DS（与 G622 的 `sc-wrwa8u-4 … FilledDanger` 是否同代）⇒ 只能在**有授权项可选**时采 ⇒ 与队列 1 合并到同一个沙盒批次做。
7. ☆ **待用户单独点头的另一件（沿袭）**＝是否重写 git 历史以抹掉 `963a442` 里的全量 id（现 HEAD 已掩码）。
8. ★ **每批收尾自检（沿袭＋本段新增两条）**＝五份产物新节标题存在性 ＋ `grep -cE '^\| G[0-9]+ \|' gap.md`（本段实跑 **1000**）＋ 三条校验 ＋ 阶梯类／全量类结论 `new Set` 枚举手 ＋ 引用旧结论先 grep 原文 ＋ "全量枚举"须写明是否含浮层内项 ＋ 属性名现场读回 ＋ ★ **本段新立两条**＝**破坏性动作之后禁用"指纹没变⇒重试"推定**；**坐标只在单次读→单次用内有效**。

## 第 100 批·上半（2026-09-30 00:3x–00:5x 本地＝UTC 16:3x–16:5x，**盘上样式批＝零浏览器调用、零写入、零沙盒**）

1. ★★★ **推翻自己上一条阶梯结论**＝`--red-*` 与 `--accent-blue-*` 各有 **18 档**（`-50…-900`，步长 50），其中 **`-50…-500` 是同一 RGB 的 alpha 阶**（6→100%）、**`-550…-900` 是不透明、逐档变暗的独立 RGB**（red `237 54 58`→`118 39 42`；accent-blue `44 103 217`→`34 60 111`，基色 `46 109 233`）⇒ ⚠ **G971 与 `styles.md §九.2` 的"`-600`～`-900` 在 accent 系里根本不存在"作废**（两处已就地 ✎，指向 G1009）；☆ 旧结论"`-950` 不存在"仍成立。⇒ **根因＝第 97 批那次只扫到 alpha 段就收手**，正是自检清单里"阶梯类必须 `new Set` 枚举手"的同型失误 ⇒ 自检再加一条＝**枚举手之后还要看"每段是不是同一种量纲"**。
2. ★★★ **`[data-whatintent]` 是 CSS 契约级机制**＝349 处消费；焦点环＝`[data-whatintent=keyboard] .X:focus`、悬停＝`[data-whatintent]:not([data-whatintent=touch]) .X:hover` ⇒ **官方不用 `:focus-visible`**，且"触屏无 hover"是**运行时判定**不是 `@media (hover:hover)`；☆ 与第 94 批静态读到的 `Npe` 触觉（`dataset.whatintent==="touch"` → `navigator.vibrate`）是**同一属性的两个消费者** ⇒ 写入点未定位（挂在未采到）。
3. ★★★ **DS 按钮规格全集**＝21 variant ＋ 3 size（`28/32/34px`，radius **7/8/9**，padding 只给横向，`--icon-height 18/20/22`，`--chevron-size 13/14/15`，gap `.125rem`）＋ 8 状态类（`isActive/isStatic/isHoverable/isOnlyIcon/isDropdown/hasIcon/fluid/nowrap`）；★ 关键底色逐字＝`variantFilled`＝`foreground-900 on foreground-100`（**4% 底**）、`variantFilledDanger`＝`red-500 on red-100`（**12% 底**）、`variantOutlined`＝**`box-shadow:inset 0 0 0 1px var(--foreground-200)` 当边框**（与第 97 批六位码面同族 ⇒ DS 通用做法）；★ **"只有图标"官方是状态类 `isOnlyIcon`（只改 padding），本地是四个尺寸档** ⇒ **建模轴不同，不是数量差**。
4. ★★ **禁用两道闸**＝`[data-disabled]{opacity:.4;cursor:default}`（**40%、`cursor:default` 不是 `not-allowed`**）＋ 所有反馈规则 `:not(._isStatic_1bml7_134,[data-disabled])`；⇒ 本地 `src/components/ui/button.tsx:6` 只有 `disabled:opacity-50`（**50% 且无 static 档**）⇒ 数值差可直接改。
5. ★★ **强调色主题＝恰好 6 档**＝`[data-accent=blue|pink|green|purple|yellow|gray]`，每档整体重指 18 条别名（两跳）⇒ 本地强调色面板应按这 6 个词建模，且别把色值直发给消费方。
6. ★ **工具层两条坑（值得固化）**＝① CSS Module 类名**自带前导下划线**，用不带 `_` 的形态去搜 `.`＋名字会**全部 NOT FOUND**（本轮第一次就踩了，10 个选择器全空）；② 36 个类名里 **33 个有独立基础规则、3 个只在组合选择器出现** ⇒ "搜不到基础规则"≠"没样式"。
7. ☆ **一屏四套 hash 族成员数**＝`1bml7` 36／`1j891` 21／`16nf6` **11**（含 `searchField`／`searchList` ⇒ 这套壳**疑似带搜索框的命令菜单**，标 `~` 未屏上验）／`1fgll` 3。
8. **规模**＝`gap.md` 1000 → **1009 条（最大 G1017）**；`styles.md` **§十一**；`internals.md` **§三十八**；`longtail.md` **§二十四**；★ `interactions.md`／`model.md` **本段无新节**（原因如实写＝盘上样式批，零操作动线、零实体字段）；`features.md` 计数行；★ **`manifest.jsonl` 不追加＝134 行不变**；☆ 新落盘证据＝`_harvest/b100-ds-button-1bml7.json`（36 类名＋33 基础规则，gitignored）。
9. ☆ **三条校验实跑**＝见下条。

### 第 100 批下半队列

1. ★★★ **撤销分组实验**（需新沙盒 `QODER-HARVEST-B100-UNDOGROUP`＝**写入批，要先拿具名口头授权**）。
2. ★★ 其余 **12 份 CSS 落盘**（含 `TaskViews.css`）＋ 暗档是否换表（`[data-theme]`）＋ `@layer utilities` 工具类全集。
3. ★★ `variant*` 的 `:active`／按下态逐条 ＋ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ 另四色（green/purple/yellow/gray）基色三元组。
4. ★ `[data-whatintent]` 的**写入点**（在哪个 chunk、判定规则、是否防抖）＋ `isStatic` 的赋值来源。
5. ★ 屏上验证 `16nf6` 壳是否真有搜索框（`~` 转正或作废）。
6. ☆ 待用户点头的两件（沿袭）＝是否重写 git 历史抹掉 `963a442` 全量 id；本地两条待裁项（`permanentDeleteDocument` 接线形状／回收站"已删除"横幅）。

## 第 100 批·下半（2026-09-30 01:0x–01:3x 本地＝UTC 17:0x–17:3x，★★★ **V91 协议补第 0 步＋两次拖拽的撤销异常**；沙盒 `QODER-HARVEST-B100-UNDOGROUP` 建→用→已软删）

1. ★★★ **通路纠错**＝连接器 `hover`（真鼠标移到元素中心）**驱动不了 Craft 的拖拽手柄**——手柄是**全页单例浮层**（`[draggable=true].sc-1iqnrwp-0`，父 `sc-1yfn40-0` rect 0×0，`closest([data-block-id])` 为 null），三次 hover 它一直停在 y=339；★ 正解＝往**左缘沟槽 x=340、目标行中心 y** 派发 `pointermove`＋`mousemove` ⇒ 手柄 y 依次 339→246→210→282 精确跟行（x 322→330）。⇒ **V91 八步协议加第 0 步**（写进 `interactions.md V94` 第一节）。☆ 顺带解释了两件事＝第 98 批"手柄↔行归属由真实鼠标位置决定"＋"从手柄反查块 id"不可靠。
2. ★★★ **两次拖拽的撤销回不到基线**＝基线 `U1 U2 U3 U4` → 拖 #1（U4→U1 中心）→ `U4 U1 U2 U3` → 拖 #2（U1→末块 U3 中心）→ `U4 U2 U1 U3`；随后在**焦点四判据齐**（`activeElement`＝U3 块 DIV／`hasFocus`／`rangeCount:1`／`anchorText:"U3 charlie"`）下按三次 `Ctrl+Z`＝**第 1 次零变化、第 2 次改序成 `U1 U3 U4 U2`、第 3 次零变化**；★ **reload 后仍是 `U1 U3 U4 U2`**（撤销落到了服务端态）。⇒ 口径＝**"两次拖拽＝两步逐条逆回"在本轮不成立，步数判为未定**（存在"送达但无变化"的按键＝撤销栈里有不改变块序列的条目），**不得写成官方撤销坏了**；与 §十八 `vQ` 每块去重＋`patchIndex` 可落空洞的读法咬合。
3. ★★ **中心落点＝插到目标之前**（第 2 次独立复现，且新增"拖到**最后一块**中心仍插其前、不是插后"一例）；☆ 全程四块始终平级 ⇒ 中心落点≠嵌套（第 2 次印证）；⇒ 下批做上缘／下缘分档时**别再用行中心**，要取上 1/4／下 1/4。
4. ★ **两条工具事实**＝`hover` 打在 StaticText 节点直接 `TypeError: this.scrollIntoView is not a function`（只能对元素级节点用）；`take_snapshot` **不收任何参数**（传 `includeSnapshot` 被 schema 拒）。
5. ☆ **本地判定**＝本地手柄是**每块渲染**（`src/components/editor/drag-handle/DragHandle.tsx`）⇒ 不复现归属漂移；本地撤销是**严格 LIFO**（`Editor.tsx:265` ＋ 单 tr）⇒ 与本轮官方观察方向不同 ⇒ 登记**有意偏差候选**，且**队列里"`newGroupDelay` 是否写死"这条先别动**（官方连逆序都不保证，分组概念对拖拽可能不适用）。
6. **规模**＝`gap.md` 1009 → **1015 条（最大 G1023）**；`interactions.md` **V94**；`internals.md` **§三十九**；`longtail.md` **§二十五**；`model.md`／`styles.md` 无新节（原因已写）；`features.md` 计数行；★ **`manifest.jsonl` 135 → 136**（建＋还原各 1 条）。
7. **现场**＝`unsorted` 3 条逐 id 与基线相同／`trash` **4**（3 条无标题＋本沙盒）／`reminders` 0／`tasks(all)` 9 无 QODER 行；页内注入属性随沙盒删除消失，**无残留**；⚠ **本沙盒现在是回收站里第 4 条具名项**＝要不要按 V93 协议精确永久清除，需单独点头（历史授权不沿用）。

### 第 101 批队列

1. ★★★ **拖拽落点分档**＝目标行**上 1/4 与下 1/4** 两档落点是否分别产生 `before`／`after`，以及是否出现**嵌套**（协议＝V94 第 0 步起手的修订版；需新沙盒，具名授权）。
2. ★★★ **撤销步数的正确测法**＝**每次拖完立刻单独按一次 `Ctrl+Z` 并读回**，逐对确认（本轮"连按三次"的测法已被证伪）。
3. ★★ 其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集（盘上批，零授权）。
4. ★★ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组（盘上批）。
5. ★ `[data-whatintent]` 写入点定位（盘上反编译，零授权）。
6. ★ 屏上验证 `16nf6` 壳是否真有搜索框（把 `~` 转正或作废）。
7. ☆ 待用户点头三件＝是否精确清除回收站里那条新沙盒（不可逆）／是否重写 `feature/windows-offline-sync` 分支以抹掉 `screens.md`＋`styles/*.json` 的历史残留（该分支在另一个 worktree）／本地两条待裁项的实施。

### 第 101 批日志（2026-09-30 09:0x–09:4x 本地＝UTC 01:0x–01:4x，★★ 写入批：1 次不可逆永久删除＋1 个沙盒建删）

**开场**：上一轮遗留三件事全部由用户"全部同意"覆盖＝① 提交本地实现 ② 精确清除 `QODER-HARVEST-B100-UNDOGROUP` ③ 继续推进。执行顺序＝先提交（`60cc5fc Wire the permanent-delete action behind a trash selection mode`，2 文件 ＋180/−15）→ 再清除 → 再采集。

**一、精确清除（V93 §三 协议第二次跑，规模从 12 降到 1）**

1. ★★★ **开场就撞上一条权威态造假**：`documents list --location trash` 回 **12 条**（含 `Quick Start: get going`／`Craft Handbook`／`Welcome to Craft`／`Watch: how to videos`／`2025/5/5` ＋ 6 条无标题 ＋ 我们的沙盒），而屏上「最近删除」只有 **4 行**。硬证＝`Welcome to Craft` 同时出现在 `--location unsorted` 的 3 条里 ⇒ **MCP 的 trash 列表会泄漏非回收站条目**；执行后 trash 立刻回落到 **3 条＝屏上行数**。⇒ **V93 第 0 步"以 MCP 列表取权威 id 集"就地作废**，改为"MCP 列表 ＋ 屏上具名 ＋ `unsorted` 三方交叉"。
2. ★★ **协议按规模分叉**：1 项授权 vs 11 项必留 ⇒ 走"默认选中＋逐条核对"而不是"全选→反选 11 条"，**点击次数从 12 降到 0**（进选择模式后默认选中的就是首张＝我们的沙盒，因为回收站按删除时间倒序）。⚠ 这条便利**只在授权项恰为最近删除时成立**，V93 的"首张非授权＝误删起点"风险没有消失。
3. ★★ **闸门实现细节新增一条**：屏上是 **3 列网格**（卡片 `265×331`，行内复选框 `x=536/820/1105` 同一 `y`）⇒ **不能按 DOM 顺序把 checkbox 列表对到卡片列表**，必须按 **rect 包含**（复选框中心是否落在卡片 rect 内）配对标题。本轮读回＝`chosenCount:1`／`chosen:["QODER-HARVEST-B100-UNDOGROUP"]`／`untitledChosen:0`／`allChosenAreOurs:true`。
4. ★ **G1003 那条"零 ARIA ⇒ 严禁按 role 判、严禁判废重试"第二次命中**：点危险按钮后 `role=dialog`／`alertdialog` 仍 **0**、卡片数与「已选 1 项」都没变，**唯一信号是新增文案**「删除 1 个项目」＋「你确定吗？你无法撤销此操作。」＋「取消」。本轮按文案判定 ⇒ 没有误判成静默失效、没有二次触发。
5. ★★ **G1007 结案**：确认框「删除」按钮 class＝`sc-wrwa8u-4 bdLahy sc-1bl4h28-1 kvoRFL FilledDanger`＝**styled-components 族＋语义后缀**，而工具栏危险按钮＝`_button_1bml7_1 _variantPlainDanger_1bml7_165 _sizeMd_1bml7_*`＝**CSS Modules hash 族** ⇒ **同屏两套按钮体系**；确认框两枚按钮 rect 与第 99 批**逐字一致**（`419,311,154×32`／`581,311,154×32`）。
6. ★★ **G242 就地 ✎ 更正**：回收站屏 ⋯ 菜单实测 **2 项**＝「选择」＋「清空最近删除」（原记"只有一项「清空最近删除」"）。⚠ 「清空最近删除」＝整站清空语义，全程未点。
7. ★★ **回收站路由两形**：站内 `a[href]` 指向 `/s/<空间名--spaceId>/f/trash` ⇒ 主区渲染**「文件夹已删除」空态**（正文 139 字符、0 卡片）；可用屏＝`/s/<空间名--spaceId>/trash`（**无 `f/`**）。⇒ 官方侧栏链接与回收站屏不同命名套；本地是全局 `/trash`（`src/app/(app)/trash/`），**不要照抄 `f/` 这一形**。
8. ★★★ **五判据全过**＝① 屏 3 行全部「无标题文档」、`ourTitlePresent:false` ② `unsorted` 3 条逐 id 未动 ③ `reminders` 0 ④ `search QODER-HARVEST` **No matches** ⑤ 硬重载后仍 3 行、且 `trash` 计数从 12 回落到 3（泄漏条目一并消失）。☆ 新形态＝硬重载后行上仍留 3 个 `role=checkbox` 但工具栏无「已选」计数 ⇒ 选择模式工具栏与行内复选框不是同一开关（未深采）。
9. ★ **一条意外的交叉验证**：前态截图里该沙盒卡片的预览文本是 `U1 alpha／U3 charlie／U4 delta／U2 bravo`＝**第 100 批撤销实验的终态顺序** ⇒ 回收站卡片预览渲染的是文档**当前**正文（`model.md §一之五十九.4`）。

**二、拖拽通路本轮不可复现（第七条仪器边界）**

10. ★★★ 按 V94 协议连打 **4 次** 连接器 `drag`（含"挂柄后立刻拖"与"清掉块上临时属性再拖"两种变体），**全部返回成功但模型零变化**。capture-phase 计数器给出决定性证据：`pointerdown:342,389:IMG` → `pointerup:685,187:DIV`（坐标全对），但 `dragstart`／`dragenter`／`dragover`／`drop`／`dragend` **零条**。排除项＝遮挡（`visibilityState:visible`＋`hasFocus:true`）、uid 失效（手柄 rect 实测随沟槽 `pointermove` 跳到 `330,374`＝V4 行、`aria-label` 跨调用保留＝**单例节点复用再获一证**）、临时属性干扰（清掉后仍零事件）。⇒ **唯一未排除的假设＝CDP 注入的鼠标序列不触发 HTML5 拖拽**（而第 100 批成功那两次可能有未记录的前置条件）。⇒ **V94 的 G1019／G1020 两条读数就地降级为"单次观测、本轮未复现"**；⚠ 表述纪律：只能写"本通路对本页不可复现"，**不得**写"官方不支持程序化拖拽"。
11. ★★ **OS 级坐标通路已标定但按成本闸停手**＝`computer-use` 每次坐标动作前必须重新 `get_window_state` 绑图（否则 `screenshot_stale`）；换算式（单点自洽验证）＝**image = ((440 + css_x) / 1.0913, (196 + css_y) / 1.0913)**，推导链＝窗口 bounds 1550×838 ↔ 截图 1420×768 ＋ dpr 1.25 ＋ 视口原点 css→screen (433,189)。⇒ 落点 y 带**不是做不到，是每次动作都要吃一张整窗截图**。
12. ★★ **一条反向证据值得记**：在已加载的 56 个 JS 资源里，主包 `index-DiTmKH3z.js`（6,841,180 字符）内 `data-block-id` 只有 **8 处**、**无一邻近 `clientY`**；`"into"`／`"child"` 位置字面量 **0 次**；能搜到的 `clientY` 数学属于画廊（水平二分 `to < left + width/2 ? "left":"right"`）与卡片倾斜／白板（`(clientY-top)/height` 归一化）。⇒ **官方正文块落点很可能按"命中哪个 DOM 元素"判定，而不是"点在行的哪一段"** ⇒ 把"落到子块＝嵌套"升为首选假说。⚠ 这是"搜不到"不是"不存在"。

**三、键盘移动通路（队列②结掉）**

13. ★★★ `Alt+ArrowUp` **生效**：`V1,V2,V3,V4` → **`V2,V3,V1,V4`**（`blocks get --format markdown` 权威复核，扁平无嵌套、4 个块 id 恒定）。随后 **一次** `Ctrl+Z` 精确回到基线、**一次** `Ctrl+Shift+Z` 精确回到改序态 ⇒ **一次移动＝一步撤销＝一步重做**，且这次用的是"单操作＋单按键＋逐次回读"的正确测法（第 100 批"两次拖拽后连按三次"已被证伪）。⇒ 队列②**结案**。
14. ⚠ **一条异常未解、不写成结论**＝一次 `Alt+↑` 产生 **2 位位移**（V1 索引 0→2），不是"上移一格"；两种解释（多块选择被整体移动／键被重复投递）都没有读数支撑，因为读不到选择范围。
15. ★ **推翻一条既有判据**＝`document.getSelection().rangeCount` 全程 **0**（连接器点击与 7 连发都命中块 DIV、`activeElement`＝编辑器 DIV、`hasFocus:true`，键盘命令照样生效）⇒ **V94 第 5 步"撤销前必须先补到 `rangeCount:1`"在本页不成立**，改为"读 `hasFocus` ＋ 用一次可观测的改序证明键路通"。
16. ★★ **本地实扫掉出一条 P1 缺失**＝本地**完全没有**键盘移动块的命令：`src/components/editor/**` 只有三处 `ArrowUp`，全是菜单内导航（`extensions/block-link-menu.tsx:121`、`extensions/emoji-suggestion.tsx:106`、`slash-menu/SlashCommandExtension.ts:85`），而官方有 4 条（`Alt-↑ Alt-↓ Alt-⤒ Alt-⤓`，第 98 批从文档「动作」子页签二方对照拿到）。
17. ★ **块 DOM 分层首次全量读回**＝`[data-block-id]` 之下五层：左沟槽 `sc-cyjsqg-0`（`228,171,250,28`＝**正文左缘外扩 130px**）、文本 `sc-3a69oq-1`（`358,175,654,23`）、整行 `sc-1fwvj4a-1`（`352,173,666,28`）、右沟槽 `sc-cyjsqg-1`（`892,171,250,28`）、0×0 portal `sc-1fwvj4a-2`。⇒ 官方热区是**整条 250px 沟槽**，手柄只是浮出来的视觉。
18. ★★★ **几何两条不要混用**＝块内换行 **行高 24px**（长文本块 `654×120`＝5 行）vs 块间 **pitch 36px**（第 100 批只记了后者）；另把"正文宽 654／整行 666"两种口径写清（第 100 批记的 670 未注明是哪一层）。

**四、还原与卫生**

19. ☆ 沙盒 `QODER-HARVEST-B101-DROPOFFSET`（1 文档＋4 块，V2 特制 120px 长文本行）建→用→**软删还原**；临时 `aria-label/role/tabindex` 全部移除并复核 **leftover:0**（手柄原生 `draggable=true` 未动）；残留三连＝`unsorted` 3 条逐 id 未动／`reminders` 0／`tasks --scope all` 9 条持平。`manifest.jsonl` 136 → **138 行**（1 条 `kind:"purge"` ＋ 1 条 `kind:"create"`）。
20. ☆ **候选更正未采信**＝侧栏底栏 4 枚按钮在 a11y 树具名（`Desktop`／`Square And Arrow Down`／`Person3 Fill`／**`Trash Icon`**），怀疑 **G244"回收站有屏无入口"要更正**；但按 `aria-label` 前缀查 DOM 未命中（名称疑在内层 SVG）、合成点击无法确认跳转目标 ⇒ **未证，本轮不改 G244**，挂下一批。
21. ☆ 消耗≈20 次 `evaluate_script`＋5 次连接器点击/拖拽＋3 次 `press_key`＋2 次导航＋1 次 reload＋2 张页面截图（都核看过）＋1 张整窗截图＋1 次 OS 点击＋6 次 craft 读。

### 第 102 批队列

1. ★★★ **落点分档改走 OS 通路**＝用 §11 的换算式打 `computer-use drag`（每次坐标动作前先 `get_window_state` 绑图），采 V4→V2 的**上 1/4 / 中心 / 下 1/4** 三档落点结果；同时验**落到子块＝嵌套**假说（先造 1 父 2 子结构）。⚠ 若 OS 通路仍零 `dragstart` ⇒ 第七条仪器边界正式封口，把"拖拽落点"整域改判为**永久不可采**并从队列删除。
2. ★★★ **`Alt+↑` 2 位位移归因**＝先造 5 块、把光标显式放到**中间某块**（用 `blocks get --format json` 读不回光标 ⇒ 改用"按一次看一次"的逐档对照），再判"多块选择"还是"键重复"；顺带采 `Alt+↓／Alt+⤒／Alt+⤓` 三条。
3. ★★ **G244 复核**＝在编辑器屏用 `take_snapshot` 找到侧栏 `Trash Icon` 那枚的 uid、读它的 DOM 归属与点击结果 ⇒ 要么转正"官方有入口"，要么坐实"有图标无跳转"。
4. ★★ **V94 拖拽读数的复现条件**＝先做一次 OS 级 `hover`（真鼠标进沟槽）再打连接器 `drag`，看能否复现第 100 批的改序 ⇒ 决定 G1019／G1020 是恢复还是永久作废。
5. ★★ 其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集（盘上批，零授权）。
6. ★★ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组（盘上批）。
7. ★ `[data-whatintent]` 写入点定位（盘上反编译，零授权）；★ 屏上验证 `16nf6` 壳是否真有搜索框。
8. ★ **本地两条待裁项**＝① 回收站屏是否要显示正文预览（`src/actions/document/get.ts:70` 的读侧目前是否带子块内容＝本轮未读）② 键盘移动块命令（官方 4 条 vs 本地 0 条）要不要补 ＋ `Editor.tsx:265` 的 `newGroupDelay` 是否写死。
9. ☆ 待用户点头＝回收站里现在躺着 `QODER-HARVEST-B101-DROPOFFSET`（1 条具名项），要不要按 V93 协议精确永久清除（不可逆，历史授权不沿用）。

### 第 102 批日志（2026-09-30 10:1x–10:5x 本地＝UTC 02:1x–02:5x，★★ 写入批＝1 次不可逆永久删除＋1 个沙盒建删；★ 本目录第一次跑通 OS 级拖拽）

**开场**：用户"全部同意"覆盖三件＝提交第 101 批产物／精确清除 `B101-DROPOFFSET`／继续推进。执行序＝提交（`54ec57e`）→ 清除 → 建沙盒 `QODER-HARVEST-B102-BANDS` → OS 拖拽四枪。

**一、精确清除第三次（V93 §三 ＋ V95 修正）**

1. ★★ **本轮 `documents list --location trash` 回 4 条＝屏上 4 行（无泄漏）** ⇒ 第 101 批那条"泄漏 8 条"是**偶发形态**，不是稳定缺陷；但"三方交叉（MCP ＋ 屏上具名 ＋ `unsorted`）"继续执行，成本 1 条读命令。
2. ★★★ **撞出一条新纪律＝视口会跨批漂移**：CSS 视口从 1154×578 缩到 **991×558**，根因＝宿主窗口取消最大化（bounds `1550×838 @ −7,−7` → `1336×811 @ 100,11`）⇒ **历次硬编码坐标全部作废**。我按旧坐标打 ⋯ 得到 `elementFromPoint → null`（`NO-EL`），改点后一发**误中顶栏按钮** ⇒ 立刻用"四计数复核"自查＝`menu/dialog/listbox/group` 全 0、**零残留**，再按类名（`Plain MediumSmall`）现取锚点成功。**⇒ 纪律补一条：每批开场先读 `innerWidth/Height` ＋ 锚点一律按类名/几何现取，禁止复用上一批 x/y。**
3. ★★ 闸门按 **rect 包含**配对标题（卡片是 3 列网格，DOM 序≠视觉序）＝`chosenCount:1`／`chosen:["QODER-HARVEST-B101-DROPOFFSET"]`／`untitledChosen:0`；确认框仍零 ARIA（`role=dialog` 0）⇒ **按新增文案判**（第三次命中）；计数回显「删除 1 个项目」＝闸门数；落刀用实时 rect（`500,301,154×32`，比上批左移 81px＝视口所致）。
4. ★ 五判据全过＝屏 3 行全「无标题文档」／`unsorted` 3 条逐 id 未动／`reminders` 0／`search QODER-HARVEST` 无命中／硬重载仍 3 行。☆ 截图 `_harvest/b102-purge-selected.png` 已核看（图里顺带读到该卡片预览文本＝第 101 批 redo 后的 `V2,V3,V1,V4` 顺序 ⇒ 回收站预览随当前序列，再获一例）。

**二、OS 级拖拽通路打通（本目录第一次）**

5. ★★★ **`computer-use.drag` 触发可信拖拽**＝`dragstart:T` → `dragenter`×2 → `dragover`×100＋ → `drop:T:p`（`isTrusted:true` ＋ 被 `preventDefault`）⇒ **第 101 批"本通路对本页不可复现"的定性作废**，真因收窄为一条仪器边界＝**CDP 注入的鼠标序列不发起 HTML5 拖拽**（G1037）。⇒ **拖拽域重新可采**，代价＝每次坐标动作要一张整窗截图。
6. ★★★ **落点三档一次采齐**（目标＝120px 高的长文本块 C2，源块每次不同以避开"原位无变化"歧义）＝**上 1/4 → 插到目标之前**、**中心 → 插到目标之前**、**下 1/4 → 插到目标之后**；三枪都能被"移除源块 → 按目标带插入"这个单步模型精确复算（逐次与 `blocks get --format markdown` 对账）。⇒ **官方只有 before/after 两档语义，边界在 (50%, 87.5%] 之间**；本地阈值是恰好 50%（`src/components/editor/drag-handle/DragHandle.tsx:133`）⇒ **该区间内会分歧，边界未钉死**。
7. ★★★ **拖拽全程不产生嵌套**＝四枪 × 三种源块，序列始终是一层四个兄弟块 ⇒ **"落到子块＝嵌套"这条我自己提的首选假说被否**（限定：本轮沙盒是扁平的，未测"目标真有子块"的情形）。
8. ★★ **臂柄方式改判**＝合成 `pointermove` 臂柄在**一次真拖拽之后失效**（手柄卡在原行、`elementFromPoint` 命中的确是沟槽 DIV，但手柄不动）⇒ 改法＝**让 OS 拖拽起手的真 `mouse.move` 自己臂柄**（`from` 打源块行的沟槽中心＝正文左缘 −18），本轮 3 次全成功。
9. ⚠ **第 4 枪异常＝"双对交换"的非单位移**：`[C4,C3,C2,C1]` → `[C3,C4,C1,C2]`（(C4,C3) 与 (C2,C1) 两处同时交换），任何单步移除-插入推不出；`drop` 只发 1 次 ⇒ **不是重复触发**。⇒ 与第 101 批"一次 `Alt+↑` 位移 2 格"**同族** ⇒ **假说：官方移动操作的选择集跨操作累积**（bundle 里 provider 返回 `{canReorder, draggedIds, dropIndicator, onHover, clearDropIndicator, ...}`，**有 `clearDropIndicator` 而无 `clearDraggedIds`**）；未证，登记为第 103 批首项。
10. ★★ **两条仪器踩坑（都会让人误判"换算式错了"）**＝① **肉眼读返回截图里的像素位置不可靠**（我据此以为预测偏了 160px，实际两次都对到 1px 内）② **只有 `include_screenshot:true` 的 `get_window_state` 才建立坐标绑定**，text-only 刷新不顶用。换算式（当前布局）＝**`image = ((css_x + 333) / 1.056, (css_y + 178) / 1.056)`**，推导链＝工具自报 `screenX/screenY` ＋ 页内日志器读到的真实 css ⇒ `css = screen − (433,189)`。
11. ★ **`dragover` 一次拖拽发 100＋ 次** ⇒ 判"命中哪个块"不能数事件，只能在 `dragover` 里读 `e.target`（本轮未采）。

**三、还原与卫生**

12. ☆ 沙盒 `QODER-HARVEST-B102-BANDS`（1 文档＋4 块）建→4 枪拖拽→**软删还原**；残留三连＝`unsorted` 3 条逐 id 未动／`reminders` 0／`trash` 4 条（3 无标题＋本沙盒）。页内注入的 9 个监听器随页面销毁消失（未显式卸载，⚠ 不是产品事实）。
13. ☆ 本轮**未改本地代码**＝G1034 的阈值差只登记，等 before/after 边界钉死再动（避免凭 (50%,87.5%] 的区间瞎调）。
14. ☆ 消耗＝4 张整窗截图＋4 次 OS 拖拽＋2 次 OS 点击＋约 12 次 `evaluate_script`＋1 次误点自纠＋6 次 craft 读；`manifest.jsonl` 138 → **141 行**。

### 第 103 批队列

1. ★★★ **钉死 before/after 边界**＝**全新沙盒、零前序操作**，目标用 120px 长块，从中心起按 55%／62.5%／70%／75% 逐步二分（每枪都要先看是否仍是单步形状）⇒ 直接决定本地 `DragHandle.tsx:133` 的阈值该写多少。
2. ★★★ **D 枪"双对交换"归因**＝在全新沙盒里第一枪就打 3/4 落点（排除累积前序）⇒ 若第一枪就出现多位移 ⇒ 官方落点逻辑本身有第二种形状；若正常 ⇒ 坐实"选择集累积"，继续查 `draggedIds` 清理点。
3. ★★ **目标真有子块时的落点**＝造 1 父 2 子结构，拖外部块落到**子块**上 ⇒ 验"是否只产生 before/after、会不会改变层级"（本轮否掉 `into` 只覆盖扁平情形）。
4. ★★ **`dragover` 期间读 `e.target`**＝采"命中判定用的是哪一层 DOM"（正文 DIV／沟槽／整行层），补 G1034 的实现细节。
5. ★★ 其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集（盘上批，零授权）。
6. ★★ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组（盘上批）。
7. ★ `[data-whatintent]` 写入点定位；★ 屏上验证 `16nf6` 壳是否真有搜索框；★ G244 复核（侧栏 `Trash Icon` 那枚的真实跳转）。
8. ★ 本地两条待裁项＝回收站屏是否显示正文预览（`src/actions/document/get.ts:70` 读侧是否带子块）／键盘移动块命令（官方 4 条 vs 本地 0 条）＋ `Editor.tsx:265` 的 `newGroupDelay`。
9. ☆ 待用户点头＝回收站里现在躺着 `QODER-HARVEST-B102-BANDS`（1 条具名项），要不要按 V93 协议精确永久清除（不可逆，历史授权不沿用）。

### 第 103 批日志（2026-09-30 10:5x–11:3x 本地＝UTC 02:5x–03:3x，★★ 写入批＝1 次不可逆永久删除＋1 个沙盒建删；★ 落点边界钉死＝本目录第一次把一条行为结论收敛到 1px）

**开场**：用户"全部同意"打包覆盖三件＝提交第 102 批产物（`35e6594`）→ 精确清除 `B102-BANDS`（具名点头）→ 继续推进第 103 批队列。执行序＝清除 → 建沙盒 `QODER-HARVEST-B103-BOUNDARY` → 4 枪 OS 二分 → 软删 → 落盘。

**一、第四次精确清除（`B102-BANDS`，1 项规模；前三次＝12 项／`B100`／`B101`）**

1. ★★★ **V93 协议第三次按 1 项规模复用、页内调用降到 4 次**＝⋯ →「选择」→ rect 包含闸门（`chosenCount:1`／`untitledChosen:0`）→ 按新增文案判确认框（`role=dialog` 仍 0）→「删除 1 个项目」→ 实时 rect 落刀 → 五判据全过（屏 3 行全「无标题文档」／`unsorted` 3 条逐 id 未动／`reminders` 0／`search QODER-HARVEST` 无命中／**硬重载**仍 3 行）。
2. ★ **又踩一次锚点歧义，且这次是"多义命中"**＝视口仍是 991×558，类名正则 `/Plain MediumSmall|has/` 命中 **3 枚按钮**，取第一枚打偏 ⇒ 菜单没开、`role=menuitem:0` ＝ **静默失效正例**（按铁律没有判成"官方没有 ⋯ 菜单"，也**没有**在不可逆动作后换通路重试，四计数复核 0＝零损害）。改法＝**取 x 最大的一枚 ＋ 回读 `role=menuitem` 非空**才算成功。⚠ 上一批的同名坑是硬编码坐标 `NO-EL`，这次是命中集合变大 ⇒ **两条都要写进协议**：坐标一律现读、锚点必须回读结果判据。

**二、落点边界二分（队列 1＋2 一并结案）**

3. ★★★ **边界＝恰好块中线，正中点归「插到目标之前」**＝靶块 D2 整行 `[345,209,505,120]` ⇒ 中线 css y **269**；四枪 299（75.0%）／285（62.5%）／277（56.7%）／**270（50.8%）全部判 after**，加上第 102 批的 269（50.0%）判 before ⇒ **边界实测落在 (269, 270]** ⇒ 规则只有 `after 要求 clientY > top + height/2`（严格大于），**三批 8 个点全被一条规则解释**。⇒ 本地差异收缩为**一个比较符的等号归属**＝`src/components/editor/drag-handle/DragHandle.tsx:133` `<` → `<=`（1 字符，本轮**未改**，等用户点头）。
4. ★★★ **队列 2「双对交换归因」结案为未复现**＝全新沙盒连打 4 枪，每枪都是干净的"移除源块→按目标带插入"单步移动，`dragstart`／`drop` 各 4 次（一枪一次）⇒ **"选择集跨操作累积"假说降为偶发未证**（不是被否证：本批前序形状与第 102 批相同＝也是跨源块拖拽，却 0/4 命中预测 ⇒ 更可能是那一次撞上预览重排的中间态）。⇒ **本地不要为它加防御代码**；G1036 已就地 ✎。
5. ★★ **落点参考系弱证＝整行 rect**＝整行中线 269、内层文本层中线 268.5；实测 269 判 before ⇒ 若参考文本层则 269 已越线应判 after ⇒ 矛盾。⚠ **弱证**＝单块单次、未做交叉块复验。
6. ★★ **一条统一解释（自我纠正三批口径）**＝28px 短行的"中心"就是它的正中点 ⇒ 第 100／101／102 批在短行上采到的"中心＝插到其前"**本来就是中线规则的必然结果**，不是另一种落点档；⇒ **本目录连续三批把同一件事当独立结论登记**，今后只写一条（G1045）。
7. ★★ **二分协议本身入库**（G1046／V97 §一）＝① 靶块必须 ≥100px（短行带宽分辨不出）② 源块与目标**相隔 ≥2 位**（相邻时两种结果必有一种"看起来没变"）③ 每枪前重读几何 ④ 每枪后先判是否仍为单步形状，是才拿去更新边界。

**三、仪器与还原**

8. ★ **OS 拖拽自己就会挂手柄**＝首个真实 `mouse.move` 即把单例浮层手柄挂到目标行（本批 4/4）⇒ 第 100 批的"往左缘沟槽派发合成 `pointermove`"第 0 步在真拖通路下**不再需要**；且**真拖过一次之后合成沟槽 `pointermove` 反而失效**（手柄卡 y=374）⇒ 两条通路互斥，别混用。
9. ☆ **换算式跨批复用有效**＝`image = ((css_x+333)/1.056, (css_y+178)/1.056)`，四枪的 `from=(625,535)`＝css `(327,387)`＝源块行沟槽中心，`pointerdown` 每次都精确落此点；⚠ **前提＝窗口布局不变**（bounds／截图尺寸／dpr／视口四项常数一旦漂移必须重标）。
10. ☆ 沙盒 `QODER-HARVEST-B103-BOUNDARY`（1 文档＋4 块，rootBlockId `38f384e7-612a-8671-1c6a-6af51df93031`）建→4 枪→**软删还原**；残留三连＝`unsorted` 3 条逐 id 未动／`reminders` 0／`trash` 4 条（3 无标题＋本沙盒）；`documents list --location trash` 与屏上**逐条一致（无泄漏）**＝连续第二批一致。
11. ☆ 本轮**未改本地代码**（边界已钉死，1 字符改法就差一句点头）；消耗＝4 张整窗截图＋4 次 OS 拖拽＋约 8 次 `evaluate_script`＋1 次导航＋1 次 reload＋4 次 craft 读＋清除动线 4 次页内调用；`manifest.jsonl` 141 → **144 行**。

### 第 104 批队列

1. ★★★ **检验 `closestCenter` 候选**（`internals.md §四十二.1` 的可证伪预测）＝造**不等高相邻块**（120px 长块紧挨 28px 短行），把落点放在两者**交界处**：若按各自几何中线 ⇒ 支持"显式二分"；若偏向"中心更近"的那块 ⇒ 支持 dnd-kit `closestCenter`。⚠ 必须先解决"短行带宽只有 ±14px"的精度问题 ⇒ 用 80px＋28px 组合更稳。
2. ★★ **奇数高度块的中线取整方向**＝造 27px 左右的块（改行高／单行文本＋特殊块型），看 `.5` 落在哪一侧 ⇒ 决定本地要不要写 `Math.floor`；☆ 同时补"块间 padding 空隙里的 y 归属"（当前本地在两块之间会返回 `null`）。
3. ★★ **目标真有子块时的落点**（承第 103 批未跑项）＝造 1 父 2 子，拖外部块落到**子块**上 ⇒ 验"只产生 before/after、不改层级"是否覆盖非扁平情形。
4. ★★ **`dragover` 期间读 `e.target`**＝采命中判定实际落在哪一层 DOM（整行层／正文 DIV／沟槽），补 §四十二 的实现归属；★ 顺带采"插入指示线"的 DOM 残留。
5. ★★ **盘上批（已连续三批未开工，本批必须开工）**＝其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集 ＋ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组 ＋ `[data-whatintent]` 写入点定位。零浏览器预算、零授权。
6. ★ **落点等号一字符改法**＝等用户点头后改 `DragHandle.tsx:133`，并加一条单测锁住正中点归属（官方＝before）。
7. ★ 本地两条待裁项＝回收站屏是否显示正文预览（`src/actions/document/get.ts:70` 读侧是否带子块）／键盘移动块命令（官方 4 条 vs 本地 0 条）＋ `Editor.tsx:265` 的 `undoRedo: collaborative ? false : {}` 与官方撤销分组的差分口径。
8. ☆ 待用户点头＝回收站里现在躺着 `QODER-HARVEST-B103-BOUNDARY`（1 条具名项），要不要按 V93 协议精确永久清除（不可逆，历史授权不沿用）；另有 **3 条无标题项**身份未明，属禁区不碰（其中 `73dc4026` 是第 96 批记过的历史残留）。

### 第 103 批·尾记日志（2026-09-30 11:5x–12:2x 本地＝UTC 03:5x–04:2x，★ 写入批＝1 次不可逆永久删除；★★ 一条采集锚点改判）

**开场**：用户"全部同意"覆盖三件＝提交第 103 批产物（`2072c44`）／改落点等号＋补单测／精确清除 `B103-BOUNDARY`。执行序＝提交 → 代码改动 → 清除 → 尾记落盘。

1. ☆ **产物提交**＝6 份 .md 一次提交（`2072c44`），提交前 `sanitize-pii.mjs` 报 0 处需改写。
2. ★ **本地代码改动（用户点头）**＝`src/components/editor/drag-handle/DragHandle.tsx:133` 的 `clientY < rect.top + rect.height / 2` 抽出为纯函数 **`src/components/editor/drag-handle/drop-band.ts`** 的 `dropBandFor(clientY, rect)`（返回 `'none' | 'before' | 'after'`），**正中点归 `before`**；新增 **`drop-band.test.ts` 4 条**（用官方实测几何：120px 块 `209..329` 中线 269 ⇒ 269 before／270 after；28px 短行中心＝正中点 ⇒ before）。
   - 验证＝`npx vitest run` **24 文件 173 条全过**、`npx tsc --noEmit` 零错、`npx eslint src/components/editor/drag-handle/` 仅 2 条**既有** warning（`$from`/`$to` 未使用，`:109-110`，非本轮引入）。
   - ⚠ **未做屏上复验**＝没有起 dev server 真拖一次验证指示线位置，等价性靠"同一 rect 同一比较"的代码推导＋单测；如要屏上证据需另开一轮（本地 e2e 里加拖拽用例未做，因用户只点头单测）。
   - ☆ **未提交**＝本轮只提交了产物；`src/` 三个文件（1 改 2 新）留在工作区等点头。
3. ★★★ **采集锚点改判（本尾记最有复用价值的一条）**＝回收站右上 ⋯ 的稳定指纹是 **`BUTTON[data-testid="browse-sort-button"]`**（全页命中 **1** 枚），而三轮来用的类名正则 `/Plain MediumSmall/` 在本屏命中 **3** 枚 ⇒ 新规则＝**先试 `data-testid`，多义时才退回"取 x 最大＋回读 `role=menuitem` 非空"**（G1049）。
4. ★★ **一条新事实＝永久删除落刀后官方自动退出选择模式**（`role=checkbox` 5→3、`已选 N 项`消失）⇒ 五判据里"屏上行数"必须在退出选择态之后读；本地同形（`TrashList.tsx:62` `exitSelection()`）＝**一致**（G1050）。
5. ★ **闸门天然满足也照跑**＝本轮默认选中的恰好是唯一授权项，仍读回 `chosen:1／namedChosen:1／untitledChosen:0` 才落刀；确认框照旧零 ARIA（`role=dialog` 0），三项指纹全没变、唯一信号是新增文案 ⇒ **没有**判废重试（G1003 例外条款第五轮）。
6. ☆ **第五次精确清除完成**＝删除前按"先读回内容"取到 4 块正文（全为采集串、零用户内容）；五判据全过（屏 3 行全「无标题文档」／`trash` 3 条＝保留集逐 id／`unsorted` 3 条逐 id 未动／`reminders` 0／搜索无命中／**硬重载**仍 3 行）。⇒ **回收站里现在只剩 3 条无标题项**（含历史残留 `73dc4026`），身份未明＝**禁区，本目录不再碰**。
7. ☆ 落盘＝`gap.md` 1040 → **1043 条／最大 G1051**（§三点一〇五十 G1049–G1051）；`interactions.md` **V97 §六**；`features.md` 计数行；`manifest.jsonl` 144 → **145 行**；`model.md`／`internals.md`／`longtail.md`／`styles.md` 本段无新节（原因＝清除尾记：零实体字段、零码路、零几何、零样式）。

### 第 104 批队列（不变，追加一条）

1–5. 见上方第 104 批队列 1–5 项（`closestCenter` 不等高块实验／奇数高中线取整＋padding 空隙归属／真有子块的落点／`dragover` 读 `e.target`／**CSS 盘上批已连续三批欠账**）。
6. ★ **新增**＝`browse-sort-button` 是否跨屏同名（在浏览屏／集合屏各读一次 `count`）；批量**还原**落刀后是否也自动退出选择模式。
7. ☆ **待用户点头**＝`src/` 的三个文件（`drop-band.ts`＋`drop-band.test.ts`＋`DragHandle.tsx`）要不要提交；以及要不要起 dev server 做一次屏上拖拽复验。
### 第 104 批日志（2026-09-30 12:2x–12:5x 本地＝UTC 04:2x–04:5x，★★ 写入批＝1 个沙盒建删；★ 立"复刻状态台账"＝本目录第一次有可测的复刻进度指标）

**开场**：用户"全部同意"覆盖四件＝提交第 103 批产物／改落点等号＋补单测／精确清除 `B103-BOUNDARY`／建 `B104` 沙盒＋补"复刻状态"列。执行序＝产物提交（`2072c44`＋`06abf7f`）→ 代码改动（`09874bc`）→ 屏上复验（`7a3aa31`）→ 第五次精确清除 → 第 104 批采集 → 台账与落盘。

1. ★★★ **换实验救回一批预算**＝队列①"不等高块区分 `closestCenter` vs 中线"**动手前先算了一遍就判废**＝扁平兄弟列表里"after A"与"before B"是同一槽位、两模型必然同解 ⇒ 改做"沟槽＋上下越界"五枪才有区分度（G1056）。⇒ 新自检＝**落点类假说必须先问"它能否产生不同槽位"**。
2. ★★★ **命中带＝行矩形＋其后 8px 尾沟槽**（E1 y=205 落在 `202..208` 沟槽正中 ⇒ 插到 G1 之后）⇒ 本地 `drop-band.ts:8` 在沟槽里判 `'none'`＝**拖进去不动**＝P1 差分（G1052）。
3. ★★★ **上下边界不对称**＝E5 y=150（比首块顶 173 高 23px）仍插到最前＝**上夹紧**；E3 y=399（末块尾沟槽之外 10px）`drop` 送达但零变化＝**下不夹紧**；E4 y=385（尾沟槽内）插到最后 ⇒ 下界在 `(389, 399]` **未钉死**（G1053）。
4. ★★★ **事件目标拓扑到手**＝四次拖拽 397 条 `dragover` 里**没有一条**落在 `[data-block-id]` 行上，全部落在正文容器 `DIV.sc-vts49g-1 deoTMl`（rect `top 48 × h 504`）；`dragstart`/`dragend` 才落在手柄 `DIV.sc-1iqnrwp-0` ⇒ **"命中哪一行"是 handler 内的 clientY 数学** ⇒ 第 103 批 `internals §四十二.1` 的两条候选（通用 helper 二分／dnd-kit `closestCenter`）**同时作废**（已就地 ✎）。
5. ★★ **一条判据补强**＝"零变化"不等于"静默失效"：E3 的 `drop` 确实送达容器 ⇒ 判"官方此处无动作"要三条齐（`drop` 送达 ＋ 落点在所有命中带之外 ＋ 模型零变化）（G1055）。
6. ★★ **换算式第三次独立复验＝零误差**＝页内 `pointerdown` 日志实测 OS `(881,416)` → css `(597,261)` 与预测逐位相同 ⇒ 同一窗口布局下跨批复用有效；☆ 一枪事件配额＝`dragstart 1 ＋ dragover ≈99 ＋ drop 1 ＋ dragend 1` ⇒ **不能用事件数当命中次数**。
7. ★★★ **立"复刻状态台账"（gap.md 新增 §〇）**＝ **P0 八条逐条实扫**⇒ **G06 已清**（`comment.ts:26` 要求 `commenter` ＋ `document-access.ts:39` 抛错 ＋ `resource.ts:15-18` 阶梯），其余 7 条**未动**（逐条带 `文件:行号`）；② 近三批已清条目带 commit 号（`60cc5fc`／`09874bc`／`7a3aa31`）；③ 约定＝新批次改了本地代码就在台账追加，**不回填旧 1043 行的列**（避免千级空格噪声）。
8. ★ **屏上复验做完了，而且做了对照**＝`e2e/drag-drop-band.spec.ts` 用真指针拖两枪（正中点→前、中线＋1→后）；把 `<=` 改回 `<` 后**单测 2 条失败＋e2e 失败** ⇒ 两层都真锁住。⚠ **一条新的仪器坑**＝`reuseExistingServer` 让 Playwright **复用了另一个 worktree 占用的 3000 端口**（`C:\Users\omen\.qoder-cn\worktrees\app\88b5ec\cs`）⇒ 第一次跑的是**别人的代码**（表现为"改了没生效"）；解法＝自起 `next dev -p 3100` ＋ 临时 config（用完删除），**不动共享 playwright.config.ts、不杀别人进程**。
9. ☆ 沙盒 `B104-GAPBAND`（1 文档＋6 块）建→5 枪→**软删还原**；残留三连干净（`unsorted` 3 条逐 id 未动／`reminders` 0／`trash` 4 条＝3 无标题＋本沙盒）；☆ 消耗＝3 张整窗截图＋5 次 OS 拖拽＋1 次 OS 点击＋约 8 次 `evaluate_script`＋2 次导航＋5 次 craft 读＋1 次 e2e 全套（24 文件 173 条单测／tsc／eslint）。

### 第 105 批队列

1. ★★★ **钉死下界**＝同一沙盒几何下测 `y ∈ {390, 393, 396, 399}` 四点 ⇒ 命中带下沿精确到位；☆ 顺带测"上界是否真的无限"（`y ∈ {120, 60}`，容器顶是 48）。
2. ★★★ **插入指示线归属**＝唯一能区分"沟槽算上行 after 还是下行 before"的观测 ⇒ 试"拖拽中用 OS 层截图"（`duration_ms` 拉到 4000 期间抢一次 `get_window_state`）；抢不到就明确记为永久仪器边界。
3. ★★ **嵌套父子缝隙**＝造 1 父 2 子，把外部块落到父子之间／父块尾沟槽 ⇒ 验命中带规则在嵌套下是否成立、是否改层级（承第 103 批未跑项）。
4. ★★ **高块与短行相邻时的尾沟槽宽度**＝造 120px 块紧挨 28px 行，测块间缝隙是否仍是 8px（若是 ⇒ 命中带规则与块高无关）。
5. ★★ **CSS 盘上批（已连续四批欠账，本批必须开工）**＝其余 12 份 CSS 落盘 ＋ 暗档色阶映射 ＋ `@layer utilities` 工具类全集 ＋ `_16nf6_`／`_1fgll_` 两族规则正文 ＋ `variant*` 的 `:active` 态 ＋ 另四色基色三元组 ＋ `[data-whatintent]` 写入点定位。零浏览器预算、零授权。
6. ★ **本地两条落点改法**（等点头）＝`drop-band.ts` 命中带扩到 `[top, top+pitch)` ＋ 首块之上夹紧到 before-first（尾部保持不动）；改完补单测两枪并跑 e2e 对照。
7. ★ 其余旧项＝回收站屏是否显示正文预览（`src/actions/document/get.ts:70` 读侧是否带子块）／键盘移动块命令（官方 4 条 vs 本地 0 条）／`Editor.tsx:265` 撤销分组差分口径。
8. ☆ 待用户点头＝回收站里现在躺着 `QODER-HARVEST-B104-GAPBAND`（1 条具名项）要不要按 V93 协议精确永久清除；3 条无标题项属禁区不碰。

### 第 105 批日志（2026-09-30 13:1x–14:1x 本地＝UTC 05:1x–06:1x，★★★ **盘上静态批＝零浏览器读屏、零沙盒、零写入**；唯一写屏动作＝第六次精确清除 `B104-GAPBAND`；★ 连续四批欠账的 CSS 盘上批终于开工）

**开场**：用户"全部同意，继续推进"覆盖＝① 以已落盘的主 CSS 做盘上样式批（不再开新沙盒）；② 按 V93 协议精确永久清除 `QODER-HARVEST-B104-GAPBAND`（1 条具名项，3 条无标题项属禁区不动）；③ 八件落盘＋校验＋提交。

1. ★★★ **分层体量结案，并推翻本批自己的草稿**＝`@layer base` 26,151（8.8%）／`@layer utilities` 55,653（18.7%、**570 个类名**）／**84 个独立 `@layer components{}` 块 215,275（72.5%、95 个哈希族）** ⇒ 官方主体是 CSS-Module 组件层；⇒ **本批会话内草稿曾写"utilities 270,907／91.2%／574 类"＝把 components 尾部误并进 utilities 的跨度计算错误（没做花括号配平）**，已作废并就地 ✎ 进 `styles.md §十二.一`；⇒ **新纪律：量一层必须配平到该层闭合 `}`**。
2. ★★★ **按下态全面结案**＝全文件 `:active` **10 条**＝3 条 Action 底色（`background:var(--foreground-200)`＝8% 前景，★ 且**包在 `@media (pointer: fine)` 里＝鼠标档专属**）＋ 1 条全局触摸（`scale(.99)＋opacity(.75)`／`.2s`，三属性 `!important`，用 `:where()` 零特异性，唯一豁免口 `.noPressFeedback`）＋ close/toggle 各 `--foreground-150` ＋ 滚动条 thumb ＋ link-preview `opacity:.91` ＋ 2 条 hover/active/focus **三态并列**的组合选择器；⇒ **DS 按钮族 `_1bml7_` 21 个 variant 的 `:active` 实测 0 条**（⇒ §十一 遗留①结案）。本地只有 `active:translate-y-px`，且全库无 `data-whatintent`／`noPressFeedback`／`pointer: fine`。
3. ★★★ **`:root,.token-scope` ＝ 公开的子树级 token 作用域接口**（127 vars 全是 `rgb(var(--基) / P%)`）；另裸 `:root` 共 **4 处**（0／4／**112**／19 vars 分布在三层）；★★ **同一份色阶在三个选择器下各写一遍**＝与 `[data-theme=light]` scale 块重叠 **48 条**（上段）＋ **60 条**（下段）、**逐字节相同** ⇒ 该块 116 vars 里 **108 条是纯重复**；★ 200-var light 块与 38-var dark 块在 base 与 utilities **各输出一次**（`block0===block4` 实测为真）⇒ 构建重复不是两套语义。
4. ★★ **两段派生算法结案**＝下段 `-50…-500`＝alpha、固定映射 `6｜12｜18｜24｜32｜40｜55｜70｜85｜100%`（前景另有 `-0/-25` 且整表 20 档 `0｜2｜3｜4｜6｜8｜10｜12｜18｜25｜32｜40｜48｜55｜62｜70｜78｜85｜92｜100%`）；上段 `-550…-900`＝**字面 rgb**（8 档等步长变暗）⇒ **同一后缀跨族不是同一量纲**（`-50` 在前景 3%、色板 6%、brand-red 3%）；★ `--foreground-950`／`--foreground-050` 逐字搜索 **ABSENT** ⇒ 第 97 批那条遗留结案。
5. ★★ **暗档＝三段逐色重指（38＋116＋56 vars）**（§十一 遗留②结案）；★★★ **brand 七族的档位序号在两档下整条反向**（`brand-blue` light `50`＝最浅 → dark `50`＝最深）⇒ **"档位表示相对深浅、不是固定色值"＝抄常量必在暗档失效**；☆ `brand-orange`／`brand-yellow` **只有 1 档**（不是色阶）且暗档不重指；☆ `--accent-contrast` 暗档＝`var(--base)`（强调色上的文字变回页面底色）。
6. ★★ **两套蓝逐字结案**＝语义板 4 色（`--blue: 0 136 255`／dark `0 145 255`）≠ 强调板 6 色（`--accent-blue: 46 109 233`／dark `113 178 255`）⇒ **连色数都不同**；本地两套塌成一套（无语义板，只有 `--craft-accent` 单值）。
7. ★★ **复选框族 4 条全量**＝18px／`border-radius:9999px`＝**圆形**／`1.5px` 边框／`[data-checked]`＋`[data-indeterminate]` **同换底色与边框**／`pointer-events:none`（点击由 20px wrapper 承接＝命中区比框大 1px）／`transition-property` **含 transform**；☆ 三尺寸全是可覆盖变量 `--cb-wrapper-size`／`--cb-size`／`--cb-border-width`；本地是 `size-4 rounded-[4px]`＝**16px 方角**、无变量接口（`checkbox.tsx:12`）。
8. ★★ **标量尺四族逐字**＝spacing 15 token（+`-0` 无 token 直接写死 ⇒ 工具类 16 档）／radius 5 档（本地 7 档且**无 `--radius-full`**）／**shadow 8 档：6 档是 6 层叠加、`empty` 是 6 层全透明占位、`inner` 是白色内描边**（本地 5 档、`sm`/`md` 只抄到第 3 层 ⇒ **丢了第 6 层 1px 外描边**）／transition 3 档＋单 easing（本地**等价已对齐**，`.4`↔`0.4` 只是字面差）；☆ `--header-height:48px` 本地已有（`--layout-header-h`）；☆ `--browse-max-width:1630px` 本地零命中。
9. ★★ **浮层壳 `_16nf6_` 25 条全量**＝老疑点"壳里有没有搜索框"结案＝**有，且定位随"有无 header"翻转**（`:has()`／`:not(:has())` 三处）；四接口变量 `--menu-width/--menu-min-width:220px/--menu-max-height:none/--search-field-size`（**同选择器二次覆写 2.5rem→3.625rem＝两档密度**）；组分隔线 `:before` 1px `--foreground-100`；groupLabel 用排版 token `--heading-xs-500-*`；item 内头像 `--avatar-size:1.5625rem !important`。
10. ★ **焦点环数值到手**＝通用 `outline:1px solid var(--accent-500);outline-offset:1.5px`、**tab 另一种环 2px／−2px**、`[contenteditable=true]:focus{outline:none}`；☆ **本批草稿原写"本地缺正文去环"，实扫推翻**＝`src/app/globals.css:364-366` 有 `.tiptap:focus{outline:none}` ⇒ 判定改"意图一致"（差在画法 box-shadow vs outline）。
11. ★ **`--editor-*` 两档各一套 ＋ 本地两条暗档照抄 light**＝10 条 light **逐字一致**、5 条渐变 light/dark **双双逐字一致**（本轮最大面积的一致项）、8 条 dark 一致；★★ **`--editor-blueDark`／`--editor-blueLight` 本地暗档＝light 值**（官方重指成 `rgb(170 169 249)`／`rgb(65 146 247)`）⇒ 暗色下等于没换档；☆ 本地缺 `--editor-text`／`--editor-spectrum`／`--brand-*` 七族。
12. ☆ **八件落盘＋两次就地 ✎**＝`gap.md` §三点一〇五二（G1059–G1068，1050→**1060 条**）＋ §〇 新增「四、第 105 批新登记的待办」9 行；`styles.md` **§十二**（十三小节＝本段主产物，含上段 8 档×10 族×两档的 160 个逐字值）＋ §十一 尾三条遗留 `~~划掉~~`＋§十一.二 六档口径限定＋§九 尾 `-950` 结案；`interactions.md` **V99**；`internals.md` **§四十四**；`model.md` **§一之六十三**；`longtail.md` **§三十一**；`features.md` 计数行；`manifest.jsonl` 147→**148 行**。⚠ **本轮未改 `src/` 任何代码**（9 条改法全部等点头）。
13. ☆ **清除与残留**＝第六次精确清除 `QODER-HARVEST-B104-GAPBAND`（13:1x 本地落刀，V93 四闸门；★ 本段收尾时**又独立复跑了一遍五判据**＝屏上 3 行全无标题／API trash 3 条／`unsorted` 3 条逐 id 与基线相同／`reminders` 0／站内搜索 `QODER` 无结果，五条全干净）；清除后回收站剩 **3 条无标题项**（属禁区，不动，含历史残留 `73dc…556d`）；★ 选择模式在删除后**再次自动退出**（工具栏消失、无复选框）＝复验第 103 批那条事实；⚠ **确认框那一帧本批没有留档**（只有 selected／after 两张），已在 manifest 的 `gate.confirmEcho` 里如实标注。★ **第 101 批队列③"其余 12 份 CSS 落盘"仍未做**＝需要 `node_repl` ＋ Browser Agent SDK 通路（`pageAssets` → `browser.tabs.content` 每批 ≤4 个 url），**不是 browser-use MCP 能做的**，本批只在已落盘的 1 份上开工。

### 第 106 批队列

1. ★★★ **其余 12 份 CSS 落盘**（第 101 批队列③遗留，唯一能推翻/确认"官方只有这 9 段 token 块"的路径）＝走 `node_repl` ＋ Browser Agent SDK：逐路由 `pageAssets.list()` 取 `.css` → `browser.tabs.content()` **每批 ≤4 个 url** → 落 `_harvest/css/`；⇒ 目标＝`TaskViews.css`（只在 `/tasks`、`/calendar` 加载）＋ 快捷键面板那份（§九 的来源）＋ 确认是否存在**第三套色阶**。
2. ★★★ **`[data-whatintent]` 的写入方与取值全集**＝必须读 JS（CSS 里只有消费点）；⇒ 结掉 V99 未采到②，并决定本地要不要引入同一机制（G1063／G1064／G1059 三条同根）。
3. ★★ **`--heading-*-<档>-*` 排版 token 全表**＝主 CSS 里按 `--heading-` 前缀整族抓（本批只撞到 `xs-500` 一个消费点）⇒ 与 `styles.md §一` 的具名样式档位对上，才能判"档位表是否等价"。
4. ★★ **`[data-accent=…]` 六档强调主题的逐字块**＝本批只到 `--accent-<色>` 基色层；⇒ 六套 × 18 档的别名表是本地"强调色设置"能否 1:1 的判据。
5. ★★ **触摸按压的动态复验**＝Playwright `hasTouch:true` ＋ `tap`，或官方站真触摸模拟 ⇒ 结掉 V99 未采到①④；同时给本地"是否值得补 `data-whatintent`"提供观感证据。
6. ★★ **下界像素与指示线归属**（沿用第 105 批队列 1／2，尚未做）＝`y ∈ {390,393,396,399}` 四点＋拖拽中 OS 截图。
7. ★ **嵌套父子缝隙／高块与短行相邻的沟槽宽度**（第 105 批队列 3／4）。
8. ★ **点头即可动手的 9 条本地改法**（全在 `gap.md` §〇「四、第 105 批新登记的待办」）＝优先级建议：**G1068（2 行暗档值，成本 1、可见 bug）** → G1067（阴影补 3 层＋`--radius-full`）→ G1062（复选框圆角与尺寸）→ G1060/G1061（语义板与档位，需先定"要不要引入 alpha 派生"）→ G1063（输入意图闸门，成本 2）。
9. ☆ 其余旧项＝回收站屏正文预览是否显示／键盘移动块 4 条命令／`browse-sort-button` 是否跨屏同名／批量**还原**是否也自动退出选择模式。

### 第 106 批日志（2026-09-30 14:3x–15:2x 本地＝UTC 06:3x–07:2x，★★★ **零写入批＝无沙盒、无删除、无偏好改动**；唯一浏览器动作＝只读取回 12 份 CSS ＋ 一次 `close()`；★ 名册结案＝13/13 份官方 CSS 全部落盘）

1. ★★★ **名册结案＝13 份 CSS／858,303 字符**＝`index.css`（297,080，第 105 批）＋ 本批新增 12 份 **561,223 字符**＝`fontdef.m-plus-rounded-1c`（308,022）／`vendor-excalidraw`（163,877）／`vendor-code-editor`（29,193）／`BlankFont`（25,567）／`fontdef.common`（25,401）／`fontdef.roboto-mono`（3,382）／`TaskViews`（2,240）／`fontdef.avenir-next-rounded`（1,485）／`fontdef.untitled-serif`（1,045）／`fontdef.source-serif`（353）／`AIChatPopup`（333）／`fontdef.inter`（325）；⇒ ★ **§十二 的分母只有 34.6%**（此前所有"全文件"结论其实只覆盖主 CSS 一份）；⇒ **"第三套色阶"的怀疑被否**＝其余 12 份里没有 `[data-theme]` 色阶块。
2. ★★★ **`vendor-code-editor.css` 名不符实＝100% KaTeX 0.16.25**＝20 faces（12 个 `KaTeX_*` 族）／368 条不同选择器（只有 1 条不是 `.katex` 作用域＝`body`）／版本自印 `content:"0.16.25"`；⇒ **`.cm-*` 在 13 份里 0 命中 ⇒ 官方代码块语法高亮不在这批资产里**（老疑点收窄＝JS 注入或未落盘 chunk）；⇒ ★ **本地 katex 0.18.7（`package.json:66`）整体换前缀类名**＝官方 368／本地 369／**同名只有 218**（官方独有 150、本地独有 151）⇒ **"照官方 CSS 抄数学样式"必然落空**，本地已有 1 条自写覆写 `.crafty-math .katex-display`（`src/app/globals.css:1035`）走的是"只对视觉"那条路。
3. ★★★ **首次撞到具名容器查询**＝`@media (width >= 748px){ @container web-shared-layout-main-wrapper (width >= 600px){ …三条覆写… } }`（`TaskViews.css`）⇒ **官方有两套断点体系**（视口 ＋ 容器）；☆ **落盘本日志时补做全库检索（原队列②当场结掉）＝声明处找到了**＝`index.css` @134,582 逐字 `._mainWrapper_6sjpd_20{display:flex;flex-direction:column;height:100%;container-type:inline-size;container-name:web-shared-layout-main-wrapper}`，**全 13 份里 `@container` 共 6 处**＝TaskViews 1（具名 `width >= 600`）＋ index 5（1 处具名 `width < 452px` 打文档网格 `._docGrid_6sjpd_59{gap:8px}` ＋ **4 处匿名 `(width >= 768px)`／`(width >= 1024px)` 驱动列表视图的"列显示分档"**＝`_colUpdated`／`_colCreated` 在 768px 出、`_colLastViewed` 在 1024px 出）；⇒ ★ **本目录此前把"侧栏两档"当视口量是读错了对象**（⚠ 仍未屏上复验，队列②改判为"实测容器变宽行为"）。
4. ★★★ **白板＝独立 vendor 主题体系**＝67 个 `--color-*` 名／108 条定义（★ 本批就地修正会话内草稿的"68 名"）、主色紫 `#6965db` ≠ 主 app 强调蓝 `--accent-blue 46 109 233`、`--color-danger #db6965` ＝ **primary 的 R/B 互换**、灰阶 **11 档含 `-85`**；★★ **整份 0 处 `[data-theme]`／`prefers-color-scheme`** ⇒ 暗色靠 JS 覆写变量；★ **4 个 `@font-face` 全是 `Assistant`（400/500/600/700）且描述符写错**＝逐字 `style:normal`／`display:swap` ⇒ **官方那份 `font-display:swap` 从未生效**＝vendor 缺陷。
5. ★★★ **首次采到"框选"痕迹＝`_fdch5__rubberBand`**＝`position:fixed;background:var(--accent-100);border:1px solid var(--accent-500);border-radius:var(--radius-sm);pointer-events:none;z-index:10`；⚠ **只有静态证据**（未做屏上拖框）⇒ 判"待验证"，**没有**写成"官方任务视图支持框选"，也**没有**进 `gap.md` §〇 台账。
6. ★★ **字体名单结案＝21 个 family／429 个 `@font-face`（全库 454＝＋KaTeX 20＋Assistant 4＋AdobeBlank 1）**＝CJK 分解 **JP 3＋KR 22＋SC 10＋TC 10＝45 faces／15 族**（`Jetendard` 16 片＝8 权重 × 2 style 是最占数的一族；`Resource Han Rounded SC/TC` 各 7 片且**是全库唯一出现 `350` 权重的族**）；`M PLUS Rounded 1c` **354 faces × 354 片**（逐码点枚举，min 2／max 211、合计 **24,840** 个码点引用，命名 `m-plus-rounded-1c-400.<i>.woff2`）；`Roboto Mono` 12 片＝6 区 × 2 style（同区 normal／italic 范围逐字相同）；⇒ 本地只有 **21 个里的 1 个**（`Inter subsets:['latin']`，`src/app/layout.tsx:8-11`）。
7. ★★ **CJK 字体包的构建真源从文件头注释恢复**＝`Generated by scripts/build_cjk_common_css.py. DO NOT EDIT.` ＋ 15 行 `Sources:` 路径（`_japanese|_korean|_simplified-chinese|_traditional-chinese` × `mono|rounded|sans|serif`）＋ **显式排除 `_japanese/rounded/m-plus-rounded-1c`（"injected as its own stylesheet"）**；⇒ 拼接脚本**只搬 CSS 不搬 woff2**（common 的 `src` 是 `../../` 回溯引用）。
8. ★★ **集合表格对外接口 `--st-*`＝21 条定义／7 档 z 阶梯／8 个宿主注入名／1 条死变量**＝z 序 `base-cell 1 ＜ index-cell-header 2 ＜ sticky-index 3 ＜ sticky-header 6 ＜ 交点 7 ＜ interactive-overlay 10 ＜ resize-preview 12`；★ `--st-z-index-cell-header` **定义了却零消费**；8 个只消费不定义（`--st-page-bg-hover-opaque #f8f8f8`／`--st-selection-bg-opaque rgb(194, 223, 255)`／`--st-border-color var(--foreground-100)`／`--st-font-family Inter, system-ui, sans-serif`…）⇒ **"内部变量自定义、外部变量只消费并兜底"** 是可复制的接口范式；⇒ 本地零 `--st-*`，表格只有 `z-10`／`z-20` 两档（`src/app/(app)/collections/[id]/TableView.tsx:149,154`）＝**缺列宽拖拽预览层**，内距 12/8px vs 官方 10/4px。
9. ★★ **两种 `font-display` 策略**＝数学 20 faces 全 `block` vs UI／CJK 全 `swap`；★ **构建器把最小的 `KaTeX_Size3` 内联成 data URI**（60 个 `url()` 里恰好 1 个，其余 59 个走 `/static/<名>-<哈希>.<ext>`）；☆ `BlankFont.css`＝`AdobeBlank` 空白兜底（base64、无 `format()`／`font-display`／`unicode-range`，**`index.css` 里 0 引用**⇒ 消费点在 JS）。
10. ★ **卡片"换脸"＝`_idle`→0 与 `_action`→1 两条成对规则，且鼠标 `:hover` 与键盘 `:focus` 共用同一对**（触摸档被 `:not([data-whatintent=touch])` 整体排除）＝**不是叠加显示**；本地 6 个文件走 `opacity-0 group-hover:opacity-100` 是叠加方向（`extensions/attachment-view.tsx:36` 等）；★ **焦点环三档**（＋1.5／−2／−1）。☆ `AIChatPopup.css` 只有 4 条＝横向滚动 chip 容器（负 margin ＋等量 padding＝焦点环不被裁）。
11. ☆ **八件落盘＋四处就地 ✎**＝`gap.md` §三点一〇五六（**G1069–G1079，1060→1071 条**＝本段收尾时把"容器查询声明处"补成第 11 条）＋ §〇 新增「五、第 106 批新登记的待办」7 行；`styles.md` **§十三**（本段主产物＝十个小节、13 份清点表／KaTeX 对照／`--st-*` 全表／TaskViews 三族／白板色板／字体名单／AdobeBlank／容器查询／本地总结对照）；`interactions.md` **V100**；`internals.md` **§四十五**；`model.md` **§一之六十四**；`longtail.md` **§三十二**；`features.md` 计数行；本日志＋第 107 批队列；★ 就地修正＝① §十二 末"其余 12 份未落盘"划掉结案、② **"95 个哈希族"→ 84**（严格捕获组）、③ 本批会话内草稿的 `1,193 条规则／68 个 --color-*／TaskViews 26 条规则` 三处**在落盘前复扫改判为 1,155／67／20 条（19 个不同选择器）**；★ 另把 G1070 的 368／369／218／150／151 **复扫验算通过**（第一次朴素正则给出 369/370/219＝把 `@font-face` 当选择器，已改用配平 parse 复核）；④ ★★ **本批自己的一条错判在落盘当场被纠正**＝§十三.四／`internals §四十五.四`／`V100` 三处原写"13 份里找不到 `container-type` 声明处"，**补做全库检索后声明处已在 `index.css` @134,582 逐字找到**（⇒ 三处就地 ✎ 改写，并新增 G1079）＝**教训＝"没检索到"与"检索了没有"是两件事，写"找不到"之前必须先跑一次全库检索**。
12. ☆ **本批新增两条仪器纪律（都是我自己踩的）**＝① **量"选择器数／族数"必须先剥 `/* */` 注释再按大括号配平**（`fontdef.common.css` 的 `/* Source: … */` 让朴素正则凭空多出 15 条"选择器"）；② **CSS-Module 族名要用捕获组、不能用"能 match 到 5 字符就算"**（`_title_11co4_8` 会被旧正则误报成族名 `title`，导致 index.css 从 84 虚报为 95）。
13. ☆ **现场状态＝零残留**＝`manifest.jsonl` **148 行不变**（本批没有任何写屏动作，按"零写入不追加"口径）；沙盒 0 建 0 删；账户偏好未动；浏览器侧只开了 1 个临时标签页取资产，`T.close()` 成功；⚠ **一次未解除的仪器故障**＝`/calendar` 屏探活时 `T.title()` 本地超时（tab 级队列停摆）⇒ **当场停手不追队列**，用 `browsers.list()`（不进扩展队列）确认控制面存活后收尾 ⇒ 该项作为第 107 批队列③"复验第 14 份是否存在"。
14. ☆ **本地未动代码**＝本批是采集批，`src/` 零改动；`gap.md` §〇 台账里第 106 批 6 行全部状态＝`未动`（含 G1068 那条"2 行暗档值"的既有待办仍未点头）。

### 第 107 批队列

1. ★★★ **框选（rubber band）屏上验证**＝在沙盒任务视图／卡片视图里用 OS 级拖拽画一个斜框，看是否出现 `_fdch5__rubberBand` 那个矩形、以及它是否真的批量选中项（三判据＝矩形可见 ＋ 「已选 N 项」文案 ＋ `role=checkbox` 计数）；⇒ ⚠ **属写入批**（要建沙盒），需重新单独开口头授权；⇒ 结掉 G1076 与 V100 第 6 条。
2. ★★ **容器查询的屏上行为验证**（★ 声明处**本批已结案**＝`index.css` @134,582 的 `_mainWrapper_6sjpd_20{container-type:inline-size;container-name:web-shared-layout-main-wrapper}`，队列原项作废）＝剩两问要屏上裁：① **折叠侧栏时 `_mainWrapper` 的实际宽度变化**（证实"侧栏两档＝容器量"而非视口量，同时复核第 96／97 批的几何读数归因）；② **列表视图的三档列显隐（`_colUpdated`／`_colCreated` ≥768、`_colLastViewed` ≥1024）在官方界面上是否真的按容器宽切换**（这一条能直接指导本地 `TableView.tsx` 的列分档实现）。
3. ★★ **`/calendar` 屏资产并集复验**（本批 `title()` 超时未做）＝确认是否存在第 14 份 CSS；若窗口不可见导致停摆，按纪律先请用户把窗口显示出来，**不做任何导航重试**。
4. ★★ **`[data-whatintent]` 的写入方与取值全集**＝读 JS（CSS 里只有消费点，本批零反编译）；⇒ 结掉 V99 未采到②、G1063／G1064 的根因项。
5. ★★ **官方代码块语法高亮的真身**＝`.cm-*` 0 命中已排除 CSS 通路 ⇒ 去 JS 里找 token 类名表或 `highlight`/`prism`/`shiki` 字样；⇒ 结掉 G1070 第二行。
6. ★★ **`--heading-*-<档>-*` 排版 token 全表 ＋ `[data-accent=…]` 六档逐字块**（沿用第 106 批队列 3／4，尚未做）。
7. ★★ **`--st-*` 8 个宿主名的注入方 ＋ `AdobeBlank` 的消费点**＝同一批 JS 反编译可结两条。
8. ★ **触摸按压的动态复验**（沿用第 106 批队列 5）＝Playwright `hasTouch:true` ＋ `tap`；顺带验"换脸在触摸端是否真的不生效"（V100 第 1 条）。
9. ★ **点头即可动手的 6 条本地改法**（`gap.md` §〇「五、第 106 批新登记的待办」）＝优先级建议：**G1068（暗档 2 行值，成本 1、可见 bug，从上批沿用）** → G1075（`--st-*` 接口＋两档 z 层） → G1072（`--font-sans` 栈显式化） → G1070（math 锁版本或声明有意偏差） → G1073（`AdobeBlank` 兜底） → G1077（换脸与三档焦点环）。
10. ☆ 其余旧项＝回收站屏正文预览是否显示／键盘移动块 4 条命令／`browse-sort-button` 是否跨屏同名／批量**还原**是否也自动退出选择模式／下界像素与指示线归属（第 105 批队列 1／2）。

### 第 107 批日志（2026-09-30 15:4x–16:0x 本地＝UTC 07:4x–08:0x，★★★ **盘上静态批＝零浏览器调用、零沙盒、零写入、零偏好改动**；★ 选题来源＝第 107 批队列④～⑦ 四条"欠 JS 反编译"的项，一次全结；★ 本批出了一次**推翻自己上一批判定**的改判＝`AdobeBlank`）

**开场**：用户指令＝"启动第 107 批任务"（承接"走 node_repl ＋ Browser Agent SDK，继续推进"）。**本批没有动用浏览器**＝队列①②③（框选／容器变宽／`/calendar` 复验）都要开屏且①属写入批，按纪律**不在无新一轮口头授权时启动**；队列④～⑦（`[data-what*]` 写入方／`.cm-*` 真身／`--heading-*` 与 `[data-accent]` 全表／`--st-*` 注入方＋`AdobeBlank` 消费点）＝**纯盘上**，检索面是历批缓存的 `_harvest/js/` 105 个 chunk，**本批未新增任何下载**。

1. ★★★ **输入意图闸门的三层链路结案（队列④＝一次结掉三条欠账）**＝第 1 层属性来源＝第三方 `what-input` v5.2.12（MIT，头注释 @2,527 逐字带 `@link`），写入函数逐字 `Pr.setAttribute("data-what" + Xa, Xa === "input" ? Hr : ca)` ⇒ **属性名是拼出来的**＝这就是历批按字面串 `data-whatintent` 在 JS 里 0 命中的真因（只搜到 CSS 侧消费点）；第 2 层＝**官方自研的 CSS 编译层**（styled-components AST 访问器 `Uvn`／`Hvn` 判 `t.type === Kre` 后改 `t.props`），把 `:focus-visible`／`:not(:focus-visible)`／`:focus-visible-within`／`:not(:focus-visible-within)`／`:hover`／`:not(:hover)`／自造 `:raw-hover` 改写成 `[data-whatinput=…]` 属性选择器，**七条正则常量逐字到手**；第 3 层＝**两套样式体系各用一个属性**（静态 CSS Modules 读 `data-whatintent`／运行时 styled 读 `data-whatinput`），且应用自己把属性当状态源（`document.querySelector("[data-whatinput]")?.getAttribute(…) ?? null`）。⇒ ★★ **本目录一条旧结论就地降级**＝第 100 批"官方根本不用 `:focus-visible`"改成"用了，但在编译期被换成属性选择器"。
2. ★★★ **读到一条此前完全没料到的可达性规则＝表单控件里 `intent` 冻结、`inputType` 不冻结**（逐字 `pa=["button","input","select","textarea"]`，唯一例外＝`nodeName==="button"` 且该按钮**不在** `form` 里）⇒ ★★ 与第 1 条合用的后果＝**同一次按键里两套闸门分叉**（静态层留鼠标档、运行时层进键盘档）⇒ 在 `V101` 里落成一条**可屏上验证的预测**："DS 按钮的键盘环出来了、任务卡片的没出来"；☆ 另四条细则＝修饰键排除表 `[16,17,18,91,93]`（单按 Ctrl 不切档）、`sessionStorage` 持久化（键 `what-input`／`what-intent`，闸门属性 `data-whatpersist="false"`）、触摸后 200ms 内的 mouse 判假、坐标未变的 mousemove 不改 intent（但 `wheel` 改）。
3. ★★★ **代码块不是一个 `<pre>`＝按语言档分三条渲染路（队列⑤＝`.cm-*` 真身结案）**＝39 项 `{storedLangCode, langCode, label}` 三元组逐字全表（`CodeEditorWrapper-DB8UxA00.js` @28,995，括号配平取整表）；分派＝`mermaid` → 动态 `import("./MermaidRender-*.js")` → `renderMermaidDiagram(text, {themeId, isDark})`，失败回落 `<pre>Invalid Mermaid syntax: …`；`math_formula`（`langCode:"stex"`）→ `renderMathFormula`，失败回落高亮；其余 37 档 → CodeMirror 6；⇒ ★ **"图"与"公式"可以不是独立块类型**（本地建模的关键含义，进 `model.md §一之六十五`）；⇒ ★ **`.cm-*` 不在 13 份 CSS 里结案**＝CM6 用 `StyleModule` 运行时注入、暗档靠两个 `newName()` 生成的类（`W9t={"&light":"."+C9t,"&dark":"."+Y9t}`）⇒ ☆ **官方三套暗档通路并存**（`[data-theme]` 三段重指／白板 JS 覆写 `--color-*`／代码编辑器运行时类名）。
4. ★★★ **推翻第 106 批自己的一条判定＝`AdobeBlank` 不是渲染兜底字体，而是字形探测器**（队列⑦后半）＝消费点逐字在 `index-DiTmKH3z.js` @1,054,299：先 `document.fonts.load("1rem AdobeBlank", 首字符)` 确保就绪 → 建 `position:absolute;width:0;height:0` 的 canvas **追加进 body** → `ctx.font='1em "Apple Color Emoji", "Android Emoji", "Segoe UI Emoji", AdobeBlank'` → **`filter(c => ctx.measureText(c).width !== 0)`** → `canvas.remove()`；⇒ **宽度 0 ＝整条栈都没有字形**；⇒ ★ 历批建议的"把空白字体挂到字体栈末位"**是错的方向**，真正要补的是一条字形探测通路 ⇒ `gap.md` **G1073 作用段就地作废＋新登记 G1084**，§〇 台账第 106 批那行同步改写。
5. ★★ **`--st-*` 的宿主注入实现结案（队列⑦前半，结掉 §四十五「仍未采到」第一条）**＝① React 内联 style 对象 `{"--st-grid-columns": l, "--st-row-height": dt}`；② `style.setProperty("--st-scroll-left", …)`（一处普通、一处在 `requestAnimationFrame` 里与 `transform: translateX(-f px)` **同时**写）；③ ★ **反向消费**＝`getComputedStyle` → `parseFloat(getPropertyValue("--st-row-height")) || 35`、`--st-index-column-width || 45` ⇒ 兜底常量与 CSS 的 `35px`／`45px` **同值双写**；④ `EditorPopup` 把 `--st-font-family`（**从锚点元素 computed style 里读**）／`--st-text-color`／`--st-border-color` 注入浮层；☆ 落盘时在 `longtail.md §三十三.六` 做了一次 **8 ↔ 13 对齐**＝CSS 侧"只消费不定义"的 8 个全部落在 JS 注入的 13 个里，多出的 5 个（`row-height`／`index-column-width`／`scroll-left`／`page-bg`／`text-color`）**在 CSS 里有默认定义、被内联覆写** ⇒ 优先级链＝**JS 内联 ＞ CSS 声明 ＞ JS 反读兜底**（比 §四十六.三 的初稿说法准确，已在两处分别写清）。
6. ★★ **CJK 字体 CSS 是运行时按 locale 注入的（⇒ 给第 106 批的名册加限定）**＝注入清单只有两条（`_cjk/common/fontdef.css`、`_japanese/rounded/m-plus-rounded-1c/fontdef.css`）＋ 白名单 `["ja","ko","zh-Hans","zh-Hant"]`＋ 建链形如 `media="print" → onload 改 "all"`＋ 幂等闸门 `link[data-cjk-font-css]`；⇒ ★ **英文 locale 下应为 11 份而不是 13 份** ⇒ `gap.md` G1069 就地 ✎（新登记 G1085，判为**有意偏差**、不进台账＝本地不该做运行时 CSS 注入）；☆ 顺带读到 12 条 locale 前缀表与"按候选串长度降序 `startsWith`"的归一化算法。
7. ★★ **token 层两张全表到手（队列⑥）**＝`--heading-*` **30 条逐字**（`xxs-600`／`xs-500`／`xs-600`／`md-500`／`md-600` ＋ 两个 allcaps 变体；★ **没有 `lg`／`xl` 档**、letter-spacing 有负值 `-.09px`）＋ 强调色**六套 12 个 light／dark 基色三元组**（`blue 46 109 233 → 113 178 255` 等）＋ **每套 19 条别名转发**的结构（`--accent-N: var(--accent-<色>-N)`，`--accent-contrast` **不在**重指清单里）⇒ 给出"暗档只重指上段 8 档"的机制解释 ⇒ 新登记 G1089／G1090（☆ G1090 本地列里补了一条**命名陷阱**＝本地 shadcn 的 `--accent` 与官方的 `--accent` 不是一个东西，本地对应物叫 `--craft-accent`）。
8. ★ **app shell 类名表与排序枚举（新登记 G1091）**＝`_6sjpd_` 族 9 个类名逐字（★ `mainWrapper`＝具名容器查询的宿主，与第 106 批 G1079 咬合）＋ 同段 12 个常量（**一个使用点都没读到 ⇒ 含义全部未定，没有据此判任何宽度**）＋ 两个枚举＝`{Name,Shared,SharedBy,LastViewed}` × `{Ascending,Descending}` ⇒ 与第 103 批的稳定锚点 `browse-sort-button` 对上了号。
9. ☆ **方法学（零浏览器的定点读怎么做，三条硬技巧）**＝① **先按引用关系选题**（扫全部 chunk 的 import 串找 `vendor-code-editor` 的引用方 ⇒ 14 个消费者，直接证明"代码块是跨面组件"，比看覆盖率榜单准）；② **字面串 0 命中就换三路**（`"data-what" + Xa` 拼接 ⇒ 退到库名注释／`setAttribute(` 调用点／`dataset.` 读法；本批的 `document.documentElement.dataset.whatintent` 是在 @2,099,675 撞到的第三路）；③ **数组字面量用配平取整表**（39 项三元组、`_6sjpd_` 名册都是这么出来的，别按首个 `]` 切）。原始机读结果留档＝`_harvest/b107-probe1.txt`～`b107-probe5.txt`。
10. ★★ **一条工具事实修正（会让历批的绿色校验失效）**＝`_harvest/check-tables.mjs` **不带参数时是空跑**（脚本只遍历 `argv.slice(2)` ⇒ 空列表 ⇒ 恒打印 `ALL TABLES CONSISTENT`）⇒ **本批起一律 `node _harvest/check-tables.mjs *.md`**；改带参数跑之后暴露两张**历批遗留的裂表**（与本轮改动无关）＝`gap.md` §〇 台账 G05 行的 `` `!doc || doc.isDeleted` ``（两个 ASCII 竖线当成列分隔）与 G971 行里多出的一个分隔符 ⇒ 两处都按"改写散句、不用 `\|` 转义"的既有规矩就地修掉，现全 25 份产物 `ALL TABLES CONSISTENT`。
11. ☆ **八件落盘清单**＝`gap.md` §三点一〇五六→**§三点一〇五七（G1080–G1091，1071→1083 条）**＋ §〇 新增「六、第 107 批新登记的待办」7 行＋ G1069／G1073 两条就地 ✎；`styles.md` **§十四**（`--heading-*` 全表 ＋ 六套强调色 12 三元组 ＋ 别名结构 ＋ ✎ §十三.八 的 `AdobeBlank`）；`internals.md` **§四十六**（六小节＝闸门三层链路／代码块三路渲染／`--st-*` 双向／`AdobeBlank` 算法／CJK 运行时注入／本批方法学）；`model.md` **§一之六十五**（语言三元组 ⇒ 三条渲染路的模型含义 ＋ 排序四维度）；`interactions.md` **V101**（闸门可达性 ＋ 五条细则 ＋ 四条屏上验证路径）＋ V100「仍未采到」两条就地 ✎ 结案；`longtail.md` **§三十三**（七张 JS 侧逐字名册）；`features.md` 计数行→**1083 条／最大 G1091／第 1–107 批**；本日志＋第 108 批队列。
12. ⚠ **本批欠的证据（写清，别当已结案）**＝**零屏上动作** ⇒ ① V101 的意图闸门可达性（含"两套闸门分叉"那条预测）**全靠代码断言**；② G1087（Mermaid 是否有界面入口）＝只读到分派代码、没有入口证据；③ G1079（容器变宽）与 G1076（框选）继续挂着；④ G1085 的"英文 locale 下 11 份"是由代码推论、**未复采**。
13. ☆ **现场状态＝零残留**＝`manifest.jsonl` **148 行不变**（零写入批按"不追加"口径）；沙盒 0 建 0 删；账户偏好未动；**本批一次浏览器调用都没有**；`src/` 零改动（采集批）；☆ **§〇 台账两节合计 14 行、状态全部＝`未动`**＝「五」7 行（6 个 ID）＋「六」7 行；**待用户点头的本地改法＝这 13 个条目**（其中 G1073 已被本批 G1084 改判取代 ⇒ 实为 12 项可动手），优先级建议见队列⑨。

### 第 108 批队列

1. ★★★ **意图闸门的四条屏上验证**（结掉 V101 全部欠账，**全部只读、不需要写入授权**）＝① 鼠标点进输入框 vs `Tab` 进输入框，比较环的有无（裁"全局态 vs 逐元素"）；② 在搜索框里按方向键后立刻 `Tab` 到任务卡片，读 `data-whatintent` 是否仍为 `mouse`、卡片环是否出现（裁"两套闸门分叉"）；③ 触摸模拟下按住卡片看 `:active` 系样式；④ 硬重载后先读 `sessionStorage` 两键再读 `documentElement` 属性。⇒ 顺带把 §三十三.三 里"`data-what*` 上不会出现 `pointer`"这条代码推论复验掉。
2. ★★★ **框选（rubber band）屏上验证**（沿用第 107 批队列①，⚠ **属写入批**＝要建沙盒，需重新单独开口头授权）＝结 G1076 与 V100 第 6 条；三判据＝矩形可见 ＋ 「已选 N 项」文案 ＋ `role=checkbox` 计数。
3. ★★ **容器查询的屏上行为验证**（沿用第 107 批队列②）＝① 折叠侧栏时 `_mainWrapper_6sjpd_20` 的实际宽度变化；② 列表视图三档列显隐是否按**容器宽**切换 ⇒ 直接指导本地 `TableView.tsx` 的列分档；☆ 需要窗口可见，不可见就按纪律先请用户把窗口显示出来、**不做导航重试**。
4. ★★ **`storedLangCode` 的写侧字段名**＝用一次 `blocks add` 建代码块（沙盒、写入批）＋ `blocks get --format json` 读回 ⇒ 结 `model.md §一之六十五`「仍未采到」第一条；☆ 顺带采"选中 `other` 档时写入的是什么"。
5. ★★ **Mermaid 面**＝读 `MermaidRender-DrFu6-mF.js` 本体（`themeId` 取值表、支持的图类型、失败态文案）＋ 屏上找入口（是否有 slash 命令／菜单项）⇒ 结 G1087。
6. ★★ **`_6sjpd_` 同段 12 个常量的使用点**（`T_=208`／`QJ=240`／`ob=200`／`FEt=268`／`hm=65`／`uS=100` 等）＝纯盘上，读到用处才能判"侧栏宽／页头高"；☆ `tok-*` 28 档的**具体配色**（同一 chunk 的 `highlightStyle` 另一半）。
7. ★ **补齐强调色上段**＝六套 × `-550…-900` 的逐档 RGB（第 107 批只给了基色三元组与下段 alpha 式）＋ `--heading-*` 的**消费点**（哪些类在用）；☆ 语言包 12 份 `translationCaches` 的体积。
8. ★ **`/calendar` 屏资产并集复验**（沿用第 107 批队列③，上批 `title()` 超时未做）＝确认是否存在第 14 份 CSS。
9. ★ **点头即可动手的本地改法**＝`gap.md` §〇「五」＋「六」合计 13 个条目（**12 项可动手**，G1073 已被本批 G1084 取代）＝优先级前七建议：**G1068（暗档 2 行值，成本 1、可见 bug，第 105 批登记、已连续三批未动）→ G1080／G1081（意图闸门＝引入或自写 `what-input`，本批已给出全部落地参数）→ G1075（`--st-*` 接口＋两档 z 层）→ G1072（`--font-sans` 栈显式化）→ G1070（math 锁版本或声明有意偏差）→ G1084（字形探测通路，★ 替代上批那条错的"把 `AdobeBlank` 挂到字体栈末位"建议）→ G1077（换脸与三档焦点环）**；☆ 其余 6 项（G1079／G1086／G1087／G1088／G1089＋G1090／G1091）成本 2–3，排在后。
10. ☆ 其余旧项＝回收站屏正文预览是否显示／键盘移动块 4 条命令／`CodeEditorFocusMode`（4,757 字符独立 chunk）的触发入口／`grammar` 能力面比 39 档大多少的量化。

### 第 108 批日志（2026-09-30 16:1x–16:5x 本地＝UTC 08:1x–08:5x，★★★ **盘上＋屏上混合批＝零沙盒、零写入、零删除、零偏好改动**；盘上读 `_harvest/js/` 历批缓存的 105 个 chunk（**未新增任何下载**）＋ 屏上 8 次只读 `evaluate_script`，收尾把两枚 `data-what*` 与 `sessionStorage` 还原为 `mouse／mouse`、屏面回到 `/trash`；★ 选题来源＝第 108 批队列①③⑥⑦；★ 本批连出**三处推翻自己历批判定**的 ✎）

1. ★★★ **代码块主题体系结案＝一个工厂 ＋ 21 键名册**（队列⑥）＝名册逐字 `ue={auto:null, craftdark, craftlight, atomone, aura, bbedit, darcula, dracula, githubdark, githublight, gruvboxdark, gruvboxlight, materialdark, materiallight, noctislilac, nord, sublime, tokyonightday, tokyonightstorm, tokyonight, vscodedark}`（⇒ **`auto` 的逐字值是 `null`**、是**合法值**而不是"没选"，解析式逐字＝`De=(o,t)=>o==="auto"?(t?ue.craftdark:ue.craftlight):ue[o]` ⇒ **`auto` ＝跟随界面明暗**）；装配链逐字＝工厂 `gBn` 收 `{theme, settings, styles}` → `li.theme(O, {dark: i==="dark"})` ＋ `uE.define(l)` → 返回 `[theme扩展, syntaxHighlighting(样式)]` ⇒ **颜色随主题走、与 `.cm-*` 的 CSS 无关**；⇒ 本地 `code-block-view.tsx:9-32` 只有 22 档语言 `select`、**零主题名册、零 `theme` 字段、零视图模式** ⇒ `gap.md` **G1093**（判定＝缺失，全新功能面）。
2. ★★★ **`craftlight`／`craftdark` 两套 settings 与 token 色板全量逐字**＝亮档 `{background:"#FBFBFB", foreground:"#3D3D3D", selection:"#BBDFFF", …, fontFamily:"Roboto Mono, monospace"}`、暗档 `{background:"#28292B", foreground:"#CECFD0", caret:"#fff", selection:"#385576", …, gutterBorder:"#f4f4f41f", fontFamily:"Roboto Mono, monospace"}`；★ 两档 token 色板逐档对出**官方是在复刻 GitHub Light／GitHub Dark**（`deleted` 档亮 `#b31d28`／暗系同构）；★★☆ **盘上读到官方一处自身缺陷**＝`deleted` 的 `backgroundColor:"ffeef0"` **缺前导 `#`**（逐字串，登记不修正、按缺陷候选处理）⇒ 本地照抄会静默错色（同一行 G1093 内成文）；✎ **第 109 批复扫更正本条归因**：原记"**暗档**"不准确 ⇒ 实测该串在**四档里逐字相同**＝`craftlight`／`craftdark`／`githublight`／`githubdark` 的 `deleted` 都是 `{color:…, backgroundColor:"ffeef0"}`，且**两档暗色沿用的是亮档粉底 `#ffeef0`**（暗档 `color:"#ffdcd7"` 配亮粉底＝第二处缺陷候选）。
3. ★★★ **语法着色的三处色源结案（结掉第 106／107 批遗留的"高亮到底从哪来"）**＝① 每档主题自带的 `styles`；② `tok-*` 表＝**30 个条目／29 个不同名**、是 @lezer/highlight 的 **class-only 表**，⇒ ★ **本构建里它没有任何配色来源**（历批以为它是"配色表"）；③ `basicSetup` 里的 `syntaxHighlighting(v2n, {fallback:true})`＝CM6 默认十六进制兜底 ⇒ 判定＝**去掉 ② 的猜想、保留 ①③**（G1094＝✎ 修正第 107 批 `longtail.md §三十三.四` 的名册与用途判定）。
4. ★★ **代码块字体逐字＝`Roboto Mono, monospace`**（两套 craft 主题都写）＋ 注入位逐字 `O["&.cm-editor .cm-scroller"]={fontFamily:s.fontFamily}`；同 chunk 内 `Roboto Mono` 出现 **20 处**＝**每档主题都写同一条** ⇒ 与第 106 批名册里 roboto-mono 12 片 `unicode-range` 咬合；⇒ 本地 `src/app/globals.css:11` 的 `--font-mono` **不含 Roboto Mono**（G1095）。
5. ★★★ **官方排版层结案＝四族 token 全量 ＋ 31 个 `.typography-*` 桥接类**（队列⑦，`styles.md` §十五 本段主产物）＝`--ui-*` **60**（15 组合 × 四属性）／`--heading-*` **30**／`--caption-*` **16**／`--body-*` **22** ⇒ **128 个名**；31 条类＝ui 15／heading 7／caption 4／body 5，逐字都带**同一套六件**（`font-family:var(--font-family)` ＋ `-webkit-font-smoothing:antialiased` ＋ `font-variant-numeric:lining-nums` ＋ `font-feature-settings:"lnum" 1,"calt" 1` ＋ size／weight／line-height／letter-spacing，italic 变体再多读一条 `--body-md-400-italic-style`）；★ **这些类全在 `@layer base`**（首条 @14,975，紧跟 normalize.css）**而不在 utilities**；⇒ ★ **第 105 批「排版没有工具类」那句就地 ✎**（`styles.md §十二.6`）＝官方有排版工具类，只是不叫 `.text-<档>`／`.font-*`／`.leading-*`／`.tracking-*`，历批那四条零命中只否掉了 Tailwind 命名（G1092）。
6. ★★ **强调色上段 `-550…-900` 逐字到手＝96 个值、两档方向相反**（队列⑦前半）＝六套 × 8 档 × light／dark；源 `index.css`＝亮档块 @287,638、暗档块 @78,234、`:root` 块 @69,357；样例 `blue` 亮 `44 103 217 → 34 60 111`、暗 `124 184 255 → 195 221 251` ⇒ ★ **亮档逐档变深、暗档逐档变浅** ⇒ 把常量当"绝对色"抄进任一档都会在另一档失效（与第 105 批 brand 七族反向同机制，此处首次拿到完整数值）（G1097）。
7. ★ **`--caption-*` 族内部不自洽候选**＝同 size 两档把 `line-height` 与 `letter-spacing` 写反＝`--caption-md-400-line-height:16px` vs `-500:13.2px`，而 `--caption-lg-400` 与 `-500` 都是 `16px`；`letter-spacing` 亦交叉（`md-400 .01px` vs `md-500 .05px`）⇒ 按"档位越大越松"的直觉会读反（G1098，**官方自身不一致新增一例**）。
8. ★★ **浏览屏网格几何的 12 个常量全部结案（结掉第 107 批"含义未定"那一整段）**＝逐字 `T_=208｜$h=16｜ic=20｜D7=8｜QJ=240｜ob=200｜of=1/1.25｜FEt=268｜NEt=5｜hm=65｜dS=!0｜uS=100`；用处逐条＝**`ob=200` 卡片基准宽**、**`ic=20` 桌面 gap**、**`D7=8` 窄档／移动档 gap**（`({$isMobile:t})=>t?D7:ic`）、**`FEt=268` 卡宽上限**、**`NEt=5` 列数上限**、**`hm=65` 列表行高**、**`of` 卡片宽高比**、**`uS=100` 入场动画毫秒**＋`dS=!0` 开关、**`QJ=240` 空态占位卡宽**；四条公式逐字＝`jme=Ame*2+ob*2+ic`／`Math.max(2,Math.min(n,5))`／`r=Math.min(l,FEt)`／`estimateSize:()=>hm` ⇒ ☆ **第 107 批把 `of` 当作设备像素比是错的**（✎ `longtail.md §三十三`），且**本地按视口断点分档＝方向性差分**（`documents/page.tsx:28,39` 等 5 屏全用 `grid-cols-*` 视口档）（G1096）。
9. ★★★ **输入意图闸门第一次拿到屏上实证（队列①，第 107 批全靠代码断言）**＝在 `/s/<space>/tasks/all` 读到 **`data-whatinput="keyboard"` 与 `data-whatintent="mouse"` 在同一时刻同时成立** ⇒ **第 107 批 G1082 的"两套闸门（静态层读 intent／运行时层读 input）分叉"从代码断言升为 `✓实测`**（G1099）；机制逐字复述＝`Aa`（keydown／pointerdown／touchstart 等）同改两枚、`Pa`（pointermove／mousemove／wheel）**只改 intent**；☆ 收尾现场还原＝两枚属性回到 `mouse`。
10. ★★ **表单控件冻结规则＝例外分支裁到了、主分支没裁到**＝**不在 `form` 里的 `button`** 聚焦后合成 `keydown` ⇒ intent 照常改成 keyboard ⇒ 实证 `pa` 名单与 `button ∉ form` 例外都在官方运行时生效（★ 且 `document.querySelector('button').closest('form')` 实测为 `null`＝**Craft 页面里没有 `<form>` 元素**，该例外是常态而非边角）；⚠ **主分支（在 input／select／textarea 里敲键盘不改 intent）没裁到**＝`el.focus()` 对 Craft 的 checkbox 不生效（`activeElement` 变成外层 `span`）⇒ 记为待复测（G1099 内的限定，结在 V102 第 3 条）。
11. ★★★ **新仪器边界＝`document.hasFocus()===false` 时 `:focus` 全链不匹配**＝本批在 `visibilityState:"visible"` ＋ `document.activeElement === 目标卡片` **两条都成立**的情况下，`el.matches(':focus')` 仍为 `false`、`hasFocus()` 仍为 `false` ⇒ 焦点类样式读数一律判"仪器不可用"；★ **历批「焦点环三档（＋1.5／−2／−1）」在此状态下不可信，但本批按仪器边界登记（G1100），绝不据此判"官方无焦点环"**；⇒ ☆ 由此**队列① 里"DS 按钮环出来、任务卡片环不出来"那条预测本轮无法取证**，与 `:hover`→`:active` 触摸档实证一起挂第 109 批，前置＝用户把窗口置于前台。
12. ★★ **具名容器运行时生效、但"列显隐"的落点没找到（队列③，G1079 的运行时半结案）**＝`/tasks/all` 屏读到 `_mainWrapper_6sjpd_20` 的 computed **`containerType:"inline-size"` ＋ `containerName:"web-shared-layout-main-wrapper"`**、**`clientWidth=703` 而 `window.innerWidth=991`（差 288＝侧栏）** ⇒ 第 106 批"两套断点体系、几何读数应改读容器宽"升为实测；⚠ **同一时刻 DOM 里零个 `_col*` 元素** ⇒ "列显隐按容器宽"只能判到"CSS 里有这条规则"，**新欠账已列第 109 批队列①**（G1101）。
13. ★ **两条诊断属性与持久化拿到屏上实证**＝① `data-whatclasses` 的"只换第一个空格"缺陷形在真实 DOM 上成立（逐字 `"_viewport_1ltym_9,_scrollViewport_6sjpd_33 _vertical…"`＝第一个空格变逗号、后面仍是空格）⇒ **G1080 里 `replace(" ", ",")` 无 `g` 的第一次实证**；② `data-whatelement` 随焦点元素标签走（`div → span → button → null`）、**`focusout` 一次把两个诊断属性一起 `removeAttribute`**（G1102）；③ `sessionStorage` 两键 `what-input`／`what-intent` 实测在写（进屏 `mouse／mouse`，实验后同步变化，收尾已还原）＋ `document.documentElement` 上 **`data-whatpersist` 为 `null`**（官方没显式关持久化）⇒ ☆ 含义＝**硬重载后"上一次输入方式"仍在**（G1103）。
14. ★★ **代码块实体的第二条设置与四枚呈现态文案**（`model.md §一之六十六`）＝字段候选表三条＝`language`（★ 块上存的是 **`storedLangCode`**、不是 `langCode` 也不是 `label`，⚠ **写侧字段名未取证**）、`theme`（默认值应为 `auto` 而非某个具体主题）、`isDark`（★ 读到的是设置对象上的 `S.id`／`S.isDark`，**作用域未证**＝块级／文档级／空间级三选一都没证据）；呈现态四枚逐字＝`blockdetails.edit.code`「编辑代码」＋`blockdetails.code.split.view`「拆分视图」＋`blockdetails.code.close.preview`「关闭预览」＋`blockdetails.full.screen.mode`「全屏模式」⇒ **图与公式不只是"渲染成 HTML"，而是有可切换的编辑面**；☆ 顺带＝语言面板与主题面板是**同一族 UI**（`blockdetails.theme`／`blockdetails.search.themes` 与 `blockdetails.language`／`blockdetails.search.languages` 成对）＋ 浏览屏是"同一份数据的两种布局"（网格与列表）＋列表行高写死 65 ⇒ **表里的 `?` 全部按未取证处理，不得当字段事实改动本地模型**（成文于 `gap.md` G1093／G1096）。
15. ★★★ **本批三条自我推翻全部就地 ✎**＝① `tok-*` 名册被驼峰截断（历批 28 → **29**，`longtail.md §三十三` 已改）；② `of` 不是设备像素比而是卡片宽高比（`longtail.md §三十三` 第二条 ✎）；③ **「14 个消费者 ⇒ 代码块是跨面组件」作废**＝`vendor-code-editor-BLm003PU.js`（3,564,744 字符）被 **53 处 side-effect import ＋ 14 处具名 import** 引用，**但 14 处具名里 13 处只引 `_`＝Vite 的 `__vitePreload` helper**，真正引 CM6 符号的**只有 `CodeEditorWrapper-DB8UxA00.js` 一个 chunk**（一次引 8 个符号）⇒ 正确结论＝**CM6 是"单一消费者"组件**（`internals.md §四十六.6` ✎ ⇒ 新登记 **G1104**）；⇒ ☆ **共性归因＝三处都是"正则／计数出口前少跑一次复核"**，与第 104 批「落点假说先自检」、第 106 批「写『找不到』前先全库检索」同族。
16. ☆ **本批新增三条工具纪律**＝① **标识符名单的正则必须允许驼峰**（`tok-[a-z]+` 直接漏掉 `tokKeyword`／`tokTypeName` 一类）；② **判"跨面／多处使用"要先按符号拆 import 或按引用点分类**，数 import 语句会系统性高估；③ **读 `:focus`／`:hover` 类样式必须先断言 `document.hasFocus()`**，四段断言（`visible` ＋ `hasFocus` ＋ `activeElement===el` ＋ 计算样式）缺一即作废该次读数（已写入 `project-crafty-harvest-tooling-discipline`）。
17. ☆ **八件落盘清单**＝`gap.md` §三点一〇五七→**§三点一〇五八（G1092–G1104，1083→1096 条，本段 ＋13）**＋ §〇 新增「七、第 108 批新登记的待办」7 行；`styles.md` **§十五**（本段主产物＝四族 token 全表 ＋ 31 条桥接类逐字 ＋ 上段 96 值两档表 ＋ 本地对照，另 §十二.6 就地 ✎）；`internals.md` **§四十七**（装配链／设置→CSS 映射／三处色源含 `tok-*` 判定／四条网格公式／intent-input 写入分工的屏上实证／`hasFocus` 仪器边界／方法学与 G1104 自我纠正，另 §四十六.6 就地 ✎）；`model.md` **§一之六十六**（字段候选表 ＋ 三档呈现态 ＋ 浏览屏两布局）；`interactions.md` **V102**（屏上实证七条 ＋ 三条判据增量 ＋ 本地落点）＋ V100 尾部两条 ✎ 结案；`longtail.md` **§三十四**（21 键名册／两套调色板与 token 色板逐字／12 常量用处表／修正后的 `tok-*` 名册／ui-caption-body 值表／`vendor-code-editor` 引用面逐符号拆分）＋ §三十三 两处 ✎；`features.md` 计数行→**1096 条／最大 G1104／第 1–108 批**＋「仍未采到（静态面）」新增 `:focus` 一行；本日志＋第 109 批队列。
18. ⚠ **本批欠的证据（写清，别当已结案）**＝① 三档**焦点环屏上证据仍为零**（两次撞在同一条 `hasFocus:false`）；② **主分支（输入框里冻结 intent）未裁**；③ `_col*` 的渲染落点没找到 ⇒ 列显隐仍停在"CSS 里有规则"；④ `storedLangCode`／`theme`／`isDark` 的**写侧字段名与作用域零证据**（队列④属写入批）；⑤ 框选 G1076 **连续第 4 批零屏上证据**；⑥ 其余 **18 档主题的调色板未逐档采**（只做了 craft 自研两档）；⑦ Mermaid 入口 G1087 本批未动；⑧ `data-whatclasses` 缺陷形对官方样式的实际影响未查；⑨ `--heading-*` 的消费点只做了"桥接类读它"这一半。
19. ☆ **现场状态＝零残留**＝`manifest.jsonl` **148 行不变**（零写入批按「不追加」口径）；沙盒 0 建 0 删；账户偏好未动；**本批对回收站／任务面没做任何数据观察**（只读焦点、属性与几何），但 `sessionStorage` 与焦点态确曾改动 ⇒ 已还原并逐条读回确认；`src/` 零改动（采集批）；☆ §〇 台账「五」＋「六」＋「七」三节合计 **21 行、状态全部＝`未动`**；**待用户点头的本地改法＝这 20 个条目**（G1073 已被 G1084 取代），优先级建议见队列⑧；☆ **一条时间卫生修正**＝第 107 批各节头原记 `15:4x–16:5x 本地＝UTC 07:4x–08:5x`，按 `git log` 该批提交时刻（16:01）校正为 `15:4x–16:0x 本地＝UTC 07:4x–08:0x`（10 个文件各一处、已同步改；本批自身的 16:1x–16:5x 也已从初稿的 17:0x 对齐到机器钟）；☆ **本节头窗口的含义**＝`16:1x–16:5x` 指**读数窗口**（盘上扫描＋屏上 8 次只读调用），落盘与校验跨到 17:0x（产物提交 `9d8bd56` 于 17:01）⇒ 今后节头一律标"读数窗口"，避免与提交时刻对不上。

### 第 109 批队列

1. ★★★ **`_col*` 的渲染落点**（本批新欠账，纯盘上零预算）＝G1101 证明容器运行时生效、但屏上 DOM 里零个 `_col*` 元素 ⇒ 先回答"这些类在哪个组件里被挂上／什么条件下才出现"（候选＝列表视图在别的屏、或需要列宽计算完成后才写类名）⇒ 结掉后才能判本地 `TableView.tsx` 要不要做容器分档。
2. ★★★ **真实键盘 `Tab` 进输入框 ⇒ 复现 `pa` 主分支**（⚠ **需用户把窗口置于前台**）＝本批 `el.focus()` 打在 Craft 的自定义控件上会把 `activeElement` 留在外层 `span`，主分支因此没裁到；取证口径＝合成 `keydown` 后读 intent 是否**不**变，同时读 `data-whatelement`。
3. ★★★ **三档焦点环复测**（同上前置，结 G1100 与 V102 挂账）＝四段断言齐（`visibilityState` ＋ `hasFocus()===true` ＋ `activeElement===el` ＋ 计算样式）后重量历批三档（通用 ＋1.5px／tab −2px／卡片 −1px），并顺带裁"DS 按钮环出来、任务卡片环不出来"那条分叉预测。
4. ★★ **`storedLangCode`／`theme`／`isDark` 的写侧字段名与作用域**（⚠ **写入批＝建沙盒 ＋ `blocks add`，需重新单独开口头授权**）＝结 `model.md §一之六十六` 字段候选表的三条 `?`；顺带采"选 `other` 档时写入什么"与"主题改了之后落在块上还是文档上"。
5. ★★ **框选（rubber band）屏上验证**（⚠ **写入批**，连续第 4 批欠账）＝结 G1076 与 V100 第 6 条；三判据＝矩形可见 ＋ 「已选 N 项」文案 ＋ `role=checkbox` 计数。
6. ★★ **其余 18 档主题的 settings 与 token 色板**（盘上）＝逐档读 `so／bo／ho／lo／yo／wo／Co／Do／Fo／Mo／jo／Ro／To／Ho／Po／Uo／Go／$o`（＝`atomone`／`aura`／`bbedit`／`darcula`／`dracula`／`githubdark`／`githublight`／`gruvboxdark`／`gruvboxlight`／`materialdark`／`materiallight`／`noctislilac`／`nord`／`sublime`／`tokyonightday`／`tokyonightstorm`／`tokyonight`／`vscodedark`）⇒ 目的是判"本地内置 20 档、还是只做 craft 两档 ＋ 一个兜底"。
7. ★★ **`--editor-*` 与代码块主题的关系**＝本地 `globals.css` 的 `--editor-fg` 一类是否该成为代码块的第二条色源；判法＝在官方侧查 `--editor-*` 有没有进入编辑器主题装配（若没有＝两套体系，本地不要打通）。
8. ★ **点头即可动手的本地改法**＝`gap.md` §〇「五」＋「六」＋「七」合计 20 个可动条目，优先级前七建议：**G1068（暗档 2 行值，成本 1、可见 bug，已连续四批未动）→ G1080／G1081（意图闸门＝引入或自写 `what-input`，第 107 批给全部落地参数、第 108 批已屏上证实两属性写入分工）→ G1093（代码块主题名册 ＋ `auto` 默认 ＋ 视图三档）→ G1096（网格四公式与几何常量＝本地按视口断点分档的方向性差分）→ G1092（排版四族 ＋ 31 条桥接类，★ 注意"类挂组件、不靠继承"）→ G1075（`--st-*` 接口 ＋ 两档 z 层）→ G1072（`--font-sans`／`Roboto Mono` 栈显式化）**；☆ 其余 13 项成本 2–3，排在后（G1094／G1095／G1097／G1098／G1099～G1104 多为"照抄值"或"登记不修"）。
9. ☆ 其余旧项＝`/calendar` 屏资产并集复验（第 106 批 `title()` 超时未做，确认有无第 14 份 CSS）／`CodeEditorFocusMode`（4,757 字符独立 chunk）的触发入口／Mermaid 面（G1087）／键盘移动块 4 条命令／`grammar` 能力面比 39 档大多少的量化／触摸档 `:hover`→`:active` 实证。

### 第 109 批日志（2026-09-30 17:0x–17:4x 本地＝UTC 09:0x–09:4x，★★★ **盘上＋数据面写入＋屏上只读混合批＝一个沙盒文档（6 个代码块）建 → 读回 → 软删还原**；屏上 11 次 `evaluate_script`（其中 3 次是状态还原与自检）＋ 1 次 `navigate_page` ＋ 2 次连接器 `press_key`；★ 本批**作废本批自己的一条读数**（G1112），并**两次按禁区停手**；`manifest.jsonl` 149 → **150 行**）

1. ★★★ **代码块写侧字段一次结案（队列④，本目录第三次用"写入读回"证字段）**＝沙盒 `QODER-HARVEST-B109-CODEFIELD`（`documents create --destination unsorted`）→ `blocks add --markdown` 插 fenced code → `blocks get --format json` 读回逐字＝`{id, type:"code", language:"python", rawCode:"print('qoder-b109')", markdown:"…"}`；⇒ 三条：① **正文载体＝`rawCode`**（历批一直假设 `content`）；② **存的是 `storedLangCode`**＝用"分歧档"打法一枪定案（`typescript` 而非 `tsx`、`cs` 而非 `csharp`、`math_formula` 而非 `stex`、**`plaintext` 的 `langCode` 是 `null` 却照样存 `plaintext`**）；③ **未知语言 `qqqlang` ⇒ `language` 整键不存在**（不报错、不回落）⇒ ☆ 本地 `src/components/editor/extensions/code-block-view.tsx:36` 的"空值兜底成 `plaintext`"是**反向建模**（G1105／G1106）。
2. ★★★ **主题不是块级字段＝静默丢字段**＝`blocks add --json '{"type":"code","rawCode":"f","language":"rust","theme":"dracula","isDark":true}'` ⇒ 回执 `Added 1 block`、读回只剩 `{id, type:"code", language:"rust", rawCode:"f", …}` ⇒ `theme`／`isDark` **两键消失且不报错**；⇒ ★ **第 108 批"块级"假设被否**，作用域候选收窄为文档级／空间级／另一条未暴露的 mutation；⇒ ☆ 同一条 `rust` 的 `language` 被保留 ⇒ **丢键不是"未知字段一律丢"的通用行为**，而是这两个键不属于块模型（这条区分很重要，否则会被读成"MCP 会丢所有未知字段"）（G1107）。
3. ★★★ **20 档主题逐档结案（队列⑥）＝每档一个"入参被忽略"的工厂**＝形状 20 档全同 `Xf=o=>{const{theme:t="light|dark",settings:a={},styles:r=[]}={};return I({theme:t,settings:{...<对象>,...a},styles:[<内联 tag 条目>,…,...r]})}` ⇒ ★ **解构源是字面量 `{}`、`o` 恒不生效** ⇒ **主题表是封闭常量集**、不可传参覆写；逐档 `tag` 条目数＝materialdark 36／nord 36／gruvboxdark 34／gruvboxlight 34／aura 20／materiallight 20／tokyonight 三档各 20／vscodedark 17／githublight 15／noctislilac 15／githubdark 14／bbedit 13／sublime 11／craftlight 9／craftdark 9／darcula 9／atomone 8／dracula 8；⇒ ☆ 20 个工厂体全文留档 `_harvest/b109-theme-<id>.txt`（不进仓库）；⇒ ☆ **只有 7 个 settings 对象逐字到底**（`We／Ue／Ke／Ge／Qe／tt／Je`），其余 14 档 `background` 未抄 ⇒ 已列队列④。
4. ★★★ **顺手结掉第 108 批留的"dark 标记错配"一问＝标记唯一来源是面板里写死的字段**（CM6 侧逐字在 `vendor-code-editor-BLm003PU.js`＝`var g=li.theme(O,{dark:i==="dark"}), w=uE.define(l), Q=[g,R6e(w)]`）⇒ ★ **错配 3 档**＝`craftdark` 标 `"light"` 而底色 `#28292B`、`materiallight` 标 `"dark"` 而底色 `#FAFAFA`、`tokyonightday` 标 `"dark"` 而底色 `#e1e2e7`；⇒ ⚠ **`auto` 在暗档下解析成 `craftdark` ⇒ 错配命中默认路径**，但可见影响范围**没有屏上证据**（Craft 把 background／foreground／caret／selection／gutter 全写死在 settings，错配大概只波及 settings 未覆盖的 CM6 内建项），故只登记"标记与真实明暗相反"这条确定事实（G1108／G1118）。
5. ★★ **官方色值缺陷累计到 3 处 ＋ 一处"看着像错其实合法"**＝① `gruvboxdark` 的 `color:"#fb4934d"`＝**7 位十六进制非法**，且 `annotation` 在同一条 styles 里**重复注册**（下一条 `tag:[e.number,e.changed,e.annotation,…]`）⇒ CM6 首条命中 ⇒ **`annotation` 永久无色**；② 同档 `borderBottom:"1px dotted #fb4934d"` 同一非法串 ⇒ 虚线失效；③ 承上批 `backgroundColor:"ffeef0"` 缺 `#`（✎ 本批复扫＝**四档逐字同一串**＝`craftlight`／`craftdark`／`githublight`／`githubdark`，且两档暗色沿用的是亮档粉底 ⇒ **上批"暗档"归因已在本日志第 2 条就地更正**）；④ ☆ `materiallight` 的 `color:"#E5393570"` 是**合法 8 位 RRGGBBAA** ⇒ **免修正标记**，别"顺手规范化"（G1109）。
6. ★★★ **焦点环屏上实测结案（队列②③的前半，清掉历批四批欠账）**＝用户把窗口切前台后 `hasFocus():true` ⇒ 对 `mainWrapper` 内 10 枚可聚焦元素逐枚 `focus()` ＋ 现场断言 `activeElement===目标` ⇒ **`:focus` 与 `:focus-visible` 10/10 全匹配** ⇒ **G1100 判为纯仪器边界**；★ 当库自己把 `data-whatinput` 写成 `keyboard` 后 DS 按钮环逐字＝`outline: solid 1px rgb(113,178,255)` ＋ `outline-offset:-1px` ⇒ **与主包与 CSS 里的模板串 `outline:1px solid var(--accent-500);outline-offset:-1px;` 完全对上**、环色＝第 107 批暗档 `113 178 255` 交叉咬合；★ 两档属性打回 `mouse` 时同一按钮 `outline-style:none` ⇒ **闸门确实是 `input` 属性**；☆ 链接实测 `outline-style:none` ＋ `offset:1px` ⇒ 鼠标档下链接无环（G1110）。
7. ★★★ **新换算律＝屏上"发丝线"类读数要 ×DPR 才是声明值**（本桥 DPR 1.25）＝自插锚点探针实测 `border:1px → 0.8px`、`outline:medium`(3px) `→ 2.4px`、`outline-offset:1px → 0.8px`，而同探针 `width:100px`／`font-size:20px`／`line-height:20px`／`getBoundingClientRect()` **全部原样** ⇒ ☆ **只有 `border-width`／`outline-width`／`outline-offset` 被 snap 到设备像素**；⇒ ★ 历批"焦点环三档 1.5／−2／−1px（声明）与屏上 0.8px 不一致"的疑点**就此消解＝没换算，不是官方不一致**；⇒ ☆ 交叉校准两条＝DS 按钮（`MediumSmall`）实测 `height:32px` ＋ `font-size:13px` 与第 100 批"28／32／34"、第 105 批"`--ui-md` 13"逐字咬合（这两个量不受量化影响，正好当锚点）（G1111）。
8. ★★★ **本批最贵的一条＝自己踩出来的仪器陷阱，并作废本批一条真按键读数**＝先把 `data-whatinput`／`data-whatintent` 强写为 `mouse`，再用连接器打一次**真实** `Tab` ⇒ 窗口捕获日志逐字＝`keydown`／`Tab`／`Tab`／`kc9`／`trtrue`／`ae A`（**送达且 `isTrusted`**），结果 **`sessionStorage` 两键翻成 `keyboard/keyboard`，而 DOM 两枚属性仍是 `mouse/mouse`** ⇒ 真因＝库内部保存 current intent，**新值与内部值相同就不再写 DOM**；⇒ ★ 那条"真按键没切档"读数**判废**（G1112），**不得**写成官方行为；⇒ ☆ 通用形态＝**"外部写入 ＋ 内部状态"双写的机制，人工写入之后所有"没变化"的读数都不可定性**（本桥无法重置库内部状态 ⇒ 只能重开页面）。
9. ★☆ **一条会改写历批归因的小事实＝合成 `KeyboardEvent` 必须带 `keyCode`／`which`**＝只给 `key:'Tab'／code:'Tab'` 时 what-input 全程无反应（属性与 `sessionStorage` 都不动）；补 `keyCode:9, which:9` 后**同一条通路立刻生效** ⇒ ★ **历批一部分"合成键推不动"不是官方校验 `isTrusted`，是 handler 读 `keyCode`**（第 107 批从代码读到 `ma=[16,17,18,91,93]` 是 `keyCode` 表，当时没意识到探针要照它写）。
10. ★★★ **`_col*` 的渲染落点结案（队列①，G1101 就地改判为已清）**＝列表视图的整套类在主包里是一张**逐字常量表 ＋ 聚合对象**（`w$t="_headerRow_1m9yz_8"` … `Y$t="_newDocTag_1m9yz_314"` ＋ `rn={…}` 共 27 键）；⇒ ★ **CSS-Module 的哈希类名以字符串常量形式内联进 Vite 产物** ⇒ **只要拿到任一哈希就能捞出该组件全部类名**（本目录第一次把一个组件的类名采全，含三个此前毫无线索的状态类 `isUnavailableOffline`／`selected`／`newDocTag`）；⇒ ★ "DOM 里零个 `_col*`"的**真因是当前布局是网格**（网格另走 `6sjpd:docGrid` ＋ `1wotv:virtualBody/virtualCardRow` ⇒ **网格也是虚拟滚动** ＋ 卡片 `dhebv:…selectionCheckbox` ＋ 复选框 `1fgll`）⇒ **不是 bug**；⇒ ☆ 新立判据＝**判"某类元素不存在"必须先判布局档**。
11. ★★★ **列宽同步机制＝`aW()` 钩子 ＋ `ResizeObserver`**＝三个表头 `useRef` → `c.style.setProperty("--col-last-viewed-width", n.current.offsetWidth + "px")`（三键同构）→ 先立即测一次 → `new ResizeObserver(d)` 观察三枚表头 → 卸载 `disconnect()`；CSS 侧消费＝`width: var(--col-last-viewed-width, 8rem)` 等三条；⇒ ★ **三个 `--col-*` 在 13 份官方 CSS 里定义 0 处／消费 3 处**＝宿主注入接口，不是主题变量；⇒ ☆ **"JS 写、CSS 消费、两处各写一遍兜底值"的又一例**（与第 107 批 `--st-*` 的 35／45 同族）；⇒ 建模含义＝**表头与虚拟行不在同一滚动容器 ⇒ 靠"实测表头宽 → 变量 → 行内消费"对齐**（本地列表若补，这是唯一能对齐官方形状的做法）（G1114）。
12. ★★ **列类名是"槽位"不是"数据身份"**＝三张表头变体共用同一组 `_col*`，而**"与我共享"屏把 `rn.colLastViewed` 贴在「共享」列上**（逐字 `$e(rn.columnHeader, rn.colLastViewed, rn.sortable, {[rn.active]: w})`，`w = n.sortBy === wi.Shared`）⇒ `@container` 门控的是"第 2／3／4 列"；行壳 `Mx` 的 props＝`{leading, lastViewed, updated, created, trailing, children, className}` ⇒ **六个 DIV 无条件全渲染**（只有 `leading` 判 `!=null`）⇒ **可见性 100% 交给 CSS、JS 不做宽度判断**（与第 104 批"落点数学在 handler 里"同取向＝几何归 CSS、逻辑归模型）；⇒ ☆ 顺带＝同一列标题有两个可用 key（裸 `name`「名称」与 `browse.sort.name`「名称」同值，代码用裸 key）＝官方自身不一致候选（G1115）。
13. ★ **官方"环"至少三套实现**＝① DS 按钮走 `outline`；② 复选框走**具名 DOM 子元素**（模块 `1nu3o` 键集逐字 `outerBox／innerBox／focusRing／isActive`）；③ 卡片走"换脸"（`_idle`→0 ＋ `_action`→1，触摸档被 `:not([data-whatintent=touch])` 排除）；☆ 同屏还读到另两种 checkbox 族（`1fgll:wrapper,checkbox` 与 `dhebv:…,selectionCheckbox`）⇒ **浏览屏至少三种复选框实现**，本地只有 `src/components/ui/checkbox.tsx:12` 一种（`focus-visible:ring-3`）（G1116）。
14. ★☆ **排版桥接类的真实消费点从 1 处补到 4 处（队列⑦的另一半）**＝逐字（同一张类名常量表）＝表头 `typography-caption-md-500`／行标题 `typography-ui-md-600`／行副标题 `typography-ui-xs-500`／三个数据列 `typography-ui-sm-500`；⇒ ★ **哈希类与排版档写在同一个字符串常量里** ⇒ 官方排版档是**组件级显式声明、不靠父级继承** ⇒ 本地落地必须逐组件挂档（并把 `.tiptap h1…h4` 的写死 rem 迁到 token）（G1117；`styles.md` §十五 的未采到第一条已就地 ✎）。
15. ☆ **一条资料卫生＝官方完全没有 `--editor-*`**＝13 份 CSS ＋ 主包 ＋ `CodeEditorWrapper`／`CodeEditorFocusMode`／`vendor-code-editor` 三个 chunk 全零命中；`vendor-code-editor` 里的 `var(--fg)`／`var(--bg)`／`var(--_arrow)` 等 130 处是 KaTeX／excalidraw 自己的内部变量，**不是 app 主题层** ⇒ ★ **本地整套 `--editor-*`（`src/app/globals.css:360` 一带）是自造**＝有意偏差候选，**别当官方对位物去"对齐"**（结队列⑦）。
16. ★ **通路事实（抖动与删除）**＝`craft` MCP 本批出现 **3 次 `-32603`＝"MCP tool invocation did not complete"**，其中一次在 `documents delete --help`（零副作用）、一次在 `documents list`（零副作用）、**一次在真正的 `documents delete`**；⇒ 处置＝**每次报错后都用读回判"到底生效没有"**（读回＝文档仍在 ⇒ 判"未生效" ⇒ 同参重试一次即成功）；⇒ ☆ 与第 96 批"`-32603` 也可能是抖动"一致，本批把它固化为**"破坏性动作报错后必须先独立读回、确认未生效才允许同参重试一次"**（区别于"报错即停"的是：目标 id 唯一且是本批自建实体 ⇒ 重试不可能打到别的实体）；☆ 另＝`documents delete --document` 收的是 **rootBlockId**（`--help` 逐字 `--document <rootBlockId>`）而 web URL 尾段是 documentId ⇒ **"无共享常量表"再添一例**（旗标名与 id 类型都要逐动词查）。
17. ★★ **两次按禁区停手（都写进队列等具名点头）**＝① 要做"列显隐 vs 容器宽"的屏上对照必须把浏览屏布局从网格切到列表，而**布局是空间级持久偏好、会同步到用户其它设备**；② 要实测复选框的 `focusRing` 得进选择模式（视图态改动 ＋ 屏上会默认选中一项，误删风险面见第 99 批）；⇒ ☆ 本批因此**没有**任何点击激活、没有进选择模式、没有开浮层；⇒ 还有一次**结构性做不到**＝对真实 `<input>` 调 `focus()` 后 `activeElement` 落在外层 `SPAN`（与第 108 批在 checkbox 上撞到的同一类现象）⇒ `pa` 主分支**第二次未裁**，只能请用户手按 `Tab`。
18. ☆ **八件落盘清单**＝`gap.md` §三点一〇五八→**§三点一〇五九（G1105–G1118，1096→1110 条，本段 ＋14）**＋ 台账 §〇 新增「八」6 行 ＋ 上批「七」里的 **G1101 就地改判为已清**；`internals.md` **§四十八**（七小节＝容器查询消费面找到／行壳无条件渲染／`aW()` 列宽同步／槽位语义／输入档运行时真相与两条自纠／方法学 ＋ dark 标记来源与错配）；`longtail.md` **§三十五**（20 档主题形状表 ＋ `rn` 27 键类名表 ＋ 三张表头变体 ＋ 缺陷清单）＋ §三十四"其余 18 档未抄"就地 ✎；`model.md` **§一之六十七**（写侧字段表 ＋ 浏览屏第三形状）；`interactions.md` **V103**（八小节＝现场条件／正向证据／环归属／预测未裁／失同步陷阱／换算律／三条判据增量／现场还原）；`styles.md` **§十六**（换算律／环实测表／三套实现／排版消费点）＋ §十五 ✎；`features.md` 计数行→**1110／G1118／第 1–109 批** ＋「仍未采到」里 `:focus` 行改判结案并写四格新欠账；`_harvest/todo-actions.md` 本日志 ＋ 第 110 批队列；`manifest.jsonl` 149 → **150 行**（建 ＋ 还原各一行，LIFO）。
19. ⚠ **本批欠的证据（写清，别当已结案）**＝① **`theme`／`isDark` 的真实作用域**（块级已否，其余三选一未判 ⇒ 要屏幕写侧）；② **列显隐 vs 容器宽的屏上对照**（要切布局）；③ 表头三变体各自对应哪一屏**只有枚举与标签证据**；④ **`pa` 主分支**（两次失败）；⑤ 错配 3 档的**可见影响**；⑥ 其余 14 档 `background`；⑦ `_statusCheckboxVisible`／`isUnavailableOffline`／`newDocTag` 的触发条件；⑧ 触摸档 `:hover`→`:active`；⑨ 亮档环色实测；⑩ **框选 G1076 连续第 5 批零屏上证据**；⑪ 代码块有没有其它属性（`wrap`／字号／"最近使用语言"），本轮读回只有那三键 ＋ 派生 `markdown`。
20. ☆ **现场状态＝零残留**＝沙盒 `QODER-HARVEST-B109-CODEFIELD` **已软删**（删除前 `blocks get --format json` 读回全部 6 个自建块、确认零用户文本，产物里也不复述用户长文本）；`documents list --location unsorted` 回 **3 条**逐 id 与建前相同（`DFF43C2D…`／`5376f8f3…`／`74c0bb3d…`）、`--location trash` 4 条（含本批那条）、`tasks list --scope all` **9 条零 QODER 串**、`reminders list --status all`＝`No reminders found`；屏侧瞬态全部还原＝注入监听已摘（`loggerGone:true`）、两枚 `data-what*` 与 `sessionStorage` 两键回 `mouse／mouse`、`activeElement` 回 `BODY`、诊断属性回 `null`、屏在 `/all`；⚠ **历史残留未动**＝`5376f8f3…`（用户自己的内容）与 `74c0bb3d…`（含三个集合的空页）仍按禁区等用户一句话；`src/` 零改动（本批是采集批，队列⑧的本地改法仍未动）；☆ **§〇 台账「五」～「八」四节合计 27 行＝26 行`未动` ＋ 1 行本批`已清`（G1101）**；☆ **三件校验实测（本日志落盘后立即补跑）**＝`node _harvest/check-tables.mjs *.md` → **ALL TABLES CONSISTENT**（19 份含表产物全扫、异常表 0）；`node _harvest/key-coverage.mjs *.md` → **1886/3639＝51.8%**（上批 1884 ⇒ **升 2 条**，因本批点名了 `browse.sort.*` 与 `shared.by` 等 key）；`node _harvest/sanitize-pii.mjs` → **SANITIZE OK**（39 文件扫描、0 改写、0 替换）。
21. ☆ **产物提交＝`1883daa`**（17:49 本地，7 份 tracked 产物＝`gap／internals／longtail／model／interactions／styles／features`，223 增 7 删；`_harvest/`、`raw/`、`screens/` 全部不入库）⇒ 提交后 `git status --porcelain` 空；☆ 提交后追加的只有本行与项目记忆（都在 gitignore 之外／记忆目录），tracked 树保持干净。

### 第 110 批队列

1. ★★★ **`theme`／`isDark` 的真实作用域（结 G1107 与 model §一之六十七 的头号 `?`）**＝⚠ **屏幕写侧**＝在新沙盒文档里放一个代码块，用 UI 的主题选择器改一次（只改沙盒块），然后 `blocks get --format json` 读回 ＋ 用另一篇文档对照 ⇒ 判它落块上／文档上／空间上；☆ 需要具名点头（改的是沙盒内容的显示属性，不动账户偏好）。
2. ★★★ **浏览屏"列表布局"的屏上对照（结 G1113 的最后一格）**＝⚠ **切换布局＝空间级持久偏好、会同步到用户其它设备 ⇒ 必须单独具名点头，且做完当场切回**；取证四读＝`--col-*-width` 实测值 ＋ 三列在不同容器宽下的 `display` ＋ 折叠侧栏时 `mainWrapper` 宽变化 ＋ 列标题文案。
3. ★★★ **`pa` 主分支**＝请用户**手按 `Tab`** 把焦点走进搜索框，然后在框内按一次字母键，读两枚属性（★ 本桥程序化 `focus()` 与 `press_key` 都拿不到"控件自己持焦"，历批两次失败）；结掉第 107 批那条"两套闸门分叉"预测的正/反。
4. ★★ **其余 14 档 settings 的 `background` 逐字**（盘上，零预算）＝把错配名单从"至少 3 档"定稿为全表；☆ 顺带把每档 settings 的**键全集**列一遍（看有没有 settings 之外的第三类字段）。
5. ★★ **框选（rubber band）屏上验证**（⚠ **写入批**，**连续第 5 批欠账**）＝结 G1076 与 V100 第 6 条；三判据＝矩形可见 ＋ 「已选 N 项」文案 ＋ `role=checkbox` 计数。
6. ★★ **三个状态类的触发条件**＝`_statusCheckboxVisible`／`_isUnavailableOffline`／`_newDocTag`（需要选择模式／离线／刚建文档三种前置态；⚠ 进选择模式要点头）。
7. ★ **触摸档的 `:hover`→`:active` 实证** ＋ 亮档环色复验（需要 DevTools 触摸模拟或真触摸）。
8. ★ **点头即可动手的本地改法**＝`gap.md` §〇「五」＋「六」＋「七」＋「八」四节合计 **27 行台账（＝26 行`未动` ＋ 本批清掉的 1 行 `已清`＝G1101）**，去重后**约 24 项可动**，★ 优先级重排（把"成本 1 且是正确性"的排前面）＝**G1105（摘掉代码块"空值兜底成 plaintext"，1 行）→ G1068（暗档 2 行值，已连续五批未动）→ G1110＋G1080／G1081（焦点环改 `outline:1px` ＋ 补 `data-whatinput`／`data-whatintent` 双属性闸门，一批做掉三件）→ G1092＋G1117（排版四族 token ＋ 桥接类，四档消费点已给）→ G1093／G1108（代码块两档主题 ＋ `auto` 跟随明暗，★ 照抄封闭形状与 `craftdark` 的 dark 错配都要注释）→ G1096／G1114（容器分档 ＋ 列宽同步范式）→ G1113（浏览屏列表布局，最贵）**；☆ 其余为"照抄值"或"登记不修"（G1109／G1111／G1112／G1118）。
9. ☆ 其余旧项＝`/calendar` 屏资产并集复验（确认有无第 14 份 CSS）／`CodeEditorFocusMode` 的触发入口／Mermaid 面 G1087／键盘移动块 4 条命令／`grammar` 能力面比 39 档大多少的量化／`rn` 的 `dragPreviewBase` 在列表视图的拖拽表现。

---

## 第 110 批批次日志（2026-09-30 18:5x–19:4x 本地＝UTC 10:5x–11:4x；**屏上只读＋盘上反编译混合批**；★ 动过一次账户级持久偏好＝浏览屏布局档，已还原；☆ 未建沙盒）

1. ★★★ **代码块主题的作用域结案＝块级，但键在 `pluginData.pluginConfigurationData.themeId`**＝读取侧逐字 `e:{const Q=m.pluginData;if(!Q||Q.pluginName!=="codeBlock"||!Q.pluginConfigurationData){b=null;break e}b=Q.pluginConfigurationData.themeId}` ＋ `const z=y??""` ＋ prop `storedThemeId:z`；⇒ ★ **第 109 批"往 `--json` 塞 `theme`／`isDark` 被静默丢弃"因此改判＝不是官方不落库，而是测错了键**（正确路径在插件数据槽）⇒ G1120，并 ✎ 了 §三点一〇五九 的「仍未采到」①。
2. ★★★ **同一个组件的 prop 列表把两种存储层并排暴露**＝`storedLanguage:t.language`／`storedContent:t.content`（块本体字段）与 `storedThemeId:z`（插件槽）同在一处 ⇒ ☆ 方法论已回写工具纪律＝**判"字段到底存在哪"，沿 prop 名往回找定义点（`z=y??""` ⇒ `y=b` ⇒ `e:{…}` 标签块）比往前读渲染分支快一个量级**，且比"UI 里改了再读回"更硬。
3. ★★★ **主题的写入是一条独立的 `pluginData` action**＝逐字 `S(Ut([o],{pluginType:"codeBlock",pluginName:"codeBlock",pluginConfigurationData:{themeId:L.id},horizontalSizeClass:null,verticalSizeClass:null,surfaceShadowOpacity:1}))`（`S`＝`docDispatch`、第一参是**数组** ⇒ 多选可一次改多块）；⇒ ★ 内容侧是另一条（`x=(Q,Y)=>{r(bRe(t.blockId,Q??"",Y))}` ＝ `updateCodeBlock{blockId,content,language}`，**三参无 theme 位**）⇒ **改主题与改代码在撤销栈上是两步**（G1121）。
4. ★★★ **`pluginData` 是跨插件块的通用槽、同一槽两种厚度**＝codeBlock 只 `{themeId}`；card 家族 `{fontStyle,pageStyle,backgroundData{7 字段},decorations,contentStyle,themeAssetId}`（序列化器 `S1e` 逐字）；`pluginName` 字面量两文件穷尽＝`card`／`codeBlock`／`unknown`（兜底 `return{pluginType:"unknown",…}`）；⇒ ☆ 另有卡片样式枚举 `Xa` 五档逐字（`card.large`／`card.wide`／`card.small.right`／`card.subtle`／`card.small.small.right`）**与 switch 的裸 `"card"` 不同层，未合并**（G1121／`longtail §三十六.二`）。
5. ★★★ **框选落点判据结案＝严格矩形相交**（**连续第 6 批欠账从盘上结掉**）＝`function j7e(t,e){return t.left<e.left+e.width&&t.left+t.width>e.left&&t.top<e.top+e.height&&t.top+t.height>e.top}` ⇒ 四边皆严格不等号 ⇒ **边贴边不算命中**，"整行入框"候选被否；⇒ ☆ 一次性带出七条（起手否决 `EVt`、阈值 `AVt=5`、自动滚动 `Uee=30`／`$ee=200` 且 1.5 次幂、命中集**整体替换**且锚点＝`te.at(-1)`、起手先存旧选择集进 `y.current` 再 `clearSelection()`、矩形 `createPortal` 到 `document.body`＋`position:fixed`＋`z-index:10`、期间 `dragstart`/`selectstart` 全 `preventDefault`）＝G1135。
6. ★★★ **命中器按型制分派、共三型＋一层通用**＝`IVt` 逐字给出 `list`→`Nee(items)`／`cards`→`Nee(folderItems)＋kVt(documentsGrid)`／`waterfall`→`vVt(columns)`；⇒ ★ **网格档是纯算术剪枝**（`floor((band.left−left)/(columnWidth+gap))` 取列区间）⇒ **第 108 批那 12 个网格常量的用途在此**；⇒ ★ 瀑布流是**二分＋线性扫 O(log n＋k)**；⇒ ☆ 由此得本地前置要求＝**先有"型制几何模型"（`items`／`documentsGrid`／`columns`）才谈得上框选**（`bW({enabled,scrollElementRef,layoutGeometryRef,remeasure})`）＝G1136。
7. ★ **矩形为何屏上扫不到，现在有答案**＝它只在拖拽进行帧挂载、`createPortal` 到 `body`、`position:fixed`；⇒ ⚠ **证据等级要分清**＝屏上只证到"起手进 `_selectionMode_dhebv_393` ＋ 1 行 `aria-checked` 翻 true ＋ 未抬指针即自行回退"，**矩形与判据是盘上证的**（G1129 vs G1135 分开登记，不混用）。
8. ★★★ **浏览屏布局恰好三档**（✎ **改判第 109 批 G1113"两套布局"**）＝`div[data-testid="browse-layout-toggle"]`（x1032 y56 112×36，**外层 DIV 不是 BUTTON**）里三枚 DS 按钮，图标逐字 `Rectangle Grid2x2`／`Rectangle3 Group`／`Line3 Horizontal`；★ 选中态判据＝类里 `Filled` vs `Plain`（遮罩实测 `F..`→`..F`→`.F.`→`F..`），**三枚 `aria-pressed`/`aria-checked`/`aria-selected` 全 null** ＝第五次印证 Craft 自有控件零 ARIA（G1119）。
9. ★★★ **容器查询第一次运行时实证**（结 G1101／G1114）＝`div._mainWrapper_6sjpd_20` computed `container-type:inline-size`＋`container-name:web-shared-layout-main-wrapper`＋**`clientWidth:916`**，同屏 `innerWidth:1204`，而「上次浏览」列 `display:none`／`offsetWidth:0` ⇒ **视口已过 1024 而列仍藏 ⇒ 门限吃容器宽**；☆ 全页只有三颗容器（具名 916、未命名 `size` 1204、`browse-document-list` 未命名 `inline-size` 884）⇒ **具名查询可隔级生效、中间无名容器不阻断**（G1124）。
10. ★★★ **列宽同步的运行值＝隐藏列写 `0px`，`8rem` 兜底永不生效**＝`[data-testid="browse-document-list"]`（★ 是 styled-components 壳 `div.sc-1r02f4x-5 kfCFoF`）内联三条逐字＝`--col-last-viewed-width:0px`、`--col-updated-width:112px`、`--col-created-width:112px`；⇒ ★ 消费式 `width:var(--col-last-viewed-width, 8rem)` 的兜底**只在属性未定义时参与** ⇒ **本地"隐藏时不写属性"会差一个 8rem**（G1125）。
11. ★★★ **intent 冻结的主分支结案＝两属性更新条件不对称**（第三次尝试成功，前两次分别死于"焦点没到目标"与"手写属性造成失同步"）＝流程＝① `press_key Tab`（`BODY`→`BUTTON#sidebar-toggle`，两属性一起 keyboard ⇒ 非 `pa` 成员不冻结）② `Control+k` 开面板（`input[data-testid="quick-search-input"]`，`placeholder="打开"`，自动持焦）③ 派发带 `pointerType:'mouse'` 的真 `PointerEvent('pointerdown')` 把两属性摆成 `mouse/mouse` ④ `press_key z` ⇒ **`data-whatinput=keyboard` 而 `data-whatintent` 保持 `mouse`**；⇒ ★ **送达判据用了独立佐证**＝输入框 `value` 由 `z` 变 `zq`（键真进了字段），从此不能用"两属性没变"冒充"官方冻结"也不能冒充"没送达"（G1131）。
12. ★★★ **`data-what*` 存在第 4 个取值 `initial`**＝清掉 `sessionStorage` 两键后重载 ⇒ 两属性逐字 `initial`；⇒ ★★ **样式侧的直接后果**＝`initial` 同时满足"属性存在"与"不等于 touch" ⇒ **首帧 hover 档规则就已生效**，本地复刻必须"装载即写 `initial`"而不是"不写属性"（G1130／`styles.md §十七.二`）。
13. ★★★ **自我作废一次 ＋ 自我修复一次**＝用 `new MouseEvent('pointermove')`（缺 `pointerType`）派鼠标移动 ⇒ 库把 `void 0` 写进属性，**`data-whatintent` 与 `sessionStorage['what-intent']` 同时变成字符串 `"undefined"`**；随后派合法 `PointerEvent` **属性不变（救不回）** ⇒ 该轮读数作废、复原＝清两键＋重载并复核回 `initial`；⇒ ☆ 比 G1112 更糟的一条＝**探针会写穿持久层、跨重载存活**（G1133）。
14. ★★ **列表档整面到手＝22 枚 `_1m9yz_` 类实际渲染**（上批名册 27 条里 5 条静止态不渲染）＋ 表头四列实测（名称 590／上次浏览 **0×0**／已更新 112 带 **`_active`**＝当前排序列／已创建 112）＋ 行壳 `_listRow_1m9yz_142 no-select`、**行高实测 65**（与第 108 批盘上常量首次屏上咬合）；☆ 选择器教训＝先按 `[class*="_col"]` 查命中 5 枚全是 `_collectionName_*` 假阳性 ⇒ **CSS Module 要按哈希段查**（G1123／`longtail §三十六.四`）。
15. ★★ **卡片焦点环与复选框结构实测**＝`_focusRing_1nu3o_7` computed `position:absolute;inset:-1px;border:2.4px solid rgb(113,178,255);z-index:1;display:none` ⇒ ×DPR 还原 **声明 3px**（且 `inset` 未被量化 ⇒ DPR 律只适用于 `*-width` 一族，这条把上批的律收窄一格）；复选框＝`SPAN[role=checkbox][tabindex=-1][data-unchecked][aria-checked][id^=base-ui-]` ＋ 同级隐藏 `INPUT[type=checkbox][tabindex=-1][aria-hidden]`（`clip-path: inset(50%)`）⇒ **行选择键盘不可达**；⇒ ✎ **G1116 归位**＝`focusRing` 属卡片模块 `1nu3o`，`1fgll` 里根本没有（全页 `[class*="focusRing"]` 在表格档 0 命中）（G1127／G1128）。
16. ★★ **寻址属性与一条盲区**＝浏览屏条目挂的是 **`data-item-id`**（实测 8 枚、值 uuid、挂在 `_outerBox_` 上），同屏 `data-block-id` **0 枚**；⇒ ✎ 顺带修正本批自己 G1123 的一句话＝"行壳属性集为空"只对**表格档 `_listRow_`** 成立，卡片档外壳带 `data-item-id`（两条不得合并成"官方浏览屏无稳定 id"）；★ 另＝静止态 `_isActive_1nu3o_62` **8/8 全带 ⇒ 不能当选中判据**（G1137／G1138）。
17. ★★ **`Tab` 序首枚＝`BUTTON#sidebar-toggle`（`aeY:8`）**，且 `data-whatelement` 记的是**事件 target 的标签名**（不是 `activeElement`）⇒ 与 G1102 两条诊断属性行为对上（G1132）。
18. ★☆ **仪器口径两条**＝① `visibilityState:hidden` 时连接器 `press_key` **不送达**，而 `document.hasFocus()` 可为 **true**（实测 `hidden`＋`hasFocus:true`＋`Tab` 后两属性仍 `initial`、`activeElement` 仍 `BODY`）⇒ **`hasFocus()` 不是送达判据**，要用"能被键改动的面"当 canary；② **程序 `el.click()` 不产生 pointer 事件** ⇒ 三次布局切换全程不动 `data-what*`（G1134）；☆ 同批一条老律再复证＝**视口跨调用漂移**（同一会话内 1204→958→1044）⇒ 硬编码坐标一律现取。
19. ☆ **★ 本批动过一次账户级持久偏好**＝布局档切到表格与第三档再切回（用户本轮具名授权）；还原判据三条＝遮罩回到 `F..`、重载后仍是 `F..`（⇒ 该偏好是持久态）、`_1m9yz_` 计数回到 0；☆ 第三档（`Rectangle3 Group`）是**顺带多测的一档**（同控件、同还原路径），量到卡宽 268 与"无 `_virtualCardRow_`"两条；⚠ **未进选择模式点按、未改排序、未改显示开关、未点任何行**。
20. ☆ **零写入面**＝本批**未建沙盒**（主题的写侧由逐字反编译结案，不必再开屏）⇒ `manifest.jsonl` **150 → 151 行**（追加一行"偏好切换＋还原"而非建／删对）；☆ 数据面 `craft` MCP 本批零调用；⚠ **本批一条流程失误（自我登记）**＝为了读主题与框选的逐字，两次用页内 `fetch` 把 chunk 取回落盘（一份 6.8 MB ＋ 一份 59 KB），而收尾检查发现 **`_harvest/js/` 里 105 份缓存中两份都早已存在**（`index-DiTmKH3z.js` 与 `CodeEditorWrapper-DB8UxA00.js` 都在）⇒ **两次抓取全部多余**；⇒ ☆ 已回写工具纪律＝**盘上批开工第一步是 `ls _harvest/js/` 对文件名，命中就不许 `fetch`**（缓存是历批留下的，抓取要花浏览器预算而 `ls` 不花）。
21. ☆ **八件落盘（本批全部写在会话 worktree `C:\Users\omen\.qoder-cn\worktrees\app\6ac7f6\cs`，因 `D:\code\cs` 被另一会话反复切到 `feature/windows-offline-sync`）**＝`gap.md` **§三点一〇六十（G1119–G1140，1110→1132 条，本段 ＋22）** ＋ 台账「九」6 行 ＋ §三点一〇五九 的「仍未采到」①②④⑤就地 ✎；`internals.md` **§四十九**；`longtail.md` **§三十六**；`model.md` **§一之六十八**；`interactions.md` **V104**；`styles.md` **§十七**；`features.md` 计数行→**1132／G1140／第 1–110 批** ＋「仍欠四格」改「仍欠三格」；`todo-actions.md` 本日志＋第 111 批队列；⚠ **落盘过程中被校验脚本抓到 3 张表列数不一致**＝两条表格行漏了「判定」列 ＋ 逐字串里的逻辑或 `||` 被当成表格分隔符 ⇒ 修法＝补列 ＋ **表内逐字把 `||` 写作全角 `｜｜` 并在同格标注真机是半角**（不要写 `\|`），复跑后 `ALL TABLES CONSISTENT`；☆ 三件校验＝见下一条。
22. ☆ **三件校验（cwd＝本 worktree 的 `docs/craft-ref/features`，一律带 `*.md`）**＝`node _harvest/check-tables.mjs *.md` → **ALL TABLES CONSISTENT**（19 份含表产物全扫、异常表 0；★ 中途曾报"共 3 张表列数不一致"，成因与修法见上一条）；`node _harvest/key-coverage.mjs *.md` → **1886/3639＝51.8%**（与上批同值＝**零倒退但未升**，因本批几乎没点新 i18n key，采的都是键路径与类名）；`node _harvest/sanitize-pii.mjs` → **SANITIZE OK**（38 文件扫描、0 改写、0 替换）。
23. ☆ **落盘位置的例外（本批一条流程事实，务必读）**＝`D:\code\cs` 被另一会话反复切到 `feature/windows-offline-sync`（reflog 实测 19:00 与 19:30 两次，中间我 19:24 切回 main 被再次切走）⇒ **本批八件全部写在会话 worktree `C:\Users\omen\.qoder-cn\worktrees\app\6ac7f6\cs`**，该处 HEAD 已从 `391f128` 前进到 `1883daa`（＝main 当尖），并把 `D:\code\cs\...\_harvest/` 整目录拷来当工作副本；⇒ ⚠ **两侧 `_harvest/` 现已分叉**（D 侧停在第 109 批末，C 侧含第 110 批日志／manifest 151 行／`b110-probe6.txt`）⇒ 收尾动作＝把增量三样拷回 D 侧，下批开场第一步＝`wc -l _harvest/manifest.jsonl` 两侧对值再动手；⇒ ☆ 提交在 C 侧的 `harvest-b110` 分支上，**合并进 main 由用户决定时点**（不在另一会话持有的工作树里抢分支）。
24. ☆ **产物提交＝`b34b139`**（分支 `harvest-b110`，父提交＝`1883daa`＝main 当尖，7 份 tracked 产物 ＋369/−4，提交后 `git status --porcelain` 干净）⇒ **main 尚未含第 110 批**，合并时点交用户决定；☆ 本条同时记收尾完成＝`_harvest/` 增量已拷回 `D:codecs`（`manifest.jsonl` 150→151 行、`todo-actions.md` 2931→2972 行，拷前两侧做过**严格前缀比对**确认零覆盖；`b110-probe6.txt` 两侧已逐字相同）⇒ 两侧 `_harvest/` 重新同值；⚠ 另见 D 侧多出一个我没建的 `_harvest/_x1.cjs`（属另一会话的工作副本，未动、仅登记）。

**⇒ 第 111 批队列**（★ 每条都写了前置与判据，顺序即建议顺序）

1. ☆☆ **零预算盘上核对项（新开）**＝把 `longtail §三十六.一` 的主题名册 `V.settings` 名（`Bo` 等）与第 109 批 §三十五.一 的工厂名（`Mo = Lo()`）对上＝`Bo`→`Lo()`→`Mo`→`ue.materialdark` 是否成立；★ 判据＝在 `_harvest/js/` 缓存里找工厂定义点，不许按名猜。
2. ★★★ **`pluginData` 是否出现在 MCP 读回里**＝`craft` 数据面 `blocks get --format json` 读一个已知代码块，看有没有 `pluginData`/`pluginConfigurationData` 键 ⇒ 若有＝**主题对账从此可以走数据面，不必开屏**（本批最大的通路收益候选）；判据＝逐键打印，不许只看有没有 `theme` 字样。
3. ★★★ **框选剩余三格**＝① 矩形运行值（OS 级真拖拽 `computer-use.drag` ＋ 拖中无截图窗口的既有约束 ⇒ 只能采"松手后残留"或改读 store）；② `shift`/`meta` 分支；③ `y.current` 那份旧选择集的用途；☆ 判据＝三型命中器的 `type` 与按钮的对应关系（现只证到两枚）。
4. ★★ **`waterfall` 型对应哪一枚按钮／哪一屏**＝本批三枚按钮只映射到 `cards`×2 与 `list`，`IVt` 里的 `waterfall` 无归属；☆ 手法＝找有瀑布流内容的屏（合集／带封面的空间）再看 `layoutGeometryRef.current.type`。
5. ★★ **`_col*` 在窄容器下的第二断点**＝把窗口压到 <768 看「已更新／已创建」是否也消失 ⇒ 直接验证 `@container (width>=768px)` 那条；☆ 前置＝需要用户配合改窗口宽度（`viewport.set` 静默无效是已判定律）。
6. ★★ **主题面板的屏上入口与逐档预览**＝进编辑器建代码块 → 找「主题」触发器（i18n 已有 `blockdetails.theme`／`blockdetails.themes`／`blockdetails.search.themes`）→ 采面板结构（懒加载 chunk `themePreviews`）＋ 复测 `De("",isDark)` 空串路径的渲染后果；☆ 前置＝**需要沙盒写入授权**。
7. ★☆ **表格档条目 id 载体复查**（本批 G1137 只证到卡片档挂 `data-item-id`，表格档 `_listRow_` 属性集为空）＝需要再切一次布局档 ⇒ **又是一次账户级持久偏好动作，要单独点头**。
8. ★★★ **本地改法（连续多批欠账，TDD 先行）**＝台账「五」～「九」现合计 **33 行＝32 行`未动` ＋ 1 行`已清`**；建议顺序＝**G1105（摘 `plaintext` 兜底，1 行）→ G1068（暗档 2 行值，连续六批未动）→ G1130＋G1131＋G1080／G1081（闸门三件套：两属性都写、默认 `initial`、只冻 intent）→ G1110＋G1127（三套环各自载体与粗细）→ G1092＋G1117（排版四族＋桥接类）→ G1135／G1136（先补 `data-item-id` 与型制几何模型，再谈框选）→ G1096／G1114／G1124／G1125（容器名＋列宽写 `0px`）→ G1093／G1108／G1139（两档代码主题＋`auto` 跟随＋名册闭合）→ G1119（列表布局，最贵）**。
9. ☆ **资料卫生**＝① 本 worktree 与 `D:\code\cs` 两侧都有 `_harvest/`，**以本 worktree 为当批工作副本、收尾把增量文件拷回 D 侧**（下批开场先 `wc -l manifest.jsonl` 对两侧是否同值再动手）；② ⌘K 面板关闭通路本批改用重载，V3 那条"Escape 关不掉「跳转到」"**未复测**，别当已证；③ 产物里凡"两个暗标记"类双字段结论，务必写清是谁吃哪一个（G1118 与 G1139 就是同档两条相反标记，合并会得出错误建议）。

## 第 111 批批次日志（2026-09-30 20:3x–21:1x 本地＝UTC 12:3x–13:1x；★ 盘上反编译＋MCP 数据面＋屏上只读混合批）

1. ★★★ **两份主题名册同一性结案**＝选择器名册 `V`（21 条）的 `settings` 与第 109 批"工厂内 settings 源"**20/20 同一对象**，唯一别名＝`materialdark` 的 `Bo=Xe`（逐字定义在工厂 `Lo` 之前一个逗号处）⇒ 上批 §三十六 开放项⑦结案，"三种可能"里成立的是"同一对象"，**不是**链条上下游（G1141）。
2. ✎ **改判上批一条**＝"20 档工厂形状全同"应为"**返回形状全同、声明形状两种**"＝18 箭头 ＋ 2 枚函数声明（`sublime` 的 `function Oo(o)`、`vscodedark` 的 `function qo(o)`，赋值处是 `const $o=qo()`）；★★ **上批漏读 3 档的根因是正则口径**＝`\w` 不含 `$` ＋ 只认箭头形态 ⇒ 新仪器律＝**全量枚举标识符一律写 `[\w$]+`、声明形态两种都认**（G1142）。
3. ★★★ **14 档底色一次补齐＝全 20 档 `background` 闭合**（表由脚本生成、未手抄）⇒ ☆ 顺带发现 `githublight` 是**唯一三位十六进制**（`#fff`）⇒ 按"六位"写的解析器会在这档静默失败（G1143）。
4. ★★ **暗标记错配从"至少 3 档"升为"恰好 3 档"**＝`craftdark`／`materiallight`／`tokyonightday`，其余 17 档"底色／工厂字面量／`isDark`"三者一致；★ **判据公式写死可复算**＝Rec.709 加权、阈值 128、三位先展开 ⇒ 本地做代码主题面时**以 `isDark` 为准、不要吃工厂 `theme` 字面量**（G1144）。
5. ★★ **`settings` 是变长对象**＝键数分布 `{7:1,8:1,9:5,10:7,11:6}`；逐键出现档数只有 `background`／`foreground`／`selection`／`selectionMatch` 满 20，`gutterActiveForeground` **只有 7/20**；★ `gutterBorder` 三态＝14 transparent ＋ 2 档 `#f4f4f41f`（**只有 craftdark 与 githubdark，逐字同串**＝githubdark 那串是从 craft 系抄的）＋ 4 档无键；☆ `fontFamily` 与 `caret` 各缺 2 档（G1145／G1146／G1147）。
6. ★★★ **MCP 面的代码主题名册只有 19 档**（`blocks explore-themes --type code` 逐条抄回）＝**没有 `craftlight`／`craftdark`**，而这两档恰好是 `auto` 的解析落点 ⇒ 官方两个面名册不等长；☆ 是"名单裁剪"还是"强制拒绝"未判（想试 `--theme-id craftdark` 时桥已挂死）（G1148）。
7. ★★★ **`--theme-id` 实绑页面主题名册**＝对代码块用 `dracula` 逐字报 `Theme "dracula" not found. Use "blocks explore-themes --type page"…` ⇒ ⚠ **官方自己的文案互相矛盾**（同一条输出末尾印 `These themes are used with code blocks via --theme-id` ＋ 例子 `blocks update --id <code-block-id> --theme-id dracula`，**照它写必失败**）⇒ 登记为官方缺陷候选；☆ 与第 77 批 row 16（页面 `styling.themeId` 写入后屏上即时渲染）**互证不冲突**，已给那行加 ✎ 边界（G1149）。
8. ★★★ **数据面写代码主题三条通路全否**＝① `--theme-id`（被页面名册吃）② `--json` 带 `theme` ⇒ 挂起、读回未落库 ③ `--json` 带 `type` ⇒ 挂起或 `at "root": Invalid input`；★ **对照实验**＝`--json {"id":…,"rawCode":…}` 立即 `Updated block` ⇒ 坏的是 payload 形状不是桥；⇒ ☆☆ **队列②"若 pluginData 出现在读回里＝主题可对账不必开屏"这一支判为不成立**（写不进自然读不到）（G1150／G1151）。
9. ★★ **`blocks update --json` 的可诊断性为零**＝缺 `id` 与多 `type` 都只报 `at "root": Invalid input`，而官方 `blocks learn json` 自述"returns a readable error with the first field path"⇒ **契约与实现不一致**（本地若开兼容层要有意超越，标"有意偏差"）（G1151）。
10. ★★ **MCP 读回代码块逐键**＝`{id,type:"code",language,rawCode,markdown}`，**无 pluginData／无 theme**；☆ 无语言的块＝**`language` 键整个省略**（与 G1105 同一条，本地刚改的就是这个语义）（G1152）。
11. ★★ **桥的挂起形态**＝`--format json` 间歇挂（同命令先成功后挂两次再成功）、`--format markdown` 全程正常；★★ **一次挂起的写会把后续读与 `connection info` 一起拖挂**（等 30 s 无效）＝桥**没有 per-call 超时隔离**；⇒ ☆☆ 纪律＝**写挂起后禁止重发写**，本批据此用"读回＋屏上截图"双判据确认 `rawCode=3` 那条没落库（G1153）。
12. ★ **接口信息量两条**＝`blocks add` 一次插 3 块**只回首个 id**；`documents create` 同时回 `rootBlockId` 与另一个 `documentId`（**两值不等**，作用域差别未判）（G1154）。
13. ★ **回收站文档对 MCP 仍可读**（json＋markdown 双通路、7 块全回）；★ `documents list` 不带 `--location` 时**含回收站**（复证第 75 批）；☆ `--filter` 在 `documents list` 上**不生效**（回全量 12 条）（G1155）。
14. ★★ **屏上否证三条主题入口**＝选中块（DOM ＋1,989、`cm-focused` 8 处、0 处「主题」）／`cua.move` 悬停块头（DOM 长度**一字不差**）／右侧栏「样式」＝页面级（「封面」×2、「背景」×1、0 处「主题」）⇒ ☆ 剩余候选＝块把手菜单／右键菜单／`⋯` 详情；⚠ **未下"官方没有面板"的否定结论**（面板 chunk 与 modulepreload 都在）（G1157）。
15. ★★ **两条仪器级新事实**＝① **`locator.evaluate()` 可用**（实测回 `{x:398,y:173,w:736,h:53.6,dpr:1.25,iw:1528}`）⇒ ★ 既有"evaluate 恒 null"要**收窄为"tab 级 `playwright.evaluate()` 恒 null"**，量几何从此不必花截图预算；② **`screenshot()` 返回跨 realm Uint8Array**＝`instanceof` 为 **false**、`constructor.name` 才是准（首字节 137＝PNG 签名）（G1158）。
16. ★ **右侧栏 tab 的 label 在 DOM 里各出现两次**（`sc-pdtez-1` ＋ `sc-pdtez-0` 两个 span）⇒ `getByText('样式').first().click()` 命中不可作用元素、**40 s 超时**，改 `getByRole('button',{name:/样式/}).last()` 才生效 ⇒ ☆ 新仪器律：**同一 label 双 span 的组件按 role＋last 定位，别按文本 first**（G1157／styles §十八.四）。
17. ☆ **顺带采到官方 HTML 内联注释**＝`Mirrors the resolution logic in src/theme/theme-store.ts.`、`parsed === "dark" || parsed === "light") theme = parsed;`，同一元素并排 `data-theme="light" data-accent="blue" data-whatinput="mouse"` ⇒ 应用级主题＝**首帧内联脚本解析＋属性驱动**（与代码块主题无关，别混用）（internals §五十.九）。
18. ★★ **本地清两笔欠账（TDD 先行）**＝G1105（`code-block-view.tsx:36` 摘掉"空值兜底成 plaintext"）＋ G1068（`globals.css:300-301` 暗档两行改成官方暗档值）；☆ 两条测试先 RED（**3 失败＋1 守卫通过**，失败原因逐条读过）再 GREEN（4 通过）；★ 全量 `npx vitest run` ＝ **25 文件通过／1 跳过、176 条通过／3 跳过、0 失败**；☆ `npx tsc --noEmit` 只剩一条**分支既有**报错（`src/app/layout.tsx:27` `LayoutProps`，本批未碰该文件，`git diff` 为空可证）（G1159）。
19. ☆ **环境一条**＝本 worktree（会话 worktree）**没有 node_modules**、三个 worktree 的 `package-lock` 各不相同 ⇒ 借不到依赖；经用户点头后 `npm ci` 就地装（exit 0，约 2 分钟）⇒ ☆ 从此本 worktree 可跑 vitest／tsc（此前多批"本地改法"卡住的原因之一）。
20. ⚠ **本批动过一次真实环境的读，未做还原**＝用户的 Edge 标签页从「所有文档」被点进沙盒文档（`getByText(标题).first().click()`），**未还原**（预算用尽）⇒ 下批开场第一件事＝回「所有文档」并自证标题，注意编辑器页 `beforeunload` 原生弹窗形态。
21. ☆ **沙盒与写入面**＝新建 1 个文档（`QODER-HARVEST-B111-THEME`，数据面 `documents create`）＋ 3 个代码块 ＋ 2 次块更新（1 成功 1 未落库）；⚠ **未删**（桥挂死）；★ **另发现第 109 批残留** `QODER-HARVEST-B109-CODEFIELD` 仍在回收站（当时只做了软删）⇒ 用户已点头"清"，本批没来得及做；☆ 那 3 个无标题回收站项**不是**我建的、未动；`manifest.jsonl` **151 → 153 行**（两条＝建文档一条＋本批写序列一条）。
22. ☆ **八件落盘（全部写在会话 worktree 的 `harvest-b110` 分支上，续提交）**＝`gap.md` **§三点一〇六一（G1141–G1159，1132→1151 条，本段 ＋19）** ＋ 台账「十」6 行 ＋ 台账 G1105／G1068 两行翻"已清"；`internals.md` **§五十**（9 小节）；`longtail.md` **§三十七**（21 行全表由脚本生成）；`model.md` **§一之六十九**（读写契约四节）；`interactions.md` **V105**（数据面八步＋屏上三条否证＋现场状态）；`styles.md` **§十八**；`features.md` 计数行→**1151／G1159／第 1–111 批** ＋ row 16 加 ✎ ＋ 新增 row 18／19；`todo-actions.md` 本日志＋第 112 批队列。
23. ☆ **三件校验（cwd＝本 worktree 的 `docs/craft-ref/features`，一律带 `*.md`）**＝`node _harvest/check-tables.mjs *.md` → **ALL TABLES CONSISTENT**（25 份产物全扫、异常表 0；★ 中途 `check-tables.mjs gap.md` 单独先过一次＝表 174／异常 0，说明"表内逐字竖线写作全角"这条扩展规则继续有效）；`node _harvest/key-coverage.mjs *.md` → **1886/3639＝51.8%**（与第 109／110 批同值＝**零倒退但未升**，本批采的是键路径与色值，没点新 i18n key）；`node _harvest/sanitize-pii.mjs` → **SANITIZE OK**（38 文件扫描、0 改写、0 替换）。

**⇒ 第 112 批队列**（★ 每条都写了前置与判据，顺序即建议顺序）

1. ⚠ **开场第一件事＝还原现场**＝把用户的 Edge 标签页从沙盒文档带回「所有文档」并自证 `title()`＝`所有文档`；☆ 手法＝`tab.back()`（**不要点 `<a href>`**＝停摆 #23 形态），若弹原生「离开网站?」则请用户点掉；⇒ 判活仍按"先 `title()` 30 s 单条探活"。
2. ★★★ **清两条沙盒残留**＝`QODER-HARVEST-B111-THEME` ＋ `QODER-HARVEST-B109-CODEFIELD`（回收站二次清空＝屏上通路，第 101～104 批有配方：列表屏选择模式→勾选→垃圾桶→确认）；☆ 删后跑残留三连（`--location unsorted` 逐 id 复核／屏上搜 `QODER-HARVEST`／`reminders list` 为 0）；⚠ 删除前先读回内容（本批两文档都已读回＝全是采集串）。
3. ★★★ **主题面板入口（row 18）**＝按"块把手 `data-hover-only` 菜单 → 右键菜单 → `⋯` 详情"三条候选逐一试，命中后采面板结构（含 `themePreviews` chunk 的运行时拉取时机）＋ 复测 `De("",isDark)` 空串路径；☆ 前置＝沙盒写入授权（改主题＝写 `pluginData`）；⇒ ★ 若三条又全否，就**改判为"web 端无面板"**并登记为屏上三度否证。
4. ★★ **零预算盘上项**＝把 `gutterActiveForeground` 缺的 13 档**实际继承值**读出来（在 `vendor-code-editor` 的 `li.theme(O,{dark:…})` 装配处找默认 gutter 前景）；☆ 顺带把余下 13 档的 `styles` token 色板补齐（第 109 批只逐字 7 档）。
5. ★★ **零预算盘上项**＝`V` 名册的**展示序规则**（第 110 批开放项④，本批仍未判；表里 `tokyonight` 排在 `tokyonightday` 之前，既非纯字母序也非"亮前暗后"）。
6. ★☆ **零预算对账项**＝`math_formula` 以代码围栏伪语言出现在 MCP 读回里 ⇒ 与 `model.md` 既有导出映射表逐档对账（判"公式在导出层是否统一走 code"），并确认本地 KaTeX 通路的**有意偏差**说明写得够清楚（G1156）。
7. ★★ **MCP 面剩余两格**＝① `documents create` 回包里的 `rootBlockId` 与 `documentId` **两值不等**，各自作用域未判；② 回收站文档"可读"的边界（`blocks add`／`update` 对 trash 文档是拒绝还是成功？官方 `blocks learn limitations` 说 trash 属"不能替换的操作"，未实测）；⇒ ☆ 前置＝MCP 桥恢复（本批末已挂死）。
8. ★★★ **本地改法续做（TDD 先行）**＝台账「五～十」现合计 **39 行＝34 未动＋3 已清＋1 待清＋1 待还原**；建议顺序（承第 110 批）＝**G1068 的缺失半条（补 `--editor-text`／`--editor-spectrum`）→ 闸门三件套 G1130＋G1131＋G1080／G1081 → G1110＋G1127（三套环）→ G1092＋G1117（排版四族＋桥接类）→ G1135／G1136（先补 `data-item-id` 与型制几何模型）→ G1096／G1114／G1124／G1125（容器名＋列宽写 `0px`）→ G1119（列表布局，最贵）**；☆ 环境已就绪（本批 `npm ci` 装完，vitest 可跑）。
9. ☆ **资料卫生**＝① 两侧 `_harvest/` 收尾对值（本批 151→152 行）；② ★ **新仪器律三条**要固化＝"全量枚举标识符写 `[\w$]+` 且两种声明形态都认"、"同 label 双 span 的组件按 `getByRole`＋`last()` 定位"、"`locator.evaluate()` 可用（只有 tab 级 evaluate 恒 null）"；③ ⚠ **MCP 桥挂死时不要重发写**，改"读回＋屏上"双判据。
