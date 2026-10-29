# 交互实验台（Wave 0 起造，Wave 1 在用）

**一句话**：同一份 spec 在**官方**与**本地**两侧各跑一遍，自动出差异表。

- 官方靶 ＝ `https://docs.craft.do`（复用已登录会话）
- 本地靶 ＝ `http://localhost:3000`
- 唯一驱动 ＝ `ego-browser`（**两侧都用它** —— 同一套 API、同一段观测代码，两边记录才可比）

## 文件

| 文件 | 作用 |
| --- | --- |
| `observe.mjs` | 共享观测库：页面侧采集函数（`captureAll` 等）＋宿主侧归一化/差集/期望求值 |
| `lab.mjs` | runner 库（纯导出，无副作用）；入口是同目录 `run.mjs` |
| `run.mjs` | 薄入口：`await main({ only, targets, tag })` |
| `diff.mjs` | differ：出 `docs/craft-ref/features/interaction-matrix.md` ＋ `runs/latest-diff.json` |
| `soft-delete.mjs` | 两侧的软删通路（采完必须把临时文档移进最近删除） |
| `db-probe.mjs` | 本地库面探针（宿主侧直连 Postgres，供 `db` 档；用完必须 `closeDb()`） |
| `exp-differ.mjs` | **对照实验**：证明 differ 真会红（见下） |
| `probe-one.mjs` | 单 spec 调试跑（逐段看观测值，不落矩阵） |
| `specs/*.mjs` | spec 本体 |
| `runs/` | 原始记录（**gitignore**：含空间名/作者名/个人文档标题） |

## 跑法（PowerShell）

```powershell
# 参数写死在 run.mjs / diff.mjs 顶部（ego-browser 不传 process.env）
ego-browser nodejs -e "await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/run.mjs')"
ego-browser nodejs -e "await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/diff.mjs')"
```

## spec 契约

```js
{
  id, wave, surface, target: 'official'|'local'|'both',
  selectors: { key: { official, local } },   // 两侧选择器各写一份
  setup:   [ navigate | seedTempDoc | placeCaret | placeCaretTrailing | openPanel | setPreference ],
  steps:   [ key | chord | type | paste | click | clickRef | clickXY | drag | hover | wait ],
  observe: ['dom','text','state','selection','blocks','attrs','indent','computed','screenshot',
            // ★ Wave 1 后续批逐步新增的**加性**档（不选就不采、选了不影响旧录像）：
            'keys',      // 按键消费探针（capture/bubble 两处各一个监听）
            'marquee',   // 框选（拖拽选中的块名册）
            'kinds',     // 块**语义档**归一枚举（para/title/headingN/strong/bullet/…）
            'a11y',      // 可达性树：编辑器子树内的可操作角色×可及名（CDP 权威 AX 树）
            'animation', // 动效：动作期间真正发生过的 animation/transition（事件式，含 elapsedTime）
            'db',        // 本地库面（**单侧**自证：按临时文档 id 读 documents 行；不进两侧 diff）
            'inline'],   // 行内标记归一枚举 marks（bold/italic/strike/highlight/code/link）
  selfCheckOnly:   ['local'],                // 可选：单侧面（如 db）的 expect 只对这些靶子求值
  observeTexts:    ['<具名文本>'],           // 进指纹的 counts
  stateSelectors:  ['<selector key>'],       // 进 stateAttrs.named
  attrProbes:      [{ key, selector, attrs }],
  computedProbes:  [{ key, selector }],
  expect:  [ { facet, op: equals|contains|count|gt|lt|exists|absent, value, at? } ],
  deviations: [ { facet|prefix, reason, ref } ],   // 已声明偏差（severity 0，不参与判定）
  teardown:[ restoreCaret | softDeleteTempDoc | restorePreference | key ],
}
```

`facet` 口径：`text:<名>`（末步或 `at` 步的计数）／`blocks`／`blocksCount`／`dom`／
`selection:<字段>`／`state:<selector key 或扁平属性名>`／`attr:<key>`／`kinds`／
`a11y`（=`a11y:rows`，`role|name` 名册）／`a11yCount`／`a11yRole:<role>`／
`animCount`（本步累计的动效条数）／`anim:<kind>|<name>|<tag>`（布尔在场）／
`db:<字段>`（`exists`／`isDeleted`／`title`／`contentLen`…，仅本地侧）／
`indentLevel`（光标所在块的缩进级数）／`focusInEditor`（焦点是否还在编辑器内）。
`at` 缺省＝末步；指定值＝ **record 里的 step 下标**（`baseline` 占 **0**，第 1 个动作是 **1**）。
★ 这一档极易错一位：写 spec 时按"第几个动作"数会整体偏 1，断言会落在前一步上。

## record 契约

```js
{ specId, target, builtFrom, startedAt,
  steps: [{ index, label, fingerprint:{domLength, bodyTextLength, counts},
            textNodes, stateAttrs, selection, blocks, attrs, indent, focus, computed? }],
  selfCheck: [{ facet, op, at, expected, actual, pass }],   // spec.expect 对**本侧自己**求值
  errors: [], log: [], finishedAt }
```

## diff 契约

```js
{ specId, verdict: match|differ|uncomparable,
  rows: [{ facet, step, official, local, delta, severity 0|1|2|3 }],
  deviations: [...], textSummary, selfCheckRaw }
```

**判定口径**：

- severity **1** ＝只记录、不判定：绝对 DOM 规模、绝对可见文本长度。
  两侧是两套实现（官方 Slate／本地 TipTap），绝对量天然不等。
- severity **2** ＝参与判定：具名文本计数的 **delta**（第 i 步 − 基线）、文本名册单侧增删、
  属性／块名册／选区不一致。
- severity **3** ＝前置条件不成立（任一侧 error，或两侧步数不一致）。
- severity **0** ＝ spec 里 `deviations` 命中的**已声明偏差**：照样列出来，但不参与判定。

## ★ 十三条踩过的坑（都改掉了，别再犯）

1. **绝对量不可比 ⇒ 旧版三个 spec 全报 differ**。
   旧版拿 `domLength` 两侧互比（官方 121597 vs 本地 60602）⇒ 恒红。
   改成比**动作引起的改变量**（delta）与**文本名册差集**后才有意义。
2. **观测必须原子**。旧版把 fingerprint / textNodes / state / blocks 拆成**多次** `page.evaluate`，
   两次调用之间页面还能继续渲染 ⇒ 采到**自相矛盾**的记录
   （实测：`counts.插入 = 0` 而同一份 `textNodes` 里有 4 条「插入…」；同一交互 smoke-01 记 4、smoke-02 记 0）。
   ⇒ `captureAll` 一次求值取回全部面。
3. **临时文档要起唯一标题**。本地侧栏行是 `<button>`（**无 id 属性**）、列表卡是 `<a href="/documents/<id>">`，
   而新文档标题是空串、占位文案「无标题文档」是多行共用的 ⇒ 按标题/按 id 都定位不到具体那一行。
   ⇒ `seedTempDoc` 建完就给临时文档写唯一标题 `QODER-ILAB-<specId>`。

另：官方文档 URL 是 `/editor/d/<spaceId>/<docId>?s=<sig>`，**不是** `/documents/<id>` ——
旧版只写了一条正则，官方侧恒 `id=null` ⇒ 官方软删**从没真正跑过**。
4. **探针不能沿"祖先链"找标记元素（Wave 1 修）**。官方缩进的载体
   〈`div._indent_1oz2o_33` `style="--indent-w: 28px"`〉与块行**同层并列**（同在 `div._flexRow_1oz2o_1` 下），
   不在 `blockrowwrap-*` 的祖先链上 ⇒ 沿祖先链找**恒读 0**，于是错判成"官方 Tab 无反应"。
   改成「**标记 → 属主块**」归位：先收全树所有非零标记，再为每个标记向上找**只包含一个块根**的最近祖先
   ⇒ 那个块根即属主。无论标记是祖先、同层兄弟还是后代都能归位。
   ☆ 教训：**"观测不到"与"不存在"必须分开**——探针读 0 时要先自证探针能读到已知存在的样本。

5. **两侧文档模型不同 ⇒ 名册要摊平（Wave 1 修）**。官方是**扁平块名册**（每个列表项各是一条 `blockrowwrap-*`），
   本地是**树**（一个 `<ul>` 包住所有项）。直接取 `.ProseMirror > *` ⇒ 本地整个列表只算**一块**、官方算**两块**＝假红。
   ⇒ 命中的根若是 `UL`/`OL`，展开到每个 `li` 的首个文本块并递归嵌套列表。

6. **"键没反应"与"键被浏览器接管"要分开量（Wave 1 新增）**。两类在块名册上**长得一样**（DOM 都不变）。
   实测本地 `Tab` 把 `activeElement` 带出编辑器（`.ProseMirror` → `nextjs-portal` → `body` → 按钮）。
   ⇒ `captureAll` 常带一个**焦点面** `focus.inEditor`（宿主选择器由 spec 的 `editorBody` 传入），differ 逐帧比。

7. **官方靶的 `goto` 必须容错（Wave 1 续批修）**。官方侧 `page.goto(url, {waitUntil:'load'})`
   **恒超时**：编辑器挂着长连接，`document.readyState` 停在 `interactive`，`load` 不再触发
   ⇒ 旧写法抛错进 `record.errors` ⇒ differ 判 **`uncomparable`**，**每一条官方 spec 都采不到**。
   处置（`lab.mjs` 的 `navigate` 分支）＝**只吞"导航已提交的超时"**这一种
   （错误文案自陈 `navigation committed`，且 `document.readyState !== 'loading'`），其余错误照旧上抛。
   ☆ 这是**仪器缺陷**，与"官方没这个行为"是两件事——若不修，会把整个 Wave 1 报成"官方不可比"。

8. **文本名册不认重复、侧栏标签不是内容（第 303 批修）**。两处都是**假红**的来源：
   - `captureTextNodes` 给重复文本加 `#n` 后缀**只是让列表能区分**。差集里它会把
     「同一标题被画在编辑区＋侧栏＋页签（官方 3 条）」与「只画 1 条（本地 1 条）」判成
     单侧多出文本。改动＝`diffTextNodes` 比较前**统一剥掉 `#n`**；重复与否另有
     `countΔ:<text>` 精算，信息不丢。★ 影响面：`editor.md-rules.block-kind` 的两条
     `AAA#1`／`…#3` 假条目随之消失（19 条已声明，原 21），其余 spec 判定逐字未变。
   - 本地测试库累积了几百篇历史测试文档 ⇒ 侧栏有 **246 条**「无标题文档」占位串，
     官方侧为 0 ⇒ 单侧多出。改动＝把该串归为外壳噪声 `<UNTITLED>`（与既有 `页面标题` 同一处置）。
   ☆ 顺带修掉 `PURE_NOISE` 正则里 `#d+` 应为 `#\d+` 的笔误——它让"纯噪声 + 重复后缀"的条目
   **永远不会被丢掉**，静默漏网。

9. **`kinds` 档只接了采集、没接断言（第 303 批修）**。`kinds` 在 Wave 1 续批七为采集而加，
   但 `evalExpect` 的 `actualOf` 里**没有 `kinds` 分支** ⇒ 任何 `facet: 'kinds'` 的 expect
   都静默取 `null`、恒 FAIL（首跑实测 6/8 FAIL 全是它）。改动＝补一行
   `if (facet === 'kinds') return step.kinds ?? null;`。
   ☆ 教训与 `check-tables.mjs` 空转同族：**新加观测档时，要同时检查断言侧认不认它**。

10. **页签标签会漂（第 303 批修）**。标签是建页时分配的，页一关一开就换号；写死的
   `PAGE_LABEL` 随即指向已关闭的句柄（报 `page p2 was closed`／`No target with given id found`，
   实测已绊过多次）。改动＝`lab.mjs` 的 `resolvePage()`：先按写死标签探活，探不通就按
   **靶子 URL 前缀**在现有页里找，都没有才新建。


11. **动效必须事件式采集，不能"动作后采样"（第 306 批修）**。`document.getAnimations()` 只在
   动画**正在跑**时才返回它；本地斜线菜单 `animation: enter .15s` 只有 150ms，而 `waitForTimeout(100)`
   ＋一次 `page.evaluate` 的往返就已超过它 ⇒ 采到的永远是空数组，把「有动画」读成「没动画」。
   改为监听 `animationstart/end` 与 `transitionrun/end`，时长取事件的 `elapsedTime`（规范值）。
   ★ 连带两条：① **被中断的过渡不触发 `transitionend`** ⇒ 读时要把它"就结算"成 `interrupted` 并
   **写回缓冲**，否则下一次读它就凭空消失（实测：读 1 拿到 5 条、读 2 只剩 1 条）；
   ② 动效缓冲是**累计**的、differ 只比**末步**——动画落在哪一步取决于挂载时机，逐步比会制造假红
   （实测同一批事件这回落在第 1 步、下回落在第 2 步）。
   ☆ 动画名两侧不可比（官方是构建哈希 `jOiMjk1699283064`、本地是 `enter`）⇒ 采集侧已归一成 `(anim)`。

12. **单侧面（`db`）有三条纪律（第 307 批）**。
   - **不能进两侧 selfCheck**：官方没有可查的库，把库面断言写进 `expect` 会让官方侧恒 FAIL，
     等于把"本来就没有这个面"伪装成仪器故障 ⇒ 用 `spec.selfCheckOnly: ['local']`。
   - **必须收尾关连接**：`db-probe.mjs` 开着 pg 连接，`closeDb()` 不调 Node 事件循环就不退出
     （实测：记录写完、进程却挂到超时被移到后台）。
   - **建文档与写标题是两次异步落库**：基线步读到的 `title` 还是空串，第 1 步才落定 ⇒
     标题断言要放在后面，别放在基线。

13. **`state:` 档曾"能采能断言、却从不参与判定"（第 311 批修）**。`stateSelectors` 一直能采到
   具名选择器命中数、也能在 spec 里用 `state:<key>` 断言，但 **differ 从来没比过 `stateAttrs`**
   ⇒ "弹窗开没开"这类最直观的差异在 verdict 里**是隐形的**（实测：官方 `Ctrl-J` 弹出新建任务弹窗、
   本地无反应，而判定里当时只剩属性行）。修法＝differ 增 ⑩ 段逐键比 `stateAttrs.named`，severity 2。
   ☆ 影响面：补上后 `editor.key.find-replace` 多一条 `state:replaceInput`、`editor.animation.slash-menu`
   多一条，其余 spec 判定未变 —— 说明这个洞此前确实吞掉了真差异，但吞得不多。
   ☆ 教训：**每加一个采集面，都要同时确认 differ 里有没有对应的比较段**（与第 9 条同族）。

## ★ 呈现机制差异 vs 产品级差异（判据，别混用）

`spec.deviations` **只**留给"**同一件事的两种画法**"：两侧落到同一个状态、只是画法不同，
所以它降为 severity 0 不影响判定。判据是**"下一个键的语义会不会因此改变"**。

| 例 | 两侧状态 | 处置 |
| --- | --- | --- |
| 项目符号 | 两侧**都**有圆点（官方文本节点 `•` / 本地 CSS `list-style: disc`） | ✅ `deviations`（画法差异） |
| `⌘A` 第二档 / `⌘D` 之后的选区 | 官方进**块选区态**、本地仍是**文本折叠光标** | ❌ **不可**用 `deviations`：它改变下一个键的语义（官方块选区上 `⌥↑` 才是"移动所选区块"）⇒ 如实判 `differ` ＋ 登记 G 行 |

★ **教训（Wave 1 续批真犯过一次）**：一度把 `⌘D` 的选区态差异写成 `deviations`，会让一个真差异
静默消失。写 `deviations` 前先问：**"如果用户接着按下一个键，两侧行为会一样吗？"** 不一样就不是画法差异。

## 对照实验（证明 differ 不是恒绿）

```powershell
node docs/craft-ref/interaction-lab/exp-differ.mjs
```

把 `editor.key.enter-mid-block` 的两侧 record 原样喂给 `compare()`，再逐个扰动行为量：

| 扰动 | 判定 | 命中 facet |
| --- | --- | --- |
| 原样 | `match` | — |
| 块名册 `BBBB` → `BXBB` | `differ` | `blocks` |
| `counts.BBBB` 1 → 2 | `differ` | `countΔ:BBBB` |
| `selection.anchorOffset` 0 → 3 | `differ` | `selection:anchorOffset` |
| 步数 7 → 6 | `uncomparable` | `precondition` |
| 注入假 error | `uncomparable` | `precondition` |
| 逐字还原 | `match` | — |

三种判定都真的出得来。
