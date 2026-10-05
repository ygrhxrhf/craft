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
    - ★ **本条那条不变量的风险面比写下的更窄（静态＋盘上双侧核过）**＝`temporal.updatedAtString()` 的 `updatedAt`
      是 **JS 侧 execution generator**（`onCreate`／`onUpdate` 都挂它），而 `createdAt` 才是 SQL 默认值 `now()`
      （实现＝`@prisma/orm-family-sql/dist/timestamp-now-generator-*.mjs`，`sed -n '55,83p'`）。
      盘上验 3 枚应用写的文档＝`created=476.476810 / updated=948.948000`、`495.495316 / 851.851000`、
      `280.280942 / 626.626000` ⇒ **`createdAt` 一直带真微秒、`updatedAt` 恒毫秒**。
      ⇒ 不变量收窄为：**只有"绕开 ORM generator 去写 `updatedAt` 的那一支"（直连 SQL 的 seed／迁移数据段／别的服务）才破坏游标收敛**；
      应用自身写入与 `createdAt` 的微秒都无害（游标不看它）。⇒ ☆ 反过来也提醒一句：探针 SQL 里 `now()` 落在 `created_at` 上是可以的、
      落在 `"updatedAt"` 上就会污染"每次装载几发"这一族读数。



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
