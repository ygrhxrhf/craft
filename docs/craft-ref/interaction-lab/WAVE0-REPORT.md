# Wave 0 收口报告（仪器层）

日期 2026-10-23 · 分支 `integrate/offline-kernel` · **零产品代码改动**（`git status --porcelain src e2e` 为空）

## 出口判据逐条

| 判据 | 结果 | 证据 |
| --- | --- | --- |
| 三条冒烟 spec 在**两侧**都产出可比记录 | ✅ | `runs/smoke-05-*` 六份，两侧各 0 error |
| diff 能正确报 `match`/`differ`/`uncomparable` | ✅ | 三条全 `match`；对照实验 `exp-differ.mjs` 三种判定都出得来 |
| 每条 spec 有逐字证据 | ✅ | `interaction-matrix.md` 的 selfCheck 表 24 行全 PASS |
| 官方 CSS hash 未变（硬规则 7） | ✅ | `index.css.CiV2oimr.css`，与 `docs/craft-ref/css-20261022/` 副本一致 |
| 原始记录 gitignore 且自证命中 | ✅ | `.gitignore:100`，`git check-ignore -v` 命中 |
| 临时文档已软删、残留清零 | ✅ | 本地库 `isDeleted=false` **0**；官方浏览卡 **12 张**（均用户既有） |
| 门禁 | ✅ | `npx vitest run` **270 文件／2189 条全绿**；`npx tsc --noEmit` **0 错** |

## 判定（`runs/latest-diff.json`）

| spec | 判定 | sev2+ | 已声明偏差 | 两侧共同行为 |
| --- | --- | --- | --- | --- |
| `editor.key.enter-mid-block` | **match** | 0 | 0 | 末步块名册 `["AAAA","BBBB"]`、`{AAAA:1,BBBB:1}`、光标偏移 0 —— 两侧逐字相同 |
| `editor.slash.open-and-filter` | **match** | 0 | 2 | `/` 面板在场（`state:slashMenu`=1）、斜杠留块 `["/"]`、过滤词进块 `["/wen"]` |
| `shell.command-palette.toggle-vs-jump` | **match** | 0 | 15 | ⌘K 后面板输入框在场（`attr:paletteInput` exists） |

## 新登记的产品级差异

- **G1543**＝⌘K：官方唤「跳转到」（placeholder 逐字「打开」，条目形如「在<空间>中 …」，**另有** `command-palette-button` 入口）；本地 Ctrl-K 开**真命令面板**（「操作」/「新建文档」/「查看所有快捷键」，placeholder「搜索文档、内容…」）。
  旁证＝官方 ⌘K 后 `[data-item-id]` 仍 13 ⇒ **不是整屏接管**，是 header 浮层（header 的「打开」标签由 span 变 input）。
- **G1544**＝`/` 菜单：官方**扁平 20 项**（列表／文本样式／…／插入看板集合）；本地是 `role="listbox"` 的**分组带副标题长列表**。过滤后官方直接收面板、本地给「无匹配命令」。

两条都**照实登记、不掩盖**，在矩阵里以「已声明偏差」列承载（severity 0，不参与判定）。

## ★ 三个仪器缺陷（自查发现、已修，写进 `README.md`）

1. **绝对量不可比 ⇒ 旧版三条 spec 全报 differ**。旧版拿 `domLength` 两侧互比（官方 121597 vs 本地 60602）⇒ 恒红。改为比**动作改变量**（delta）＋**文本名册差集**。
2. **观测非原子 ⇒ 采到自相矛盾的记录**。旧版把 fingerprint/textNodes/state/blocks 拆成多次 `page.evaluate`，两次调用之间页面还能渲染。实测：`counts.插入=0` 而同一份 `textNodes` 里有 4 条「插入…」；同一交互 smoke-01 记 4、smoke-02 记 0。⇒ 改 `captureAll` 一次求值取回全部面。
3. **官方软删从没真正跑过**。官方 URL 是 `/editor/d/<spaceId>/<docId>?s=<sig>`、不是 `/documents/<id>`，旧版只有一条正则 ⇒ 官方侧恒 `id=null`。同类第二坑＝本地侧栏行是 `<button>`（无 id 属性）、新文档标题空串、占位「无标题文档」多行共用 ⇒ 定位不到。⇒ 建完即写唯一标题 `QODER-ILAB-<specId>`。

## 对照实验（differ 不是恒绿）

`node docs/craft-ref/interaction-lab/exp-differ.mjs`

| 扰动 | 判定 |
| --- | --- |
| 原样 | `match` |
| 块名册 `BBBB`→`BXBB` | `differ` (`blocks`) |
| `counts.BBBB` 1→2 | `differ` (`countΔ:BBBB`) |
| `anchorOffset` 0→3 | `differ` (`selection:anchorOffset`) |
| 步数 7→6 | `uncomparable` (`precondition`) |
| 注入假 error | `uncomparable` (`precondition`) |
| 逐字还原 | `match` |

## 未做（不粉饰）

- `observe: ['a11y','animation','db']` 三档**未实现**（本批只落 dom/text/state/selection/blocks/attrs/computed/screenshot）。
- Wave 1—7 **未开工**。
- `scripts/seed-test-user.mjs` 是**上一手留下的未跟踪文件**（不是我建的），未处理。
