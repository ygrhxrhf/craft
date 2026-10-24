# Crafty 手工验收清单（验收第 3 档）

自动化两档（`e2e/visual.spec.ts` 截图基线 + 功能交互用例）只能证明"像素没漂"和"流程走得通"，
不能证明"和 craft.do 一样"。本清单是第三档：人工逐屏比对 + 自动化判不了的观感/手感项。

- 本地截图来源：`e2e/visual.spec.ts-snapshots/`（42 个视图状态 × 3 档宽度 = 126 张基线，文件名带
  `-win32` 平台后缀）；另有 9 张人工留档在 `docs/craft-ref/local-*.png`。
- 参考截图：**官方 66 屏已在 `docs/craft-ref/ref/`**（2026-10-22 ego-browser 批次，清单见 `screens.md` §十二）。
  三档齐备：1440×900（desktop，54 张）/ 768×1024（tablet）/ 390×844（mobile），md5 逐张唯一。
  含个人内容，已 `.gitignore`（`/docs/craft-ref/ref/`），只留本地。官方 token 全量解出，对照表见 `tokens.md`。
  下表"参考"列：`✅ <文件名>` = 有官方图可并排比对，`⏳token` = 只能按 token 比对，`⚪ 豁免` = 官方无对应面。
- ⚠️ **旧记录作废**：「`viewport.set()` 静默无效、tablet/mobile 采不到、基准图 1910×925」三条均已被本轮
  `Emulation.setDeviceMetricsOverride` 推翻（证据：`capture.md` 路径 C、`screens.md` §12.1）。下表不再出现这三条陈旧结论。
- 勾选含义：人眼在该分辨率下确认布局/留白/图标语义/动效；只看自动化通过不算勾。

## 一、逐屏对照表

宽度档：`desktop 1440×900` / `tablet 768×1024` / `mobile 390×844`；主题档：`light` / `dark`。
下表每行覆盖 3 档 × 2 主题，人工至少要亲自过 desktop 与 mobile 各一次、dark 至少一次。

| # | 屏 | 路由 | 本地基线前缀（`{theme}-`，×3 档） | 参考 | 人工判断点（自动化判不了的） | 有意偏差 | 状态 |
|---|---|---|---|---|---|---|---|
| 1 | 登录 | `/login` | `login` | ⚪ 豁免（官方需登出才能访问，未采） | 输入框聚焦环、提交失败抖动节奏 | 无 | ☐ |
| 2 | 注册 | `/register` | `register` | ⚪ 豁免（同上） | 同上 + 密码规则提示位置 | 无 | ☐ |
| 3 | 文档首页（含侧栏树） | `/documents` | `app-documents` | ✅ `ref/all-documents-{desktop,tablet,mobile}.png` | 树层级缩进量、拖拽插入指示线、hover 底色 | 图标为 lucide 近似 | ☐ |
| 4 | 最近 | `/recent` | `app-recent` | ✅ `ref/shared-with-me-desktop.png`（近似） | 空态插画留白、卡片阴影高度 | 无位图插画，用 CSS 近似 | ☐ |
| 5 | 收藏 | `/favorites` | `app-favorites` | ✅ `ref/starred-desktop.png` | 取消收藏后行的消失方式 | — | ☐ |
| 6 | 每日笔记 | `/daily-notes` | `app-daily-notes` | ⏳token（官方经 `Ctrl+Alt+N` 进入，非导航路由，未采） | 日期分组标题字重与间距 | — | ☐ |
| 7 | 任务 | `/tasks` | `app-tasks` | ✅ `ref/tasks-{desktop,tablet,mobile}.png` | 勾选动效、提醒/循环徽标可读性 | — | ☐ |
| 8 | 日历 | `/calendar` | `app-calendar` | ✅ `ref/calendar-{desktop,tablet,mobile}.png` | 月格行高、今日标记、条目 chip 溢出 | 日详情 Sheet 未做（见偏差表） | ☐ |
| 9 | 模板 | `/templates` | `app-templates` | ✅ `ref/templates-desktop.png` + `ref/templates-gallery-desktop.png`（237 卡片 / 8 分类） | 模板卡缩略比例 | — | ☐ |
| 10 | 搜索 | `/search` | `app-search` | ✅ `ref/search-panel.png`、`ref/dark-search.png` | 命中高亮色、"加载更多" 反馈 | — | ☐ |
| 11 | 设置 | `/settings` | `app-settings` | ✅ `ref/settings-open.png` + `ref/settings-{about,account,advanced,appearance,assistant,integrations,language,notify,published,space,subscription,tags,team}.png`（13 张） | 分组分隔线强度、开关动效 | — | ☐ |
| 12 | 回收站 | `/trash` | `app-trash` | ✅ `ref/trash-desktop.png` | 恢复/彻底删除的确认层级 | — | ☐ |
| 13 | 集合列表 | `/collections` | `app-collections` | ✅ `ref/collections-{desktop,tablet,mobile}.png` | 集合卡封面色带 | — | ☐ |
| 14 | 白板列表 | `/whiteboards` | `app-whiteboards` | ⚪ 豁免（官方无网页白板列表路由） | 新建白板卡比例 | — | ☐ |
| 15 | 文档详情（编辑器） | `/documents/[id]` | `document-detail` | ✅ `ref/document-detail-desktop.png`、`ref/dark-doc.png` | 标题衬线字号、正文 16/1.7 行距、段间距节奏 | Inter 即官方字体；衬线栈为近似 | ☐ |
| 16 | 右栏·插入 | 同上，tab 插入 | `document-tab-插入` | ✅ `ref/document-tab-insert-desktop.png` + `ref/insert-panel-slash.png`（斜线菜单） | 分类分组留白、图标可辨识性 | — | ☐ |
| 17 | 右栏·格式 | 同上，tab 格式 | `document-tab-格式` | ✅ `ref/document-tab-format-desktop.png` | 色块圆点尺寸与选中标记 | — | ☐ |
| 18 | 右栏·样式 | 同上，tab 样式 | `document-tab-样式` | ✅ `ref/document-tab-style-desktop.png` | 封面/Washi 预览缩略、宽页切换瞬时布局 | 主题位图为 CSS 渐变近似 | ☐ |
| 19 | 右栏·信息 | 同上，tab 信息 | `document-tab-信息` | ✅ `ref/document-tab-info-desktop.png` | 属性行标签对齐、协作者头像堆叠 | — | ☐ |
| 20 | 集合详情（三种视图） | `/collections/[id]` | `collection` | ✅ `ref/collection-{table,gallery,kanban}-desktop.png`（官方三种均为**内联块**，无独立路由） | 表头粘性、单元格编辑态边框、首列 sticky | — | ☐ |
| 21 | 白板画布 | `/whiteboards/[id]` | `whiteboard` | ✅ `ref/whiteboard-{desktop,tablet,mobile}.png`（内联块） | 工具栏图标、笔迹压感手感 | tldraw 水印按许可保留 | ☐ |

上表之外，本轮还采到一批**本地没有对应路由/基线**的官方屏（只能人工目视吸收，不能并排比对）：

- 弹层：`shortcuts-modal.png`（快捷键 7 分类全表，见 `screens.md` §12.4）、`share-sheet.png`、`search-panel.png`、
  `menu-{new,bell,ellipsis,help,card-context,space-switcher}.png`（6 张）、`insert-panel-slash.png`。
- 布局切换：`layout-{grid,list,table}.png`。浏览路由：`folders-desktop.png`、`inbox-desktop.png`、`tags-desktop.png`、`connections-desktop.png`。
- 暗色：`dark-{browse,doc,search,settings-appearance}.png`（只采了四屏，不是全量矩阵）。
- 还原证据：`theme-restored-system.png`（确认官方侧主题已回到「系统」）。

另有 3 类窄屏形态已在基线里，但**必须人工在真机/模拟器上过一遍**（截图看不出触摸目标与滚动惯性）：
移动抽屉（左滑出侧栏）、底部 Sheet 面板（插入/格式，样式与信息收进 `⋯`）、编辑器 16px 防 iOS 聚焦放大。

## 二、tokens 偏差表

`craft.do` 列为 **2026-10-22 对登录后产品内界面的真实 `getComputedStyle` 实测**（`tokens.md` §九 / §12.2）。
⚠️ **旧基准作废**：本表原来取自**营销页**（暖纸白 `rgb(252,249,247)`），但产品内实测是**冷白** `rgb(252,253,254)` —— 两者不是同一个面。Δ 为本地与实测值的可量化差。

| 维度 | craft.do 基准 | 本地 token | Δ | 处置 | 有意偏差 |
|---|---|---|---|---|---|
| 页面背景 | `rgb(252,253,254)`（`--base: 252 253 254`） | `--background: oklch(0.9936 0.0017 247.8)` = `rgb(252,253,254)` | **0** | 已对齐（逐字相等） | 否 |
| 正文墨色 | `rgb(26,28,30)`（`--foreground: 26 28 30`） | `--foreground: oklch(0.2252 0.0049 248)` = `rgb(26,28,30)` | **0** | 已对齐（逐字相等） | 否 |
| 主按钮 | 本轮未量（旧值 `rgb(3,3,2)` 是营销页） | `--primary: oklch(0.18 0.008 85)` | 无对照 | **待量**：产品内主按钮底色 | 否 |
| 边框 | 本轮未量（旧值「微暖灰」是营销页） | `--border: oklch(0.92 0.004 85)` | 无对照 | **待量** | 否 |
| 圆角 | 旧值 16px（营销页）；产品内 `--radius-md: 8px` 已实测 | `--radius: 0.75rem`（lg 12 / xl 16.8px） | 待校 | 需按实测 `--radius-md: 8px` 校一轮 | 否 |
| CTA 圆角 | 药丸（全圆角） | 产品内 `rounded-md` | 形态不同 | **不改**：药丸是营销页语言，产品内按钮保持中等圆角 | ✅ 有意 |
| 标题字体 | Untitled Serif（48px 为营销页值） | `font-serif` = Georgia/Times/Noto Serif SC，`text-3xl`(30px) | 字体不可搬运；字号更小 | 系统衬线栈近似 | ✅ 有意（版权） |
| 正文字体 | **Inter**（实测字体族第一顺位） | `Inter` 16px / `line-height 1.7` | **字体已一致**；行高待校 | 字体无需替代 | 否 |
| 等宽 | 专有 mono | `--font-mono` 系统等宽栈 | 字体近似 | 不搬运 | ✅ 有意 |
| 图标 | 专有图标集 | lucide + 自绘（`scripts/gen-icons.mjs` 出 favicon/manifest 图标） | 语义近似 | 不搬运 | ✅ 有意（版权） |
| 主题背景/Washi 位图 | 专有素材 | CSS 渐变/图案近似 | 纹理差异 | 不搬运 | ✅ 有意（版权） |
| 暗色主题 | **本轮已采 4 屏**（`ref/dark-{browse,doc,search,settings-appearance}.png`），但未量 token | `--editor-bg: oklch(0.9911 0 0)` 亮 / `oklch(0.2562 0 0)` 暗 | 待量 | 有图了，可开始对比 | ⏳ 部分 |
| 顶栏高度 | `--header-height: 48px`（实测） | — | — | 已对齐 | 否 |
| 动效时长 | 转场约 200–300ms | `--transition-fast 100 / base 150 / slow 250ms ease` | 区间内 | 已对齐 | 否 |
| 侧栏宽度 | **288px**（实测，所有路由一致） | `--layout-sidebar-w: 288px`（≤767 变抽屉 `min(20rem,88vw)`） | **0** | 已对齐（本仓已改为 288） | 否 |
| 右栏宽度 | **296px**（`#right-sidebar-container`）—— ⚠️ 但是在**窗口态 1060×707** 量的，非 1440 基准 | `--panel-w: 360px`（≤1023 转底部 Sheet） | **不可比** | ⚠️ 两数不同基准：官方 296 是窗口态、本地 360 是 1440 下的固定值；`globals.css:251` 自述「~360px」**本轮未能复现**，需在 1440 基准下重量 | 否 |
| 正文measure/内边距 | 正文框实测宽 **442px**（窗口态，非 1440 基准） | `--editor-measure: 720px`、`--editor-pad-x: 3rem → 2rem → 1rem` | 无可比性 | 需在 1440 基准下重量 | ⏳ 待采 |

## 三、功能/交互层"只有人工能确认"的清单

1. **拖拽手感**：侧栏文档拖进编辑器/集合、DragHandle 抓取首块、拖入分栏列内、看板卡片跨列。
   自动化只断言了结果，插入指示线的出现时机与抖动需要手感判断。（DragHandle 本轮修掉两个真缺陷：
   指针移向把手时把手被隐藏、首块因 `posAtDOM` depth=0 而抓不住。）
2. **中文 IME**：拼音候选期间的 inputRule 不应误触发（`#`、`- `、`[] `、`~~`、`==`、`$x^2$`、`..-`/`.--`/`---`/`=-`）。
3. **撤销/重做跨结构**：删除分栏、把表格拆成段落、镜像块插入后 Ctrl+Z 链是否连续。
4. **协作观感**：双端同开一份文档，远端光标名字标签位置、颜色区分度、断网重连后内容不倒退、
   离开再进来块数不翻倍（有回归用例，但"多人同时打字不抢焦点"要人工感受）。
5. **只读与权限观感**：viewer 打开文档/白板时工具条确实禁用且提示可读；口令页输错 3 次仍不泄露内容。
6. **离线与 PWA**：DevTools offline 后导航到 `/offline.html`、安装态图标（自绘 192/512/maskable）、
   重连后草稿恢复弹窗出现一次且只出现一次。
7. **导出保真**：`/信息` → 导出 markdown / html / text / json 四格式逐个人工核对富块（callout、卡片、
   表格、分栏、公式、白板嵌入）有没有丢内容 —— 这是 codec 的 `default: textContent` 老缺陷的回归面。
8. **移动端触摸目标**：44px 命中区、底部 Sheet 拖拽关闭、`⋯` 菜单不误触。
9. **暗色对比度**：正文/次要文字/禁用三档在 `oklch(0.19 0.005 260)` 底上是否达到 4.5:1。
10. **空态与错误态**：无网络下的 AI 生成、图片生成、链接预览失败提示文案与重试入口。

## 四、采集状态（2026-10-22 第二轮已完成：66 屏）

旧记录（路径 B，2026-09-25）6 屏 desktop 已被本轮**全量取代**：现在是
`docs/craft-ref/ref/` 下 **66 张**（desktop 54 / tablet 6 / mobile 6），md5 逐张唯一，见 `screens.md` §十二。

旧“仍缺”三条的现状：

1. ~~tablet / mobile 档~~ **已采**（推翻：`Emulation.setDeviceMetricsOverride` 可用，`viewport.set()` 无效是路径 B 的限制）。
   当前 6 屏有三档：`all-documents` / `tasks` / `calendar` / `collections` / `whiteboard` / `inbox`。
2. ~~右栏 格式 / 样式 / 信息 三 tab~~ **已采**（`ref/document-tab-{format,style,info}-desktop.png`）。
3. 登录 / 注册 / 回收站 / 白板列表仍属本地专有路由（官方无对应面或需登出）⇒ 按 token 比对即可。

仍真的未采（不是旧原因）：集合详情 / 白板的**独立路由**屏（本账号两者均为内联块）、
团队协作态（需第二个账号）、每日笔记屏、`menu-people`（付费墙，免费档不触发）。

`scripts/capture-ref.mjs` 是路径 A 的产物（自带 Playwright 会话，需自己的账号），保留备用。
