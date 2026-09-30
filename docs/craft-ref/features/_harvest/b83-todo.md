
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
4. ☆ **零写入**：读「Markdown 快捷方式」那个入口的内容（一次点击 ＋ 一次 dump）；G756 的持久化复测（关面板 → 同 URL 重载 → 重开，看当前分类是否仍是 `合集`）。
5. ☆ 静态：面板源按 section 做大括号配平以穷尽"面板源共多少条"；`ot.tableShortcuts` 子组成员；`k9t` 非 Mac 分支读全；`MOVE_BLOCK_*_MAC`／`QM(zr(Ts))` 两处站点的所属上下文；平台位 `_d`／`JAe`／`gae`／`k2` 是否参与键位选取。
6. ☆ `keyboard.md` 其余遗留：表A 的 `TITLE`／`HEADING` 同名与 `STRONG`「强调」vs 面板「粗」；表E 列名语义改标"主描述符／Windows 匹配式"；⤒／⤓ 字形归属（本轮屏上再次见到 `Ctrl Shift ⤒/⤓` 与 `Alt ⤒/⤓` 两族，可与 §八 对照结案）。
7. ☆ 孤儿任务清理（10 条，需单独口头确认）；**F 只读态**需明确开口才能开分享页（禁区清单内）。
