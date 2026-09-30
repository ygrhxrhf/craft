
### 三点一〇〇、第 83 批·上半（2026-09-28 09:01–09:11，★★ **官方快捷键面板第二次独立复现 ＋ 弹层栈的"关一层露一层"屏上实测**；零写入，`browser-use` MCP ＋ 页内合成事件）

| 编号 | 官方实测事实 | 本地实现（本轮实跑 grep ＋ 文件:行号） | 判定 | 优先级 |
|---|---|---|---|---|
| G752 | ★ **官方弹层是栈，`Escape` 只弹一层**：面板开着时按 Esc → `[role=dialog]` 消失、DOM 从 `133,990` 减到 `128,211`，但下层帮助菜单的 `role=menu` 与 6 个 `menuitem` **仍在 DOM 且完全可见**（`display:flex`、`visibility:visible`、`opacity:1`、`pointer-events:auto`、rect `482,44 278×204`）⇒ 关栈顶会把下一层**回显**，不是连带关闭（V64） | `grep -rn "Escape" src/components` 命中九处**各自独立**的关法：`src/components/settings/SettingsModal.tsx:95`（`if (event.key === 'Escape') close()`）、`src/components/editor/extensions/block-link-menu.tsx:130`、`src/components/editor/slash-menu/SlashCommandMenu.tsx:16`（注释写明"Arrow／Enter／Escape 由 suggestion 插件处理"）等；★ 该目录里 `layer` 与 `zIndex` 都查不到 ⇒ 全仓**没有**共享浮层栈或弹层序号，两层叠着时各自监听器都会响应，一次 Esc **把两层一起关掉** | 行为不同（本地缺栈语义，Esc 关多层） | P2 |
| G753 | ★ **取证通路判决收窄**：同一 `press_key` 通道发的 `Escape` **被官方处理**，而 `Control+Shift+,` **没有** ⇒ 正确口径是"OS 级键能驱动弹层组件自挂的 Esc 监听，驱动不了键表注册的组合键"，第 82 批 V63 的"键没进页面事件循环"过宽；⇒ A–E 每条键要**先试 `press_key` 再用合成键兜底**，并在结论里标明由哪条通路驱动 | 本地 `grep -rn "keyboard.press" tests` **无命中** ⇒ e2e 从不通过键盘驱动，全部走点击或直接调 action ⇒ 官方的"键位是否真的生效"在本地**没有任何自动化覆盖**，即便把面板补齐也只对上显示层 | 缺失（本地测试基建，非官方缺陷） | P2 |
| G754 | ★ **帮助菜单六项逐字**：`意见反馈` ／ `最新特性` ／ `Web 和 Windows 版最新特性` ／ `常见问题` ／ `快捷键` ／ `Markdown 快捷方式` ⇒ 官方把"Markdown 快捷方式"做成**与快捷键面板并列的独立入口**（另一份小抄），不是面板里的一节 | `grep -rn "Markdown 快捷方式" src` 与 `grep -rn "Markdown shortcut" src` 均无命中；本地只有 `src/components/editor/extensions/markdown-shortcuts.ts:4`（`Extension.create` 名为 `markdownShortcuts`，由 `src/components/editor/Editor.tsx:35` 导入、`Editor.tsx:368` 装进编辑器）⇒ **输入规则有能力、界面没有入口**，用户无法查看这份对照表 | 只有壳没真实现（能力在、可发现性缺失） | P3 |
| G755 | ★ 「查看所有快捷键」面板的屏上结构定版（两次独立复现一致）：容器 `DIV._content_hlglt_2._dialog_dm375_1`、标题 `CAPTION._caption_dm375_64` 值为 `快捷键`、左侧 7 个 `BUTTON._action_1j891_1`（选中态加 `_variantActive_1j891_163`，**不是 `role=tab`**）、正文层级 `._categoryTitle_dm375_70` → `._sectionTitle_dm375_93` → `._row_dm375_102`（`._rowName_dm375_110` 加可选 `._rowAlternative_dm375_118`，键帽 `SPAN._keys_dm375_124` 内含 `KBD._key_dm375_124`）；七类顺序 `通用／文档／任务／编辑／样式／整理／合集`，分类行数 7／4／15／13／27／6／17＝89 行 | `grep -rn "快捷键" src` 只命中三处**展示用样式件**（`src/components/ui/command.tsx:173` 的 `CommandShortcut`、`src/components/ui/dropdown-menu.tsx:235`、`src/components/ui/context-menu.tsx:238`）⇒ **没有面板、没有分类、没有键帽组件**；键盘注册侧本地只有 `src/components/editor/extensions/font-size.ts:72–75` 四条（`Mod-=`／`Mod--`／`Mod-Shift-=`／`Mod-Shift--`，同文件 :68–70 的注释解释了为什么必须写成连字符而不是加号）⇒ 官方 89 条里本地有 keymap 的只有字号一族 | 缺失（面板整体 与 绝大多数键位） | P2 |
| G756 | `~` 面板**默认落在上次选择的分类**而非首位：本轮进入面板时当前分类是 `合集`（最后离开的那类，`_variantActive_` 只有一个）⇒ 像持久化偏好，但**未做"重载后是否仍是 `合集`"的复测**，不能断言 | 本地无面板可对照；同族的"配置持久化时机"问题已在集合视图一侧登记过（见 `collections.md` 与早前 G 项）⇒ 若实现面板，需显式决定"当前分类"属本地 UI 态还是要入库的账户级偏好（后者属禁区，改动要另行确认） | 未确认 | P3 |
| G757 | ★ **判据级事实**：对 `menuitem` 派发 `pointerdown／mousedown／pointerup／mouseup／click` 后**立刻**测 `outerHTML` delta＝0，400 ms 后才出现 `[role=dialog]`（＋5,615 字节）⇒ 官方弹层是异步装配的；**"指纹没变"只有在等待 ≥400 ms 之后才有效**，否则会把成功点击误判成静默失效（本会话此前多条"静默失效"判决应按此复核） | 本地 Playwright 的 `click()` 自带 actionability 与后续 auto-wait，不会有这个坑；但走 `browser-use` MCP 加 `evaluate_script` 手写的通路**没有任何等待** ⇒ 采集脚本必须自带 `await new Promise(setTimeout)` | 通路／工具（写进技能判据） | P2 |

#### 仍未采到（第 83 批·上半 刷新）

- ☆ **截图仍为零**：`take_screenshot` 全程报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … visibilityState=hidden`（viewport 774×578、`attached` 与 `cdpAttached` 均 true、`visible=true` 却拿不到绘制帧）⇒ 本轮证据是 DOM 指纹 加 逐字文本；恢复动作归用户（把承载 Craft 的窗口或 Qoder 内嵌浏览器面板切到前台并保持可见）。
- ☆ G756 的持久化判定：需要"关面板 → `navigate_page` 同 URL 重载 → 重开面板"一次，看当前分类是否仍是 `合集`。
- ☆ A／B／C／D／E 的**按键效果**仍未测（`Escape` 只证明弹层监听可用，不证明键表组合键可用）；三条候选通路（`press_key`、页内合成 `KeyboardEvent`、`cua`）的可用性差异要在跑批时逐键记录。
- ☆ `Markdown 快捷方式` 那个入口的**内容**没读（本轮只读到菜单项文案）⇒ 一次点击 加 一次 dump 即可结掉，属零写入批次。
- ☆ 面板条目**为什么只 89 条**：面板源里被功能开关／浏览器位／平台位裁掉的分支仍未穷尽（承 `### 三点九九` 的"源里有、渲染没有"）。
- ☆ `TOGGLE_ASSISTANT` 与 `ADD_TABLE_ROW` 撞键、以及 G742 的屏上复核仍需沙盒（要新的写入授权）。
