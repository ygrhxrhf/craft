# Crafty 全场景测试报告(2026-09-22)

环境:dev server http://localhost:3000(用户提供实例);测试账号 craft-test@example.com;
浏览器:Qoder 内置浏览器(browser-use MCP)+ curl。

## 一、路由矩阵(19 条)

| # | 路由 | 断言 | 结果 |
|---|---|---|---|
| 1 | `/` | 307 → /login?callbackUrl=/(未登录) | ✅ |
| 2 | /login | 200,登录成功 → /documents | ✅ |
| 3 | /register | 200 | ✅ |
| 4 | /settings | 200,渲染"设置" | ✅ |
| 5 | /documents | 200,最近编辑列表(Test A/B/C/日记) | ✅ |
| 6 | /documents/[id] | 编辑器渲染、图标/标题/工具条 | ✅ |
| 7-9 | /trash、/favorites、/recent | 均 200(trash 空态文案"回收站是空的") | ✅ |
| 10 | /collections | 200,新建集合弹窗 | ✅ |
| 11 | /collections/[id] | 表格视图(默认视图 tab + 筛选/排序/分组) | ✅ |
| 12 | /daily-notes | 今日笔记自动列出(9月22日 周二)+ 打开按钮 | ✅ |
| 13 | /search | ⌘K 面板,输入"Test" → Test A/C/B 命中 | ✅ |
| 14-15 | /whiteboards、/whiteboards/[id] | 200;画板加载 + 快照恢复 | ✅ |
| 16 | /tasks | 任务收件箱:编辑器 taskItem 同步显示 | ✅ |
| 17 | /calendar | 月视图 + 今日选中 + 日记条目面板 | ✅ |
| 18 | /s/[token] | 分享页见下方口令流程 | ✅ |
| 19 | /p/[slug] | 发布页,未发布时显示"页面不存在或未发布"逻辑保留 | ✅ |
| 20 | 权限(12 路由 × 未登录) | 全部 307 → /login?callbackUrl=<原路径> | ✅ |

## 二、编辑器交互矩阵

| # | 交互 | 断言 | 结果 |
|---|---|---|---|
| 1 | 块拖拽 | mousemove 出 handle → pointer 拖 UL → [P,UL,P]→[UL,P,P] → 撤销恢复 | ✅ |
| 2 | `[[` 引用 | 中文"任务"后输入 `[[` 弹出"链接到文档",点击插入带 documentId 的 blockLink | ✅ |
| 3 | 卡片块 | / 菜单 → 布局 → 卡片,cardBlock 节点插入 | ✅ |
| 4 | taskItem 同步 | 编辑器勾选"task apple" → /tasks 显示 checked:true | ✅ |
| 5 | AI 浮动菜单 | ⌘J/✨ 打开、主菜单互斥、Esc 关闭、错误文案(无效 key → "Request timed out.") | ✅(成功路径待有效 key) |
| 6 | 白板拖入编辑器(新) | 侧栏白板条目 dragstart → 编辑器 drop → whiteboardLink 插入,点击跳转 /whiteboards/[id] | ✅ |
| 7 | 文档拖入编辑器 | 既有 sidebarDoc MIME 体系,Crafty 侧栏双向拖拽此前已验证 | ✅(回归未变) |
| 8 | 保存持久化 | 2s 防抖保存,刷新后内容/块引用/whiteboardLink 均在 | ✅ |

## 三、白板持久化

| 断言 | 结果 |
|---|---|
| 画布加载(canvas + tl-container) | ✅ |
| 合成 pointer 绘制一笔(12 段 move) | ✅ |
| 刷新后形状恢复(5 个 shape 元素、36 条 SVG path) | ✅ |

## 四、分享口令保护(新功能)

| 断言 | 结果 |
|---|---|
| ShareDialog 设置口令 → "已启用" | ✅ |
| /s/[token] 无 cookie → PasscodeGate(icon+标题+输入框) | ✅ |
| 错误口令 → 401 + "口令错误,请重试" + shake 动效 | ✅ |
| 正确口令 → Set-Cookie + reload → 内容可读 | ✅ |
| /p/[slug] 独立 path cookie → 同流程 | ✅ |
| 清除口令 → 无 cookie 直接可读(curl 验证 200 + 正文) | ✅ |

## 五、视觉还原(对照 craft.do)

- 暖纸白背景/暖墨色/微暖边框(oklch 色相 85)✅ 计算样式验证:lab 正 b* 轴
- 侧栏暖灰底 ✅
- 卡片圆角 12px 基准(xl≈16px)✅
- 文档标题衬线字体(Georgia/Noto Serif SC 栈,非搬运官方字体)✅
- 详见 `docs/craft-ref/visual-diff-checklist.md`

## 六、已知边界(非缺陷)

1. AI 成功路径(改写/续写/翻译/总结)依赖有效 OPENAI_API_KEY,当前 key 失效返回
   "Request timed out." —— 错误分支已优雅展示;换 key 后即可端到端验证。
2. /tasks 勾选不反向写回编辑器 taskItem —— 单向同步(编辑器→任务)为既有设计。
3. `CommandDialog` 需 `<Command>` 包裹的既有修复仍生效(⌘K 无回归)。
4. 测试中曾向文档写入测试节点,已全部清理。
5. **标题落库缺陷＝已结案（2026-10-04，commit `13f3549`）**。症状＝在编辑器里改标题后立刻导航离开，标题不入库
   （`trash-selection` 与侧栏右键用例曾在库里查无该行）。根因＝`DocumentEditor.tsx:253` 每次渲染递一个新的内联箭头
   作为 `onTitleChange`，而它挂在 `EditorHeader` 防抖 effect 的依赖里 ⇒ 任何与标题无关的父级重渲染都会
   `clearTimeout` 再重新起 500ms，写入只能在渲染停止后发出；这期间导航即整条丢弃。
   页内直接数 delay=500 的定时器实测：18 次面板切换 → `scheduled=19 / cleared-before-fire=18 / fired=1`，
   写入落在 4922ms（而切换本身 4528ms）；修法（ref 持回调、赋值放在 effect 里、依赖收成 `[draftTitle, title]`）
   后同探针读到 `scheduled=1 / cleared=0`，写入 +548ms，此时切换仍持续 6904ms＝写入在抖动当中就发出了。
   正控制＝故意把依赖改回旧形状，用例红于 `e2e/core.spec.ts`（`.pw-out/e2e-report-pc6.json`，
   文案含 "first 6242ms after typing, 5822ms of re-rendering before leaving"）。
   同提交内的侧栏批量读**不是**这枚缺陷的修法：只有它的构建上写入延迟 6 次全部超出旧预算
   （1264／1434／2712／4855／4901／4932ms），它只把每周期 5 发独立读压成 1 发。
6. **判据形状第二次变更（同一处用例，用户已认可）**：绝对毫秒预算已整体撤除
   ——`grep -c 'toBeLessThan' e2e/core.spec.ts` 实算＝**0**；`grep -c 'expect(sent' `＝**0**，
   即写入次数与渲染压力都不再被直接断言。现存的判据只剩两枚：
   (a) 命中守卫 `expect(churn.missing,…).toBe(0)`——断的是 20 次面板切换里**没命中的次数**，属 DOM／命中守卫，
       **不是重渲染次数**；(b) 持久性断言 `…toBe(marker)`——抖完立刻离开、按 URL 回原文档后标题输入框的值。
   **它比旧判据弱在哪一面，必须写明**：旧判据虽然被证伪为不可靠（见下），但它至少会让"渲染压力真的存在"这件事
   失败；新判据不会。现在"父级确实在重渲染"只由 (a) 的点击命中数与 `EditorHeader` 上的注释间接支撑，
   靠常识而非断言。若面板改版导致那两个按钮不再是重渲染源，本用例会**静默退化**为"什么都没抖"的通过。
   撤除理由＝同一构建、同一动作串，只起 1 个 dev server 时 533–1133ms，而本配置同时起 3 个 server 时
   2295–2562ms ⇒ 绝对毫秒数跟踪的是跑测机负载而不是产品；用它当判据既会误红也会误绿
   （两轮里坏构建因 CDP 往返每次 >500ms 反而"通过"，见 `docs/adr/0003` 附注）。
7. **两枚间歇性红（一枚已修、一枚待判）**：
   - `core.spec.ts:38 settings persist preference selection`：**产品档，已结案（2026-10-04，本轮未提交）**。
     原始红点照抄存档，不改写：`core.spec.ts:66:71`（＝`page.reload()` 之后那条 `toHaveAttribute`），
     **不是** `:58` 那条点击后的断言；`Locator: getByRole('button', { name: '深色', exact: true })`
     `Expected: "true"  Received: "false"  Timeout: 20000ms`，call log
     `40 × locator resolved to <button type="button" aria-pressed="false">…</button>`；
     已提交字节 `13f3549` 单跑 **3/6 红**、改动前 `a15f261` 单跑 **4/4 红**，耗时双峰
     （绿 11328／12400／19352ms 对 红 29627／30549／34718ms），零并发即可复现＝**不得写成"并发压力类"**。
     ★★ 旧条目那句"机制假设（未证）"本轮**证成为真**，并排除了我中途一度以为的另一条成因＝
     "写通路坏了、`updatePreferences` 落不了库"（那是被上一段的废器读出来的假象，见 (甲)）：
     机制＝**面板比服务器早 ~0.5s 宣称"已保存"**。修前 `src/components/settings/SettingsPanels.tsx:146`
     在 `await updatePreferences(patch)` **之前**就 `setPrefs(next)`，而 `:64` 的 reload 落进这段窗口就把
     写请求整条打断。实算＝浏览器侧只观测、直读 `users.theme`（psql，n=5，同一账号同一行）：
     上色 218／254／256／266／354ms，落库 354／749／830／846／948ms ⇒ 五发里四发上色早于落库
     （354ms 那发是我 400ms 采样粒度下的平手，不构成反例），且**五发全部落库**＝写通路本身没坏，
     坏的是"上色的时机"。
     ☆ 修法＝`setPref`（现 `:140`）与同文件 `setSwitch`（现 `:159`，历批已是"先确认写入再上色"）对齐：
     `await updatePreferences(patch)` 成功后才 `setPrefs` 与 `setTheme`。`setTheme` 也一起挪到后面＝
     next-themes 会把主题写进 localStorage，若画面先走、导航一断，localStorage 与行就长期各说各话
     且屏上没有任何东西暴露这点。失败分支改为静默不动画面（原来也只是"上色后回滚"，信息量相同）。
     ☆ 新用例 `core.spec.ts:82 theme choice is not shown as saved before the server accepted it`
     ＝两把钟对照：`waitForResponse` 只观测不改请求，取 `postData()` 里含 `"<theme>"` 的那一发为"服务器接受"，
     取 `aria-pressed` 翻真的一刻为"画面宣称"，断言 `paintedAt - acceptedAt >= 0`。
     **红＝`Received: -494ms`（`.pw-out/e2e-report-preftwo.json`，未修字节，红在 `:128:5`）**，
     绿＝修后 `--project=desktop -g "theme choice is not shown as saved"` 单跑 **5/5 绿**
     （15597／15401／15076／15076／15787ms，startTime `08:11:56.881Z`–`08:14:08.041Z`）。
     旧用例同时在修后单跑 **5/5 绿**（`-g "settings persist preference"`，
     12971／15264／15519／15580／15372ms，startTime `08:09:07.091Z`–`08:11:16.823Z`）＝
     **双峰里"红＝含 20s 超时"那一档整体消失**，不是被加大超时压下去的（`expect.timeout` 仍是 20000ms 未动）。
     ★★★ **两处仪器自纠，都写进判据**：
     (甲) 我第一版用 `page.route(/\/settings$/)` 扣 POST 想"扣住那一发写"＝**废器**。Next 的 server action
     全部 POST 到**当前文档 URL**，侧栏批量读／`getPreferences`／`updatePreferences` 共用 `/settings`，
     扣一个就把三发一起扣住：实测写请求被挤到 `+1843ms`、reload 必然抢跑，读回来的"没落库"是仪器造的。
     改判据＝凡"扣住某一发写"必须先证这发能被**单独认出**（这里用 `postData()` 含被写的值）。
     (乙) 用例里 `getByRole(..., { pressed: true })` **不能**当"偏好已载入"的闸门：
     `(prefs?.theme ?? 'system') === variant` 让 prefs 仍为 `null` 时「系统」就是 pressed＝
     历批那句注释"the pressed state only appears once they arrive"是错的（本轮改正，未动旧用例本体，
     只在**新用例**里用 通知 面板的 `载入中…`（`value === undefined` 才渲染）作闸门）。
     ☆ **同族第二处已一并修掉**：`src/components/theme/ThemeToggle.tsx`（侧栏下拉）原本是
     `setTheme(...)` 立即上色 ＋ `void updatePreferences(...)` 不await＝同一形状的缺陷，实测差得更远＝
     红在 `Received: -1569ms`。改法同上，新用例
     `core.spec.ts:148 sidebar theme choice is not applied before the server accepted it`
     用同样的两把钟（观测量＝`<html>` 上的 `dark`/`light` 类），修后单跑 **5/5 绿**
     （startTime `08:49:48.620Z`–`08:51:45.049Z`），跑完 `users.theme` 回读＝`system`（用例复原）。
     ☆ 本节按用户当轮指令写"结案"，**尚未 commit／push**。
   - `core.spec.ts:119` `.block-anchor-flash`：并跑红、单跑 **5/5 绿**＝覆盖层自毁窗只有 1400ms
     （`src/lib/editor/block-anchor.ts` `deadline = Date.now()+1400`），断言走 CDP 往返轮询，机器吃紧时
     一次往返就整窗错过 ⇒ 仪器窗口宽度不足，不是产品少画一次高亮。**本轮未动**（等具名指令）。
   - ☆ 跑测卫生约定（同一时间只允许一个 playwright 占 3000／3001／3002，不得对 3000 发 `taskkill`）
     的由来：曾为清端口冲突误杀另一路并跑的 dev server，造出 17 枚纯假红与一次 `3001 is already used` 中止。
8. **★★★ 基线里烘着 dev 浮标＝逐像素扫出来的，不是从"全绿"推的**。
   按浮标圆点色 `rgb(80,227,194)`（与 `maskColor` 的青 `#00f0f0` 可分）扫 126 张基线的左下 3/4 区域：
   **15 张命中、每张恰好 44 px＝同一枚同位置的浮标**＝
   `light-app-{daily-notes,documents,favorites,recent,search,settings,templates,trash}-mobile`（8）＋
   `dark-app-{documents,recent,search,settings,templates}-mobile`（5）＋
   `dark-document-tab-信息-{mobile,desktop}`（2）。浮标包围盒实算＝`x 19..135 / y 607..644`
   （390×664 帧、底左锚定、CSS 偏移 16px），历批那条"行 607–644、列约 30–149"与之相符。
   ☆ **为什么"视觉 96/0"完全不否证这件事**：整枚浮标在亮色移动帧上实算 **2,955–3,095 px**（本轮重录后
   逐张量得，见下）＝移动帧的 **1.1%–1.2%**，在 `maxDiffPixelRatio: 0.02` 预算内 ⇒ 全绿与"基线是脏的"
   同时成立。⇒ **判据：基线卫生只能靠逐像素定位，不能靠通过率**（通过率是"差异 < 预算"的同义反复，
   对亚预算污染零分辨力）。☆ 暗色帧上"实质差"只有 347–1,171 px＝浮标深灰 `50,50,50` 与暗底
   `30,30,30` 差 20，压在我 40 的实质差阈值以下＝**同一枚浮标在暗档几乎量不出来**，
   所以"暗色命中数少"不是"暗色浮标小"，是量法对暗档钝（圆点色那把尺不受影响，恒 44 px）。
   成因＝这 15 张的 mtime 停在 `10-02 13:16`＝早于把 `expectIndicatorIdle` 闸门加回 `shoot()` 的那次
   （`13f3549`，10-04 12:13）；同日 12:36 只重录了其中 2 枚（`light-app-collections-mobile`／
   `light-document-tab-信息-mobile`），剩下 15 枚是漏网的。
   ☆ **本轮处置＝只保住"能证明只动了浮标"的那 6 枚**：在闸门下 `--update-snapshots=all` 重录一遍，
   再逐张按"实质差（>40）落在哪里"分类（阈值 40 是为了把下面 (甲) 那个全局 +16 位移当噪声排除）。
   保住＝`{dark,light}-app-{documents,recent,settings}-mobile` 六枚，逐枚读数＝圆点 `44 → 0`、
   实质差像素 347／771／1,171／2,955／3,005／3,095、**盒外杂点全部 0**；其余 **103 枚一律 `git restore` 退回**。
   ★ 退回的理由＝重录一遍把 **109／126** 枚都改了，而其中绝大多数改的不是浮标，是另外两件事
   （分类读数：17 枚逐字节相同／2 枚只有亚阈值位移／9 枚实质差全在浮标盒内／**98 枚盒外有实质差**）：
   - **(甲) token 对齐的欠账**：`89e4d52`（09-25 16:32）把暗色 `--base` 从 `oklch(0.17 0.005 260)`
     改成官方 `oklch(0.235 0 0)`＝实测新帧背景 `rgb(30,30,30)`、旧基线 `rgb(14,15,18)`；亮色侧同理＝
     `light-login-desktop` 卡片 `255,255,255 → 252,252,252`＝官方 `--base-overlay`。两值都记在
     `docs/craft-ref/tokens.md`（亮 `--base` `252 253 254`／暗 `--base` `30 30 30`）＝**现在的渲染是官方值、基线是旧的**。
   - **(乙) 遮罩落点漂了**：`light-app-calendar-desktop` 有 `0,240,240 ↔ 252,253,254` 各 **2,280 px**
     成对互换＝`shoot()` 第一条 mask（`h2:has-text("19")`／`h2:has-text("20")`）这次盖在别的元素上。
   - **(丙) 面板左栏内容漂**：`light-document-tab-信息-mobile` 与 `{dark,light}-whiteboard-mobile`
     在浮标盒内有 3,024–3,038 px 实质差，但**圆点 0 → 0**＝那里根本没有浮标，是内容
     ⇒ 历批"6908 除浮标外还有内容级漂移"那句由此独立复现。
   ★★★ **顺带抓到门禁本身的一处弱点（本轮未改，要具名指令）**：`toHaveScreenshot` 的 `threshold`
   走默认 **`0.2`**（✎ 本条历批写作 `0.1`＝错，`playwright-core@1.63` 的 `coreBundle.js:7897` 是
   `options.threshold ?? 0.2`＝**每通道 51/255**，比原先记的还宽一倍）、比率走 `0.02`，两层都看不见"整帧均匀位移"＝暗底 +16 亮度被感知距离判为"相同"；
   而 `light-app-calendar-desktop` 那 20,162 px 实质差＝1,296,000 的 **1.56%**，正好压在 2% 预算下。
   ⇒ **判据：通过率对 (a) 全局 token 位移与 (b) 亚预算内容漂移都是零分辨力**，
   要看得见就得换尺子（圆点色＋实质差包围盒，本轮已建成 `_impl-scripts` 里两份脚本）。
   ☆ 剩下 **9 枚**仍烘着浮标＝`{dark,light}-app-{search,templates}-mobile`＋
   `light-app-{daily-notes,favorites,trash}-mobile`＋`dark-document-tab-信息-{mobile,desktop}`，
   它们与 (甲)(丙) 缠在一起＝重录它们会顺带把未点名的漂移认下来 ⇒ **本轮不替用户做这个决定**。
   ✎ 该条已被下文第 12 条作废＝下一轮用户点名"全部同意"后，这 9 枚已按 `missing` 闸门重录并逐枚证明
   改变区间＝浮标几何；(甲)(丙) 那两笔欠账**没有**因此被认下来（其余 117 枚一枚没动）。

9. **本轮（2026-10-04 下午）门禁读数，全取 stdout、均在最终字节上**：
   - vitest **48 files／404 tests passed**（本轮未新增单测：两枚修法都在客户端组件里，
     本仓 vitest 是 `node` 环境、无 `@testing-library`，客户端行为只有 e2e 一条通路）。
   - `tsc --noEmit` **无输出＝0 错**。
   - `eslint` **0 errors／441 warnings**（与改动前逐字同，警告数一枚没动）。
   - e2e 非视觉（`--project=desktop`，16 份 spec、**67 枚**）＝**63 passed／1 unexpected／3 skipped**，
     `startTime 2026-10-04T09:00:57.748Z`、1742s。那枚 unexpected＝`trash-selection.spec.ts:9`
     红在 `:29` 且**不是断言**＝`page.reload: net::ERR_CONNECTION_REFUSED`，日志里逐字有
     `[WebServer] ⚠ Server is approaching the used memory threshold, restarting...`
     ＝Next dev 撞内存阈值自重启、正好砸中第 61 发；单跑复核 **2/2 绿**（`09:31:14.192Z`／`09:32:13.897Z`，
     两份日志里 `memory threshold` 各 0 次）⇒ 判**通路档**，不记产品回归、不因此改判据。
     ☆ 3 枚 skipped 全部有具名原因＝`responsive.spec.ts` 三条 `test.skip` 按 project 分档
     （`editor right panel` 跳 desktop；两枚铃铛回归跳 desktop＋tablet＝只有手机档宽度会让两者撞上），
     本轮已把它们在**该跑的那一档**实跑出来：`e2e/responsive.spec.ts --project=mobile --project=tablet`
     ＝**8 passed／0 failed／2 skipped**（那 2 枚＝同两条在 tablet 档），铃铛两枚在 mobile 档**都是绿的**。
   - e2e 视觉（三档全跑）本轮共三份读数：
     ① 改动前基线上的复核＝**96 passed／0 failed／0 skipped**（`startTime 2026-10-04T08:52:36.418Z`、
     393s，跑后 `git status` 里一枚基线都没被改写）；
     ② `--update-snapshots=all` 全量重录一遍＝同样 **96/0**（`-visrec`，6.6m，改写了 109 张基线的字节）；
     ③ **保住 6 张纯浮标重录＋退回其余 103 张之后＝96 passed／0 failed／0 skipped**
     （`startTime 2026-10-04T09:58:15.950Z`、325s）＝那 6 张新基线对第二次独立捕获仍然一致＝不是单发巧合。
     ☆ ① 两条读数的含义已被第 8 条限定：**96/0 不等于基线干净**。

10. **SQL 往返读数（用户点名的第 ① 项，本轮结案）**：把一枚计数中间件临时接到 `src/prisma/db.ts`
    （`afterQuery` 逐条落 `../impl-scripts/sql-census.log`），量"方案 A 到底省下了什么"。
    ☆ **它省下的是传输量，不是往返次数**：同一份字节连跑三档，整跑语句总数是
    **400／379／358**（a1／a2／b2），单窗计数更摆——冷 `/documents` 在两跑同字节上给出 **119／169**。
    ⇒ 计数这条尺先作废（历批那句"84→21 次往返"数的是 HTTP action 派发，本来就不是查询数）。
    真实差异有两处，都改由**形状**承载：
    - **五枚列表读全在裸奔整行**（含 `content`／`plainText`）。按侧栏那 605 行直接问库实算字节＝
      `content` **119,517 B** ＋ `plainText` **11,230 B** ＝ **130,747 B/发**，而同表的元数据列合计
      才 **42,340 B** ⇒ 投影掉的正是这 128 kB。判据＝**"少发几条"是假读数，"少发哪几列"才可核**。
    - **同步轮询的归属判定原本在 JS 里**：老写法 `SELECT id, userId FROM documents`（无谓词、
      行数＝**全表 888**），新写法 `SELECT id FROM documents WHERE userId = $1`（**619**＝本账号行数）。
      A/B/A 四档对照（同一台 dev、同一登录态、每跑各写一份窗口文件），逐档读数＝
      `b1｜HEAD｜id 单列＋WHERE 的读 0｜整表读 10｜语句 379｜总行 18,151`、
      `a1｜本轮｜33｜0｜400｜16,139`、`a2｜本轮｜30｜0｜379｜15,441`、
      `b2｜本轮回切复测｜27｜0｜358｜14,743`。

      ☆ 判据＝**形状列是二值的**（0 ↔ ≥27、10 ↔ 0），计数列不是（同字节两跑 379／400）⇒ 只有形状能作证。
      按轮归一后＝每轮归属读 **920 行 → 649 行**，且从"随表长"变成"随本账号数据长"。
      ☆ 那 888 行读的 `ms` 在 **130–1,302** 之间摆＝同一形状自己摆十倍，历批那句 sumMs
      **14250→12649→9533** 一并降级为**不可用读数**，本轮不引它作证。
    ★ **四次仪器自纠（三次产出了假读数，都在落笔前被抓）**：
    ① 窗口 JSON 走固定路径、被第二次运行覆盖 ⇒ 第一次的日志失去归属，对照脚本把 `after` 报成
       **0 条**——上一轮那个"after=0"就是这么来的，本批改"每跑各写一份"后重跑；
    ② 表名匹配器原先只认 `"public"."documents"` 这种限定形，非限定名 **126/138** 全落进 `?` 桶；
    ③ 中间件把 SQL 截到 80 字符 ⇒ "无 WHERE"会把长列名投影误判成裸读，改为"截断行一律记为可疑、
       不计入 bare"（所以表中"整表读"那列是按 `id, userId FROM` 这一路数的，不是按 `definitively-bare`）；
    ④ 计数与延迟不可作证（见上）。
    ☆ 临时中间件在读数取完后已 `git restore`，最终字节里没有它（`git status` 里 `src/prisma/db.ts` 干净）。

11. **集合树的 N+1（第 ② 项，已修）**：`getCollections()` 原本"每枚集合两次子查询"，而侧栏快照
    每发都含它 ⇒ 一次冷载多份重复读。TDD 三档：
    - **红（逐字）**＝`AssertionError: four collections cost 9 statements, two cost 5: expected 5 to be 9`
      （新测试 `src/actions/collection/collection.test.ts`：自建计数中间件、只武装在被测那一发上）。
    - **绿**＝批量成 1＋2 读（`Collection` ＋ `Promise.all([properties, items])`、`IN (ids)` 用回调形），
      4 枚与 2 枚都是 **3 条**。
    - **对照（把修法改坏）**＝故意去掉"按父分组" ⇒ 计数那条**仍然绿**、只有实质断言红
      （`expected [ { …(10) }, … ] to have a length of 2 but got 8`）⇒ 两条断言互相独立，
      "语句数不涨"这一条单独不构成验收，与第 7 条主题缺陷那次同形。
    ☆ 另有一条判据留下＝老写法把 `items` 整批发回来只为数个数；新写法 `.select('id','collectionId')`。
    ☆ 同档未修的第二处＝`getCollection(id)` 里"每个 item 一次 `CollectionValue` 读"。它只在打开
      单枚集合时触发、不在冷载路径上（本次 census 里 `collection_values` 只有 n=10／max=35），
      本轮不顺手扩大改动面。
    ★ **"快照重放 3–4 次"这条挂账判为按设计、不是缺陷**：`use-sidebar-snapshot.ts:17-22` 的缓存键是
      `treeVersion:pathname`，而"键里带 pathname"是历批写死的因由＝新建集合不 bump 树、
      只有导航进去才浮出来。收紧成跨路由复用会把这个已修过的缺陷放回来 ⇒ 只记下"每份快照便宜了"。

12. **余 9 枚浮标基线已重录（第 ③ 项，用户点名后执行）**：闸门换成
    `--update-snapshots=missing`＋**先把这 9 枚挪出目录**＝`missing` 档只能写入"缺席"的那几张，
    其余 117 枚即便不匹配也只报红、不改写 ⇒ "只动了这 9 枚"由仪器保证而不是由我声明。
    实跑两份（`vis-rerecord-a`／`-b`）＝各 9 failed（写缺席快照必然计为失败）／15 passed，
    跑后 `git status` 里基线恰好 15 枚被改＝6 枚历批已重录＋本批 9 枚，其余一枚没动。
    ★ **历批那把亮色尺子对暗档零分辨力，本轮换了尺子**：`dark=N` 在暗底基线上是
    "整角都是暗背景"（新帧 `dark=4,502/4,560`＝98.7%），旧帧也是 `4,295`＝**改前改后都报 PILL?**。
    ⇒ 换判据＝框内"偏离本框中位数 >40 的像素"＋新旧差集包围盒：
    `offBg 358 → 66`、`3499/2848/2833` 个改变像素、包围盒 `x 30..133 / y 608..644`
    ＝**与浮标自身的 101×37 几何重合**；桌面那枚的盒只框到浮标右端 24 px，改点 `x 111..133` 与之相符。
    亮色 5 枚由老尺子独立复现（圆点色命中 `44 → 0`、`widestDarkRow 105 → 26`）。
    ☆ 判据＝**"浮标没了"要按改变区间的几何来证，不能按某一档的像素计数来证**（计数对暗底钝）。

13. **视觉门禁阈值（第 ④ 项）：量完价、决定不收**：
    - **噪声底实算＝0**：同一路由连录两次（间隔 3 分钟、两次独立 dev server 实例），9 枚
      3,367,680 像素里 **anyDiff=0**、material>40=0、maxDelta=0 ⇒ 拍摄条件本身完全可复现，
      门禁再紧也不是被"抖动"挡住的。
    - **紧一档的代价实测**：把 `threshold` 从默认 **0.2**（☆ 本条历批写作 0.1＝错，见第 8 条的 ✎）临时降到 0.02 跑全矩阵（`--update-snapshots=none`）＝
      **23 failed／73 passed**，其中 **16 暗／7 亮**，失败行报的都是"255,206 pixels (ratio 0.99 of all
      image pixels) are different"这种**整帧级**差异＝第 8 条那笔 token 欠账（暗底 `14,15,18 → 30,30,30`
      每通道 +16，恰好被 `threshold 0.2`≈**51/255** 吞掉）。☆ 也就是说这次实验是把感知容差**收窄 10 倍**（0.2→0.02），不是原记的"减半"。
      实验完已 `git restore playwright.config.ts`，
      最终字节上阈值仍是默认值。
    - ⇒ **结论：不收 `threshold`**。0.02 会让门禁在**代码一字未改**时报 24% 红，红的原因不在产品里；
      要么先做一次 126 枚全量重录（＝把历批判为"不该认下来"的漂移一并认下来，用户没点这个名），
      要么把它当常态噪声。两条都比"看不见全局位移"更贵。
      ☆ 补偿控制留在**重录环节**而不是运行环节：`probe-pill-baked.cjs`（圆点色）＋
      `probe-pill-dark.cjs`（暗档可用的 offBg＋差集包围盒）＋`noise-floor.cjs`（两次录制的逐像素对照），
      三把尺子都在 `_impl-scripts` 里，重录时按第 12 条的 `missing` 闸门跑一遍就能定档。

14. **本轮（2026-10-04 晚）出口门四件套，均在最终字节上、全取 stdout**：
    - vitest **50 files／413 tests passed**（历批 48／404 → 本轮新增 `get.test.ts`(6) 与
      `collection.test.ts`(3)；两枚主题修法仍在客户端组件里，本仓 vitest 是 `node` 环境、
      无 `@testing-library`，那部分行为只有 e2e 一条通路）。
    - `tsc --noEmit` **无输出＝0 错**。
    - `eslint` **0 errors／441 warnings**＝与本轮动手之前逐字同，警告数一枚没动
      （中途一度 443：新增的两处 `(c: any)` 标注，已改用 `for...of` 迭代掉）。
    - e2e 非视觉**分两批**（每批各自起全新服务）＝批次 1（authz-toast／authz／block-link-menu／
      collab／core／drag-drop-band／drag-handle-menu／editor，8 份 spec）**43 passed／1 failed／16.7m**；
      批次 2（mention-user／notify-switches／reminder-delivery／responsive／share-edit／
      share-publish／trash-selection／whiteboard-collab，8 份）**28 passed／0 failed／5 skipped／8.4m**
      ⇒ 合计 **71 passed／1 failed／5 skipped／77 枚**。那枚 failed 的定性见第 15 条；
      5 枚 skipped 全部＝`responsive.spec.ts` 里按 project 分档的具名 `test.skip`（历批同形，本轮没新增跳过）。
    - e2e 视觉（三档全跑、全新服务）**96 passed／0 failed／0 skipped，6.3m**＝本轮那 15 枚新基线
      对一次独立捕获全部吻合；跑后 `git status` 里基线计数仍是 **15 枚**＝这一发没有改写任何基线
      （`--update-snapshots` 完全没用）。
    ★ **本轮另外有三份"整批读数"被作废并原样归档**（都不是产品红，是测量条件的问题）：
      ① `19:11–19:48` 那次非视觉全量（37.2m）报 **3 failed／5 skipped／69 passed**
      （`editor.spec.ts:109` 两档 slash 命令＋`share-publish.spec.ts:39`）＝**复用了上一发遗留的
      `next dev`**（19:11 起、已跑了近 40 分钟），同样这几枚在②的干净分批里全绿；
      ② `19:47` 那次在测试 40 之后连续 38 枚红、每枚 ~400ms＝服务整条没了（连接拒绝），
      日志末尾"38 failed"不是判据而是现场；
      ③ `20:12` 那次视觉跑用 `setsid nohup` 分离出去，停在第 8 发、三个端口全空＝分离进程随会话被杀。
      ⇒ 判据＝**e2e 的每一发读数都要能证明"服务是这一发起的、且没在半路死"**：端口先空、日志取 stdout、
      通知摘要一律不作数（①那份的转述摘要当时是"66 passed／0 failed／3 skipped"，与 stdout 三处不符）。
      ☆ 历批那条"一次挂起的写会拖挂后续读"式的通路判语在本轮再次成立＝服务健康与否直接决定
      38 枚的成败，因此**分批＋全新服务**从今天起是本仓 e2e 的默认跑法，不是特例。

15. **本轮唯一那枚非视觉红的定性（承历批已归档的同一条）**：`core.spec.ts:204`
    `[[^ link addresses a single block and jumps back to it`，红在"等 `.block-anchor-flash` 可见"
    这一步（`expect(locator).toBeVisible() failed … Timeout: 4000ms … element(s) not found`，
    批次 1 里该枚耗时 43.1s）。本轮按"要样本量就跑到 ≥5 并报分布"的口径单跑 **5/5 全绿**＝
    1.1m／47.1s／46.9s／45.2s／46.1s（每一发都含 ~40s 的全新服务启动，实际用例都在秒级）。
    ⇒ 判**仪器档**、不记产品回归，与历批那份"隔离 5/5 绿、对着 1400ms 自毁的浮层"同一形状：
    全批跑时该浮层在断言被调度到之前就已自毁，隔离跑时进程空闲、赶得上。
    ☆ **不改判据、也不加超时**：`timeout 4000ms` 是这枚用例的意义所在（闪层本来就只活 1400ms），
    放宽它就等于把这枚用例改成恒真。**留作在册间歇红**，跑法上按第 14 条改为分批＋全新服务后
    仍会出现，出现时按本条对号即可。
    ☆ 与之相对，历批那枚"主题开关间歇红"本轮已经是**真修掉**＝批次 1 里 `core.spec.ts:38`
    （33.4s）、`:82`（43.2s）、`:148`（14.5s）三枚全绿，且本轮非视觉 77 枚里没有任何一枚红落在主题上。

16. **浮标普查的"针"正式定名＋定义（观测侧 19:2x 提的"我的针漏色"，盘上否证）**：
    - **针名＝`pill-dot-44`／定义**＝与参考色 `rgb(80,227,194)` 的三通道距离和 **≤60** 的像素，且该文件命中 **≥12 px**；
      并报出包围盒，让"命中"必须能被肉眼复核成圆点形状，而不是只当一个计数。工具＝
      `../impl-scripts/probe-pill-band.cjs <目录> [band]`。
    - **读数**＝本次入账之前（`HEAD~1`＝`71a8058` 的 126 枚）命中 **恰好 15 枚、每枚 44 px**，
      其中 **36 px 是精确色、8 px 是抗锯齿环**，15 枚的包围盒完全同一＝移动帧 `x 32..39 / y 622..629`
      （桌面帧 `y 858..865`）＝同一枚 **8×8 圆点**；本次入账之后（126 枚）同一把针 **0 枚命中**＝浮标污染清零。
      ⇒ 观测侧那句"点色不恒为该值"**在这批字节上不成立**＝15 枚里每枚都含 36 个精确色像素。
      两边 44 vs 36 的差＝**环像素**（精确匹配把抗锯齿圈丢了）；9 vs 15 的差＝**阈值或扫描范围**，
      不是像素值。☆ 但"精确色那把针会系统性少算"这个方向是对的＝本轮把它换成容差带，
      并把两把针的差（36/44）写成在册事实。
    - ☆ **band 不能乱放宽**＝`band≤90` 起就会命中与浮标无关的 UI 青绿（`light-document-tab-样式-desktop`
      这类 1,400+ px 的散布、`bbox x 22..1396`），特异性反而崩掉。⇒ 定义里必须同时钉住 **距离带＋最小像素数＋包围盒形状** 三件。
    - ★ **`light-document-tab-信息-mobile`（6908 px 那三张图对应的文件）判为已销项**：它**不在**上面 15 枚里＝
      10-04 12:36 那次重录已把它洗干净（`docs/test-report.md:161` 在册），观测侧手上的证据是 **10-03 19:08** 的
      `expected/actual/diff`＝早于那次重录。今天全矩阵对它**绿**。⇒ 观测侧判语 (1)"该重录不该改代码"已由盘上实现；
      判语 (2)"整页纵向 1–3 px 逐行累积位移"也只对**重录前**成立，它正是那 6908 px 的其余部分（`6908/258,960＝2.7%` 越过 2% 预算，
      重录后归零）。判语 (3)（浮标在基线与实截同时在场则永远绿）**成立且重要**＝它就是我第 8 条"通过率对浮标污染零分辨力"的机制面，
      本轮的 15→0 是把它从"看不见"变成"针能看见"。
    - ☆ 两栏具名（承上一轮要求，同一集已核实）＝**内容变更 6 枚**＝`{dark,light}-app-{documents,recent,settings}-mobile`
      （历批 17:5x 保住的那 6 枚＝本次入账的 6 枚，**同一集**，由 `pill-dot-44` 针在 `HEAD~1` 上命中这 6 枚＋
      盒外实质差按历批口径 max>40 为 0 双重确认）；**缺失补齐 9 枚**＝`{dark,light}-app-{search,templates}-mobile`＋
      `light-app-{daily-notes,favorites,trash}-mobile`＋`dark-document-tab-信息-{mobile,desktop}`。
      ☆ 两类含义不可混写＝前者是"已有文件被换掉"、后者是"文件先被挪出目录、闸门只能新建它"。
      ★ 其中 **5 枚页面主色被这次重录迁移**＝`dark-app-templates-mobile` `rgb(14,15,18)→rgb(30,30,30)`
      （整帧 252,807 px 三通道和>40）、`dark-app-search-mobile` `13,13,16→27,27,27`、`light-app-search-mobile`
      `225,224,220→226,227,228`、`light-app-{favorites,trash}-mobile` `251,249,245→252,253,254`（＝向官方
      `--base` 靠拢）。⇒ **照原样入账、没有挑任何一边**，`maxDiffPixelRatio` 与 mask 一字未动
      （`git diff HEAD~1 HEAD -- playwright.config.ts e2e/visual.spec.ts` 为空）。

17. **一处硬错的更正（`e2e/visual.spec.ts:120`，由 `640849d` 引入并已推送）**：原句＝"The stale grid is **5427 px** on mobile, **just under the 2% budget** on its own, which is why it only failed inside a full run where the dev pill adds another 4891"。
    - **算式在盘上核对**（`playwright-core@1.63` 源码 `coreBundle.js:7903`）＝`maxDiffPixelRatio` 的预算是 `expected.width * expected.height * ratio`，**跑在整帧上**；mask 是把该区域在两图里涂成同色，**不缩分母**。实测两枚日历移动基线 IHDR 均为 **390×664＝258,960 px** ⇒ 预算＝**5,179 px**。
    - **实算读数**＝`.pw-out/e2e-report-b5r.json`（10-03 14:01，`[mobile] app /calendar`）与 `b5r2.json`（14:08）两处都是 **`5390 pixels (ratio 0.03 of all image pixels) are different`** ⇒ **5,390 > 5,179**＝单靠陈旧网格就**越界**。（原句那个 5,427 在盘上查无出处，只有本条注释自己写着。）
    - ☆ **"ratio 0.03" 是取整假象、不是更大的差**＝同文件 `:7909` 是 `Math.ceil(count / (w*h) * 100) / 100`：5,390/258,960＝**0.02081** → ×100＝2.081 → ceil＝3 → 印成 `0.03`。⇒ 判据＝**别拿打印的 ratio 反推差的大小，要拿 `count` 除以帧像素自己算**；这条也解释了第 8 条那句"1.56% 正好压在 2% 预算下"为何打印成 `0.02`（ceil(1.56)＝2）。
    - ★ **但"只在整跑红"这个现场是真的**，只是归因写反了：`14:01` 整跑红（5,390）→ **`14:02` 单跑同一枚＝绿**（`.pw-out/e2e-report-cal1.json`，mobile、2 tests、0 unexpected）→ `14:08` 整跑又红。⇒ 差别在**那一发采到的是哪种网格状态**，不在"离预算多近"。加时钟钉之后 `calfix2.json`（15:06）＝**96/96 全绿**，问题由钉子解决、不是由预算解释。
    - ☆ 该改的注释已就地改写（把预算公式、帧像素、5,390 与 5,179 的比较、ceil 打印、以及"单跑绿"的真实归因都写进去），**保留了原句仍然成立的那半**＝"这一发抓不住错的月份，所以时钟钉是承重的"。**没有**为了保住原推论而调措辞，也**没有**动 `maxDiffPixelRatio`、mask 或任何基线（`--update-snapshots` 一字未用）。
    - ★ 同一处错话在文档里的两处（第 8 条与第 13 条把感知容差默认值写作 `0.1`）一并更正为 **`0.2`**＝`coreBundle.js:7897` 的 `options.threshold ?? 0.2`＝每通道 **51/255**。⇒ 门禁"看不见 +16 均匀位移"这件事比我原先写的**更严重**（51/255 远吞 16），而第 13 条那次收紧实验实际是把容差**收窄 10 倍**（0.2→0.02）而不是"减半"。

18. **历轮那两个聚合数（铃铛 13／树 8，各 6 次装载）已在同一台仪器上逐枚复现，并顺带挖出一条数据面不变量**：
    - **复现 13**＝`../impl-scripts/probe-bell-fanout.cjs` 加了"在第 N 发装载之前执行一份 SQL"的写侧挂钩（这是关键：游标只在轮询端点头部被消费，**装载之前**插进去的到期提醒会被登录那发首屏吃掉＝量到的永远是"无重发"＝假零）。实跑＝`load1..6` 逐枚 `bell=2/2/3/2/2/2`、`snapshot=1×6`、浏览器侧 POST 同为 `00ee35a2=3` 于第 3 装载 ⇒ **总 13＝12（StrictMode 双发）＋1（一枚真·新提醒的合法重发）**。
    - **复现 8**＝同仪器插一枚**新文件夹**（属 `SIDEBAR_TABLES`）后 ⇒ `snapshot=2` 且**不是只此一次**：紧接的一发装载也是 2，第 4 跑（清行之后）又回到 `1×6`＝总 6。⇒ 该复发是**粘性**的，由"最新一行是不是侧栏表"决定。
    - ★★★★★ **成因＝时间戳精度，不是"有新行"**（两侧对照，唯一变量＝精度）＝服务端回游标是 `new Date(maxTs).toISOString()`＝**毫秒**；库里应用自己写的行 `µs == ms×1000`（实测 `documents` 最新行 `126-126000`、`folders` `941-941000`、`tasks` `272-272000`、`notifications` `498-498000`）⇒ `updatedAt > since` 对它**为假**＝不重放。而我用 SQL `now()` 插的行带真微秒（取样＝`524.524681`，同一行截到毫秒＝`525.525000`）⇒ 游标**永远收敛不过去**，每一枚**新会话**的第一发轮询都把该行当"新行"重新计入 ⇒ 侧栏表 ⇒ `bumpTree` ⇒ **每次装载多付一发树读**；会话内被 `sameRow` 抑制，所以只有"整页重装"才看得见。反向对照＝插一枚 `date_trunc('milliseconds', now())` 的最新文件夹 ⇒ `snapshot=1×6`＝总 6。⇒ **不变量＝凡是绕过应用写入 `updatedAt` 的通路（迁移、直连 SQL、别的服务）必须截到毫秒**，否则同步游标不收敛、每枚页面装载多一发读，且这条**与 StrictMode 无关、生产档同样付**。
    - ☆ 诚实限定：历轮那个 `8＝6＋2` 我**只证到"存在这样一条机制、且能按变量复现/取消"**，没有证到"当时就是它"＝当时工作区的行是否带微秒无从回查。
    - ★★★★ **③-① 铃铛在途缓存＝按 TDD 做，判据先红**＝新纯核 `src/lib/read-per-revision.ts` ＋ `read-per-revision.test.ts`（5 枚）。对"无缓存"桩的逐字红＝`AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times`（`read-per-revision.test.ts:13`）；实现后 **5 passed**。☆ 另 4 枚（revision 上台阶／回来／失败不入缓存）在桩上本就绿＝**它们是防过度缓存的护栏、不是这枚改动的证据**，承重的是第一枚。
    - **接线验收**（组件级行为无 DOM 测试面，判据落在浏览器计数器上）＝默认档（StrictMode 开）复跑 6 装载 ⇒ `bell=1×6`、`snapshot=1×6`＝总 6/6，与第 44 条那笔生产档读数（12 装载全部 1/装载）**对齐**；☆ 反向没被吃掉＝`e2e/reminder-delivery.spec.ts` **2 passed**（`a reminder that came due arrives in the bell and stays resolved across a reload` 20.7s、`the reminders switch decides whether a due reminder is delivered at all` 32.1s）＝轮询驱动的合法重发仍然进铃铛。
    - ☆ 没有顺手把 `use-sidebar-snapshot.ts` 折进同一个工具（它的 key 是 `treeVersion:pathname` 两半、且自带 setState 语义，改它需要它目前没有的测试面）＝**重复留在一处、由本条记账**，不在本轮扩大改动面。
    - 现场＝本轮为取样写入的 3 枚行（1 task／1 微秒 folder／1 毫秒 folder）与其派生 notification 已逐枚删净并回读（`tasks_left=0`、`notifs_left=0`、`post_delete_count=0`）。
    - **四道门（最终字节）**＝tsc `exit=0`；eslint `0 errors / 441 warnings`（与在册基线同数）；vitest **51 files / 418 tests passed**（＝在册 50/413 正好加上本条这一份 5 枚）；
      非视觉 e2e 两批（新起服务、批间端口空掉）＝批 1 `43 passed / 1 failed`（20.7m）＋批 2 `28 passed / 5 skipped`（9.3m）
      ⇒ 合计 **71 passed / 1 failed / 5 skipped＝与上一轮逐字同形**，唯一那枚红仍是已在册的 `core.spec.ts:204`（第 15 条，本条为它添第 6 枚样本；`core.spec.ts:38` 本轮 14.8s 单档绿）。
      视觉矩阵**未跑**＝铃铛渲染未变、且第 39 条那 9 枚浮标基线仍挂着，不在本轮顺手重录。
    - ☆ **提交后补跑的那道门（`87e501a` 之后）**＝视觉矩阵 **96 passed / 0 failed（6.7m）**，且跑完 `git status --short` 为空
      ⇒ 这份改动**没有改写任何一枚基线**（`--update-snapshots` 全程未用）＝"铃铛渲染未变"由计数器佐证、不由推断。
      ☆☆ **该 11 行落盘时的 commit message 是错的**＝`86809eb` 的内容只有 `docs/test-report.md +11/-0`，
      却挂着上一批（`87e501a`）那条"Coalesce the bell read…"的正文＝我把 `git commit -F` 指到了 `commit-msg-5.txt`（应为 `-6`），
      并且随后照常推送＝远端已带这条错 message。⇒ **不 amend、不 `--force`**（在册硬边界），改为**前向更正**：
      本行即为勘误，正确描述随下一枚正常 commit 的正文一并落盘。⇒ 教训入册＝**多份 message 文件并存时，`-F` 的参数要在提交前对一次首行**，
      别凭"刚写过哪个"的印象选；`chained` 的多条 `git commit` 更是禁止（本次那串里第一条就误提交、第二条才报 nothing to commit）。

    - ★ **本条那条不变量的风险面比写下的更窄（静态＋盘上双侧核过）**＝`temporal.updatedAtString()` 的 `updatedAt`
      是 **JS 侧 execution generator**（`onCreate`／`onUpdate` 都挂它），而 `createdAt` 才是 SQL 默认值 `now()`
      （实现＝`@prisma/orm-family-sql/dist/timestamp-now-generator-*.mjs`，`sed -n '55,83p'`）。
      盘上验 3 枚应用写的文档＝`created=476.476810 / updated=948.948000`、`495.495316 / 851.851000`、
      `280.280942 / 626.626000` ⇒ **`createdAt` 一直带真微秒、`updatedAt` 恒毫秒**。
      ⇒ 不变量收窄为：**只有"绕开 ORM generator 去写 `updatedAt` 的那一支"（直连 SQL 的 seed／迁移数据段／别的服务）才破坏游标收敛**；
      应用自身写入与 `createdAt` 的微秒都无害（游标不看它）。⇒ ☆ 反过来也提醒一句：探针 SQL 里 `now()` 落在 `created_at` 上是可以的、
      落在 `"updatedAt"` 上就会污染"每次装载几发"这一族读数。

19. **集合详情读的第二处 N+1 已修（活路径），并删掉一枚带同样缺陷的死码**：
    - **先验证目标是不是活的**＝`grep getItems` 全仓（`src`／`e2e`／`docs`）**零引用**＝死码；真正在跑的是 `getCollection(id)`
      （集合详情页）里那句"每枚行一次 `CollectionValue` 读"。⇒ ☆ 判据＝**修 N+1 之前先问哪条通路真被消费**，
      否则会把 25 行死码修得很漂亮而活路径一处没动。
    - **TDD＝先红**（新 `src/actions/collection/collection-detail.test.ts`，真库＋`afterQuery` 计数中间件，同第 11 条的夹具形状）＝
      逐字红＝`AssertionError: a one-item collection costs 5 statements, a four-item collection costs 8: expected 8 to be 5`
      ⇒ 改一次批量读（`where((m) => m.itemId.in(itemIds))`＋按 `itemId` 分桶）后 **6 passed**（两份集合测试文件合计）。
    - ★ **三枚断言各测不同事（控制跑过）**＝把 `CollectionItem` 的作用域摘掉（`.where({ collectionId: id })` 去掉）复跑＝
      **只有隔离那枚红**＝`AssertionError: expected [ …(60) ] to not deeply equal ArrayContaining{…}`，
      另两枚（分桶正确／语句数不随行数增长）仍绿 ⇒ 三枚不是同一件事的三次回声；恢复用 `cp` 回原字节并 `cmp` 证逐字相同。
    - ☆ **计数尺在这条通路可用、在第 10 条那条不可用，差别要说清**＝这里是 vitest **直调 action**＝语句序列确定；
      那里是 dev 冷装载＝预取与渲染状态会把同一份字节跑出 119 与 169。⇒ 判据＝**用计数前先问这条通路的语句序列是不是确定的**。
    - **死码 `getItems` 删除**＝lint 总数 **441 → 438**＝正好 −3 全来自它；我的新代码 **0 新增警告**
      （用 `git show HEAD:<f> | eslint --stdin --stdin-filename <f>` 对同一文件两档逐档核：`items.ts 18→15`、
      `collection.ts 9→11` → 去掉两枚多余的 `(item as any)` 断言后**回到 9**）。
    - ★★ **本轮我自己判错又当场撤回的一句话**＝先用 `left(value #>> '{}',1) <> '"'` 把 29 枚 `CollectionValue` 判成
      "产品在往 `json` 列写裸串"的活缺陷（其中 28 枚属 e2e 账号、时间戳一直写到当天 16:51，看着极像活缺陷）；
      改用真正的判据"解码出来那段还能不能 `JSON.parse`"重算＝**只有 1 枚不可解析，而那枚正是我自己夹具中止时漏下的**
      （本轮在同一把新谓词下重算的分母＝库里 **51 枚全扫／不可解析 0 枚**，清理前是 52／1＝那 1 枚就是漏下的夹具行）
      ⇒ **产品侧写入无缺陷**（`setItemValue` 一直 `JSON.stringify`，是对的）。
      ✎ **连同当时给的"为什么误收"一起更正**＝原话"合法值里 number/object/boolean 都不以 `"` 开头"不成立＝
      实算全库 51 枚 `json_typeof` **全是 `string`**＝零枚 number/object/boolean；误收的真正原因是 `#>> '{}'` 已把标量的
      外层引号剥掉，于是那把谓词对**每一枚**正常行都成立＝它不是"旁证不牢"，是"恒真"。
      ☆ 判据加一条＝**旁证式分类线除了问"该属性是否成立"，还要问"它在健康样本上是不是也成立"**＝恒真的分类线等于没有。
    - ★★★★ **这一条本轮补上了"能不能红"，并把我自己写错的机制改对**＝分类线改成属性直写
      `json_typeof(value) = 'string' and not pg_input_is_valid(value #>> '{}', 'json')`（PG 16+ 的 `pg_input_is_valid`）＝
      仪器 `../impl-scripts/probe-undecodable.sql`（全程 `begin…rollback`）＝**同一把谓词在真数据上 1 → 2 → 1**
      （把一枚健康行临时写成单编码形＝2，回滚＝1）＝既非恒真也非恒绿；`fixture-cleanup.sql` 里那枚报 28 的旧 `poison_left`
      已就地换成此形。
      ＝☆ **更正我更早的一句话**＝"写裸串能存进去，但读的时候会抛"里**成因写错了**＝实测 PG **拒收**裸串
      （`../impl-scripts/probe-json-coltype.sql`：未定型字面量→`类型 json 的输入语法无效`＋`DETAIL: Token "苹果" is invalid`；
      显式 `::text`→`字段 "value" 的类型为 json，但表达式的类型为 text`；合法 JSON 文本那档只撞外键＝写侧本身放行）
      ＝`json` 列**不可能**存下非法 JSON，"失败延迟到读侧"为真、但通路在 codec 不在存储：
      `node_modules/@prisma/orm-target-postgres/dist/codecs-*.mjs:277-278`＝`pgJsonEncode = JSON.stringify(value)`、
      `pgJsonDecode = JSON.parse(wire)`，而驱动交回来的已经是解析过一次的值⇒**读侧解析两次**。
      三枚字节级读数互相对上＝健康行存 `"\"苹果\""`（12 字节，内层仍是合法 JSON）两次解析落在 `苹果`；
      漏下的那枚存 `"一枚行#0.0"`（15 字节，内层是裸文本）第二次解析抛
      `RuntimeError: Failed to decode column collection_values.value with codec 'pg/json@1': Unexpected token '一', "一枚行#0.0" is not valid JSON`。
      ☆ 活闸门＝`setItemValue` 里那句 `JSON.stringify` **是承重的**＝把它当"重复序列化"清理掉，写入照样成功、库面照样合法，
      只有下一次详情读才炸＝**写侧不给任何信号**。
    - ☆ 实验账（单变量＝只摘夹具里那一句 `JSON.stringify`）＝定向跑 `collection-detail.test.ts` **exit=1**＝3 枚全 skipped、
      `beforeAll` 抛上面那条 `RuntimeError`＝vitest 在 `beforeAll` 失败时**不跑** `afterAll`，那枚行因此留在库里
      （删前先读回内容＝`users 2／values 1／properties 2／items 1／collections 1`，按邮箱前缀 `collection-detail-%` 选、不用 CJK 显示名）；
      `cp` 回原字节＋`cmp` 证逐字相同后复跑＝**6 passed / 2 files**；清理后库面＝**总 51 枚／undecodable 0**。
    - **门禁（最终字节）**＝tsc `exit=0`；eslint `0 errors / 438 warnings`；vitest **52 files / 421 tests passed**；
      集合相关 e2e 定向批 `-g "collection"` **13 passed（2.4m）**，跑完 `git status --short` 内无任何 `.png`＝基线一字未动；
      非视觉全量与视觉矩阵**未重跑**（上一份全量基线在 `87e501a`，本批只动 `src/actions/collection/` 两个文件＋一份新测试）。
      ☆ 第 41 条另一半（126 枚基线全量重录后再谈阈值）按第 13 条的量价**继续不做**。
20. **全局搜索里"集合行"这一路此前每次必抛＝产品里集合搜索一直是静默零结果**（顺带把上一条评论里那句错机制改对＝见第 19 条）：
    - 逐字红＝`TypeError: v.value.ilike is not a function`（`search.ts:176`，`Json` 字段的字段代理上没有 `ilike`）＝
      这一发查询**从来没成功过**；调用方两处（`CommandPalette.tsx:59-67` 首发与 `:78-87` 翻页）都只有 `try/finally` 没有 `catch`⇒
      界面得到的是"搜索集合没有结果"而不是报错＝☆ 判据＝**通路级抛错在缺 catch 的调用方那里长得像空数据**。
    - 为什么历批 421 全绿没抓到＝`/search` 页只开关弹层（`src/app/(app)/search/page.tsx` 不读库）、
      视觉基线拍的是**没有查询词**的空弹层、`e2e/block-link-menu.spec.ts` 走的是另一个入口 `searchDocumentsForLink`
      ＝覆盖面缺口，不是"没缺陷"。
    - 判据（新 `src/actions/document/search-collection-scope.test.ts`，真库 3 枚）＝① 别人账号 10 枚命中、我 1 枚时我那枚必须在结果里
      ② 结果里不许出现别人的 `itemId` ③ 回给的 `text` 是单元格本体、不带 json 外层引号。先红＝**3 枚全红**、原因即上面那条 `TypeError`。
    - 转绿＝先定作用域（我的集合 → 我的行 → 我的单元格，共 3 发读完）再把文本匹配放到 JS；顺带去掉每命中 2 发的 `first()` 回查。
    - **控制（三枚不是同一件事的三次回声）**＝把 `.where({ userId, isDeleted: false })` 里的 `userId` 摘掉复跑＝
      ①红（`search returned [6 枚别人 id], my row … is absent`）、②红（`expected [ Array(1) ] to include 'b06be7a7…'`）、③仍绿；
      `cp` 回原字节＋`cmp` 逐字相同后 **3 passed**。
    - ☆ 要说清证据边界＝"页容量限制早于归属过滤会把我的行挤出"这句在**改之前**没能单独测（它挡在那次抛后面）＝
      本次是从"摘掉作用域"这一侧看到同一形状（别人的 6 枚把我的挤掉）＝结构性推论＋反向观察，不是对原形状的正面复现。
    - **e2e 已补（同轮，任务 #46 结案）**＝新 `e2e/search-palette.spec.ts` 三枚判据：① 弹层按标题找到我的文档
      ② 弹层按单元格文本找到我的集合行 ③ 别人账号的数据不出现在我的弹层里（并要落到"未找到"态、不卡在"搜索中…"）。
      账号自注册 `craft-palette@example.com`＝视觉矩阵 owns 的那枚账号一律不写（往共享账号的集合单元格里打字会把
      `collection table view` 基线改掉），且 `playwright.config.ts` 的 tablet/mobile 只 `testMatch` visual|responsive＝这枚只跑 desktop。
      夹具走真入口：新建集合自带一枚 `名称` 文本属性（`createCollection`）→新建行→点 `-` 空格→填→Enter。
    - **控制的不对称才是要记的东西**＝把 `src/actions/document/search.ts` 整份回退成 HEAD 那枚带 `v.value.ilike` 的缺陷形（`git show HEAD:` 落盘）复跑＝
      ①② **红**（`expect(locator).toBeVisible() failed`）、③ **仍绿**＝"沉默空结果"这一类**负向判据抓不住、只有正向判据抓得住**；
      `cp` 回固定字节＋`cmp` 逐字相同后 **3 passed（29.2s）**（首跑因冷编译 53.7s＝同一批字节两种读数都合法，别把编译时间当回归）。
    - 门禁（本条最终字节）＝tsc `exit=0`；eslint `0 errors / 429 warnings`（438→429，−9 全在 `search.ts`；两份新测试与这份 e2e **各 0 枚警告**）；
      vitest **53 files / 424 tests passed**；e2e＝`search-palette` 3 passed／`-g "search"` 视觉 6 passed／`block-link-menu` 5 passed／
      `-g "collection"` 13 passed；各轮跑完 `git status --short` 内 `.png` **0 枚**＝基线一字未动；
      库面＝`collection_values` 55 枚／`undecodable` 0／历轮夹具账号 0 残留。
21. **按第 20 条的形状把同族枚举了一遍，并抓出我自己刚写下的那枚空心判据**：
    - ☆ 谓词面（可红性）＝全库 `grep -rn "\.ilike(" src/` 共 **5 枚**调用点＝唯一打在 `Json` 列上的正是第 20 条那枚，
      ✎ **这枚数缺的是钟、不是针＝第 22 条末笔更正**＝`HEAD~1`（改前）该针实跑 **5 行**、`HEAD`（改后）同一把针 **4 行**＝被修掉的正是 `v.value.ilike` 那一枚⇒ 5 与 4 都对，第 21 条只是没写它是哪份字节上的读数
      其余 4 枚按 `contract.prisma` 逐枚核实接收列型＝`Document.title String`／`Document.plainText String`／`Tag.name String`
      ⇒ **同族清零**（这 4 枚仍走 SQL 侧匹配、本轮未动＝它们合法）。
    - ★★ 浏览器侧到底有没有信号＝**实测**（临时把 `pageerror`／`console` 挂到弹层三枚判据上并把读数写到仓外）：
      健康档三枚各 `pageerror 0／console error 0`；缺陷档（`git show HEAD:` 回退 `search.ts`）同一枚动作下＝
      `pageerror=["v.value.ilike is not a function"]`＋`console error=["Failed to load resource: the server responded with a status of 500"]`
      ⇒ **开发者看得见、用户看不见**（屏面是"未找到与…相关的结果"）＝这就是那枚缺陷能活到今天的完整解释。
      三枚判据末尾各留一条 `expect(errors).toEqual([])`＝健康档 0 枚＝这枚断言可红、是第二张网不是唯一一张。
    - ★★★★ **我自己上一轮写下的负向判据是空心的**＝第 20 条那条"别人数据不出现在我的弹层里"当时只断"不出现＋落到未找到态"＝
      而 `未找到与 “…” 相关的结果` 在 **200ms 防抖窗口内就已渲染**（`hasQuery && !searching && 三个数组皆空`）＝
      **通路整个死掉也照样绿**＝上一轮控制跑那个 `2 failed / 1 passed` 里的 `1 passed` 不是"缺陷不存在"，是"判据无效"。
      改形＝先要求一次**看得见地落地**的结果（我的单元格行必须出现），再把查询词换成别人的、断言**它消失**
      ＝"消失"只能发生在第二次响应之后 ⇒ 同一控制跑变成 **3 failed**＝负向判据自己也能抓住死通路了。
      ⇒ ☆ 判据＝**任何"零命中"类断言之前，要在同一段里先放一枚"该通路此时真在响应"的正控制**；
      否则你测的是渲染时序，不是功能。这条比第 20 条那条"覆盖面缺口"更狠：那是要么没测、要么测了个不能红的。
    - ☆ 放大器清单（**本轮不改**，最终字节上复扫一次与首次扫一致）＝全库 `'use client'` 文件里"只有 `try/finally`、没有 `catch`"的块
      **15 枚／13 份文件**＝各 1 枚的 11 份（`app/(app)/calendar/page.tsx`、`app/(app)/collections/[id]/FormView.tsx`、
      `app/(app)/daily-notes/TodayNoteButton.tsx`、`app/(app)/tasks/page.tsx`、`app/(app)/whiteboards/CreateWhiteboardButton.tsx`、
      `components/collection/AddPropertyMenu.tsx`、`components/collection/AddViewMenu.tsx`、
      `components/editor/extensions/block-link-menu.tsx`、`components/editor/extensions/mention-user-menu.tsx`、
      `components/editor/panels/BacklinksPanel.tsx`、`components/sidebar/ImportButton.tsx`）＋各 2 枚的 2 份
      （`components/editor/tabs/TagsSection.tsx`、`components/search/CommandPalette.tsx`）＝11＋2＋2＝**15**＝逐份列出与总数对平
      （☆ 第一遍我只列了 10＋2＋2＝14，漏在 `FormView.tsx` 一枚＝**清单必须与分母加得起来**，否则清单本身就是那类抽样当全量的错）。
      ＝给它们加错误呈现是**产品决策**（toast？内联？静默重试？）＝要用户点名后按官方屏基准对齐，不在观测层擅自补词。
    - 门禁（本条最终字节）＝tsc `exit=0`；eslint `0 errors / 429 warnings`（本轮新增 0；那两枚 `Unused eslint-disable`/`any` 类读数经逐份归属核实属
      `e2e/core.spec.ts`／`e2e/whiteboard-collab.spec.ts`／`scripts/probe-collab.mjs`＝非本轮）；vitest **53 files / 424 tests passed**；
      e2e `search-palette` **3 passed（改形后复跑 27.8s／28.8s）**；本轮 3 份新文件逐份 `npx eslint <file>` **各 0 枚警告**＝分母与逐份读数并排打印。
      ☆ 非视觉全量与视觉矩阵整体仍未重跑（上一份全量基线在 `87e501a`）。

22. **基线集的两笔审计账（只读，本轮 0 枚基线改动／0 处阈值改动）**：
    - ★★ **分母假零出在"行尾锚"上，而且专挑最坏的那两枚**＝`git show --name-only --format= 5e7376a | grep -c '\.png$'` ＝ **13**，
      去掉锚＝**15**，`--name-only -z` 逐条数＝总文件 24／png **15**（三者都已实跑）。成因＝`--name-only` 对含 CJK 的路径输出八进制**引号形式**，
      整行以 `…win32.png"` 结尾（尾部多一枚引号），`\.png$` 恒不命中。被丢的正是 `dark-document-tab-信息-{desktop,mobile}`＝
      而这两枚恰是盒外差最大的两枚（**6891／5482**）＝**按 13 枚看会得出"最坏的已经点名了"，实际最坏的两枚在视野外**。
      ⇒ ☆ 判据＝**锚式 grep 报零或报少时，要把"哪些行没被锚住"逐行打出来**；只看计数会给出方向性错误的账（同族＝`git ls-files`／`status --porcelain` 要 `-z`）。
    - 15 枚逐枚四列（实质差／差集包围盒／盒外紧档 `19..135×607..644`／盒外宽档 `8..160×h-74..h-4`；暗档用 offBg＋差集包围盒，**不用 `pill-dot-44`**）
      ＝盒外 **0 的 6 枚**：`dark-app-{documents,recent,settings}-mobile`＋`light-app-{documents,recent,settings}-mobile`；
      **非零的 9 枚**＝`dark-app-search-mobile` 3518／`dark-app-templates-mobile` 5389／`dark-document-tab-信息-desktop` 6891（宽档 7196）／
      `dark-document-tab-信息-mobile` 5482（宽档 5167）／`light-app-favorites-mobile` 3125／`light-app-search-mobile` 3554／
      `light-app-trash-mobile` 3497／`light-app-daily-notes-mobile` 68／`light-app-templates-mobile` 74＝**6＋9＝15**（☆ 我第一遍把这两栏写成"8 枚／7 枚"，
      逐枚列名才抓住＝**聚合数必须与成员名册加得起来**，否则清单自己就是那类"抽样当全量"的错；这条判据是采集线在册的，我这批原样兑现一次）。
      分档＝68／74 那两枚全落在 `y0..39` 一行、色变 `252,253,254→82,92,102`＝**标题文字本体＝预期内容变动**；
      3125／3497／3518／3554／5389 五枚的色变族是灰阶字形边＋暗底换档＝候选＝列表文字随账号数据变｜**未证**（证它要跑当前帧对比＝属视觉轮，本轮未授权、我没跑）；
      信息 tab 两枚的色变是**彩色的**（`125,194,235`／`235,194,125`／`30,125,194`，只在 `y≥420`）＝既非浮标也非文字＝**判为待判的意外一类，照原样记录、一字未改**；
      逐枚原始读数在 `../impl-scripts/gate-6-all.log`。
    - ★ **126 枚内部一致性普查＝"通过率不能审计自己的阈值"被盘上坐实**：页×主题分组 **42**，其中 top1 底色跨档**分裂 27**（全表 `../impl-scripts/census-roster.log`）。
      所以 `96 passed / 0 failed` 只证"与当前基线集自洽"，不证这套底色本身对。
      **mtime 不能当录制的钟**＝126 枚只有 **9 个不同 mtime 值**、**94 枚挤在 `2026-10-04 09:56`＋`09:57` 这一分钟对**（＝一次批量触碰）；
      而 `14,15,18` 那 8 枚 mtime 全为 `10-04 09:56`、提交时间却是 `2026-09-25 16:32:51`＝晚 9 天 ⇒ **能用的钟只有 git committer date**。
      分裂确实与"录早了"同分布＝按"最后触碰这枚文件的提交"分档＝`09c52df ×67`／**`89e4d52 ×20`**／`5e7376a ×15`／`66cf329 ×14`／`181268f ×8`／`13f3549 ×2`（67＋20＋15＋14＋8＋2＝**126**＝与分母对平），
      而 `89e4d52 2026-09-25 16:32:51` 那 **20 枚**＝**16 mobile＋4 desktop**，簇内构成＝dark `14,15,18` ×8、light `251,249,245` ×4、dark `21,22,24` ×2、light `249,247,244` ×2
      ＋另 4 枚落在跨提交的簇里（dark `35,35,35`／dark `249,250,251`／light `252,252,252`／light `249,250,251` 各 1）。
      ☆ **这里我第一遍写成"一枚提交带走 16 枚"**＝把"只属于该提交的那几簇之和"当成了"该提交触碰的文件数"＝**聚合数必须与成员名册加得起来**（同上一条错误、同一批内二次犯），
      正确读数是 **20 枚触碰／16 枚独占**；能用的钟只有 git committer date，mtime 那 9 个值里 94 枚挤在同一分钟对。
      ⇒ 候选＝那批快门打在"主题由运行期 effect 写进 `<html>`"之前（G1384 的预测形状）｜**未证**——证它要把其中一枚在当前代码下重录并看是否落到 `30,30,30`＝属重录、本轮不授权。
    - ☆ 两枚同题提交的四问（只报读数不报成因）＝`87e501a` 与 `86809eb` 的 `%s` 与 `%B` 逐字相同（`%B` md5 均为 `17d2381df1f092b3e6f10716b8763998`）；
      numstat **不**相同＝`87e501a` 5 份（adr 19/6、test-report 15/0、NotificationBell 7/1、`read-per-revision.test.ts` 58/0、`read-per-revision.ts` 29/0）
      vs `86809eb` 1 份（`11 0 docs/test-report.md`）；`86809eb^ = 87e501a`、中间无别的提交（17:27:55 → 17:42:34）；
      `git ls-remote origin refs/heads/impl/crafty-p0` ＝ `660eefd…` ＝ 本地 `HEAD`。
    - ★ **非视觉全量 e2e 在当前字节上重跑了一份（补上第 21 条末尾那句"仍未重跑"的欠账）**＝
      `npx playwright test --project=desktop`＋逐份列出 16 份非视觉 spec（不含 `visual`／`responsive`）＝
      stdout 原文＝`1 failed`＋`64 passed (22.1m)`、`PW_EXIT=1`（**后台任务的"exit code 0"不作数**＝那是外壳退出码，真正的 playwright 码在日志里＝1）。
      分母对平＝**65** 枚＝历批那 67 枚去掉 `responsive.spec.ts` 的 5 枚、加本轮 `search-palette.spec.ts` 的 3 枚（`67 − 5 + 3 = 65`）。
      唯一那枚红＝`whiteboard-collab.spec.ts:93`，**不是断言**＝`Test timeout of 120000ms exceeded` 停在 `secondPage.goto(...)` 的 `waiting until "load"`；
      日志里 `line 403` 逐字有 `[WebServer] ⚠ Server is approaching the used memory threshold, restarting...` 而 `line 410` 正是那枚红＝时序前后咬住；
      单跑复核＝`npx playwright test --project=desktop e2e/whiteboard-collab.spec.ts`＝**6 passed (2.6m)／`PW_EXIT=0`／`memory threshold` 出现 0 次**，
      且那枚 `:93` 这一跑 **22.9s**（全量跑里是 2.0m 撞超时）⇒ 判**通路档**（与历批 `trash-selection.spec.ts:9` 同机制、第二次实例），**不记产品回归、不因此改判据或加超时**。
      ☆ 另＝本轮该全量跑里在册那枚间歇红 `core.spec.ts:204` 是绿的（`ok 21 … (32.7s)`）。
      消费面核对＝我改的三份（`document/search.ts`／`collection/collection.ts`／`collection/items.ts`）的 import 面全在 `collections` 页、`sidebar/snapshot.ts` 与两份测试里，
      白板通路零引用＝超时与改动无因果（这一句是静态核对，不是那条红的判据；判据是上面那个单跑）。
    - ★★★★ **我对第 21 条那枚"5 枚"动的第一版更正是错的、这里连它一起改判＝聚合数缺的是钟、不是针**＝
      第 21 条写"全库 `grep -rn "\.ilike(" src/` 共 **5 枚**调用点"，我今天同一条命令实跑＝**4 行**（`search.ts:62/83/91/101`＝`Document.title` ×2、`Document.plainText`、`Tag.name`，接收列按 `contract.prisma` 逐枚核实全为 `String`）＝
      我据此判"数是宽针扫出来的、句子署名给窄针"（宽针 `grep -rn "ilike" src`＝5 行，多出的是 `search.ts:178`＝第 20 条我自己那句注释）。
      **向版本库取两档读数把它否证了**＝`git show HEAD~1:src/actions/document/search.ts | grep -cF ".ilike("`＝**5**、`git show HEAD:… `＝**4**＝
      被修掉的正是 `v.value.ilike` 那一枚⇒ **5 是改前字节上的真读数、4 是改后的**，第 21 条两个都没错，**错的只是没把钟写上**；
      而我那版"更正"把一个对的数改判成错的＝**比原句更错**。已在第 21 条行末把 ✎ 换成本档口径。
      ⇒ ☆ 判据两条＝① **引聚合数要同屏写"改前／改后·哪份 ref·哪把针"**；② **凡要判历批写错，先向版本库取该针在两档 ref 上的读数再下笔**——
      "今天的命令跑不出那个数"不等"那个数当时是错的"，样本会随我自己的修改移动，而这批的移动正是我本人造成的。
    - ☆ 改后字节上 `src` 的 string-only 方法名真实计数（逐条 `grep -rn -F` 单跑）＝`.ilike(` **4**／`.contains(` **4**／`.startsWith(` **28**／`.endsWith(` **2**／`.like(` 0／`.regex(` 0；
      后三把逐枚看过＝全是宿主 JS 字符串（`view.dom.contains(to)`、`e.currentTarget.contains(to)`、`db.objectStoreNames.contains(STORE)`、`type.startsWith('image/')`、`pathname.endsWith('/')`）＝**零枚打在 Prisma 字段代理上**⇒ 第 21 条"同族清零"在改后字节上仍成立。
      ☆ 同一条循环曾对这三把给出 `0／0／0`＝逐条单跑与复跑同一循环都得 `4／28／2`＝**该假零不可复现**；候选＝那一次针被多吞一层反斜杠（`\\.` 在 BRE 里＝字面反斜杠＋任意字符）｜**未证**。
      ⇒ ☆ 判据＝**零命中要先逐条单跑复现、再用 `-F` 与正则两种口径对一次**；两口径不合＝针出了问题，此时的"零"一律不作数（与第 22 条首笔那条"行尾锚假零"同族＝都是输入侧看不见）。
    - ☆ 普查仪器（把上面那句判据落成一段会红的脚本）＝`../impl-scripts/census-predicates.cjs`＝
      从 `contract.prisma` 解析 22 枚模型的字段类型，扫全 `src`（排除测试）的回调式谓词 `(x) => x.field.method(`，
      并解析 `const base = db.orm.public.Document` 这类**构建器变量**来回填模型＝45/58 枚入册、13 枚被模型过滤器丢弃（逐枚打印丢弃原因与原文行，防"丢弃＝干净"）；
      自带**分母闸**＝另用一把只扫 Prisma 专有名（`ilike`／`like`／`regex`，`contains`/`startsWith` 与 DOM 字符串同名故不入）的独立计数与普查结果对平＝
      `scan = 4 / census = 4 → GATE: OK`；可疑档（string-only 方法打在非 String 列上或列名在契约里找不到）＝**0 枚**。
      ☆ 首跑曾因两处仪器缺陷给出假账：`updatedAt temporal.updatedAtString()` 这种**带点与括号的值对象类型**没被类型正则认下（全表报 `?`＝"零可疑"来自解析失败而非干净），
      以及 `const base = db.orm.public.Document ... base.where((d) => d.title.ilike(...))` 这种**跨语句的构建器变量**让 `search.ts:62` 整个掉出名册＝
      修好后同一枚 `.ilike` 才回到册内。⇒ ☆ 判据＝**"同族清零"这类结论的前提是仪器自己看得见自己的分母**：
      修复前那 4 枚在册的只有 3 枚，"清零"当时就已经是假账（第 20 条那枚缺陷就长在 `search.ts`）。
    - ☆ **这台普查有两面结构上覆盖不到＝动态表访问器与计算键**＝
      ① `src/lib/sync/changes.ts:204/206/229` 与 `src/actions/whiteboard/whiteboard.ts:33` 写的是 `db.orm.public[table]`（表名运行期传入），
      静态上不可能回填模型 ⇒ 这 4 枚谓词（`.gt(since)`／`.asc()` ×2／`.eq(userId)`）留在丢弃名单里、**不计入"清零"**；
      ② 计算键的谓词我的回调正则根本表达不出＝`changes.ts:201` 的 `d[scope.key].in(...)`、`:238` 的 `r[key].in(...)`、`:274` 的 `d[key].in(...)`＝**3 枚整条不在扫描面上**
      （而 `:201` 那行旁边就是本仓那句承重注释"对象式 `.where({ id: { in: [] } })` 会静默匹配不到任何东西"＝最该被看着的那类通路）。
      另外 `.gt` 打在 `updatedAt` 上＝契约里 `updatedAt` 全是值对象类型 `temporal.updatedAtString()`，而同表的 `createdAt` 是 `TimestamptzString`＝**同一张表两档时间类型**；
      现况只由 e2e 的侧栏实时性与轮询路径托住＝**静态普查对它是零证明力**，要判它得单发真库探针（未开工，属下一批）。
      ⇒ ☆ 判据承第 21 条＝**"清零"要连着报出这台仪器扫了哪些面、扫不了哪些面**，否则零来自看不见。
    - ☆ 仪器（全部仓外、只读）＝`../impl-scripts/gate-6-mobile-baselines.cjs`（新增 `--all` 档＝一次量全 15 枚）、`table-gate-6.cjs`、
      `strays-profile.cjs`、`baseline-census.cjs`（`.tsv` 全名册）、`census-clusters.cjs`、`census-roster.cjs`。

23. **同步游标 `.gt(since)` 有了能红的判据，并把"字段代理到底暴露哪些谓词名"量成一张表**：
    - ★★★★ **历批两枚活库判据抓不住"静默零行"这个形状**＝`src/lib/sync/changes.test.ts:84`（`never leaks body payloads…`）与 `:122`
      （`a second pull at the cursor is a no-op replay…`）里的每一条断言都是**对可能为空的数组做全称量化**（`for (const row of rows) expect(...)`），
      另加 `if (users.length === 0) return;` 兜退＝**`.gt(since)` 整个返回零行时它们一字不改地绿**＝第 21 条那枚"空心判据"族的又一枚，且长在我自己历批写的测试里。
    - **新增 `src/lib/sync/changes-cursor.test.ts`（真库夹具，账号 `sync-cursor-<id8>@example.com`、两篇文档）**＝三枚判据：
      ① 按 1970 游标必须真取回我那两枚（`expect(docs.length).toBeGreaterThanOrEqual(2)`＋逐枚 `toContain`）＝正面承重；
      ② 同一枚测试体内**先跑正控制**（epoch 游标含我那两枚），再把游标推到未来，断言不含＝"从有到无"才叫判据（承第 21 条那条改形）；
      ③ 改一篇的标题后按上一轮 `cursor` 复拉，断言**那篇回来了**（证明游标真能筛出时间差，而不只是"1970 之后全给"）。
      正确字节上＝**3 passed（292ms）**、`npx vitest run` 全量＝**54 files / 427 tests passed**。
    - **控制跑（单变量＝只翻那一枚谓词）**＝`../impl-scripts/change-cursor-predicate.cjs break` 把 `changes.ts:204` 的 `.gt(since)` 改成 `.lt(since)`＝
      **3 failed**，逐字红＝`Document came back empty at since=null: expected 0 to be greater than or equal to 2`／
      `positive control went missing, so the zero below proves nothing: expected [] to deeply equal ArrayContaining{…}`／
      `the touched row did not come back over the cursor: expected [] to include '…'`；
      `restore`＋`cmp`＝`RESTORED_BYTE_EXACT` 后复跑又 3 passed。⇒ 判据可红＝这条通路从此有闸。
      ☆ 夹具卫生＝跑后库面 `sync-cursor users = 0 / documents = 0 / collections = 0`（`../impl-scripts/probe-cursor-leftover.cjs`，只数不打印显示名）。
    - ★★★★★ **字段代理的谓词能力是量出来的**（`../impl-scripts/probe-proxy-methods.cjs`，`typeof` 逐项探）＝
      `String`／`String?`＝`eq,in,notIn,lt,lte,gt,gte,like,ilike`；`temporal.updatedAtString()`／`temporal.timestamptzString()?`／`TimestamptzString`＝**同上但没有 `like`/`ilike`**；
      `Int`／`Int?`／`Float`＝`eq,in,notIn,lt,lte,gt,gte`；`Boolean`＝**只有 `eq,in,notIn`**；`Json`／`Json?`＝**一个都不暴露**
      ＝第 20 条那枚抛错的完整机制（不是"`ilike` 挑类型"，是 Json 档根本没有谓词面）；
      而 `equals`／`ne`／`not`／`notEquals`／`contains`／`startsWith`／`endsWith`／`regex` **在所测各档上都不存在**＝本批我自己踩了一枚：
      清理探针写 `u.email.startsWith('sync-cursor-')` → `TypeError: u.email.startsWith is not a function`，换成 `u.email.like('sync-cursor-%')` 才通。
      ⇒ ☆ 判据＝**"接收列是 `String`，所以这个方法合法"不够**＝名字要对着量过的能力表核。
    - ☆ 普查闸随之升级（`../impl-scripts/census-predicates.cjs`）＝判红条件从"string-only 方法打在非 `String` 列"换成"**名字不在该声明类型的能力集内**（`asc`/`desc` 属 `orderBy` 不计）"，
      并加**8 枚夹具自测**（`Json .ilike`／`Json .eq` 必须判红、`String .ilike`／`temporal .gt` 必须判净、`String .contains`／`Boolean .gte`／类型解析不出来 必须判红）＋分母闸，任一不合**非零退出**＝
      现况＝可疑 **0 枚**、`SELFTEST: OK`、`GATE: OK (4 = 4)`、`CENSUS_EXIT=0`；三面盲区照旧（动态表访问器／计算键／`Json` 档根本没有谓词面）。
    - 门禁（本条最终字节）＝tsc `exit=0／0 行`；eslint `0 errors / 429 warnings`（新增测试文件单独 `npx eslint` **0 枚警告**＝总数一字未动）；
      vitest **54 files / 427 tests passed**；e2e **未重跑**＝产品字节与 `ee95145` 逐字相同（本条只动 `docs/` 与新增一份测试），第 22 条那份全量读数（`64 passed／1 failed` 判通路档）仍是当前码的读数。

24. **视觉矩阵在当前字节上全量复跑了一份（只读、未重录），并把字段代理的能力表从抽样升到全表面**：
    - ★ **全量视觉＝96 枚测试全绿**（分三次跑、同一份字节）：`--project=mobile`＝`32 passed (2.2m)／PW_EXIT=0`；
      `--project=desktop --project=tablet`＝`64 passed (2.8m)／PW_EXIT=0`；**两次都没带 `--update-snapshots`**，
      跑完 `git status --short` 内 `.png` **0 枚**、`test-results` 目录 0 枚＝**基线与产物一字未动**。
    - ☆ **分母三方对平**（这枚是重点，因为"32 passed"很容易被读成"只量了 32 张"）＝每档 **32 枚测试 ↔ 42 枚快门 ↔ 42 份基线**：
      每主题 1 枚 auth（2 张：login/register）＋12 枚 app 路由（各 1 张）＋1 枚文档（1＋4 张面板 tab）＋集合 1＋白板 1＝**16 枚测试／21 张**；×2 主题＝32 枚测试／42 张；
      三档 × 42＝**126**＝与第 22 条普查分母（盘上 126 份）逐字对上＝**没有孤儿基线、也没有没被走过的快门**。
    - ★★ **它对第 22 条那笔"意外漂移"的判语意味着什么**＝"当前构建产出的画面 == 已提交基线集"这一半**已实测**（96/0）；
      所以那 9 枚盒外非零不是"提交之后又漂了"，而是**`5e7376a` 那次入账自带的、且现在被全量跑认可为当前形状**。
      这枚读数控住的方向是**产品侧写入**那半：它要的是"与官方屏面一致"，而官方屏面属取证线（会话 C）的读数面，**本线不能自证**＝候选＝这几枚的形状就是当前实现的真实输出｜已证；"该形状是否等于官方"＝**不在本线的证明力范围内**。
    - ★★★★ **字段代理能力表：从 10 枚字段抽样升到 266 枚字段全表面**（新 `../impl-scripts/census-proxy-capability.cjs`，读数 `proxy-capability-full.log`）＝
      **22 枚模型的 266 枚字段逐枚 `typeof`，探针报错 0；同一声明类型的所有字段签名完全一致（分裂类型 = 0/42）**＝"能力是声明类型的函数"成立、不必做逐字段表。
      分档＝`String`(77)＋`String?`(30)＝`eq,in,notIn,lt,lte,gt,gte,like,ilike`；`temporal.updatedAtString()`(17)／`TimestamptzString`(21)／`TimestamptzString?`(11)＝同上**无 `like`/`ilike`**；
      `Int`(10)／`Int?`(1)／`Float`(7)＝`eq,in,notIn,lt,lte,gt,gte`；`Boolean`(15)与 `Bytes`(1)＝**只有 `eq,in,notIn`**；
      **`Json`(1)／`Json?`(6) 与所有关系类型（`Document`／`User`／`Tag[]`…）＝一个都不暴露**；
      `equals`／`ne`／`not`／`notEquals`／`contains`／`startsWith`／`endsWith`／`regex`／`mode`／`searchMode` **在 266 枚字段上全部不存在**。
      ⇒ 普查的判红条件据此从"string-only 方法打在非 `String` 列"换成"**名字不在该类型能力集内**"，且能力表**由仪器直接读那份实测日志**（打印 `capability table from: measured (proxy-capability-full.log)  types in table = 42`，读不到才退回字面量并如实报源）＝手打字面量正是当初"接收列是 String 所以合法"这句推断的来源。复跑＝**可疑 0 枚／`SELFTEST: OK`（8 枚夹具全分对，含 `Json .ilike` 必须判红）／`GATE: OK (4 = 4)`／`CENSUS_EXIT=0`**。
    - ★★★ **同一族缺陷在本批抓到我自己一次**＝清理探针写 `u.email.startsWith('sync-cursor-')` → **`TypeError: u.email.startsWith is not a function`**＝
      与第 20 条那枚同一个机制（不是"挑 Json"，是这个名字在代理上根本不存在），**换成 `.like('sync-cursor-%')` 即通**；
      ☆ 而我上一轮据"零命中"说过"其余 string-only 方法名在 `src` 出现次数全为 0"——那是假零（真值 `.contains(` 4／`.startsWith(` 28／`.endsWith(` 2，逐枚看过全是宿主 JS 字符串、零枚打在代理上）；
      该假零**不可复现**＝候选＝那一次针被多吞一层反斜杠（`\\.` 在 BRE 里＝字面反斜杠＋任意字符）｜未证。⇒ 判据已并进第 22 条那两条（聚合数带钟；零命中先复现再换口径对）。
    - 门禁（本条最终字节）＝tsc `exit=0／0 行`；eslint `0 errors / 429 warnings`；vitest **54 files / 427 tests passed**；
      e2e 非视觉＝第 22 条那份（`64 passed／1 failed` 判通路档）；e2e 视觉＝本条 **96 枚全绿**；`git status --short`＝`docs/test-report.md` 一份已跟踪改动＋`src/lib/sync/changes-cursor.test.ts` 一份未跟踪＝**0 枚 `.png`**。

25. **同步白名单第一次被对着"发出去的契约"逐列核了一遍；顺带把 `.where()` 简写形量成机制，量出来的东西把两句产品注释改对了**：
    - ★★★ **新判据 6 枚**（`src/lib/sync/changes.test.ts` 10 枚 → **16 枚**，读数 `SPEC_VERBOSE=1`＝`models=22 tables=15 columns=131`）＝
      同步模块的三张 spec（`INCREMENTAL_TABLES`／`SCOPED_INCREMENTAL_TABLES`／`FULL_TABLES`）此前**只被自己核自己**——历批那 3 枚判据全是"列名在不在列名册里"，而 `collectChanges` 是用**字符串**取表（`db.orm.public[table]`）与取列（`.select(...columns)`），
      新加的 6 枚把这一面换成对 `src/prisma/contract.json`（22 枚模型／**逐枚 131 列**）核：表名是不是模型／列名是不是字段／游标档在模型上真有没有 `updatedAt`／作用域列（`userId`、`parentKey`、`ownedByUser` 那批）在不在／以及 `FULL_TABLES` 那句"没有 `updatedAt` 可游"的断言本身。
      现况＝**不符 0 处**；仪器自身分母闸＝模型数 ≥20（契约换形时整组不会静默空转）。⇒ 历批挂在"动态表名进不了静态覆盖"那笔账，从"未验"变成"有闸"。
    - ★★★★ **新判据 4 枚（`src/prisma/where-shorthand.test.ts`）＝把"简写形里放运算符对象"这一族量成了机制，而不是传闻**。
      `where()` 两形：callback（`d.id.in([...])`）与简写对象（`{ id: ... }`）。简写形把值**直接当 SQL 字面量**送进 postgres，所以运算符对象不是"构造不出筛选"，而是"拿列去比那段 JSON 文本"，实测三种结局各一枚：
      文本／uuid 列＝**静默 0 行**（`{userId:{eq:uid}}`＝0，同一列裸值＝3，callback `eq`＝3；`{id:{in:[真实id]}}`＝0，callback `in`＝1；`{id:{ne:a}}`＝0；`{id:{not:a}}`＝0）；
      时间列＝**当场抛**（`{updatedAt:{gt:ts}}` → `无效的类型 timestamp with time zone 输入语法: "{"gt":"2026-10-02T05:27:07.241Z"}"`）；
      `and/or/not` 当顶层键＝抛 `Shorthand filter on "Document.and": field does not support equality comparisons`（＝组合子不在这张面上，因此黑名单里它们与运算符对象是**两种失败模式**，判据文案分开写）。
      危害档＝**静默那一支**：一次重构（"这堆 callback 太啰嗦，统一换成对象形"）就能让侧栏某棵树变成空数组、无报错、`for (const row of rows)` 整体不执行，而套件全绿。
    - ★★★★ **全库普查＝291 份文件／108 处简写形 `.where({…})`／违规 0 枚**（`CENSUS_VERBOSE=1`）。这台仪器过了历批那三关：
      **看得见要找的那一枚**＝4 枚坏形夹具（含三层嵌套 `{OR:[{a},{name:{ilike:…}}]}` 与跨行 `{updatedAt:{gt:since}}`）全部判红；
      **不被"提到"骗**＝`changes.ts:199` 与 `collection.ts:175` 两句注释里本来就写着这枚坏形，它们在 108 枚里判绿——我改注释时又把同一句坏形**写进 `changes.ts` 的新注释**，复跑仍是 `108／0`＝"剥注释与字符串"那条支路在真字节上被反证（不剥就会报出来）；
      **分母闸**＝文件数 >200 且简写形站点数 >0，否则判红（_walk 断掉与真的干净是两种零_）。
    - ★★★★ **本批两处改判我自己刚写下的话**（都在落盘前被实测挡回）＝
      (甲) 我先在判据头注释里写"假列名会**静默少字段**"→ 直读探针＝`.select('notAColumn')` **会抛** `字段 documents.notAColumn 不存在`，已按实测改成"每次轮询抛错"，这台静态闸的价值随之要重新说＝**不依赖数据库、1.1 秒 vs 活库那两枚 20 秒预算、且覆盖"父集为空时根本不发查询"的那几档**（`SCOPED_*` 与 `viaDocuments` 在用户没有集合／文档时提前 return，活库判据走不到那条 SQL）；
      (乙) 我写"tsc 挡不住**字符串键访问**那一档"→ 控制跑一次注入两枚（具体形 `db.orm.public.Document.where({id:{in:ids}})` ＋ 字符串形），**tsc 两档都没报**（见下枚控制跑），措辞已升为"tsc 根本不是这张网"。
      ☆ 同一条命令链上另一枚自己的失误＝取 vitest 总数时我把 grep 指向了一份**从未创建的文件**（`impl/vitest-tmp`），拿到 0 行后又**白跑了第二次全量套件**（`npx vitest run | tail -0`＝丢弃输出）＝两笔都是"读数面"的错、不是代码的错；⇒ 判据＝取读数只从**当轮真实重定向到的那份日志**读，路径不许临时编，且不许在同一命令里既读日志又重跑同一件事。
    - ★★★ **产品注释改对（两处，纯注释、`git diff` 无一行代码变）**＝原句都把这枚危害限定在"**空列表**"（`{ in: [] }` 那形），实测**非空列表同样中招**，按空列表理解的读者会写出 `{ in: ids }` 而自认为安全；
      顺带 `collection.ts` 那句"所以空集早退必须留着"不成立＝callback 形 `.in([])` 本就回 0 行，早退省的是**两次往返**而不是正确性，已如实改写。两处均指向 `src/prisma/where-shorthand.test.ts` 作为出处。
    - ★★★★ **控制跑两枚，均单变量、均逐字还原**＝
      ① 临时文件注入 `.where({ id: { in: ids } })` 两枚 → 普查红＝`AssertionError: shorthand filter with an operator object returns 0 rows: expected [ …(2) ] to deeply equal []`，逐条点名 `src\lib\sync\__census-control.ts:9`／`:11`；**同一份字节上 `npx tsc --noEmit` exit=0、未提这两枚**（撤文件后仍 exit=0）＝"绿着的 tsc"与"红着的普查"同时在场，这张网的作用面就此钉住。
      ② `changes.ts` 单枚列名 `dailyNoteDate → dailyNoteData` → `changes.test.ts` **3 failed／13 passed**＝1 枚静态（逐字红＝`Document.dailyNoteData is not a contract field: expected { charCount: { …(2) }, …(23) } to have property "dailyNoteData"`）＋2 枚活库（`字段 documents.dailyNoteData 不存在`）＝静态与运行时同判，而静态那枚先给出表名．列名；
      还原＝`RESTORE OK md5 c6000d15d042c879984511355546b6b1`（与备份逐字相同），复跑 20 passed。
    - ★ **抓到我自己一枚真错（新代码自带）**＝首跑 tsc 报 `src/prisma/where-shorthand.test.ts(186,29): error TS7006: Parameter 'r' implicitly has an 'any' type`，另一枚 eslint `'spec' is assigned a value but never used`＝都在提交前于最终字节上修掉并复跑；☆ 一度误把整轮三件套重跑了一遍（grep 用了基础正则的 `|` 交替＝死分支，0 行输出被我读成"没打印"），已记为仪器侧缺陷：判红条件里带 `|` 的针一律用 `-E`。
    - ☆ **一条被点名但不该由本线动产品的账**＝普查顺带量出 **6 张带 `updatedAt` 却不在同步白名单的模型**＝`Comment`／`CommentThread`／`DailyNotesConfig`／`DocumentMember`／`User`／`YjsDocumentState`。
      逐张查了读路＝前五张各有 server action 读路（`daily-notes.ts:71`／`backlinks.ts:63`＋`get.ts:171`／`preferences.ts:42`＋`profile.ts:11`／`comment.ts:29` 等），`YjsDocumentState` 由 `src/collab/persist.mjs:97` 走协作侧持久化＝**不是漏，是作用域边界**；但"要不要进同步面"属产品口径，**本线只报名册、不擅自加表**。
    - 门禁（**提交前在最终字节上新鲜跑**，不复用修前读数）＝tsc `exit=0／0 行`；eslint `src`＝`0 errors / 402 warnings`、`.`＝`0 errors / 429 warnings`（与第 24 条同针同数＝本批净增 **0 枚告警**）；vitest **55 files / 437 tests passed**（较第 24 条 +1 份／+10 枚）；普查 `files=291 shorthandSites=108 violations=0`；契约对账 `models=22 tables=15 columns=131`；`git diff --check` exit 0；
      改动面＝`src/prisma/where-shorthand.test.ts`（新，241 行）＋`src/lib/sync/changes.test.ts`（102+/0−）＋`src/lib/sync/changes.ts`（纯注释 4+/2−）＋`src/actions/collection/collection.ts`（纯注释 6+/2−）＋本报告（115+/0−）＝**代码面 112 插入／4 删除**（✎ 这组数只对"第 25 条落笔时那份字节"有效；同面在第 26 条落笔后是 **249 插入／4 删除**＝`git diff --numstat` 现取）；另有 `src/lib/sync/changes-cursor.test.ts`（第 23 条那枚，97 行，仍未跟踪）；**0 枚 `.png`、0 处阈值改动**；**未 commit／未 push**（本轮未点名）。
    - **未验部分**＝① 契约对账只核"列在不在模型上"，**没核**"该不该同步这张表"（上面那 6 张即此口子）；② 普查跳过 `*.test.ts`（夹具自导），测试文件里的简写形不设防；③ 括号深度器不处理 `.where({` 内含 `{` 的模板串——本批 108 枚站点里 0 枚这种形状，属**已知**而非**已证**；④ `{id:{in:[…]}}` 那支"静默 0 行"只在**本库本档**（`@prisma/orm-postgres` 装机版 **8.0.0-rc.11**／CLI **8.0.0-rc.15**，加这份 contract）实测，未跨版本复证。

26. **同步模块的运行期形状补了两张网：一张量"代理给不给这个方法"，一张量"少付的那几次往返还在不在"**（＝第 25 条末尾我自己点名的那半：名字对不对已结案、方法名合法那半仍开）：
    - ★★★★ **覆盖面事实先量出来：`asc`／`desc` 是历批那张能力表从没量过的第二面**＝历批 `census-proxy-capability.cjs` 的 `NAMES` 只有谓词名（`eq,in,notIn,lt,lte,gt,gte,like,ilike,…`）、**没有排序名**＝"266 枚字段已量完"那句对排序零证明力。
      本次把 **15 枚真站点逐条执行**（不是 `typeof`，执行更接近生产）＝三元组名册**由源码派生**（`.orderBy((x) => x.field.dir())` 就近配 `db.orm.public.<Model>`／`getTable('<Model>')`）＝**25 处站点／15 枚唯一三元组／1 处如实报"未解析"**（那枚恰是 `changes.ts:208` 的动态表名＝没被我猜掉）；误配风险最高的六枚逐条打上下文核过。读数＝**15/15 全过**。
      两枚负控制按预期红，且**报错不同档**＝假字段 `Cannot read properties of undefined (reading 'asc')`（字段代理本身不存在）｜`CollectionValue.value` `m[field][dir] is not a function`（代理在、排序方法不在＝`Json` 档什么都不暴露，与历批第 20 条同机制）⇒ 这两档从此分得开。
    - ★★★★ **新判据 3 枚（`changes.test.ts` 16 → 19 枚）＝代理能力闸**：清单**从导出的 spec 派生**（不会与 spec 走散）＝`INCREMENTAL` 6 张各 `userId.eq`＋`updatedAt.gt`＋`updatedAt.asc`、`SCOPED` 5 张各 `parentKey.in`＋同两枚时间形、`FULL/viaDocuments` 2 张各其键的 `in`＝**`shapes=35 failures=0`**（`CAP_VERBOSE=1`）；分母闸＝清单 ≥30 枚。
      ☆ 顺带量到一条 API 形状＝`where()` **在调用当场同步执行回调**（抛点栈里就有 `CollectionImpl.where`）＝坏形状是**同步 TypeError**、不是被拒的 promise ⇒ 我第一版用 `.then(_, onReject)` 接它＝结构上接不住（首跑当场红），已改成包住调用本身的 `try`。
    - ★★★★★ **给"少付往返"补了它唯一会红的判据（新 `src/lib/sync/changes-scope-census.test.ts`）＝这条账此前零覆盖**：
      先跑控制＝**删掉 `changes.ts:193` 的空父集短路，`src/lib/sync/` 三份 53 枚全绿**＝那行没有任何判据把住；并顺带得一条事实＝`.in([])` 合法回 0 行，短路省的**只有往返**、不是正确性。
      我据此**先把自己刚写的那枚新判据判为零分辨力**（它的断言在删与不删下同真），并在其注释里写死这件事、指名由谁的闸把住；再补成语句计数闸（沿用仓里 `collection-detail.test.ts` 的 `afterQuery` 计数中间件形状）＝空账号一次 `collectChanges` **实测 10 条**＝6 张游标表＋2 次父 id 探针（Document／Collection）＋2 张按 `userId` 整表（Tag／Favorite），与按 spec 结构推出的 6+2+2 **相符**；控制跑（同一次删短路）＝**15 条**、逐字红＝`round trips for an account with no data: expected 15 to be 10`＝该闸确有分辨力。夹具账号建了又删、删后回读 0 枚。
    - ★★★ **控制跑一枚，专门测"新闸是不是唯一网"＝答：不是**：把 `CollectionValue.parentKey` 由 `itemId` 换成 `value`（**真列**、**在它自己列名册里**、但 `Json` 档无谓词面）＝契约对账 6 枚**全绿**、自指"选了自己的 parent key"那枚**全绿**、而 `changes.test.ts` **3 failed**＝能力闸＋两枚活库 `collectChanges` 同红（该用户恰好有集合数据）。⇒ 能力闸的独有价值**不在**这枚变异上（此处与活库网冗余），而在"父集为空时那 5 张表根本不发查询"那一档＝由上一条的 10/15 计数**实测**成立，不是口头推。
    - ★★★★ **本批自己踩的四件**（逐件都有对应处）＝① 三枚"模型名靠猜"的探针样本里有一枚指向 `DailyNotesConfig.dailyNoteDate`——**该模型根本没这列**（真调用点是 `Document.dailyNoteDate`）＝探针把"探针坏了"与"能力缺失"分两档打印才没让我报出一枚假缺陷；② 还原脚本把锚检查放在分支之前 ⇒ `restore` 路径也被"文件已改"挡死＝**撤销路径不可达**，当场手对 md5 还原并把守卫改为只管 `break`；③ `toInclude` 在本机 vitest 的 chai 上不存在（`Invalid Chai property: toInclude`）＝改用 `toContain`；④ 新代码两枚真编译／风格问题在控制跑的 tsc 里被抓出（对 `unknown` 取 `.message`＝`TS2339`；4 枚 `no-explicit-any` 告警）⇒ 补 disable 头时我又连做两次 Edit 造出**重复的 disable 行**，读回才发现合一。☆ 其中②那枚"只有控制态才跑得到 tsc"值得记：我此前每次都在干净字节上跑 tsc，故这枚错活了三轮命令。
    - 门禁（**最终字节新鲜跑**）＝tsc `exit=0／0 行`；vitest **56 files / 441 tests passed**（较第 25 条 +1 份／+4 枚）；eslint `src`＝`0 errors/402 warnings`、`.`＝`0 errors/429 warnings`＝**与本批开工前逐字相同＝净增 0 枚告警**（中途那枚 406/433 是我自己带进去的 4 枚，已消）；`git diff --check` exit 0；`.png` 0 枚；`changes.ts` 仍只有第 25 条那 4+/2− 注释改动（三次控制跑均以 `md5 c6000d15d042c879984511355546b6b1` 逐字还原）；**未 commit／未 push**（本轮未点名）。
    - **未验部分**＝① "键合法但**指错列**"（如 `parentKey` 指向另一枚类型合法的列）三张网都抓不到＝能力闸看方法在不在、契约闸看名字在不在、活库网看有无数据，**语义层无判据**；② 排序面本轮量了 15 枚真站点＋能力闸里 11 张表的 `updatedAt.asc`，`desc` 在同步模块零使用；③ 语句计数 10 是**这份库＋这份 spec** 的读数，加表即变（这是它的用途，不是脆弱点，但改 spec 的人必须重跑）；④ 计数中间件那侧的 `familyId: 'sql'` 形状沿用仓里既有仪器，未独立验证它对 `orderBy`-only 语句也计数（10/15 两档差恰为 5＝与 5 张被短路的表一一对上，属**间接**证据）。
27. **快门时刻第一次有了正面判据＝主题 class 必须早于快门落在 `<html>` 上，并把"这两道闸门是不是在空转"各量了一次**：
    - ★★★★ **判据 → 先红 → 转绿**＝控制跑把期望 token 硬编码成 `dark` 打在 light 档，逐字红＝
      `Error: <html class="inter_786c1081-module__J60SBq__variable h-full antialiased light"> carries no "dark" token at the shutter`（`PW_EXIT=1／1 failed`），
      栈帧 `at shoot (e2e/visual.spec.ts:92:3)`＝**快门语句前三行**抛的 ⇒ 位置也验了，不是"在测试末尾补了一句"。
      改成从快门名解析 token 后＝`--project=mobile` **32 passed (2.1m)／PW_EXIT=0**、三档合跑 **96 passed (4.5m)／PW_EXIT=0**，
      两次都没带 `--update-snapshots`、跑完 `git status --short -- '*.png'`＝**0 枚**＝基线一字未动；`e2e/visual.spec.ts` 对 HEAD 的差＝**18 插入／0 删除**（纯增量）。
    - ★★★★★ **为什么是"单次读"而不是 `await expect(page.locator('html')).toHaveClass(...)`**＝后者会轮询到 `expect.timeout`（20 s），
      于是恰好放过这枚判据要抓的那种失败＝**主题晚到**。在册第 35 条那次缺陷的形状是"先上色后写入"，它在快门侧的同族形状就是"先快门后上色"＝
      一张浅色页面被登记成 `dark-*` 基线、然后那些像素变成新基线（漂移被烘进去而不是被抓住）。⇒ 判据＝**正面断言的读法要按"缺陷的形状"选，不按"现在能不能绿"选**；
      盘上事实＝当前字节上它 24/24 首样即终态（144–534 ms），所以这道闸今天**不会**因晚到而红，它买的是"下次晚到时必红"。
    - ★★★★ **覆盖面的结构性证明**＝整个 `e2e/` 只有 **1 处** `toHaveScreenshot`（在 `shoot()` 内）⇒ 每档 **42 枚快门**逐枚过这道闸，不靠人记得加；
      快门名没有 `light-`／`dark-` 前缀时**抛错**而不是回落到某一档＝回落会让一枚"没前缀的新快门"以错的理由通过。
    - ★★★ **两枚"闸门在空转吗"的假设各量一次**（临时探针 `e2e/_shot-gate-probe.spec.ts` 已删，读数在 `../impl-scripts/shot-gate-probe2.log`／`shot-gate-class2.log`）＝
      ① `加载中` 标签 12/12 路由都真出现过、524–931 ms 消失、`changesIn350msWindow=0` ⇒ 那句 `toBeHidden` 不是空转、350 ms 落在静默里；
      ② `<html>` class 在 2 秒窗口内**从不跃变**（`states=1`×24、`classStable=YES`）⇒ 历批"录早了"那枚候选在**当前字节**上不可复发，要判它得回到修复前的字节。
    - ★★★ **e2e 面上的否定式断言第一次被全数登记**（`../impl-scripts/absence-census3.log` 首行逐字）＝
      `specs=18 negativeAssertions=30 coveredInFile=8 coveredElsewhere=3 nowhere=6 anchorUnparsed=13`；定位器活性＝**102 枚字面量／判后死锚 0 枚**。
      ☆ 口径＝`nowhere=6` 是"本仓内没有任何正面断言把住它"，不是"这 6 枚是坏的"；`anchorUnparsed=13` 是仪器解析不出锚、按不可判上报（不可判≠通过）。
    - ★★★★★ **那 6 枚逐枚判完后，判出来的是仪器自己的错＝v1 把两种缺陷混进了一个桶**（新仪器 `../impl-scripts/census-absence-assertions2.cjs`，读数 `absence-census-v2b.log`）＝
      拆成**两根独立的轴**：`needle`＝这枚定位器的字面在全仓任何地方被正面断言过在场吗；`guard`＝同一段测试体内有没有正面断言、且它排在缺席声明之**前**／之**后**／根本没有。
      v2 读数＝`negatives=30 needleLive=8 needleDead=9 needleNoAnchor=13 guardBefore=27 guardAfter=3 guardNone=0 DEAD_AND_NONE=0`（两轴各自对平＝8+9+13＝30、27+3+0＝30）＝**最坏那一格 0 枚**＝没有一枚同时"针不活"且"整段无铺垫"。
      两处过报的机制都指认到了＝① v1 的正面集含 `.click(`／`waitFor(`＝**动作被当成断言**；② 更硬的一枚＝`whiteboard-collab.spec.ts:155` 访客侧的缺席声明被**主人侧** `:57` 的同一字面 click 判成"已覆盖"＝**按文件搜正面＝跨行动者混用**。
      ☆ 移进 dead 的 3 枚有名＝`trash-selection:44`／`:45`（正面证据只有 `.click(`）＋`whiteboard-collab:155`；v1 标 elsewhere 的 `authz:80`／`whiteboard-collab:218` 在 v2 落 `guard=after`＝正面排在后面＝整段不会在空白页上过，但**这一行本身会**。
      ⇒ 判据＝**"覆盖 N 处"类桶要先答它按哪根轴分**；同一份盘按两轴可以报出 6、也可以报出 9，两个数都不指认任何缺陷。
    - ★★★★ **`needleDead=9` 不等于 9 枚陈旧标签**＝逐枚拿字面回产品源码对了一次（`grep -rlF` 逐串、src／e2e 两份计数并排）＝
      `载入中`＝src 2 份／`加载中`＝8／`链接到文档`＝1／`永久删除所选`＝1／`还原所选`＝1／`分享白板`＝2＝**六串都还在产品里**，"dead" 只表示没有 spec 正面断言它在场；
      `路人丙`＝src 0＝**它本来就是测试自造的 fixture 用户名**（`mention-user.spec.ts:7`）＝这枚 dead 是设计不是缺陷；该声明的可证伪性由同文件 `:65-67` 给＝正面断言了 `提及人员` 面板在场＋`协作者乙`／`发起者甲` 两枚**同形状**按钮在场 ⇒ "形状能匹配、这一枚不在其中"才是它的意思。
      ☆ 顺带一条在册事实＝**两套加载中文案并存且不同字面**（`载入中…` 只在设置面板、`加载中` 在 8 份文件）＝两枚 `toBeHidden` 各守各的串、不可互抄。
    - ★★★★★ **非视觉全量那一发判为"不可归因"，而抓到它的原因是机器钟、不是测试**＝`../impl-scripts/t3f-e2e-nonvisual.log` 末尾逐字＝
      `2 failed`＋`63 passed (11.1h)`＋`PW_EXIT=1`（分母对平 63+2＝65）。两枚红同在 `collab.spec.ts`（`:52`／`:75`），第一枚的**原因串自己就是判语**＝
      `page.goto: net::ERR_NETWORK_IO_SUSPENDED at http://localhost:3000/documents`＝OS 层网络 I/O 被挂起；第二枚是它的下游（提交后停在 `/login`、撞 120 s 测试超时）。
      ☆ 我最初把它读成"跑了 11 小时"的反常、并据此怀疑自己的时间叙述——核对＝本机钟 `12:45:46` 落盘、开跑约 `01:4x`＝**墙钟真有 11 小时**，
      而 playwright 的 `Duration` 就是墙钟＝**机器中途睡过去的时间全被算进每一枚测试的耗时里**⇒ 同屏打印的 `Slow test file: editor.spec.ts (5.8m)／core.spec.ts (5.4m)` **不得**当产品耗时读数引用。
      判据 ②（在册那套三步里唯一有罪责力的那把尺）＝单跑同一份 spec＝`3 passed (1.3m)／PW_EXIT=0`（`t3f-collab-retry.log`）＝**开罪**；
      判据 ①＝红那两行紧邻的原因串即 `ERR_NETWORK_IO_SUSPENDED`（且全日志只 1 枚）；判据 ③（只算旁证）＝本轮 `src` 侧只有注释级改动。
      ⇒ 判据＝**凡墙钟类读数先与本机钟对一次再进报告**；"上一轮是几分钟前"在这台机器上不可信（本轮我就是这样把 11 小时当成半小时的）。
      ☆ 与历批那枚"通路档"的区别要写清＝历批的形状是`超时＋memory restart 行紧邻`，本轮的形状是**OS 网络挂起串自证**＝两种成因两套处方，不可互抄。
    - ★★★★ **本轮自己踩的五件**＝① 一次 Edit 的 old/new 只差末尾一个换行 ⇒ 它实际删掉了 `shoot()` 尾部的空行、而我以为已经把闸门加进去了＝
      **读回文件**才发现（`git diff` 现为纯 18/0 就是这条的收工证据）；② 探针复用同一个 page 跑两主题 ⇒ 暗档那轮标签从不出现、
      `shutterAt=lastBusyAt+350` 打印出 `-1+350` 这种"看着合理的结构垃圾"＝改每主题独立 context＋只打无标签的 `classStable` 判决；
      ③ `grep -E 'toHaveCount(0)'` 假零（ERE 把 `(0)` 当捕获组）＝`-F` 真值 23 枚、`toBe(0)` 3 枚；
      ④ 差一点把 00:4x 的四份门禁读数当"最终字节"＝它们早于闸门落笔约 20 分钟，故 tsc／eslint／vitest／视觉全部在 `t3f-*` 重跑；
      ⑤ **我删掉了一份自己没读懂的 tsc 读数**＝随后 4 次独立 `tsc --noEmit` 全 `exit=0／0 行`，又与活着的 `next dev` 并发跑 3 次仍全空＝
      该读数不可复现，而它的证据被我删了。☆ 字形也对不上＝它写的是"把 `string | undefined` 赋给 `string`"（TS2322），
      而本仓 `tsconfig.json` **没设** `noUncheckedIndexedAccess`、`e2e/**` 又确在 tsc 网内（`--listFilesOnly` 命中 1 枚）⇒ 我这两种写法在那个 flag 关闭时同型 ⇒ 候选＝我把另一份日志的行首读了｜未证。
      **新纪律＝没读懂的读数不许删；归档并标"待判"。删证据是独立于结论对错的缺陷。**
    - 门禁（**最终字节新鲜跑**）＝vitest **56 files / 441 tests passed／exit=0**（与第 26 条逐字相同＝本轮零新增单测）；tsc `exit=0／0 行`；
      eslint `.`＝`0 errors/429 warnings`、`src`＝`0 errors/402 warnings`＝**与开工前持平＝净增 0 枚告警**
      （日志里那枚 `Unused eslint-disable directive` 属 `scripts/probe-collab.mjs`＝不在本线改动集，未动）；e2e 视觉三档 **96 passed／PW_EXIT=0**；`.png` 0 枚。
    - ★★★★ **e2e 非视觉全量（16 份 spec／分母 65）在最终字节上＝`64 passed (23.1m)／1 failed／PW_EXIT=1`，而那枚红判为通路档、不是产品**（`../impl-scripts/t3f-e2e-nv2.log`）＝
      红的正是**历批同一枚**＝`whiteboard-collab.spec.ts:93`（两主人实时互见形状），逐字原因＝`page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/whiteboards`（打在 `createBoard` 的第 26 行）；
      判据 ① 邻接＝`[WebServer] ⚠ Server is approaching the used memory threshold, restarting...` 在**日志第 481 行**、红那枚的报头在**第 483 行**＝相隔两行，且红发生在 `[60/65]`＝长跑末段内存压力峰值处；
      判据 ②（唯一有罪责力的尺）＝单跑同一份 spec＝**`6 passed (3.0m)／PW_EXIT=0`**、该日志里 memory-threshold 标记 **0 次**＝开罪；判据 ③ 只算旁证＝本轮 `src` 侧仅注释级改动。
      ☆ **同一行号第三次红、三次原因串各不相同**＝历批＝`Test timeout` 停在 `waiting until "load"`＋重启行紧邻；本轮第一发＝`net::ERR_NETWORK_IO_SUSPENDED`（机器睡过去）；本轮复跑＝`ERR_CONNECTION_REFUSED`＋重启行紧邻。
      ⇒ 判据＝**形状族是同一条（长跑里 dev server 生命周期吃掉在飞的那枚），但处方不可互抄，每发都要重新按三步判**；也因此"这份 65 分母的全量"里那 1 枚红**不应**被下批读成新增回归＝它已经是三批连续的同一条通路账。
    - **未验部分**＝① 这道闸只管"主题 token 在不在 class 上"，不验 `color-scheme` 与各 token 的计算值（探针里顺手读过、恒 `light`／`dark`，**未固化成断言**）；
      ② 它防不住"主题对、token 值错"那一档；③ 快门前的 350 ms／标签／dev 浮标三道仍是**等待**条件，本闸不测它们各自的必要性；
      ④ 与第 22 条那 9 枚盒外非零无关（那批的形状是重叠／几何，不是颜色晚到）；⑤ ✎ 原写"非视觉 e2e 读数还在跑"——同轮内已到，见本条门禁行的 `64 passed (23.1m)／1 failed／PW_EXIT=1` 与其下那条通路档判定（本机钟 13:15 复跑单份 spec 亦已绿）。
28. **批间重启 webServer 的分批跑法落地了，它对目标类病灶归零；但它同时把两枚别的红照了出来，其中一枚测成了"随时序单调退化"而不是 flake**：
    - ★★★★ **仪器＝`../impl-scripts/e2e-batched.cjs`（顺序跑 Playwright 原生 `--shard`，每批发起各自的一套 `next dev`＋collab＋tldraw）**。它不是"把命令跑两遍"，因为带三道会红的闸：
      ① **覆盖闸**＝各片标题**并集必须逐字等于**不分片的标题集、且两两不相交、且各片枚数之和＝分母（正面读数＝`plan full=65 shards=[35+30] sum=65 dupTitles=0 missing=0 unexpected=0`）；
      ② **新鲜闸**＝每批**开始前** 3000/3001/3002 必须无监听，否则当场 ABORT（`reuseExistingServer: !CI` 会把一台已经跑热的 server 静默交给下一批＝分批的意义就没了）；☆ 这台闸的正控制是白捡的＝第 1 批运行中用同一谓词量到三台**都在听**（PID 23620／6972／16036）；
      ③ **`flaky` 计数**＝本轮没有 `CI`，若哪天读到 `flaky>0` 就说明有人开了重试、正在掩盖间歇失败。退出码一律取自子进程，不取管道尾。
    - ★★★★★ **覆盖闸被证明真的会红**＝注入"两片同取一份"的缺陷（`--control=overlap`）＝读数 `shards=[30+30] sum=60 dupTitles=30 missing=35`、`COVERAGE GATE FAILED`、exit 1＝"分批等于全量"这句话不是我说的，是这台闸说的。
    - ☆ **为什么不用 `CI=1` 这条捷径**＝它确实能让 `reuseExistingServer` 变 false，但 Playwright 的 CI 档同时会改重试／worker 默认值＝**会把"没人被重试掩盖"这件事从可测变成不可测**；而我两台探针都读不到解析后的 `retries`（`--list` 的文本行、`--list --reporter=json` 的 `config` 里都没有这个键＝25 个键里没有）⇒ 判不了就不依赖，改用上面那道新鲜闸。
    - ★★★★ **对目标类病灶＝归零**：三批连红的"长跑里 server 因内存阈值重启、吃掉在飞那枚"这一族，本方案读到的 `memoryRestart=0`；总读数＝
      `AGGREGATE passed=63 failed=2 flaky=0 skipped=0 didNotRun=0 counted=65/65 memoryRestart=0`（逐批＝`34 passed／1 failed (11.7m)`＋`29 passed／1 failed (15.1m)`，`counted=65/65` 由分母闸把住）。
      ☆ 代价也要报＝两批合计 26.8 分钟 vs 不分批 23.1 分钟＝**多两枚 server 冷启＋按需编译＝+3.7 分钟**，且第 2 批（30 枚／15.1m）每枚更慢＝白板／collab 这些重路由落在了那一片。
    - ★★★★★ **但两枚新红不是同一类，第一枚被推翻了"flake"这个读法**＝`core.spec.ts:204`（`[[^` 块锚点跳转后 `.block-anchor-flash` 在场）：
      同一条测试、同一份字节，`--repeat-each=5` 在 13:53＝**3 通／2 红**，在 14:10＝**0 通／5 红**；两枚红的逐字理由同为 `element(s) not found`（4000 ms 窗口内从未在场）。
      ☆ 我先怀疑是**自己的探针扰动**＝做了双臂对照（带每帧 `querySelector` 采样器 vs 完全不装采样器）＝**两臂都 5/5 红**＝采样器无罪；而带采样器那臂的时间线＝`{idAt:0, hashBAt:0, flashAt:0, flashFrames:0, frames:15368}`＝跳转之后**15 秒内 `[data-block-id]` 一次都没出现过**＝不是"链慢于 4 秒"、是**这条解析根本没有完成**。
      ⇒ 判语＝这条**不是间歇失败、是随时序单调退化**；候选＝账号数据体量（只读数＝`../impl-scripts/count-docs.cjs`：`craft-test@example.com documents=980 live=958`、`craft-visual@example.com live=6`＝**套件从不清理自己的账号、每跑一遍就长一截**）｜未证。
      判死发已点名＝(甲) 在小体量账号上同法跑 5 发看分布是否回到通；(乙) 在失败现场读 `#i-<n>` 解析的入参与候选名册。产品侧可疑点（尚未定罪）＝`src/lib/editor/block-anchor.ts:52` 的 `if (!block) return;`＝**单次探测、不重试**＝只要那一刻 id 还没落，高亮就永久静默缺席。
    - ★★★ **第二枚红还没测**＝`whiteboard-collab.spec.ts:122`＝20 秒内 Postgres 检查点里没有出现形状文本（逐字＝`Expected substring: "重启后仍在"`、`Timeout 20000ms exceeded while waiting on the predicate`）＝**分布未取**（在册规矩＝间歇类要报 ≥5 发的分布、不报单发）＝已挂任务。
    - ☆ **一条作用域限制**＝这台运行器按在册"诊断脚本法定位置"放在仓库树外，**CI 与别的会话拿不到**；要进仓就得动 `package.json` 与 `scripts/`＝两处都在本线授权面（`src/`／`e2e/`／`migrations/`／`src/prisma/contract.*`）之外＝**等点名**。（✎ 10-06 17:0x 结案＝用户本轮"全部同意"点了这一件，已进仓＝见第 31 条）
    - ☆ **我一处没动的东西要写明白**＝没有为了变绿去加大那 4000 ms 窗口、没动 `maxDiffPixelRatio: 0.02`（两处原样）、没改任何判据；`core.spec.ts:204` 现在是**红着交出来的**。
    - 门禁（**最终字节新鲜跑**，本机钟 14:2x—14:4x）＝vitest **56 files / 441 tests passed／`VITEST_EXIT=0`**（与第 26／27 条逐字相同＝本轮零新增单测）；tsc **`exit=0／0 行`**（临时探针已删之后再跑）；
      eslint `.`＝`0 errors/429 warnings`＝**与开工前持平**；e2e 视觉三档＝第 27 条那份 **96 passed／PW_EXIT=0**（字节未再变）；e2e 非视觉＝**分批 63 passed／2 failed／`counted=65/65`／`memoryRestart=0`**；`.png` 改动 0 枚；`git status`＝5 份改动＋3 份新测试文件、`git diff --check` exit 0；**未 commit／未 push**（本轮未点名）。

29. ★★★★★ **第 28 条那枚"锚点高亮"的红判下来了＝不在锚点上，而在文档之间的客户端跳转上；判的过程里还抓出自己那条 `waitForURL` 是假闸**：
    - **五台一次性探针**（都写作 `e2e/_<name>.spec.ts`，跑完即删＝现在 `ls e2e/_*.spec.ts`＝0 枚；日志留在仓库树外 `../impl-scripts/anchor-probe*.log`）。同一字节、同一账号、只换"怎么到达目标文档"这一个变量：
      ① 直达（`page.goto('/documents/<id>#i-0')`）＝**5/5 通**＝编辑器落在 665—741 ms、内容 766—852 ms、`#b-` 808—862 ms、闪光 805—888 ms；
      ② 逐字复现 `core.spec.ts:204` 的链（chip 客户端跳转）＝**4/5 在 20 秒内什么都没落、1/5 到 4446 ms 才落**；
      ③ 同链＋20 ms 采样＋"手动改 hash 重新触发"对照＝**3/3 自发落章**，但闪光距点击 2963／3809／4172 ms＝**三发全部超出那 4000 ms 窗口**；
      ④ 逐帧序列（每 50 ms 一行、含"屏上还有没有 chip"）＝2/3 在 3526／7168 ms 落到目标文档、**1/3 在 35.7 秒里始终停在源文档**、只是把 `#i-0` 贴到了源 URL 上；
      ⑤ 再加网络／控制台／pageerror 捕获＝落章那发 3762 ms 提交、5772 ms 见闪光；**两发根本不提交**（31.4／29.9 s），且**点击之后线路上再没有发出任何一发请求**＝目标文档的 RSC prefetch 早在点击之前就 200 了。
    - **判到的东西**：红的主因是 `router.push` 这一跳＝要么 3.3—7.2 s 才提交、要么不提交；提交之后协作内容还要另等 ~2.0 s 才进编辑器。锚点自己那条"盖章→换 `#b-`→铺 overlay"的通路在目标页到位时是好的（① 的 5/5、④ 第 3 发在 8352 ms 见到 `fl=Y`、9297 ms 消失＝overlay 寿命与在册的 1400 ms 相符）。
    - ★ **上一轮我自己写的"候选＝随账号体量退化"＝本轮判为"未被支持"，但也不写作"被否证"**＝整轮里体量只涨不跌（开局一次读数 `documents=982／live=960`、收尾 `documents=1010／live=988`），而 ②（1/5 落章）与 ③（3/3 落章）是相邻两臂、之间体量差只有个位数枚＝**这把尺在两臂之间分不开**（承在册那条"分辨力要对自己刚写的判据量一次"）；① 也在同一量级上跑到 5/5＝它证明的是"同一账号换个到达方式就差一个量级"。⇒ 体量降为**未证候选**，判死发（低体量账号）改写进任务 #55；☆ 我**没有**取逐发的体量读数，所以这里只到"未被支持"为止。同一条里 `block-anchor.ts:52` 的 `if (!block) return` **本轮也没被定罪**＝它只在"目标页根本没到"时才有机会发生，而那种情形里 hunt 压根没起步。
    - ★★★★★ **假闸是自家的**＝`core.spec.ts:225` 原写作 `waitForURL(/#i-\d+/)`，而探针 ④ 第 1 发就是它的现场证人＝浏览器还在**源**文档、URL 却已经带上了 `#i-0`＝**跳转完全没发生也能通过这条闸**，后面每一条断言都在量错误的页面。已收紧为 `/documents/<targetId>#i-\d+`（＋5／−1 行）。☆ 方向要说清＝这是**收紧**不是放宽＝同一枚红从此报在更早、更真的那一行上；4000 ms 窗口、`block-anchor.ts` 的 2500 ms、`maxDiffPixelRatio: 0.02`（两处）一律没动。
    - ★★★ **探针自己的两处缺陷，都是它把自己骗了一次**：① 上一轮那台采样器只盯 `[data-block-id]` 与 `#b-`，**没有"内容到齐"这枚谓词**＝它给出的"解析根本没完成"其实分不开"内容没到"与"窗口已过"两种，本轮补上谓词才判得开；② 新加的"内容到齐"第一版写作"编辑器文本里含 marker"＝**在源文档同样为真**（chip 的标签正文就是那个 marker）＝判据必须同时钉住"在哪一篇"，后来改用 `chipOnScreen=false`（chip 只存在于源文档）作"目标页在屏"的反证。☆ 同族第三枚＝③ 里 `path` 首次命中出现在 `waitForURL` 已经返回**之后**（1414／1437／247 ms）＝fragment 比 pathname 先落地＝这类"两个谓词不同源"的读数只能靠逐帧序列判，首次命中时间不够。
    - ☆ **现场污染如实报**＝探针期间 `craft-test@` 从 `documents=982／live=960` 涨到 `documents=1010／live=988`＝**+28**（两次读数同幅）；我按逐发预期是 +30＝**差的 2 枚未解释**，所以这里只写实测的 28、不写 30。`craft-visual@`（视觉基线账号）读数 `documents=6／live=6` **未动**＝本轮不碰基线。
    - ☆ **下一枚待量的红**＝`whiteboard-collab.spec.ts:122` 的检查点分布仍未取（任务 #54）；探针已写好又被本轮的判定挤掉＝它现在多了一个同族问题：#55 说"提交后要 2 s 内容才进编辑器"，而 `:132` 量的正是"20 秒内 Postgres 有没有那枚形状"。
    - ★★★★★ **收紧后的闸在分批全量里当场给出自己的证人**＝那一片唯一红的逐字原因换成了
      `Error: page.waitForURL: Test timeout of 120000ms exceeded.`＋闸内日志 `navigated to "http://localhost:3000/documents/8e5824d6-…#i-0"`＝**地址落到的是另一篇（源）文档加 `#i-0`**＝老闸 `/#i-\d+/` 在这种状态下是通的、新闸把它拦下来了＝**非空转判据不需要夹具，本轮真实跑次就是它的样本**。☆ 代价也要报＝这一发从"4 秒红"变成"烧满 120 秒测试超时"（`2.1m`）＝我没有给它另配一个更小的 timeout＝选小数字就是选"多快算失败"，那是要单独定的事，不在本轮顺手做。
    - 门禁（**最终字节新鲜跑**，本机钟 15:0x—15:5x）＝vitest **`56 files / 441 tests passed`／`VITEST_EXIT=0`**（与第 26／27／28 条逐字相同＝本轮零新增单测）；tsc **`exit=0`／0 行输出**；eslint `.`＝**`0 errors / 429 warnings`**＝与开工前持平（那条 `Unused eslint-disable directive` 仍属 `scripts/probe-collab.mjs`、不在本线改动集）；
      e2e 非视觉（分批 2 片）＝**`passed=64 failed=1 flaky=0 skipped=0 didNotRun=0 counted=65/65 memoryRestart=0`**、覆盖闸 `full=65 shards=[35+30] sum=65 dupTitles=0 missing=0 unexpected=0`、`BATCHED_EXIT=6`＝唯一那枚红就是上面 `core.spec.ts:204`（**红着交出来的**）；☆ 第 28 条那两枚红现在只剩一枚＝`whiteboard-collab.spec.ts:122` 这一跑是**绿**的＝它因此正式属于"间歇"族、分布仍未取（#54）；
      e2e 视觉＋响应式（全三档）＝**`106 passed / 5 skipped (5.5m)`／`VISUAL_PW_EXIT=0`**＝分母 111（`--list` 同命令读到 `Total: 111 tests in 2 files`）＝5 枚跳的都在 `responsive.spec.ts`（3 枚 desktop＋2 枚 tablet，逐枚已点名）＝**本轮不重录任何基线**＝`.png` 改动 **0 枚**、未跟踪 `.png` **0 枚**。
      卫生＝`git diff --check` **exit 0**；改动集＝6 份跟踪文件（`docs/test-report.md` 222／0、`e2e/core.spec.ts` 5／1、`e2e/visual.spec.ts` 18／0、`src/actions/collection/collection.ts` 6／2、`src/lib/sync/changes.test.ts` 239／0、`src/lib/sync/changes.ts` 4／2）＋3 份新测试文件；临时探针 6 份**已全部删除**（`git status` 内 `_*.spec.ts` 0 枚）；☆ 一笔口径＝工作树里这三份文件是 CRLF（`core.autocrlf=true` 检出所致）而我新增的行是 LF＝HEAD 的 blob 全为 LF（`git show HEAD:docs/test-report.md` 数到 CR=0）＝入库侧一致、`--check` 干净，不是丢行。
      **未 commit／未 push**（本轮未点名）；`craft-visual@` 文档数 `6/6` 未动。

30. ★★★★★ **那条锚点红被拆成三枚不同的东西：我自己测试点错了行（已修）、指向本篇的块链接点了没反应（判据先行、已修）、跨文档那一跳要 1.5—8.1 秒（未修、红着交出来）**：
    - ★★★★ **先量再改**＝六发路由探针（`../impl-scripts/route-longtask-probe.log`，逐字 `ROUTEPROBE` 行）：`landed` ＝ 3890／NEVER／1503／2739／8110／4426 ms，同发的长任务总时长＝3772／2144／1884／3356／4960／3293 ms、`worstGap`＝910—1537 ms，而**每一发的资源耗时都 ≤ 800 ms**＝**提交延迟与主线程占用同向、与网络不同向**。☆ 那发 NEVER 的形状与其余五发不同＝它取的是 `/documents/<源>#i-0`、**从未取目标文档的 RSC、也从未取 collab token**＝NEVER 不是"慢"、是"跳错了对象"。
    - ★★★★★ **P3＝测试一直在量它没命名的事**＝`core.spec.ts` 原写作 `button:has-text(marker)` 的 `.first()`，而 `searchBlockAnchors`（`src/actions/document/anchors.ts:25`）**不排除当前文档**、按 `updatedAt desc` 排＝两篇文档标题都是 未命名、而 chip 的正文又恰好等于那个 marker ⇒ `.first()` 经常选到**本篇自己的块**。修＝块行带上稳定标识（`block-link-menu.tsx` 加 `data-block-hit-document`／`data-block-hit-index`），测试按目标文档 id 选行。☆ 判据＝**同名两行必须用稳定 id 选、不能用可见文本**（承在册"标识用稳定 id 而非标题"）。
    - ★★★★★ **P1＝指向当前文档的块链接点了没反应**＝`router.push('/documents/<同一篇>#i-0')` 只改片段，而 `history.pushState` **不发 `hashchange`**＝`Editor.tsx:470` 那个侦听器不会被触发、依赖 `[editor, documentId]` 又没变＝hunt 从不起步＝地址停在 `#i-0`、既不盖章也不高亮。判据先行＝新用例 `core.spec.ts:243`；**改产品之前**的逐字红＝`Error: expect(locator).toBeVisible() failed`／`Timeout: 4000ms`／`Error: element(s) not found`／`- waiting for locator('.block-anchor-flash')`。修＝同文档且带片段时改走 `window.location.hash = fragment`（这条会真发 `hashchange`）、跨文档仍走 `router.push`（`block-link-view.tsx:16-30`）。转绿＝**5/5 通**（逐发跑时 27.2—28.6 s，闪光逐发在 4 s 预算内在场）。☆ 一笔没留住的现场＝修复前后合起来 8 发里**有 1 发红在同一枚 flash 缺席上**，而那发的 `error-context.md` 被后续跑次覆盖＝我没留住 DOM／URL 现场＝读数只到"8 发 1 红"、成因未定。
    - ★★★★ **「先红」在提交字节上重演了一次**＝`../impl-scripts/p1-revert.cjs break` 只把 `handleClick` 换回旧体（git 自己认得＝blob 从 `10b2348` 退回 `41022b6`＝HEAD 那一版）＝单跑该用例逐字红在 `core.spec.ts:272`＝`Locator: locator('.block-anchor-flash')`／`Timeout: 4000ms`／`Error: element(s) not found`／`PW_EXIT=1`（`p1-control-red.log`）＝`restore` 按快照字节回写、sha `1ec6aa80e6…` 与快照逐字相同＝同一条命令 `1 passed (42.4s)／PW_EXIT=0`（`p1-control-green.log`）＝判据＝**"改产品之前先红"不能只是我看过一次，要能在落盘字节上重演**；☆ 顺带一枚自家尺缺陷＝第一版 `break` 拿 `\n` 字面量去匹配整段＝**工作树是 CRLF**（`core.autocrlf=true`）＝`fix block found 0 times` 当场 ABORT＝没让我把旧体静默写成半段；改为按整行定位、还原走快照字节。
    - ★★★★ **量具用错＝假红**＝第一版把这条断言写成 `page.waitForURL(/documents/<id>#i-\d+/)`，三发全部 `Test timeout of 120000ms exceeded`＝`waitForURL` 等的是 **load 事件**，而同文档改片段永远没有 load。换成 `expect(page).toHaveURL(...)` 之后同一枚断言才按预期失败／通过＝**4000 ms 闪光预算全程未动**。
    - ☆ **P2 未修**＝即便选对行，跨文档那一跳仍要 1.5—8.1 s 才提交＝本轮 `core.spec.ts:204` 三发里 1 通 2 红（红在 `:234` 的 flash 缺席）＝任务 #55 的判死发升级为 **CPU profile**（`longtask` 只给时长不给函数名，下一把尺要能点名是谁占住主线程）。
    - ☆ 一条在册外事实＝dev server 每跑必打的 `⨯ Error: aborted`（`code: 'ECONNRESET'`）在三份探针日志里各出现 10—49 次＝它**不是**本轮任何一枚红的成因（NEVER 那发点击后根本没有请求），但是历批"通路档"读数反复出现的背景噪声＝值得单开一账、不要再当解释用。

31. ★★★★ **分批跑法进仓了**（第 28 条挂的那笔"运行器在树外、CI 与别的会话拿不到"的账结了）＝`scripts/e2e-batched.mjs`＋`package.json` 的 `npm run test:e2e:batched`：
    - ☆ 移植时唯一实质重写＝**新鲜闸换了尺**：原来解析 `netstat -ano` 的文本，现在用 `node:net` 直接**试着 bind 那个端口**（`EADDRINUSE`＝忙、其余错误原样打成 `error:CODE` 不许读成"忙"）。换尺的理由是可移植性（CI 上没有 netstat），且刻意绑**通配地址**而不是 `127.0.0.1`＝绑具体地址可能与一台通配监听者共存、会把"忙"读成"空闲"＝**一道只会在错方向上失败的闸比没闸更坏**。
    - ★★ **新尺的两把控制当场各打一次**＝① 正控制（白捡的现场：另一批正在跑、三台 server 都在听）＝`PORTS BUSY: 3000 3001 3002`，与另一台独立仪器同向（`netstat -E ":(3000|3001|3002) .*LISTENING"` 数到 6 行＝IPv4＋IPv6 各三）；② 覆盖闸在**移植版**上重打负控制＝`--control=overlap` → `shards=[30+30] sum=60 dupTitles=30 missing=36`、`COVERAGE GATE FAILED`、exit 1＝"移植没把闸移丢"是这台闸自己说的。☆ 顺手一枚自家读数缺陷＝第一次交叉核对时我把 netstat 的正则写成 `LISTENING.*:3000`＝**行序写反＝假零**（在册那族"行尾锚假零"的又一枚实例），改序后才数到 6 行。
    - ☆ 正面读数（当前字节）＝`npm run test:e2e:batched -- --plan-only --shards=2` → `specs=nonvisual files=16 projects=desktop`、`plan full=66 shards=[36+30] sum=66 dupTitles=0 missing=0 unexpected=0`、`COVERAGE GATE OK`＝分母自本批起是 **66**（新增那枚同篇锚点用例）。
    - ☆ 新增 `--projects=`（默认 `desktop`）＝把"这台运行器只跑桌面档"从隐含变成写在用法注释里的一行；三档视觉矩阵（111 枚）仍按第 29 条那条命令跑，**不要**拿 `--specs=visual` 冒充它。
    - 门禁（**最终字节新鲜跑**，本机钟 16:1x—17:2x）＝vitest **`56 files / 441 tests passed`／`VITEST_EXIT=0`**（与第 26—29 条逐字相同＝本轮零新增单测，新增的判据都在 e2e 档）；tsc **`exit=0`／0 行**；eslint `.`＝**`0 errors / 429 warnings`**＝与开工前持平＝新进的 `scripts/e2e-batched.mjs` 贡献 **0 枚**告警；
      e2e 非视觉（分批 **3 片**）＝**`passed=65 failed=1 flaky=0 skipped=0 didNotRun=0 counted=66/66 memoryRestart=0`**、覆盖闸 `full=66 shards=[30+15+21] sum=66 dupTitles=0 missing=0 unexpected=0`、逐批退出码只有 `1/3=1`；**唯一那枚红＝`core.spec.ts:204`**（P2＝跨文档那一跳），新用例 `core.spec.ts:243` 在负载档里同样通过（`ok 22`，27.8 s）；
      e2e 视觉三档＝第 29 条那份 **106 passed / 5 skipped／`VISUAL_PW_EXIT=0`**（`e2e/visual.spec.ts` 与 `src/**` 之外本轮没再动它的字节；`src/components/editor/*` 两处改动**不在**任何视觉快门的路径上＝这条限定按在册口径明写，不当作已验）；`.png` 改动 **0 枚**。
      ☆ **一处读数与字节的错位要写明白**＝这份非视觉全量是在 `scripts/e2e-batched.mjs`＋`package.json` 那一条**之前**起跑的（16:56）＝这两份字节只新增了一个无人 import 的脚本与一个无人调用的 script 项＝对 66 枚用例的语义为零影响；其后在同一字节上重跑的 vitest／tsc／eslint（17:2x）才是最终字节。
      卫生＝`git diff --check` exit 0；改动集＝9 份跟踪＋4 份新文件；`npm run test:e2e:batched -- --plan-only` 与 `--control=overlap` 各跑一次（前者 `COVERAGE GATE OK`、后者 `COVERAGE GATE FAILED`／exit 1）；`--check-ports` 两向各一次（跑中 `PORTS BUSY: 3000 3001 3002`、收工 `PORTS FREE: 3000 3001 3002`）。






## 结论
19 条路由 + 编辑器交互矩阵 + 白板持久化 + 分享口令流程全部通过;
`npm run build` 通过;未发现功能缺失、交互异常。视觉层面完成 token 级
对齐(暖纸白/暖墨色/衬线标题/圆角),无结构性偏差。

---

# 第二轮：P0→P3 补齐后的全场景验收（2026-09-25）

环境：Playwright 自起 `npm run dev`(3000) + `dev:collab`(3001) + `dev:tldraw-sync`(3002)；
测试账号 `craft-test@example.com`、越权对照 `e2e-intruder@example.com`、
视觉种子 `craft-visual@example.com`；三档视口 desktop 1440×900 / tablet 768×1024 / mobile iPhone 12。

## 一、出口门四件套

| 命令 | 结果 |
|---|---|
| `npm run lint` | 0 errors（438 warnings，全为既有 `no-explicit-any`/未用变量风格项） |
| `npm test` | 23 文件 / 169 用例全绿（node 环境，纯逻辑与编解码） |
| `npm run build` | 通过，23 条路由产出，`/p/[slug]`、`/s/[token]`、`/w/[token]` 为动态 |
| `npm run test:e2e` | **119 passed**（23 功能 + 96 视觉），11.0 分钟，退出码 0 |

上表是 P3 出口门那一轮的结果。其后新增的 `e2e/editor.spec.ts`（+6 用例，见"二·补"）单独跑为
8 项全绿，但**四件套尚未带着它重跑一次全量**：另一个会话在 10:03–10:12 改了本目录 20 个源文件
（各页内联标题重构为共享 `AppPageHeader`），并从 10:36 起在此目录跑 `visual.spec.ts --update-snapshots`，
移动端基线随之过期（旧基线无抽屉触发键、标题 24px）。并发写入期间的全量数字不可归因，
需在无并发后重跑一次出口门再更新本表。

## 二、功能矩阵（自动化）

| 能力 | 用例 | 结果 |
|---|---|---|
| 登录/路由守卫 | `core.spec.ts` 登录跳转 | ✅ |
| 文档 CRUD + 自动保存 | create/edit/persist | ✅ |
| 偏好设置持久化 | settings | ✅ |
| `[[` 块级锚点：定位→打稳定 id→高亮→刷新后仍可跳 | 块锚点用例 | ✅ |
| 镜像块：跨文档只读复制、非可编辑内容、刷新保留 | 镜像用例 | ✅ |
| Markdown / TextBundle 导入（标题/任务列表/引用/代码块语言） | 导入用例 | ✅ |
| 集合：属性、公式列、画廊视图、表单视图 | 集合用例 | ✅ |
| 循环任务：完成后滚动到下一次 occurrence，历史实例保留 | 任务用例 | ✅ |
| 发布页自定义地址 + SEO canonical + 保留字拒绝 | 发布用例 | ✅ |
| 侧栏树项右键菜单：重命名/新建子文档/创建副本/收藏/复制链接/回收站 | 右键菜单用例 | ✅ |
| 文档内白板内嵌只读预览 + 点击放大 | 嵌入白板用例 | ✅ |
| 成员/权限面板：授予只读→对方只读渲染→撤销→再次拒绝 | `authz.spec.ts` | ✅ |
| 越权面：非属主打不开文档/拿不到协作 token/开不了白板 | `authz.spec.ts` ×2 | ✅ |
| 协作实时同步、断线重连、重开不翻倍、服务端重启不丢 | `collab.spec.ts` ×3 + `persist.test.mjs` | ✅ |
| 白板协同：双端同步、viewer 只读、撤销分享即踢断、匿名 view | `whiteboard-collab.spec.ts` ×6 | ✅ |
| 编辑器全块矩阵：33 项 slash 可达、18 块逐个落地、13 条 inputRule、四档分隔线、DragHandle 重排、四 tab 面板 | `editor.spec.ts` ×8 | ✅ |

## 二·补、编辑器矩阵（`e2e/editor.spec.ts`，本轮新增）

| 用例 | 覆盖面 | 结果 |
|---|---|---|
| 33 项 slash 命令按名可达 | 每个命令都查询得到、命中的是标题完全相等的那一项（`卡片` 不会被 `网页链接` 的描述"富链接预览卡片"抢走） | ✅ |
| 插入落地 ×3 段（每块一个新文档） | 标题 1–4 / 无序 / 有序 / 待办 / 折叠 / 引用 / 代码块 / 表格 / 分隔线 / 四类 callout / 卡片 / 分栏 / 公式 / 绘图 / 白板内嵌，各自断言其 DOM 标记 | ✅ |
| Markdown inputRule 13 条 | `#`/`###`、`- `、`2. `、`> `、`[] `/`[x] `、`` ``` ``ts、`**`、`~~`、`==`、`[t](u)`、`$x^2$` | ✅ |
| 四档分隔线互不吞 | `..-`→thin、`.--`→medium、`---`→thick、`=-`→dashed，四条同时存在各一条 | ✅ |
| DragHandle 重排顶层块 | 悬停把手出现 → 拖到最后块下方 → 顺序改变 → Ctrl+Z 还原 | ✅ |
| 右栏四 tab 各自渲染 | 插入项列表 / 字号步进 / 文档颜色 / 协作者区块 | ✅ |

两点实现约束（写测试时踩到，已固化在 spec 注释里）：
slash 的 suggestion 查询遇空格即止，`标题 1` 只能键入 `标题` 再选完整标题；
插入断言必须一块一文档，分栏/表格这类容器删不干净到"恰好一个空段落"。

## 三、视觉矩阵

`e2e/visual.spec.ts`：13 应用路由 + 登录/注册 + 文档详情与四个面板 tab + 集合表格 + 白板画布，
× light/dark × desktop(1440×900)/tablet(768×1024)/mobile(iPhone 12 390×844) = **96 用例 / 126 张基线**
（每主题 21 张，文件名带 `-win32` 平台后缀），本轮因新增 UI（格式 tab 字号行、协作者区块、
侧栏导入按钮、集合头部按钮、移动端抽屉）重建一次并连续多轮全绿（重建轮 + 校验轮）。
掩码：侧栏树、日历网格、时间戳与相对时间文本。

## 四、本轮修复的真实缺陷（均有复现证据）

1. **离开文档时挂起的编辑被丢弃**：编辑器 2s 防抖保存只在卸载里 `clearTimeout`，
   导致 `Document.content` 落后于 Yjs 房间；`/p`、`/s`、导出、搜索、版本快照全部读这一列。
   实测公开页正文为空。改为卸载时补写挂起内容，并用脚本验证「输入后 300ms 离开」仍落库。
2. **口令保护的发布页用自定义地址访问时永远解不开**：`/api/s/[token]/verify` 与 `/s/[token]`
   只按 `token` 查库，slug 命中不了。统一走 `findShare()`（先 slug 后 token）。
3. **协作者面板此前无 UI 入口**：`DocumentMember` 建表与鉴权早已存在但没有任何地方能写入，
   现在信息 tab 可增删改角色，并顺带补齐了此前记为"延后"的文档 viewer 拒写用例。
4. **DragHandle 悬停即消失，块根本抓不到**：把手渲染在编辑器盒子外的装订线里，指针移向它必然
   触发 `dom` 的 `mouseleave`，原实现无条件 `setHandle(null)`。改为放行 `relatedTarget` 落在
   `[data-drag-handle]` 上的情况。
5. **第一个块永远无法拖拽**：`posAtDOM(el, 0)` 对首个顶层块解析出 depth 0，range 取不到；
   且拖拽开始时用悬停阶段抓到的元素引用，而 Yjs 回显后 ProseMirror 已把该元素换掉。
   改为按 `doc.child(i)` 走位求 range，并在 pointerdown 依 `handle.top` 重新解析当前块。
6. **缺 Craft 的 `[] ` / `[x] ` 待办快捷输入**：矩阵覆盖时才暴露（此前只有 slash 入口）。
   已补 inputRule，并限定只在顶层段落生效——列表内 `- [ ]` 是导入器的职责，就地替换会造出
   schema 不接受的内容。

## 五、已知偏差与未覆盖项

1. craft.do 线上基准截图仍无法采集（本机无外网）。已把采集脚本与规程落盘：
   `scripts/capture-ref.mjs`（无会话即干净报错，本环境只能验到这一条路径）与
   `docs/craft-ref/capture.md`；逐屏人工对照工作表见 `docs/craft-ref/manual-checklist.md`
   （21 屏 × 3 档 × 2 主题、tokens 偏差表、10 项"自动化判不了"清单），其中"参考"列全部标 `⏳待采`。
   `docs/craft-ref/tokens.md` 待网络恢复后由 `tokens.json` 生成。
2. 白板内嵌预览的授权沿用白板自身的 owner/share 判定：文档协作者若不是白板属主且未开分享，
   看到的是「无法预览」回退条（保留标题与跳转），不是空白。
3. 旧文档里的 inline `whiteboardLink` chip 原样保留（改块级会丢已存内容），
   新的插入路径（`/白板` 与侧栏拖入）才生成块级内嵌。
4. 集合的 relation / file 属性单元格、搜索的「加载更多」分页项没有 e2e 覆盖（需要真实上传与
   超 20 条命中数据），仅由单测覆盖其纯逻辑（`formula.ts`、`search.ts` 的分页参数）。
5. 整页关闭（浏览器标签直接关掉）不在 SPA 卸载路径上，防抖窗口内的最后一次编辑仍可能不落
   `Document.content`；Yjs 房间状态不受影响，重开即恢复。
6. 移动端「日历日详情 Sheet」未做（P2 已记录），PDF/Email 导出仍走浏览器打印与 mailto 占位。
7. tldraw 许可：仅本地/内网使用，保留水印与许可校验，本轮不做公网部署。

---

# 第三轮：官方设计 Token 对齐（2026-09-25 中午）

前两轮把 craft.do 基准采集记为"本机无外网，阻塞"。本轮推翻该结论：产品端域名是
`docs.craft.do`（`app.craft.do` 才是不通的），用户 Edge 里已有登录态，于是用 Qoder Browser
Connector 直连采集，并把本地视觉体系整体对齐到官方值。

## 一、出口门四件套

| 命令 | 结果 |
|---|---|
| `npm run lint` | 0 errors（438 warnings，含 `scripts/probe-collab.mjs` 一条既有 unused-disable） |
| `npm test` | 23 文件 / 169 用例全绿 |
| `npm run build` | 通过（**注意**：dev 运行期间跑 build 会打断 dev，见第四节） |
| `npm run test:e2e` | 全量 125 passed / 2 failed（23.0 分钟）；两条失败单跑 2 passed，合计 **127/127** |

## 二、采集到的官方基准

- `docs/craft-ref/tokens.md`：官方 `index.css`（296,789 字节 / 544 个自定义属性）解出的
  light + dark 全量色板、字号阶、圆角阶、间距阶、阴影阶、动效阶，加 `elementInfo` 实量几何。
- `docs/craft-ref/ref-*-desktop.png`：6 屏真实登录态截图（含个人内容，已 `.gitignore`）。
- `docs/craft-ref/capture.md`：规程改为"路径 A（自带会话）+ 路径 B（Browser Agent）"，并把四条
  已实测失败路径写进去（`playwright.evaluate` 恒 null、`pageAssets.bundle()` 恒 stale、
  CDP 仅放开 `DOM.*`、`viewport.set()` 静默无效）。
- `docs/craft-ref/manual-checklist.md`：21 屏对照表的"参考"列已按实际采集情况标 `✅` / `⏳token`。

## 三、按官方值改掉的偏差

| 项 | 官方 | 本地改动 | 影响文件 |
|---|---|---|---|
| 页面底色 | `252 253 254` 冷调近白 | 色相 85（暖）→ 247.8 | `globals.css` |
| 前景 / 正文墨色 | `26 28 30` / `rgb(31 34 37)/90%` | 新增 `--editor-fg`，`.tiptap` 取它 | `globals.css` |
| 暗色主题 | `30/30/30` + `35/35/35`，中性灰 | 去掉 260 蓝紫偏色 | `globals.css` |
| 圆角阶 | 4/8/12/16px | 由 `calc(--radius*n)` 改固定值 | `globals.css` |
| 动效 | `.15/.2/.5s` + `cubic-bezier(.4,0,.2,1)` | 替换 100/150/250ms ease | `globals.css` |
| 侧栏宽 | 288px（实量） | store 默认 260 → 288（改 CSS 变量无效，桌面轨由 store 驱动） | `use-sidebar-store.ts` |
| 右栏宽 | ≈360px | `--panel-w: 300 → 360` | `globals.css` |
| 外壳字号 | `--ui-md` 13px / −0.04px | `text-sm → text-[13px]` 共 19 处 | 侧栏 8 文件 + 右栏 2 文件 |
| 顶栏高 / 页面标题 | 48px / ≈24px | `min-h-14 → min-h-12`、`text-lg → text-2xl` | `AppPageHeader.tsx` |
| 文档标题 | 斜体衬线，占位"页面标题" | 加 `italic`，占位文案改齐 | `EditorHeader.tsx` |
| 主 CTA | 药丸 | `default` 变体加 `rounded-full` | `ui/button.tsx` |
| 右栏"插入" | 整行边框卡 + 右侧拖拽点、无描述行 | 按官方重排 | `InsertTab.tsx` |
| 文档正文形态 | base 底上浮起圆角卡 + `--shadow-doc` | 正文容器改为卡片 | `DocumentEditor.tsx` |
| 浏览页宽度/密度 | `--browse-max-width: 1630px`，5 列 | `max-w-5xl → max-w-[1630px]` + `xl:4 / 2xl:5` | `AppPageContainer.tsx` + 6 页 |

96 张视觉用例（126 张基线）按新体系整体重建一次，重建轮与校验轮均全绿。

## 四、本轮自己造成的两次假失败（都已定位并修）

1. **`npm run build` 打在 `next dev` 运行期间**：Next 16 的 dev 用 `.next/dev/`，但 build 会写
   `.next/` 顶层 manifest 与共享 `.next/cache`，正在服务的 dev 被打断，`collab.spec.ts` 报
   `net::ERR_CONNECTION_RESET`。停掉 dev、让 Playwright 自己起干净服务后该用例恢复正常。
2. **改了标题占位符没同步用例选择器**：`EditorHeader` 的 `placeholder="无标题" → "页面标题"`
   让 `core.spec.ts` 两条用例在旧选择器上超时（2.1 分钟）。已把 `core.spec.ts` 与
   `global-setup.ts` 三处选择器改齐，单跑 2 passed。

## 五、仍存的结构性偏差（不是 token 能解决的）

1. **侧栏信息架构**：官方是 space 切换器 → 新建文档 → 所有文档/任务/日历/连接/与我共享/我的模板
   → 星标 / 文件夹 / 标签 分组；本地是 搜索 → 首页/收藏/最近/日记/任务/日历/模板/回收站
   → 文档/文件夹/集合/白板 树。
2. **顶栏**：官方页面名居中，右侧为 头像 + 共享 + 通知 + 帮助 + 面板开关；本地是面包屑居左。
3. **编辑器正文行高**：官方 UI 阶 16/19.2，本地 1.7；截图目测 1.5–1.6，需像素测量定档后再改，不凭猜动。
4. `--highlight-*` 7 色是**死 token**（全仓无引用，高亮色实际硬编码在组件里），要先接线再按官方 9 色换值。
5. tablet / mobile 档官方截图仍缺（`viewport.set()` 静默无效），右栏 格式/样式/信息 三 tab 官方图待补。
