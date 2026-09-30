---
name: project-crafty-screen-path-live
description: craft.do 采集通路现状——browser-use MCP 的 click/evaluate_script/take_snapshot/take_screenshot 全通（截图自第 84 批 09:36 随 visibilityState=visible 恢复，且支持 filePath）；press_key 分档：普通键与 Escape 实测进应用 handler，带 Ctrl+Shift 的 chord 不通（改走页内合成 KeyboardEvent）；★★ 绝对 outerHTML.length 不是稳定基线（同一"无弹层"直方图跨生命周期可差 6 万字节）⇒ 判据看角色直方图＋新增文本集合，字节只在同序列内比；★★★ 三条可复用手法：读实时 React fiber 闭包定菜单落点、拦截 window.open 取 URL 参数（本桥无 close_page，真开即残留）、页内 keydown/keyup 日志器让连按多键只花 2 次调用
metadata:
  type: project
---

2026-09-28 07:44 起，craft.do 行为级采集的**屏幕通路恢复**：用户把已登录窗口交给连接器后，`mcp__browser-use__list_pages` 返回 `Craft — A fresh take on documents`（url 含 `docs.craft.do/s/zhang's-Space--3b788e8c-7aa3-d2e8-fc70-0c112def1581/home`）且 `[selected]`；`take_snapshot` 得到 44 个元素的**中文已登录**首页树（未分类 3／最近删除 6／与我共享 0／我的模板 0）。

**Why:** 前四批（78／79）全部卡在会话态丢失（快照是未登录欢迎页），数据面只能靠 `craft` MCP 的写侧读回，§6 要求的 A–H 屏上证据一直为零。这次是三面对照首次同时成立（连接器标签页＝登录态、API 侧同 space、回收站计数 6 与 `documents list --location trash` 一致）。

**How to apply:**
1. 屏幕采集走 `mcp__browser-use__*`（16 个 Playwright 形状工具），**不要**再用 Browser Agent SDK —— SDK 的 `tabs.list()` 此前返回空，且 0.4.2 已无 `openTabs()`/`claimTab()`，§1 的字面开场序列已过时。
2. `mcp_call` 的 `arguments` 里**不要传空对象**给无参工具（`take_snapshot` 会报 `additional properties`）；省略 `arguments` 即可。`press_key` 的入参只有 `key` 与 `includeSnapshot`，**带 `includeSnapshot: true` 可以一次拿到「按键＋按键后指纹」**，比 press＋snapshot 两步省一半预算。
3. 开场键位探针 `Control+Shift+,`（打开官方快捷键面板）**返回成功但快照与首页逐字节一致** ⇒ 依铁律判为「静默失效」，不得写成「官方无此行为」。换通路次序：同键再按一次 → `Meta+Shift+,` → 先点进某文档正文再按（`UIFocusStack` 的 229 短路）→ 兜底走设置入口。
4. 每批第一步仍是 `take_snapshot` 判活：非空**且**内容不是登录页（`欢迎来到 Craft`／`请确认你的邮箱`／SSO 按钮）才算通；导航后 URL 会被追加 `?s=<session token>`，入产物前必须剥掉。
5. 屏幕侧 A–H 项需要**单独的第 80 批写入授权**（第 79 批的授权不得沿用）。

## 第 80 批更正（同一会话，07:49）★★★ 键盘通道不通

上面「屏幕通路恢复」需要一条硬修正：`press_key` 在本连接器**能返回成功但不进页面**。实测三连（`Control+Shift+,`、`Escape`、`?`）返回的快照逐字节相同，连带 Close 按钮的浮层都关不掉；同页 `click(uid)` 立刻改变 DOM。⇒ **键盘驱动的采集（撤销计步、Enter 逐级退档、块首 Backspace 链、Shift+Tab 缩进子树、Shift+Enter）此刻全部不可执行**，且不得把它当成「官方没绑键」。

判活口径再升级：快照非空**且**是登录页只证明**渲染**通，不证明**可输入**；每批开场要做「一键＋一点」的双通道对照（键看 DOM 是否变，点看 DOM 是否变），只有两者都动才算全通。
第 80 批再补两条通路事实（07:51）：

- 「在桌面应用中打开？」浮层**挡点击**：要展开文档头 `Ellipsis` 时连接器回 `Element is covered by another element at its clickable point`。⇒ 官方 web 端每次进文档都得先把它消掉（点 Close，或在别处点一下挤掉它）才能碰头区按钮；它不吃键盘不等于无害。
- `user-browser-use` 备份桥**默认不可用**：`press_key` 回 `No tab with given id <旧 id>`，说明它握着上一段会话的过期 tab。用它之前必须先 `list_pages` 或 `select_page` 重新绑定。⇒ 此前记忆里「二桥可达登录态空间」的判断要按这条收窄。
- ★★★ 第三条键盘通路也断了：OS 层 computer-use 的 `press_key` 对 Edge 窗口（`msedge.exe` id `263978`，标题「所有文档」，`isMinimized:false`）被 `browser_url_policy`／`insufficient_url_confidence` **整轮终止**，消息要求停止该通路。⇒ 目前**没有任何程序化键盘通路**；要拿 A／B／C／D／E 的屏上证据，只能靠**用户手按**，或者先修连接器让 `press_key` 进页面。下批别再花时间试 OS 层。

## 第 81 批补充（2026-09-28 08:2x，★ 三条会改变下个会话行动的通路结论）

1. **键位对照已从 `~` 升为完成**——不要再按旧行"键位对照仍 `~`、第 78 批须先聚焦正文"行动。官方快捷键面板可用**点击通路**稳定唤出：先 click 顶栏 Question Mark（首次只出现 loading 节点，需再取一次快照才见 6 个 menuitem），再 click「快捷键」menuitem，即得 7 个分类。面板自己印着「查看所有快捷键 = Ctrl Shift ,」⇒ **该绑定真实存在**，此前所有"面板唤不出"的观测都归因于键盘通路，不是官方缺行为。七类原文已落盘 _harvest/b81-panel-all.txt，对账结论写进 keyboard.md §十一。
2. **browser-use MCP 的 evaluate_script 能返回真实页面数据**（第 81 批 4 次成功：DOM 计数、类名、scrollHeight、页内脚本连点 7 个分类一次跑完）。旧行"evaluate_script 恒返回 {}"只适用于备份桥 user-browser-use，**不要**据此放弃结构量测。⇒ 新默认手法：量测走 evaluate_script，take_snapshot 只用于取 uid；★ **含大表（数百格）的页面禁止 take_snapshot**，一次就吃光上下文。
3. **截图与导航的两种"假失败"**：(a) take_screenshot 报 NATIVE_BROWSER_VIEWPORT_UNAVAILABLE 且 visibilityState=hidden ⇒ 是窗口不可见，恢复动作归用户，恢复后同一调用即成功；(b) navigate_page 对重页面 30 s 超时**但导航其实成功** ⇒ 先用 evaluate_script 读 title/location.href 复核，别急着重发导航。★ 另：浮层或菜单开着时**键盘事件被浮层吞掉**，所以"用户手按快捷键没反应"在该状态下不可定性——手按复测必须在干净态（先 navigate 同 URL 关掉一切浮层）做。
4. **回收站认知更正**：documents 命名空间确实没有 restore/purge 动词，但 documents delete 的自述含「Auto-purged after 30 days; use documents move to restore」⇒ 回收站是**30 天自动彻底清除**、**还原＝documents move --destination unsorted**；旧行"清空回收站在 API 通路结构性不可能，别再为它开批次"要加这条限定。沙盒还原的正确顺序＝先 tasks delete 再 documents delete（反了会被 Cannot modify document in trash 卡住，此时先 move 还原）。

## 第 82 批下半（2026-09-28 08:32，★★★ 键盘取证通路解锁：合成 KeyboardEvent 被官方分发器接受）

- ★★★ **A–E 不再是"永久不可采"**。在严格干净态（`[class*=dialog]`=0、`[role=menu]`=0、焦点 BODY、visible）下实测：`press_key('Control+Shift+,')` 返回成功但**逐项指纹不变** ⇒ 第 80 批"键盘不到页面"的判决排除"浮层吞键"干扰后成立；改用页内派发 `new KeyboardEvent('keydown',{key:',',code:'Comma',keyCode:188,which:188,ctrlKey:true,shiftKey:true,bubbles:true,cancelable:true,composed:true})` 到 `document.activeElement` ⇒ **面板 0→1**（容器类名与点击唤出的同一个 `_dialog_dm375_1`），再派发一次 **1→0**（toggle）。⇒ 官方全局键位分发器**读事件字段、不校验 `isTrusted`**。
- ★ **用法边界（必须写进结论，别当成万能键盘）**：合成键能驱动"keydown → 应用自身 handler → 状态变化"这一类（撤销、Enter 退档、块首 Backspace、Tab 缩进、Shift+Enter、快捷键面板）；**不能**驱动"字符输入 / IME / `beforeinput` 链路"（合成键不产生插入）。凡此类结论一律标"合成键驱动"，置信度比 OS 级按键降一档。
- ★ **前提**：目标必须在编辑上下文且有焦点 ⇒ A–E 正式跑批仍需**沙盒写入授权**（先点进正文块，再派发，且每步先做一次纯观测排除静默失效）。
- ★ 顺带事实：快捷键面板**记住上次分类**（本批开在「合集」=38 枚键帽，不是「通用」=16）⇒ 遍历分类要先读选中态，"键帽数"必须与"当前分类名"成对记录。
- ★ 屏幕收尾：面板已关回 0，停在空间「所有文档」屏，零写入、未碰账户偏好。

## 第 83 批·上半更正（2026-09-28 09:01–09:11，★★★ **`Escape` 经 `press_key` 确实生效 ⇒ 第 80 批"键盘三连全灭"的判决受仪器盲区污染，不可当既定前提**）

★★★ **必须改判的一条**：上面第 80 批写的"`press_key` 三连（`Control+Shift+,`、`Escape`、`?`）返回的快照逐字节相同，连带 Close 按钮的浮层都关不掉"——那条**用 `take_snapshot` 观测**，而 `take_snapshot`（Playwright 无障碍树）**根本不收录这些自绘弹层**（第 82 批已把这条写成规律）。本批改用 `evaluate_script` 的计数器复测：**面板开着时 `press_key('Escape')` → `[role=dialog]` 消失、`outerHTML` 从 `133,990` 减到 `128,211`**，同时下层帮助菜单（`role=menu` ＋ 6 个 `menuitem`）回显且 `opacity:1`、`pointer-events:auto`。⇒ **`Escape` 这条 OS 级键是通的**；`Control+Shift+,` 仍不通（键表注册的组合键不到页面）。⇒ 行动口径：**A–E 每条键先试 `press_key`（判活必须用 `evaluate_script` 计数，不许用 `take_snapshot`），失败再用 V63 的合成键兜底，并在结论里标是哪条通路驱动的**；不要再写"键盘通路整体不可用"。

★★ **另一条会改变历史判决的判据**：对 `menuitem` 派发 `pointerdown/mousedown/pointerup/mouseup/click` 后**立刻**测 `outerHTML` 得 delta＝0，**400 ms 后**才出现 `[role=dialog]`（＋5,615 字节）。⇒ "指纹没变＝静默失效"这条铁律必须加时间窗：**等待 ≥400 ms 之后指纹仍不变才算失效**。此前若干"点击静默无效"的记录（例如 `sidebar-profile`、`样式` 文本项）都是用即时读数判的，属于**待复核**，不要当成已确认的连接器缺陷。

★ **`evaluate_script` 是本轮的主力**（第 81 批已开通路，本批继续验证可用）：一次调用即可完成"读 `outerHTML.length` ＋ `role` 直方图 ＋ `getComputedStyle` ＋ 派发事件 ＋ `await` 等待 ＋ 回读"，并支持 `filePath` 参数**把大段结果直接落盘**（面板 7 个分类的 HTML 各 12–20 KB，全程没进上下文）。⇒ 新默认手法：`filePath` 落盘 → 本地 `.mjs` 解析器按类名切表；`take_snapshot` 只用来拿 uid 或确认元素数。

★ **仍未解开的一项，且它卡着 §6**：`take_screenshot` 全批失败于 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … visibilityState=hidden`（`viewport=774x578`、`visible=true`、`attached`/`cdpAttached` true，1 s 内拿不到绘制帧）。⇒ **本批所有屏上证据没有截图**；恢复动作仍归用户（把该页切到前台并保持可见）。备份桥 `user-browser-use` 本批 `list_pages` 只回一个 `about:blank` 的 New Tab ⇒ 它现在**没有** Craft 页可开，别把它当备用屏幕。
## 第 83 批·上半尾记（2026-09-28 09:12–09:26，★★★ **绝对 `outerHTML.length` 不是稳定基线** ⇒ 上一节里靠绝对字节写的判据要按"同生命周期"限定）

★★★ **本会话最贵的一条通路结论**：同一张「所有文档」列表屏，**两次测量之间没有任何写入**（只有弹层开合 ＋ 一次 `navigate_page` 整页重载），却量到两档绝对字节：`128,211／128,349／128,617` 与 `181,832／181,930／182,077／196,591`，**差约 5.3 万字节**；面板同一分类跨重载也从 `130,528` 变到 `130,288`。⇒ **判据优先级改为：角色直方图（`[role]` 计数）＋ 新增文本集合 ＞ 同一生命周期内的相邻差 ＞ 绝对字节数**。凡是"上一秒 X 字节、下一秒 Y 字节所以发生了变化"的论证，必须先证两次读数在**同一次页面生命周期内**；跨 `navigate_page`／跨时段拿绝对值对齐＝**无效判据**（本批之前的 V64 序列就是这种情况，已在 `interactions.md` V65 就地限定）。

★ **`browser-use` 桥没有 `close_page`**（16 个工具里只有 `list_pages`／`select_page`／`navigate_page`）：页内点击把受控标签导向站外（help center）后，**唯一恢复手段是对同一扇标签 `navigate_page` 回 Craft URL**；副作用＝"是否留下多余新标签"在该通路上**不可观测**，收尾只能声明 `list_pages` 的剩余数（本批收尾＝1 扇 Craft、`?s=` 已被 navigate 换新）。⇒ 以后要验外链落点，**先记下基线标签数**再点，别指望能"关掉"。

★ **`take_screenshot` 仍全批失败**（`visibilityState=hidden`）⇒ §6 的截图证据**依旧为零**；恢复动作永久归用户。本批两轮（V64／V65）都是"DOM 指纹 ＋ 逐字文本"级证据，产物里已如实标注无截图。

☆ **通路仍缺的两件事**（下批别再从零试）：① 键表注册的组合键（`Control+Shift+,`）`press_key` 不通，`Escape` 通 ⇒ A–E 一律"先 `press_key` 一次、不通立刻换 V63 合成键"，并在结论标驱动通路；② 面板"当前分类"实测**跨整页重载保持**（G756 结案），但载体未证（没读存储，属铁律）⇒ 不要为了搞清载体去读 `localStorage`，要读得先问我。

## 第 84 批·上半（2026-09-28 09:36–09:43，★★★ **截图恢复** ＋ ★★★ **普通键可达应用 handler**）

- ★★★ **`take_screenshot` 恢复可用**：`visibilityState` 由 `hidden` 翻成 `visible`（用户把窗口交给前台）⇒ 图能拍且**支持 `filePath`**（大图不进上下文，直接落 `_harvest/*.png`）。⇒ 开场纪律加一步：**先读 `visibilityState`**，`visible` 就顺手把关键弹层拍下来；`hidden` 也别当永久状态，它可能在批内翻转。
- ★★★ **`press_key` 分档再细化**：普通键（`Tab`、`ArrowUp`、`ArrowDown`）**实测能进应用自己的 handler**（面板选中分类随方向键一步一档变化，而原生按钮不响应方向键）；`Escape` 上一批已通；**只有带 `Ctrl+Shift` 的 chord 不通**。⇒ 别再写"键盘通路不可用"；A–E 一律**先真键盘、失败再合成键**，并记录通路（G761）。
- ★★ **判据**：同一次页面生命周期内绝对 `outerHTML.length` **完全稳定**（6 秒 4 次采样恒 `182,077`）⇒ 跨重载才漂（G760／G764）；把"是否发生过 `navigate_page`"当显式事件记。
- ☆ 收尾仍要复核弹层：`Escape` 第三次复现"只关栈顶一层"（dialog 关、下层 menu 留），必须再 `navigate_page(同一 URL)` 才全清。

## 第 84 批·下半（2026-09-28 10:02，★★★ 三条会改变下个会话行动的手法 ＋ 一条判据更正）

1. ★★★ **自绘菜单的落点不必靠点击跳转**：`menuitem` 的 `__reactProps$…` 只有 Base UI 通用包装（`onClick($a){if(Ar){$a.preventDefault();return}va==null||va($a)}`），拿不到落点 ⇒ 沿 `__reactFiber$…` 的 `return` 链向上读 `memoizedProps`：深度 3 是应用自己传的 `onSelect`，深度 9 是整个组件的具名回调（一次拿到六个）。⇒ **零导航、零新标签**。
2. ★★★ **要 URL 参数就拦截 `window.open`**：临时替换为"记录 `{u,tt,f}` ＋返回假句柄 `{closed,close,focus,blur,location}`"，逐项点击，采完当场还原。⇒ 本桥**没有 `close_page`**，真开标签就是永久残留 ⇒ 这条手法优先。顺带能量出"闭包里有没有 `noopener`／有没有自关菜单"这类静态看不出的差异。
3. ★★★ **按键批量取证**：页内**捕获阶段**同时挂 `keydown` 与 `keyup` 监听，每次事件后 520 ms 采样一次状态（选中项／`kbd` 数／行容器数／`_rowName_` 数／绝对 len／`activeElement`／`visibilityState`）挂到 `globalThis.__KL` ⇒ **连按 6 个键只花 2 次浏览器调用**，且每次按键都有"送达证据"（日志条数）与"效果证据"（采样差）。`navigate_page{type:"reload"}` 即可清掉注入的监听器（复核 `loggerGone:true`）。
4. ★ **判据更正（会改写历史判决的那类）**：**"按了没变化"不能判该键无效** —— 本批 `Enter` 落在**已选中**的分类按钮上，原生激活即无变化 ⇒ 要判"某键没注册"，必须先把焦点指向**未选中项**（或换一个可观察状态）再按。
5. ★ **同一"无弹层"角色直方图跨生命周期量到 `114,026`／`116,436`／`120,197`／`182,077`** ⇒ 判"页面变没变"不能只看直方图相同；同一次生命周期内分钟级也有 ＋118 字节微漂（秒级仍恒定）。跨 `reload` 一律改用"新增文本集合＋计数类指标"，绝对字节只在同序列内比。
6. ☆ 屏幕现状：`visibilityState=visible`、`take_screenshot{filePath}` 可用（本批 `_harvest/b84-keyboard-nav.png`）；`list_pages` 全程 1 扇受控标签；**A–E／G 的效果面仍为零**，卡在第 85 批沙盒写入授权（不得沿用上一批）。

## 第 86 批·上半（2026-09-28 10:35–10:39，零写入屏幕取证，11 次调用）＝三条会改变下个会话行动的手法与判据

1. ★★★ **按键实验必须先记 `document.activeElement`，并把"焦点"与"选中"刻意分开放**。本批因此翻掉第 85 批的 `Space` 结论：`Space` ＝**激活聚焦项**（不是"重置回第一个分类"）。⇒ 今后凡按键类结论，采样指纹里必须含 `activeElement` 的 tag＋class＋文本，否则"命令语义"可能只是"焦点默认值"的投影。
2. ★★★ **页内按键日志器仍是最优预算解**：capture 阶段挂 `keydown`/`keyup`，每条键在**即时**与**延迟 520 ms**各采一次状态指纹 ⇒ 4 条键位 ＋ 2 次改焦点 ＋ 装/读 ＝ 11 次调用拿到 16 个采样点。`reload` 自动清监听（本批复核 `loggerGone:true`）。
3. ★★ **弹层自身 `outerHTML.length` 是比整页长度更好的弹层指纹**（本批 14,753–23,678，随分类变化），可当第四口径；但**只限同一生命周期内**作相对判据（承 G760／G764／G770）。
4. ☆ **仪器效应**：`element.click()` **不搬 DOM 焦点**、`el.focus()` 不等于用户 `Tab` 序列 ⇒ 判"焦点真实落点"必须坐标点击或 OS 通路，而本桥在后台标签（`visibilityState=hidden`）**不能用 `elementInfo`／坐标探针**；⇒ 窗口交前台仍是用户动作，本批又没拿到截图。


## ✎ 2026-09-29 第 96 批·下半改判（本文件上方所有"全通"口径都要按这段重读）

★★★ **`browser-use` 不是用户的 Edge，是 Qoder 内置浏览器**（工具描述 "in the selected in-app browser page"；截图报错 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … Open the in-app Browser before retrying this visual action`）。⇒ 本文件里"恢复动作＝请用户把承载 Craft 的 Edge 窗口从最小化还原"**永久作废**，正确措辞＝**请用户打开 Qoder 的内置浏览器面板**。

- 「click／evaluate／snapshot 全通」→ 现实测＝**`evaluate_script` ✓、`take_snapshot` ✓（44 元素、顶栏在树）、`click(uid)` ✗、`press_key` ✗、`take_screenshot` ✗**，四个 ✗ 的报错都指向同一个前置条件：有绘制面。
- 「普通键（Tab／ArrowUp／ArrowDown）实测进应用 handler」→ **本批两桥都不能复现**（桥 A 装 `window` 捕获监听后 `press_key ArrowDown` 监听计数仍 0；桥 B `press_key Tab` 页面区像素零差）。⇒ 该口径降级为"待在有绘制面的内置浏览器上重测"，A–E 不得据它开跑。
- ★ **新通路（可见 Edge，`user-browser-use`）**：`navigate_page` ✓、`take_screenshot` ✓（1910×867·407,616 B，真实窗口）、`click(uid)` ✓ 真落地；但 `evaluate_script` **恒返回 `{}`**、`take_snapshot` 残缺（表头 76 实列 21、侧栏与顶栏图标不进树、`verbose` 落盘丢角色名）、**ref→坐标映射不可信**（`ref_75` 实测落 CSS (1370,538)，其下方约 40 px 就是「删除」行）⇒ **未标注可访问名的 ref 一律禁点**，且这条桥只能出截图、出不了 DOM 判据。
- ★★★ **无绘制面时唯一可用的"点击"＝页内合成 pointer 序列**（`pointerover/pointerenter/pointerdown/mousedown/pointerup/mouseup/click` ＋ `clientX/clientY/pointerId:1/pointerType:'mouse'/isPrimary/bubbles/cancelable/composed`）；`el.click()` 单独用**完全无效**。它已足以打开 `role=menu` 并穷出 5 个 menuitem，还能触发整页导航（借此拿到了帮助站 markdown 键表 25 条）。
- ★★ 结构性结论：**没有任何一条桥能同时给出「截图＋DOM 判据＋按键」** ⇒ A–I 连续 4 批为零的真正原因是通路分裂，不只是"窗口没开"。⚠ **✎✎ 本条已被同批尾记六／八推翻，见下方「再改判」段**。

## ✎✎ 2026-09-29 第 96 批·尾记六／八再改判（推翻上方"两桥都不能复现"与"没有一条桥能同时给三件"）

★★★ **桥 A（Qoder 内置浏览器）在面板 visible 时三件齐全＝`evaluate_script` ＋ `take_screenshot` ＋ `press_key` 同窗可用**（实测窗口 05:04–05:10Z：`take_screenshot` 落盘 `_harvest/b96d-schedule.png`、同段 9 次 `evaluate_script` 出真实 DOM、7 次 `press_key` 真驱动应用）。⇒ 上方"没有一条桥能同时给「截图＋DOM 判据＋按键」"**只在面板关闭／hidden 时成立**，面板一开就没这个限制。⇒ **恢复动作只有一句：请用户把 Qoder 内置浏览器面板打开并保持前台**（与聊天分屏并排最稳）。

- ★★★ **上方"普通键两桥都不能复现"作废**＝那是面板未开时的读数。面板 visible 后实测可用＝`Escape`、`Tab`、`Shift+Tab`、`ArrowDown`、`Backspace`、`Ctrl+A`、`Ctrl+Z`，以及**字母族组合键 `Ctrl+Shift+S`／`Ctrl+Shift+D`（真开出日期弹层）**。
- ★★ **仍不可达的两件事（仪器边界，不得写成官方缺陷）**：① **标点族 chord**（`Ctrl+Shift+,`）⇒ `press_key` 送出的事件 `e.code` 是**空串**（`key=","`、修饰位全真），官方 `zr(Vr("Comma"))` 这类按 `code` 匹配的绑定结构性打不到 ⇒ **可达性按"chord 末键是否字母"分档**；② **浏览器默认动作永远不会执行** ⇒ `Enter`／`Space` 落在 `<button>` 上不合成 `click`（"按了没激活"≠"官方抑制"；G890／G803 由此改判），凡涉及原生激活、聚焦、滚动的默认行为只能**请用户手按**。
- ★★ **第四道闸＝面板前台归属，它决定编辑器能不能拿到焦点**：面板未在前台时 `navigate_page` 后读数翻回 `hidden`＋`hasFocus:false`，对 `contenteditable` 派发合成 pointer 后 `activeElement` 仍是 `BODY`、`getSelection().rangeCount` 仍是 0 ⇒ ~~行为批三件套判据＝`visibilityState:"visible"` ＋ `document.hasFocus()===true` ＋ 派发后 `rangeCount>0`，三条齐才可开 A–E 类取证~~ ⚠ **✎✎ 尾记九 已判定这条过严**（同批在 `hasFocus:false`＋`rangeCount:0` 下 `ArrowDown` 两次都被面板 handler 接收）⇒ **正确分档＝面板／外壳级键只要 `visible` 就能驱动；编辑器内容级（A/B/C/D/E）才需要 `hasFocus` ＋ 派发后 `rangeCount>0`**。⇒ **纪律：新立判据必须同时写作用域**（与 `paddingLeft` 盲区、零 ARIA 弹层同族＝判据越界）。
- ★★★ **新增第三条仪器盲区（与前两条并列）**：**Craft 自有弹层零 ARIA 角色**（`role=dialog/menu/listbox/grid/cell` 全 0）⇒ 用角色直方图判"弹层开没开"**恒假**（本批真的把"已开"读成"chord 无效"一次）。有效三路读数＝**`body` 新增文案集 ＋ `activeElement` 标签名与 `placeholder` ＋ 容器 `outerHTML` 长度**。⚠ 与本文件"绝对 `outerHTML.length` 不是稳定基线"不冲突：那条禁的是**跨时刻／跨重载比字节**，这里用的是**同一生命周期内、容器级**的相对变化。
- ☆ **页内键日志器仍是决定性求解器**：`d|KeyD|c1s1a0|t=INPUT|pd=false` 一条读数同时回答"送达了吗／修饰对吗／目标是谁／默认动作被阻止了吗"四问 ⇒ 判"键被吞"必须先出这条日志，否则归因只能停在猜测（本批据此把"弹层吞键"从 `preventDefault` 型改判为"命令不在栈顶键表内"型）。
- ★★★ **桌面档读数首次到手（`innerWidth:1088`，13:16–13:22，零写入）⇒ 快捷键面板 rail 的判据改写**：7 枚分类按钮实测＝全 `BUTTON`／全 `tabindex="0"`／**`aria-selected` 全 `null`**／**无 `data-composite-item-active`**／无 `data-disabled`，选中**只由 CSS 变体类 `_variantAc…` vs `_variantDe…`（hash `1j891`）表达**。⇒ 上方"改读 `[tabindex="0"]` vs `[aria-selected]`"**在桌面档无物可读**；**唯一有效双判据＝`_variantActive_1j891_*`（选中）＋ `document.activeElement`（焦点）**。⇒ ⚠ **两档 rail 是两套组件、判据必须分档写**：桌面／sidebar 档＝`a6` DS 按钮（无 role/onKeyDown/tabIndex 覆写），compact 档＝`Npe`/`TIe` Tabs（`x8v9o` hash、有 `aria-selected`）⇒ 跨档共用一条判据是本目录两次踩坑的共同根因。
- ★★ **桌面档帮助浮层含「快捷键」＝此前"官方删了入口"疑点撤销**：`Question Mark Icon`（`DIV`，`x=1046`）→合成 pointer 七连发→`role=menu:1`／`group:1`／6 项（意见反馈／最新特性／Web 和 Windows 版最新特性／常见问题／**快捷键**／Markdown 快捷方式）⇒ 之前"5 项无快捷键"是 **compact 档＋已删文档缓存屏**造成的，不是官方改动。
- ☆ **两条现场事实**：① `navigate_page` 请求 `/s/<spaceId>/home` 被 app 改写为 `/s/<空间名--空间id>/all`（路由段是 slug 化 `名称--id`，`home` 非合法视图名）；② ~~快捷键面板**开着没关**（`role=dialog` 残留）~~ ⇒ **✎ 尾记十一 已还原**（面板与分享浮层都关掉，`dialog/menu/group/menuitem` 四计数复核全 0）。
- ★★★ **合成 pointer 的命中目标必须用 `document.elementFromPoint(标签中心)` 求**（尾记十一 第三次踩同一类坑）：对分享权限档位的第一次点击打在 `textContent` 那层往上找到的**样式壳 DIV**（`sc-st2m8s-0 WAcGA`）上＝**静默失效**（触发器文案没变）；改成 `elementFromPoint` 命中的真实 `BUTTON.sc-14qg8m-5` 才生效。⇒ 探针脚本默认形态＝`const hit = document.elementFromPoint(x, y) || el`，再对 `hit` 发七连发。
- ★★ **剪贴板在本桥既写不进也读不出**：把 `navigator.clipboard.writeText` 包起来后点官方「复制链接」两次 ⇒ 拦截数组为空（复制不走这条 API，真实实现未定位）；`navigator.clipboard.readText()` 报 `NotAllowedError: Read permission denied`。⇒ **别拿剪贴板当取证通路**；⚠ 也不得据"拦截为空"判官方复制无效。
- ★ **分享弹层同样零 ARIA 角色**（本目录第四次同类印证）＋ **顶栏「共享」入口没有 `aria-label`**、只有可见文本 ⇒ **枚举入口必须同时走 `aria-label`/`title` 与可见文本两条**，否则漏。
- ☆ **访客态在本通路结构性不可得**：两桥共享同一份登录 cookie（G848），以 owner 身份打开带 `?s=` 的分享链接不会进只读态 ⇒ 要采"只读渲染"，要么请用户登出一次（破坏会话、需明确同意），要么改用应用内天然只读的**版本／备份预览**作替代证据源（⚠ ≠访客态，产物须分开标）。

- ★★★ **判活门槛第三条＝"原生激活类"必须断言 `activeElement === 目标元素`**（尾记十二）：面板切后台后 `activeElement` 归 `BODY`，此时用户手按 `↓` ⇒ **应用照改选中**（整理→合集、`pd=0`），证明键分派在**文档／容器级、不依赖元素持焦**；但紧接着手按 `Enter` ⇒ 无反应，而"Enter 激活聚焦 `<button>`"是**浏览器默认动作、以该按钮持焦为结构前提** ⇒ 那一轮**作废**（铁律：指纹没变＝静默失效，不得记成官方抑制；G890 仍未结案）。⇒ **三档门槛并列**＝① 编辑器内容级（A/B/C/D/E）需 `hasFocus` ＋ 派发后 `rangeCount>0`；② 面板／外壳级只需 `visibilityState:visible`；③ **原生激活类（`Enter`／`Space`／双击默认动作）必须现场断言目标元素正持焦**，`document.hasFocus()` **不能代替**（本桥实测 `hasFocus:false` 时键仍送达 ⇒ 该属性对本通路不敏感）。复测六步协议见 `interactions.md V88`（要点＝面板切前台后**不要点分类**，点一下会把焦点与选中一起搬走）。
- ★ **桌面档 rail 不做 roving tabindex**：7 枚分类按钮 `tabindex` 全 `"0"`、`aria-selected` 全 `null` ⇒ `Tab` 可逐枚走完 rail；compact 档（Base UI Tabs `x8v9o`）是 roving ⇒ **两档连键盘可达面都不同**，探针与判据一律分档写。
- ★★ **收尾段补：三类键的持焦门槛定稿**（尾记十二·收尾 17:50）＝① **编辑器内容级**（A/B/C/D/E）需 `hasFocus` ＋ 派发后 `rangeCount>0`；② **面板级导航与关闭**只需事件送达——连接器 `press_key Escape` 在 `activeElement` 已归 `BODY` 时照样当场关掉快捷键面板（四计数复核 0）；③ **默认动作类**（`Enter`／`Space` 激活按钮、双击）必须目标元素正持焦。⇒ 写探针时按这三档分别断言，不要再用一条"三件套"糊住。
- ☆ **待裁的仪器歧义（下批第一条探针）**：`press_key` 之后同一读回里 `visibilityState` 从 `hidden` 翻 `visible`、`take_screenshot` 恢复可用 ⇒ 到底是"连接器按键自带 surface 激活"还是"用户同时切了窗口"未定 ⇒ 用 `Shift` 单键（官方无绑定、无副作用）做判活探针；**若按键能自唤绘制面，则连续 15 批的"恢复动作永久归用户"要改成"先试按键、再请用户"**。

## ✎✎✎ 2026-09-29 第 97 批（20:12–21:14，桌面档 1206）＝**G943 裁定 ＋ 送达闸门改写 ＋ 默认动作分三档 ＋ 编辑焦点只能靠 trusted click**（这段覆盖本文件上方一切通路口径）

1. ★★★ **G943 裁定＝连接器的 `press_key` 不自唤绘制面 ⇒「恢复动作永久归用户」维持原判，但含义收窄为"用户开一次面板即可"**。判据三连＝① `hidden`＋`innerWidth:0`＋`attached:false` 时 `press_key Escape` **返回 `Successfully pressed key` 但页内捕获日志器新增 0 条**（同一次调用里向 `body` 派发合成 `KeyboardEvent` 作 canary ⇒ 条数 ＋1，证明监听本身有效 ⇒ 零是真实的）；② `visibilityState` 的翻转发生在 `press_key` **之后**的两次读屏之间，而紧接 `press_key` 的那一次读回仍是 `hidden` ⇒ 翻转与按键无因果；③ 上一批计划的载体键 `Shift` **结构性不可执行**（见第 4 条），改用无弹层时零副作用的 `Escape`，而 `visibilityState` 是浏览器级属性、页面脚本改不动 ⇒ 载体键有没有官方绑定与这道探针无关，结论干净。
2. ★★★ **送达的真正闸门＝"surface 已 attached ＋ 正视口"，不是 `visibilityState`、也不是 `hasFocus`**：面板被打开过一次之后再切回后台，读数＝`visibilityState:"hidden"` ＋ **`innerWidth:1206` 保持** ＋ `attached:true`，此时 `press_key ArrowUp` **照常送达并生效**（选中 5:整理 → 4:样式、`kbd` 13→80）。⇒ **操作含义（很重要）**：用户**只需开一次面板**；此后即使面板切后台，`press_key`／`evaluate_script`／`click`／`take_snapshot` 全可用，**只有 `take_screenshot` 需要前台**（前台丢失时它报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … visible=true, attached=true, visibilityState=hidden`）。⇒ 开场纪律改＝**先读 `innerWidth`＋`attached`（可由截图报错原文拿到），别只看 `visibilityState`**。
3. ★★★ **默认动作分三档（推翻本文件"浏览器默认动作永远不会执行"那条）**：① 连接器注入的键——**焦点移动类会执行**（`press_key Tab`／`Shift+Tab` 使 `activeElement` 在 7 枚分类按钮间逐枚移动，`pd=false`、rail 组件静态无 `onKeyDown`）；② 连接器注入的键——**激活类不执行**（`press_key Enter` 两轮都在"目标就是持焦 `<button>`"的情况下送达，但页内 `click` 捕获监听 **0 次触发**；同次读回用 `el.click()` 作对照 ⇒ 监听确实工作）；③ **用户手按——两者都执行**（手按的 `Enter`／`Space` 各派生一条 **`isTrusted:true` 且 `detail:0`** 的 `click`，并当场把选中从「文档」改到「通用」）。⇒ 判"某键被官方抑制"前必须先答两问：**注入还是手按／要的是哪类默认动作**。
4. ★★ **`press_key` 有键名白名单**：`Shift`、`ShiftLeft`、`F13`、`Insert` 一律 `Unsupported key: <name>`（含 `Alt+Shift+Control+F13` 这种包裹写法，报错只报末键）⇒ **裸修饰键与罕见键在本通路不可用**，别设计依赖它们的探针。
5. ★★★ **编辑焦点只能靠连接器真 `click`（合成 pointer 拿不到）**：对任务块文本 SPAN 发**命中校正版**七连发 ⇒ `activeElement` 仍 `BODY`、`getSelection().rangeCount` 仍 **0**；改 `click(uid)` 点同一块 ⇒ `DIV[contenteditable=true]`、`rangeCount` **1**、`startOffset` 精确落位。⇒ **A/B/C/D/E 类取证的开场必须用连接器 `click`**；这与"合成 pointer 能开 Craft 自有浮层"**并存不矛盾**（开层 ≠ 搬编辑焦点）。§4 那套"编辑器内容级三件套"因此**可达**，只是达成手段固定。
6. ★★ **页内注入物随任何整页导航丢失，不只是 `reload`**：`navigate_page` 进另一篇文档后 `window.__b97log` 变 `undefined` ⇒ **每次导航后必须重装**；且"日志器条数 0"在导航后要**用 `typeof` 区分**"没送达"与"监听没了"——不区分就会把已送达的键读成未送达（本批差点犯）。
7. ★★ **主区懒渲染 ⇒ 判"这屏没有 X"必须二次读**：`/shared-with-me` 第一次读屏时 `H1` 与内容网格**都不在 DOM**（`body` 只有 22 行侧栏文本），第二次读才出现。同类：`+` 插入栏与拖拽手柄**静止态根本不挂载**（实扫 `plusByText:0`／`dragByName:0`），需对块发 `pointerover` 才出现 ⇒ **"读不到"不等于"官方没有／只读态隐藏了它"**（这是一条会制造假差分的判据）。
8. ★ **`click` 事件的 `detail` 字段可区分点击来源**＝真鼠标 `detail:1`、**键派生的原生激活 `detail:0`**，两者 `isTrusted` 都是 `true` ⇒ 用它直接抓到"用户在按 `Enter` 之前先点了一下面板标题区"（那击把焦点与选中一起搬到了同一枚 ⇒ 那一轮 `Enter` 前提被污染），于是**用连接器 `↓` 自行重建"焦点≠选中"再补一轮干净的 `Enter`**，没有把污染轮写成结论。⇒ 手法固化：**"原生激活类"取证要先断言持焦，再断言焦点≠选中，两者同读数里带回读**。
9. ☆ **连接器 `click(uid)` 在有 attached surface 时可用**（焦点会落到目标、返回成功），与第 96 批"✗ 需绘制面"一致 ⇒ 前置条件就是绘制面，不是桥的缺陷。
10. ☆ **`craft_write` 的 `documents delete --document` 要 rootBlockId**：传 app 链接里的 `documentId` 报 `Document not found`（提示让你 `documents resolve-link`）。本批踩过一次。
11. ☆ **现场**：本批结束时快捷键面板／备份 modal／日程与提醒层**全部关闭**（四计数复核 0），屏上停在 `/tasks/all`，三条页内监听 `typeof undefined`，沙盒 `QODER-HARVEST-B97-INDENT` 已 LIFO 删除（`unsorted` 读回原 3 条、`reminders list` 两次为 0、屏上任务面 0 命中采集串），截图 3 张（`b97-backups-modal.png`／`b97-g890-enter-space.png`／`b97-restored-tasks-screen.png`）；**未 commit**。


## ✎✎✎ 2026-09-29 第 98 批：拖拽取证通路破解 ＋ 第五条仪器边界

- ★★★ **块拖拽在本桥只有一条可行通路**：连接器 `hover(块)`（**真鼠标**）挂出手柄 → `evaluate_script` 给手柄**临时**加 `aria-label`＋`role=button`＋`tabindex=-1` → `take_snapshot` 取 uid → `mcp__browser-use__drag(from=手柄, to=目标块)` ⇒ 一次即提交移动。⇒ **合成 `DragEvent` 序列（`dragstart`/`dragenter`/`dragover`/`drop`/`dragend`，配自建 `DataTransfer`、`elementFromPoint` 校正命中、`effectAllowed`/`dropEffect` 设全）不能提交**＝三种打法都做到 `dragover`/`drop` 的 `defaultPrevented=true`、预览幽灵也画出，**但数据面零变化** ⇒ 记为**第五条永久仪器边界（疑 `isTrusted` 闸）**，严禁写成"官方不支持程序化拖拽"。⇒ 本地 e2e 同理：**必须用 `page.dragAndDrop()`**，不要用 `dispatchEvent(new DragEvent(...))` 验落点。
- ★★ **改 DOM 属性作取证手段首次启用并立规**＝只允许在**本轮沙盒页面**上做、**同生命周期内撤销**、收尾必须 `removeAttribute` 后复核 `leftover:0`；严禁在用户文档上做。
- ★★★ **拖拽期间的判据盲区（第六条）**＝预览幽灵**带着被拖块的同一个 `data-block-id`** 进 DOM（实扫 `div[data-block-id]` 由 4 变 5、幽灵 `x` ＋74／`w` ＋16），并进入 `innerText` 与 a11y 的 `value` ⇒ **拖拽期间禁止用"按 id 计数／按文本数出现次数"判"块是否变了"**；唯一可靠判据＝**行的几何 y 序 ＋ `blocks get --format json`**（本批我就差点把幽灵读成"插了重复块"）。
- ★★ **手柄↔行的归属由真实鼠标位置决定**＝合成 `pointerover` 能挂出手柄但**可能挂到别的行**（实测想挂 C、手柄中心落在 B 的行）；且**DOM 重排后旧 uid 的手柄不可信**（第二次拖拽"回成功、零变化"＝静默失效轮）。⇒ 每次拖拽前都要重新 hover ＋ 重新读手柄中心 y 做归属断言。
- ☆ **回收站屏的形状事实（通路相关）**＝`/s/<空间名--spaceId>/trash` 是合法路由；**每一行是一个 `<A href=/editor/d/...>` 链接 ⇒ "点行"＝打开文档**（不还原、无"已删除"横幅、`contenteditable` 结点到 4）；屏上可点项全量枚举 30 项**无删除语义控件**，而命令表里注册着 `commands.empty.trash` ⇒ **"动词存在、入口未找到"**，清不了也**不该乱清**（15 条里 3 条无标题、身份未明）。
- ★ **撤销类键的焦点门槛在拖拽支复现**＝拖完 `hasFocus:true` 但 `rangeCount:0` ⇒ 先连接器 `click` 进正文拿到 `rangeCount:1` 再 `Ctrl+Z` 才有效（三档门槛不变）。
