# craft.do 基准采集规程

> **状态：已执行过一轮（2026-09-25 中午）。** 此前"本机无外网"是误判：Craft 产品端域名是
> `docs.craft.do`，`app.craft.do` 才是不通的；用户 Edge 里就有登录态。
> 实际采集走的是下面的 **路径 B**（共 6 屏）。
> ⚠️ **2026-10-22 起改走路径 C（ego-browser），路径 B 已废弃**：现为 **66 张**、三档矩阵齐备，
> 见本文末「路径 C」与 `screens.md` §十二。旧产物 `ref-*-desktop.png`（1910×925）已作废。
> 路径 B 的四条坑（`playwright.evaluate` 恒返回 null、`pageAssets.bundle()` 恒报 snapshot is stale、
> CDP 只放开 `DOM.*` 因而拿不到 computed style、`viewport.set()` 静默无效）已写在文末与项目记忆里，
> 下次别再试。

## 路径 A：Playwright 独立采集（需自己的账号会话）

产物进本目录：`ref-<screen>-<desktop|tablet|mobile>.png` + `tokens.json`。
对照结论写进 `visual-diff-checklist.md`（逐项处置）与 `manual-checklist.md`（逐屏状态与偏差表）。

## 前置

- **外网可达**：本机 2026-09-24/25 实测 `app.craft.do` DNS 解析失败、`google.com` 连接超时，
  唯一可达的是 Playwright 浏览器 CDN。因此本规程尚未执行过一次完整采集，`ref-*.png` 为空，
  `manual-checklist.md` 的"参考"列全是 `⏳待采`。网络恢复后从这里开始。
- 一个已登录的 craft.do 账号（免费档即可覆盖全部界面形态）。
- Playwright 浏览器已装：`npx playwright install chromium`（离线时可用镜像
  `PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/`）。

## 步骤

```bash
# 1)  headed 登录一次，会话存到 e2e/.craft-ref-state.json（已 gitignore）
node scripts/capture-ref.mjs --login

# 2)  13 个静态路由 × 3 档
node scripts/capture-ref.mjs

# 3)  实体屏（文档 / 集合详情 / 白板）URL 因账号而异，用 --only 命名 + --path 指定
node scripts/capture-ref.mjs --only=document-detail --path=/documents/<id>
node scripts/capture-ref.mjs --only=collection --path=/collections/<id>
node scripts/capture-ref.mjs --only=whiteboard --path=/whiteboards/<id>

# 4)  右栏四 tab、集合四视图、日历月格这类"同一 URL 不同状态"的屏，脚本不模拟交互：
#     用 --login 的 headed 窗口手动切到该状态，或直接改 SCREENS 临时加一条带 hash/查询的路径，
#     再按 `ref-<screen>-<w>.png` 命名手动补图
```

## 每屏要记的字段

`tokens.json` 由脚本自动写入，键为 `<screen>@<viewport>`，值为下列属性在
`body / main / nav / card / button / h1 / input` 上的 `getComputedStyle` 结果：

`background-color, color, font-family, font-size, line-height, letter-spacing, padding, gap, border-radius, border-color`

对齐时按 `manual-checklist.md` 第二节表逐行填：基准值 | 本地值 | Δ | 处置 | 是否有意偏差。

## 判读规则

- **Δ ≤ 1px / 色相差 ΔHue ≤ 2**：视为一致，不改。
- **专有字体/图标/主题位图**：不搬运，用系统衬线栈 / lucide / 自绘图标近似（本轮既定边界）。
  例外：**Inter 不是近似，是官方 Web 端字体栈第一位**（`--font-family: "Inter", var(--cjk-sans),
  "Pretendard", -apple-system, …`），所以本地用 Inter 属"与官方一致"而非偏差。
- **暗色主题**：已按官方 `[data-theme=dark]` 的 `30/30/30` + `35/35/35` + `249/249/249` 改过，
  官方是中性和灰、**不带蓝紫偏色**。
- **单一来源**：本地值只从 `src/app/globals.css` 的 token 读，不接受组件里写死的十六进制；
  发现写死即视为缺陷，改回 token。
- 采集失败的单屏不阻塞整批（脚本按屏 try/catch，把错误写进 `tokens.json`），会话过期就重跑
  `--login`。

## 路径 B：Browser Agent 走用户已登录会话（本轮实际用法）

不需要账号密码，也不要把凭据写进任何脚本或对话。

```js
// node_repl 里
const { createBrowserAgent } = await import('@qoder-space/computer-use-sdk');
const agent = await createBrowserAgent();
const browser = await agent.browsers.get(<browsers.list() 返回的 Edge id>);
const tab = await browser.tabs.new();
await tab.goto('https://docs.craft.do/');       // 会跳到该账号的 /s/<space>/all
await tab.markHandoff();                        // 否则本 turn 结束标签页被自动关闭
```

1. **截图**：`await tab.screenshot({format:'png'})` 拿字节，用 `fs.writeFile` 落
   `docs/craft-ref/ref-<screen>-<w>.png`。下一 turn 用 `browser.tabs.list()` + `tabs.get(id)` 重新取回标签页。
2. **设计 token**：`browser.tabs.content({ urls:[<index.css 地址>], contentType:'text' })`
   直接取回官方样式表全文（`contentType` 只认 `text`），再用正则抽 `[data-theme=light|dark]{…}`
   与 `--*` 定义；rgb → oklch 换算用一段 node 现算。
3. **几何**：`tab.playwright.elementInfo({x, y})` 返回该点命中的元素栈（含 `bounds`），
   用它量侧栏/顶栏/卡片宽高。
4. **不要试的四条路**：`tab.playwright.evaluate(...)` 恒返回 `null`；`pageAssets.bundle()` 恒报
   `snapshot is stale`；CDP 只放开 `DOM.*`，`CSS.enable` 被拒所以拿不到 computed style；
   `viewport.set({width,height})` 返回 `undefined` 但**不生效**（截图仍是窗口内尺寸）。
5. 截图含用户真实内容 → `ref/` 已进 `.gitignore`，只留本地对照。

## 与自动化的分工

`ref/` 下的图是**人看的对照图**；CI 门禁是 `e2e/visual.spec.ts` 的 126 张本地基线
（42 视图状态 × 3 档，掩码掉侧栏树/日历格/时间戳）。两者不互替：基线防回归，`ref/` 定"对不对"。

## 路径 C：ego-browser（2026-10-22 起，**取代路径 B**）

路径 B 的四条坑在 ego-browser 下**有三条已解决**，方法与本轮产物见 `screens.md` §十二。
此后再采基准一律走路径 C。

```powershell
# 脚本写到 UTF-8 .mjs，用 ASCII-only 的一行入口跑（PowerShell 5.1 会把多行/双引号参数切碎）
ego-browser nodejs -e "await import('file:///C:/Users/<name>/ego/<goal>-<date>/round-01.mjs')"
```

```js
const task = await taskSpace("craft-page-capture");   // 复用自己的空间，别新建
const page = task.page("p1");
// 截图前必须复原窗口，否则报 Cannot capture a screenshot while the window is minimized
const w = await page.cdp("Browser.getWindowForTarget");
if (w.bounds.windowState !== "normal") {
  await page.cdp("Browser.setWindowBounds", { windowId: w.windowId, bounds: { windowState: "normal" } });
}
// 精确 CSS 视口（路径 B 的 viewport.set 在这里由 Emulation 取代）
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
```

能力对照（相对路径 B）：

| 能力 | 路径 B | 路径 C |
|---|---|---|
| 取 computed style | ✗（`evaluate` 恒 null） | ✓ `page.evaluate()` |
| 精确视口 | ✗（`viewport.set` 无效） | ✓ `Emulation.setDeviceMetricsOverride` |
| 取 CSS 原文 | `tabs.content` | ✓ `page.fetch()` / `page.fetch({saveAs})` |
| CDP 面 | 仅 `DOM.*` | ✓ `Browser.*` / `Emulation.*` 等 |
| 窗口最小化 | — | ⚠ 会打断截图，需先复原 |

**两条硬规则（本轮用真实文档的代价换来）：**

1. **不要在真实文档里做插入 / 输入类操作**。Craft Web 的 `Ctrl+Z` 不撤销已插入区块；唯一复原路径是
   「信息 → 查看备份 → 选历史版本」，而**点版本行即触发恢复**（不是预览），并会另存一份「快照」文档。
2. 要采编辑器 / 斜线菜单 / 白板 / 集合块这类**会产生内容**的屏，**新建临时文档**，采完删掉。

截图含用户真实内容 → `ref/` 已 gitignore，只留本地对照。


### ⚠️ 视口覆盖是**按会话**的（本轮踩到）

`Emulation.setDeviceMetricsOverride` 的覆盖**只对当前 `ego-browser nodejs` 进程有效**。下一个 round 是新进程，
覆盖已失效 —— 必须**每个脚本开头重设一次**，否则截图会退回窗口尺寸（本轮实测为 1536x714，
而覆盖生效时是 1440x900，混在一起会让基准图尺寸不统一）。

本轮第一次跑完 66 张后才发现 32 张是 1060x707、8 张是 1536x714，只能整批重采。校验方法（零浏览器开销）：

读 PNG IHDR 里的宽高（字节偏移 16 / 20），按尺寸分组统计；再用 md5 查重（字节完全相同的两张图要删一张）。

另外：**同一张图不要连拍两次**（本轮对 `templates-gallery` 连拍两张字节完全相同，
项目文档把这种情况判为「点击静默失败」，但这里只是重复截图）。收尾前必须按 md5 查重。

### 取 DOM 快照（2026-10-23 起，路径 C 的新能力面）

截图只能还原像素，**还原不了 DOM 结构**。补这一面：

```js
// 整页 DOM（含 <html>/<body>）
const html = await page.evaluate(() => document.documentElement.outerHTML);
await writeFile("C:/.../out/" + name + ".html", html, "utf8");
```

三条实测教训：

1. **`outerHTML` 取不到 shadow DOM 与部分浮层**。本轮 `/` 插入面板的节点**不在** `document.documentElement.outerHTML` 里，
   但 `document.body.innerText` 里**有** `白板` 字样 —— 只看 `outerHTML` 会误判成「菜单没打开」。
   判定浮层是否真的在页面上，用 `innerText` 或 `page.snapshot()`；要拿结构，则用
   `page.cdp("DOM.getDocument", { depth: -1, pierce: true })` 递归（含 `shadowRoots` / `contentDocument`）再 `DOM.getOuterHTML`。
2. **浮层开合很快，且取 HTML 前不能插入长任务**。`page.evaluate()` 里跑 `setInterval` 轮询会**阻塞 React 渲染**，
   把菜单「等」没（本轮踩到：轮询版永远抓不到）。正确做法是动作后**立刻**取一次整页 HTML。
3. **`Ctrl+A` + `Backspace` 在正文块里是安全的**（只在临时文档用）；但**不要在真实文档里做**，见上文两条硬规则。

采 DOM 前先对齐版本：读 `<link rel="stylesheet">` 里的 `index.css.<hash>.css`，
**与仓里已落的 CSS 原文比 hash**。hash 变了说明 craft.do 又发版，旧 DOM 与旧 CSS 全部作废，必须重采。

产物含空间名 / 作者名 / 个人文档标题 ⇒ 与截图同因，**只留本地、不入库**（参照 `/docs/craft-ref/dom-20261023/` 的 `.gitignore` 条目）。

### 取运行时 CSSOM（2026-10-23 第 2 轮起）＝**比读 CSS 文件更重要**

**教训**：只读 `<link rel=stylesheet>` 抓下来的 CSS 文件会**漏掉一大半样式**。styled-components（以及部分
CSS-in-JS、Ant Design 等）在运行时把规则注入**内联 `<style>` 表**，这些表不在任何 `<link>` 里。
我第一轮就因此误判「`sc-*` 类名无解」。

```js
// 取全部样式表（含内联），逐条 cssText
const sheets = await page.evaluate(() => {
  const out = [];
  for (const s of document.styleSheets) {
    try { out.push({ href: s.href, text: [...s.cssRules].map((r) => r.cssText).join("\n") }); } catch (e) {}
  }
  return out;
});
```

`href === null` 的就是内联表。判据：内联表里若有 `data-styled` / `data-styled-version` 属性，
那就是 **styled-components 的运行时注入**（本批实测 340 规则 / 43,905 B）。

**`cssText` 会把 `@keyframes` / `@media` / `@font-face` 压成一行但不会丢**；要拿**具名**动画，直接按类型取：

```js
for (const r of s.cssRules) {
  if (r.type === CSSRule.KEYFRAMES_RULE) kf[r.name] = r.cssText;   // 拿到名字 + 全文
  if (r.type === CSSRule.MEDIA_RULE) media.push(r.cssText);
  if (r.type === CSSRule.FONT_FACE_RULE) ff.push(r.cssText);       // 含 unicode-range
  if (r.cssRules) walk(r.cssRules);                                 // 嵌套要递归（@media 里的 @keyframes）
}
```

**两条量化纪律**（本轮踩到，写错会得出完全相反的结论）：

1. **`sc-*` 类名本身不带样式** —— 它是组件 ID，样式挂在同一元素的**第二个类**（生成类）上。
   要量"样式可还原度"必须按**元素级**问「该元素至少有一个类能解析吗」，不能按类名逐个问。
   本批：元素级 **97.5%**，而按类名问 `sc-*` 只有 8.1% —— 同一个页面，两个数差 12 倍。
2. **类名命中要分类统计**（`_hash_*` / `sc-*` / 其它），混算会掩盖真实分布。

**仍有真缺口**：运行期由 JS 算完**内联进 `style=` 属性**的值（拖拽位移、滚动位置、测量后回写的尺寸），
CSSOM 里没有。那类只能**触发状态后逐个取 `getComputedStyle`**，或录 CDP 的 `Animation` / `Layout` 域。

---

## 取静态资产（字体 / css / js / image）——第 3 轮新增，2026-10-23

**目标**：把 craft.do 的静态资产（尤其字体）落到本地，使「像素级复刻」在**排版层**可验证。
**结论**：字体层已达像素级可复刻（454 条 `@font-face` / 494 个字体文件 / 34 族，度量与栅格哈希 100% 对齐）。

### 一、字体：按「声明它的 stylesheet」解析相对 URL（第 2 轮在此处错过一次）

`@font-face` 的 `src` 里大量是**相对路径**，且**不是相对文档 URL，而是相对声明它的那张 CSS**。
所以必须先记录 `sheetHref`，再解析：

```js
const faces = [];
for (const s of document.styleSheets) {
  let rules; try { rules = s.cssRules; } catch (e) { continue; }   // 跨域表会抛，跳过
  for (const r of rules) {
    if (r.type !== CSSRule.FONT_FACE_RULE) continue;
    const src = r.style.getPropertyValue("src") || "";
    faces.push({
      sheetHref: s.href,                                            // ★ 关键：声明表
      family: (r.style.getPropertyValue("font-family") || "").replace(/["']/g, ""),
      weight: r.style.getPropertyValue("font-weight"),
      style: r.style.getPropertyValue("font-style"),
      display: r.style.getPropertyValue("font-display"),
      unicodeRange: r.style.getPropertyValue("unicode-range"),
      urls: [...src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((x) => x[1]),
    });
  }
}
// 解析：new URL(raw, sheetHref) —— 不要用单一 base 拼！
const abs = new URL(raw, face.sheetHref).href;
```

**第 2 轮的具体错例**（写成反例留档）：
- 用单一 base `.../r-48-g9244379/` 拼 `roboto-mono-*-wght-normal.woff2` ⇒ 404；实际在 `.../r-48-g9244379/roboto-mono/`
- 拼 `m-plus-rounded-1c-700.117.woff2` ⇒ 404；实际在 `.../_japanese/rounded/m-plus-rounded-1c/`
- KaTeX 拼成 `.../r-48-g9244379//static/KaTeX_...`（双斜杠）⇒ 实际在 `https://docs.craft.do/static/KaTeX_...`

本批实测：**454 条 `@font-face`，来自 10 张声明表**（354 条来自 `_japanese/rounded/m-plus-rounded-1c/fontdef.css`，
45 条来自 `_cjk/common/fontdef.css`，20 条来自 `vendor-code-editor.css`，其余 7 张共 35 条）。
其中 **2 条是 `data:` URI**（`KaTeX_Size3`、`AdobeBlank`），需单独解码落盘，否则会撑爆 JSON。

### 二、镜像布局：让本地路径 == 远端路径，实现零重写

```
docs/craft-ref/dom-20261023/static/**   ← 忠实镜像远端 /static/ 树
```

`https://docs.craft.do/static/fonts/.../inter-variable.woff2`
→ `/static/fonts/.../inter-variable.woff2`（只去 origin）

好处：`@font-face` 的 `src` 可以**原样保留远端路径**，无需任何字符串改写；也便于逐文件核对。

### 三、下载纪律（第 2 轮在 45 个后静默死掉，本批修正）

1. **先探体积再下**：用 `fetch(url, { headers: { Range: "bytes=0-0" } })` 读 `content-range` 拿总长，
   再决定下载范围。本批实测字体 **188.4 MB**（不是预估的 1–2 GB），风险解除后才全量下。
2. **增量落盘**：每 50 个写一次进度文件；结束后写完整 report（含 failures 数组）。
3. **断点续传**：已存在且字节数与探测值相同的文件直接 skip。
4. **并发 10–12**，每个文件最多重试 3 次（指数退避）。
5. **落盘后校验 magic bytes**：`wOF2` / `wOFF` / `OTTO` / `true` / `ttcf`，并比对字节数与探测值。

本批结果：字体 **492/492 ok，0 fail**；非字体资产 **88/88 ok，0 fail**；magic 全通过，**0 坏文件**。

### 四、验证方法（必须双端对照，且带哨兵）

**只测一端等于没测**——本批第一次尝试就栽在这：本地服务因路径守卫写错而**全线 403**，
但 `document.fonts.check()` 对**根本不存在的字体族也返回 true**，所以「本地全绿」是假象。
加一个**哨兵族** `ZZZ_NoSuchFamily_ZZZ` 作回退基线后立刻暴露。

三层验证，由弱到强：

1. **宽度度量**：`canvas.getContext("2d").measureText(text).width`。
   注意 **CJK 字体的 `unicode-range` 排除拉丁**（U+0041–007A 不在范围内），
   所以用拉丁文本测 CJK 族会得到**回退值**（多族都等于 221.241）——**不具判别性**。
2. **像素哈希**：`ctx.getImageData(...)` + FNV-1a，比对**实际字形栅格**。
   用探针字符（罕用汉字 `龎龘龜齋`、假名 `アイウエオヶ`、韩文 `각간갇갈감`）
   才能真正区分不同字体。**每族必须至少有 1 个探针区别于哨兵**，否则是假通过。
3. **`document.fonts` 集合对照**：`[...document.fonts].map(f => f.family+"|"+f.weight+"|"+f.style)` 排序后比集合差。

**本批数字**：度量 34 族 × 6 文本 = **204/204 delta=0**；像素哈希 34 族 × 5 探针 = **170/170 一致**；
`fontFaceSet` 本地 454 / 线上 454，`onlyLocal=0 onlyLive=0`。

### 五、全页像素对照要小心「伪差异」

本地快照（禁 JS 渲染）vs 线上（JS hydrate）实测差 **10.99%**，但**大头不是资产差异**：

1. 快照 HTML 自带 `<noscript>` ⇒ 禁 JS 时浏览器渲染出 "You need to enable JavaScript…" **多一行**，整体下移 18px；
2. **相对时间文案本身在漂移**（本地 "已更新 11 小时前" vs 线上 "已更新 13 小时前"，两次采集隔约 2 小时）；
3. 快照与线上命中的 CSS 规则不同（线上元素带 `font-weight:600; letter-spacing:-0.13px`，快照缺），
   但**相同 CSS 下 DOM 宽度两边完全一致**（`129.5375` vs `129.5375`，delta=0.0000）。

**教训**：报全页像素差时必须**先归因**，否则会把采集方法的伪差异当成复刻缺陷。

## 取设备像素截图（dpr 非 1:1）——第 4 轮新增，2026-10-23

**先测真实 dpr，别假设是 1。** 清空 emulation 覆盖后读：

```js
await page.cdp("Emulation.clearDeviceMetricsOverride", {});
const dpr = await page.evaluate(() => window.devicePixelRatio);   // 本机 = 1.25
```

本机：`dpr=1.25`、`innerWidth/Height=1536x714`、`screen=1536x864`。
**此前所有采集都跑在 dpr=1，而真实用户看到的是 1.25** —— 这就是「截图 dpr 非 1:1」缺口的实质。

### ★ 陷阱：`page.screenshot()` 的 `raw: true` 无效

`help("page.screenshot")` 写 `raw: Bypass device-pixel-ratio correction`，**实测不起作用**：

| dpr | `screenshot({path})` | `screenshot({path, raw:true})` | 期望（设备像素） |
|---|---|---|---|
| 1 | 1440x900 | 1440x900 | 1440x900 |
| 1.25 | 1440x900 | 1440x900 | **1800x1125** |
| 2 | 1440x900 | 1440x900 | **2880x1800** |

两种模式的输出**字节完全相同（MD5 相同）**，且恒为 CSS 像素尺寸。**不要用它取设备像素。**

### 正解：绕过 wrapper，用原始 CDP

```js
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1.25, mobile: false });
// ...导航、等待...
const r = await page.cdp("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(out, Buffer.from(r.data, "base64"));   // -> 1800x1125
```

同一 dpr 序列下 CDP 正确输出 1800x1125(dpr1.25) / 2880x1800(dpr2)。
（`captureBeyondViewport:false` + `fromSurface:true` 结果相同。）

### 前置条件：窗口不能最小化

`Page.captureScreenshot` 在窗口最小化时**直接抛错**（`Cannot capture a screenshot while the window is minimized.`）。
先恢复：

```js
const w = await page.cdp("Browser.getWindowForTarget", {});
if (w.bounds.windowState === "minimized") {
  await page.cdp("Browser.setWindowBounds", { windowId: w.windowId, bounds: { windowState: "normal" } });
}
```

### 验证「真高清」而不是「1x 假放大」

**不要用「相邻列重复率」** —— 本批试过，被大片纯色背景稀释而失效
（1x 88.29% / 1.25x 90.08% / NN 放大 90.64%，几乎无差）。

**有效的判据＝直接差分**：把 1x 图按目标比例放大到同尺寸，与原生逐像素比。
本批：原生 1.25x vs NN 放大差 **4.81%**、vs 双线性放大差 **5.07%**（文字密集区 2.4–4.5%）；
锐度（相邻像素梯度均值）2.7229 > NN 放大的 2.0029 ⇒ 确为真实渲染。

### dpr 会不会改变布局？——不会（已证）

固定 1440x900 CSS 视口，dpr 设 1 / 1.25 / 2，逐个导航线上页面采几何：
`aside`/`main`/`h1`/`header`/`body` 的 x,y,w,h,font,fontSize **逐字段一致，差异 NONE**。

侧证：CSS 里 `min-resolution` / `max-resolution` / `device-pixel-ratio` / `image-set` /
`image-rendering` **全为 0 次**（运行时 CSSOM 并集口径）；155 条 `@media` 的 44 个唯一条件里，
唯一沾 dpr 的是 Excalidraw 的 `screen and (min-device-width: 1921px)`（本机 1536 不匹配，不生效）。

⇒ **dpr 只影响栅格分辨率，不影响几何**，所以已有 dpr=1 的几何/样式数据**无需重采**。

### 高清图片资产：先探服务端有没有，别默认有

`document_preview` 的 `size` 参数**只有两个合法值**：

| 请求 | 状态 | 字节 |
|---|---|---|
| `size=s` | 206 | 1,264 |
| `size=m` | 206 | 10,875 |
| `size=l` / `xl` / `2x` / `medium` / `M`、去掉 `size` | **400** | — |

其余「高清」参数（`width`、`w`、`dpr`、`scale`、`retina`、`hd`、`quality`、`q`、`format`、`type`）
**全部被忽略**，返回同样的 10,875 B。

侧证：28 份快照里 `srcset` **0 次**、`@2x` **0 次**、`image-set(` **0 次**
（出现的 245 个 "2x" 全是 `32x32`/`192x192` favicon 的 `sizes` 属性，与 DPR 无关）。

⇒ **craft.do 不提供任何 DPR 图片变体**，高 DPI 下预览图必然偏软 —— 是产品固有上限，不是采集遗漏。
头像 `resv2.craft.do/user/full/...` 不带参数即 403（需登录态 + 属个人内容，本就不应采）。

### 本批补采范围

13 条可导航路由 @dpr=1.25，**13/13 全部 1800x1125**：
10 个空间路由（/all /tasks /calendar /connections /templates /starred /folders /inbox /tags /trash）+
暗色 /all + /shared-with-me + /search。
**未补**：编辑器/弹层类路由 —— 需临时文档，按既有硬规则不新建。
