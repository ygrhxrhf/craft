# 官方字符串表面向的功能目录（Craft 命令注册表 189 条（index bundle 英文兜底表））

> 由 `render-catalog.mjs` 从产品自己的本地化文件自动生成，共 189 条（剔除 无）。
> 这是**功能候选清单**，不是行为事实：每条只证明"产品里有这个概念/入口/文案"，触发方式与效果要按 SKILL.md Step 3 单独验证。
> 命名：`中文值 | 键 | 英文兜底`。英文兜底缺失时留空。

> ⚠⚠⚠ **本册的「英文兜底」列不是逐字面——那一族的字节在源头就坏了**（第 173 批收尾段现算，2026-10-09 机器钟 02:1x）
> ① 损坏证据（字节级、不是显示级）＝`_harvest/js/index-DiTmKH3z.js` 偏移 **260596** 处 `Set Deadline to Date` 之后逐字节＝`e9 88 a5 ef bf bd 22`＝官方原形应是 `e2 80 a6`（U+2026 `…`）＝⇒ 整 `js/` 目录（105 枚 chunk／26,856,028 字节）里 **U+FFFD 计 12150 处**、「`鈥`」形 **1463 处**、而**干净的弯标点只剩 4 处**（`…` 1／`’` 3／`–` 0）＝⇒ 这是 UTF-8 被当 cp936/GBK 解后再存回的形状，**信息在落盘那一步就丢了**：换 `utf8` 重读得到的是同一批坏字节、恢复不了
> ② 本册受影响的行数＝**24 行**（现算＝`grep -c 鈥 commands-catalog.md`＝24）＝典型形状＝`Set Deadline to Date鈥`、`Add Content鈥`、`Custom鈥`、`Change Deadline鈥`＝☆ 这些格**照原样留着不涂改**（涂改＝伪造官方文案）＝但引用时必须按"损坏形状"处理，不得当官方逐字
> ③ **中文列不受影响、可作逐字出处**＝它取自 `_harvest/zh-Hans.json`（另一条下载通路）＝现算＝该文件 220,210 字节里 **U+FFFD 0 处**、「`鈥`」0 处、干净弯标点 105 处＝⇒ 语言包那一面是干净的，坏的只有 bundle 内联表那一面（这条正面控制历批没做过）
> ④ 表头那句"由 `render-catalog.mjs` 自动生成"**在盘上不成立**＝现扫 7 枚 worktree（`git worktree list` 全集、maxdepth 6）＝`render-catalog*` 零命中＝⇒ 本册与 `feature-catalog.md` 实际处于**手维护**状态：改它不会自动重生成、也不会有人替你重生成；要恢复生成通路得先重写取表脚本（＝新仪器＝等点名）
> ☆ 判据（落成一条硬规矩）＝**逐字出处要先问"这一族的字节从哪个文件来"**：`zh-Hans.json` 系（中文）可用；`js/` bundle 系（英文兜底、以及一切带 `… ’ “ ” – —` 的英文串）不可用，只能取其中纯 ASCII 的窗口（本线落盘脚本 `snip()` 已按此断言＝窗口含非 ASCII 即 ABORT）＝见 `internals.md` §一百零三③ 与 §一百零五③

| 分组 | 条数 | 内容 |
|---|---|---|
| `commands.insert` | 22 | Insert After、Insert Before、Insert Block Above、Insert Block Below、Insert File、Image from Unsplash… |
| `commands.task` | 13 | Set Deadline、Clear Deadline、Set Deadline to Date鈥�、Set Deadline to Tomorrow、Set Deadline to Next Monday、Set Deadline to Today… |
| `commands.move` | 11 | Move blocks down、Move Selected Blocks、Move blocks up、Move to Bottom、Move Down、Move Space… |
| `commands.open` | 10 | Open AI Assistant、Open/Close Toggle、Open in Folder、Open Link in New Tab、Open in New Tab、Open in New Window… |
| `commands.add` | 9 | Add Column、Add Column(s) Before、Add Content、Add Content鈥�、Add Content Inside This Block、Add Reminder… |
| `commands.reminder` | 9 | In 1 hour、In 20 minutes、In 3 hours、Custom鈥�、Mark Reminder as Resolved、Next week… |
| `commands.new` | 6 | New Folder、Create New Folder、Create New Subfolder、New Space、Create New Space、New Window |
| `commands.shortcuts` | 6 | In Collections、In Find and Replace、In Tables、In Tasks Views、Editing、General |
| `commands.toggle` | 6 | Toggle all toggles、Toggle Focus Mode、Toggle Left Sidebar、Toggle sidebar、Toggle Sidebar Visibility、Toggle sidebar visibility 鈥� [0] |
| `commands.edit` | 5 | Edit Page Block、Edit Text Block、Edit Folder鈥�、Edit Reminder、Edit Selection |
| `commands.navigate` | 5 | Navigate、Navigate Back、Navigate Forward、Navigate Into、Navigate Out |
| `commands.help` | 4 | Report Sync、Report Sync Error、Web sync error reporting、Windows sync error reporting |
| `commands.reload` | 4 | Reload、Reload App、Reload Document、Reload Whiteboard |
| `commands.select` | 4 | Select Days of the Month、Select Days of the Week、Select to Bottom、Select to Top |
| `commands.at` | 3 | At cursor、At the bottom、At the top |
| `commands.copy` | 3 | Copy Link、Copy Link to Block、Copy of [0] |
| `commands.create` | 3 | Create Reminder、Create Subfolder、Create a new window |
| `commands.delete` | 3 | Permanently Delete Document、Permanently Delete Document、Delete [0] |
| `commands.mobile` | 3 | Layout、React、Remind |
| `commands.turn` | 3 | Turn into a Collection、The selected block could not be turned into a Collection、Some of the blocks could not be turned into Collections |
| `commands.block` | 2 | Blocks to bottom、Blocks to top |
| `commands.blocklink` | 2 | Frequently Used、People |
| `commands.change` | 2 | Change Deadline鈥�、Change Schedule鈥� |
| `commands.comment` | 2 | Add Comment、Add or View Comments |
| `commands.date` | 2 | Date & Time、Now |
| `commands.group` | 2 | Group、Group & Ungroup |
| `commands.remind` | 2 | Remind me、Remind Me鈥� |
| `commands.restore` | 2 | Restore、Restore Document |
| `commands.selection` | 2 | Check Selected、Uncheck Selected |
| `commands.show` | 2 | Show Daily Notes、Show key shortcuts |
| `commands.clear` | 1 | Clear History |
| `commands.command` | 1 | Command Menu |
| `commands.commands` | 1 | Search for pages to mention |
| `commands.deselect` | 1 | Deselect All |
| `commands.duplicating` | 1 | Duplicating [0] |
| `commands.empty` | 1 | Empty Recently Deleted |
| `commands.enable` | 1 | Enable Focus Mode |
| `commands.export` | 1 | Export Home as鈥� |
| `commands.focus` | 1 | Focus Mode |
| `commands.folder` | 1 | Folder Settings |

## commands.add  (9)

- Add Column  `commands.add.column`
- Add Column(s) Before  `commands.add.columns.before`
- Add Content  `commands.add.content`
- Add Content鈥�  `commands.add.content.3dot`
- Add Content Inside This Block  `commands.add.content.desc`
- Add Reminder  `commands.add.reminder`
- Add Row  `commands.add.row`
- Add Row(s) Before  `commands.add.rows.before`
- Add to Dictionary  `commands.add.to.dictionary`

## commands.at  (3)

- At cursor  `commands.at.cursor`
- At the bottom  `commands.at.the.bottom`
- At the top  `commands.at.the.top`

## commands.block  (2)

- Blocks to bottom  `commands.block.to.bottom`
- Blocks to top  `commands.block.to.top`

## commands.blocklink  (2)

- Frequently Used  `commands.blocklink.popover.frequently.used`
- People  `commands.blocklink.popover.people`

## commands.change  (2)

- Change Deadline鈥�  `commands.change.deadline.3dot`
- Change Schedule鈥�  `commands.change.schedule.3dot`

## commands.clear  (1)

- Clear History  `commands.clear.history`

## commands.command  (1)

- Command Menu  `commands.command.menu`

## commands.commands  (1)

- Search for pages to mention  `commands.commands.mention.placeholder`

## commands.comment  (2)

- Add Comment  `commands.comment.add`
- Add or View Comments  `commands.comment.view.add`

## commands.copy  (3)

- Copy Link  `commands.copy.link`
- Copy Link to Block  `commands.copy.link.to.this.block`
- Copy of [0]  `commands.copy.of`

## commands.create  (3)

- Create Reminder  `commands.create.reminder`
- Create Subfolder  `commands.create.subfolder`
- Create a new window  `commands.create.window`

## commands.date  (2)

- Date & Time  `commands.date.and.time`
- Now  `commands.date.time.now`

## commands.delete  (3)

- Permanently Delete Document  `commands.delete.permanently`
- Permanently Delete Document  `commands.delete.permanently.document`
- Delete [0]  `commands.delete.x`

## commands.deselect  (1)

- Deselect All  `commands.deselect.all`

## commands.duplicating  (1)

- Duplicating [0]  `commands.duplicating.document`

## commands.edit  (5)

- Edit Page Block  `commands.edit.block.page`
- Edit Text Block  `commands.edit.block.text`
- Edit Folder鈥�  `commands.edit.folder`
- Edit Reminder  `commands.edit.reminder`
- Edit Selection  `commands.edit.selection`

## commands.empty  (1)

- Empty Recently Deleted  `commands.empty.trash`

## commands.enable  (1)

- Enable Focus Mode  `commands.enable.focus.mode`

## commands.export  (1)

- Export Home as鈥�  `commands.export.home.as`

## commands.focus  (1)

- Focus Mode  `commands.focus.mode`

## commands.folder  (1)

- Folder Settings  `commands.folder.settings`

## commands.google  (1)

- Search for 鈥淸0]鈥� on Google  `commands.google.for.x`

## commands.group  (2)

- Group  `commands.group`
- Group & Ungroup  `commands.group.and.ungroup`

## commands.help  (4)

- Report Sync  `commands.help.report.sync`
- Report Sync Error  `commands.help.report.sync.error`
- Web sync error reporting  `commands.help.report.web.sync.error`
- Windows sync error reporting  `commands.help.report.windows.sync.error`

## commands.image  (1)

- Copy Image  `commands.image.copy`

## commands.insert  (22)

- Insert After  `commands.insert.after`
- Insert Before  `commands.insert.before`
- Insert Block Above  `commands.insert.block.above`
- Insert Block Below  `commands.insert.block.below`
- Insert File  `commands.insert.image.files`
- Image from Unsplash  `commands.insert.image.unsplash`
- Insert Separator  `commands.insert.line`
- Separator 鈥� Extralight  `commands.insert.line.extralight`
- Separator 鈥� Light  `commands.insert.line.light`
- Separator 鈥� Regular  `commands.insert.line.regular`
- Separator 鈥� Strong  `commands.insert.line.strong`
- Insert New Block  `commands.insert.new.block`
- Insert New Block Above  `commands.insert.new.block.above`
- Insert New Block Below  `commands.insert.new.block.below`
- Insert Snippet  `commands.insert.snippet`
- Insert Code Block  `commands.insert.snippet.code`
- Insert TeX Formula  `commands.insert.snippet.formula`
- Mermaid Diagram  `commands.insert.snippet.mermaid`
- Insert Plaintext Snippet  `commands.insert.snippet.text`
- Insert Table  `commands.insert.table`
- Insert from Template  `commands.insert.template.inline`
- Insert Whiteboard  `commands.insert.whiteboard`

## commands.inspect  (1)

- Inspect Element  `commands.inspect.element`

## commands.jump  (1)

- Jump to  `commands.jump`

## commands.mark  (1)

- Mark as Resolved  `commands.mark.as.resolved`

## commands.mobile  (3)

- Layout  `commands.mobile.layout`
- React  `commands.mobile.react`
- Remind  `commands.mobile.remind`

## commands.move  (11)

- Move blocks down  `commands.move.blocks.down`
- Move Selected Blocks  `commands.move.blocks.selection`
- Move blocks up  `commands.move.blocks.up`
- Move to Bottom  `commands.move.bottom`
- Move Down  `commands.move.down`
- Move Space  `commands.move.space`
- Move [0] Space to  `commands.move.space.to`
- Move to  `commands.move.to`
- Moved to all documents  `commands.move.to.all.docs`
- Move to Top  `commands.move.top`
- Move Up  `commands.move.up`

## commands.navigate  (5)

- Navigate  `commands.navigate`
- Navigate Back  `commands.navigate.back`
- Navigate Forward  `commands.navigate.forward`
- Navigate Into  `commands.navigate.into`
- Navigate Out  `commands.navigate.out`

## commands.navigation  (1)

- Navigation  `commands.navigation`

## commands.new  (6)

- New Folder  `commands.new.folder`
- Create New Folder  `commands.new.folder.create`
- Create New Subfolder  `commands.new.folder.sub.create`
- New Space  `commands.new.space`
- Create New Space  `commands.new.space.create`
- New Window  `commands.new.window`

## commands.open  (10)

- Open AI Assistant  `commands.open.ai.assistant`
- Open/Close Toggle  `commands.open.close.toggle`
- Open in Folder  `commands.open.in.folder`
- Open Link in New Tab  `commands.open.link.new.tab`
- Open in New Tab  `commands.open.newtab`
- Open in New Window  `commands.open.newwindow`
- Open Settings  `commands.open.settings`
- See All Keyboard Shortcuts  `commands.open.shortcuts`
- Open Slash Menu  `commands.open.slash.menu`
- Open Whiteboard  `commands.open.whiteboard`

## commands.page  (1)

- Page Break  `commands.page.break`

## commands.pin  (1)

- Pin  `commands.pin`

## commands.press  (1)

- Press Enter  `commands.press.enter`

## commands.quick  (1)

- Quick Open  `commands.quick.open`

## commands.reload  (4)

- Reload  `commands.reload`
- Reload App  `commands.reload.app`
- Reload Document  `commands.reload.document`
- Reload Whiteboard  `commands.reload.whiteboard`

## commands.remind  (2)

- Remind me  `commands.remind.me`
- Remind Me鈥�  `commands.remind.me.3.dots`

## commands.reminder  (9)

- In 1 hour  `commands.reminder.1.hour`
- In 20 minutes  `commands.reminder.20.min`
- In 3 hours  `commands.reminder.3.hour`
- Custom鈥�  `commands.reminder.custom`
- Mark Reminder as Resolved  `commands.reminder.mark.resolved`
- Next week  `commands.reminder.next.week`
- Save for Later  `commands.reminder.save.for.later`
- Show In Progress Reminders  `commands.reminder.show.in.progress`
- Show Resolved Reminders  `commands.reminder.show.resolved`

## commands.remove  (1)

- Remove Reminder  `commands.remove.reminder`

## commands.rename  (1)

- Rename Link  `commands.rename.link`

## commands.repeat  (1)

- Repeat鈥�  `commands.repeat`

## commands.request  (1)

- Request Access  `commands.request.access`

## commands.reschedule  (1)

- Reschedule  `commands.reschedule`

## commands.restart  (1)

- Restart app  `commands.restart.app`

## commands.restore  (2)

- Restore  `commands.restore`
- Restore Document  `commands.restore.document`

## commands.restoring  (1)

- Restoring document  `commands.restoring.document`

## commands.search  (1)

- Find in Page  `commands.search.inpage`

## commands.select  (4)

- Select Days of the Month  `commands.select.days.of.the.month`
- Select Days of the Week  `commands.select.days.of.the.week`
- Select to Bottom  `commands.select.to.bottom`
- Select to Top  `commands.select.to.top`

## commands.selection  (2)

- Check Selected  `commands.selection.complete`
- Uncheck Selected  `commands.selection.uncomplete`

## commands.send  (1)

- Send  `commands.send`

## commands.shortcuts  (6)

- In Collections  `commands.shortcuts.in.collections`
- In Find and Replace  `commands.shortcuts.in.find.and.replace`
- In Tables  `commands.shortcuts.in.tables`
- In Tasks Views  `commands.shortcuts.in.tasks.views`
- Editing  `commands.shortcuts.keyboard.editing`
- General  `commands.shortcuts.keyboard.general`

## commands.show  (2)

- Show Daily Notes  `commands.show.daily.notes`
- Show key shortcuts  `commands.show.key.shortcuts`

## commands.sort  (1)

- Sort  `commands.sort`

## commands.spelling  (1)

- Suggestions  `commands.spelling.suggestions`

## commands.submit  (1)

- Submit  `commands.submit`

## commands.task  (13)

- Set Deadline  `commands.task.deadline`
- Clear Deadline  `commands.task.deadline.clear`
- Set Deadline to Date鈥�  `commands.task.deadline.date`
- Set Deadline to Tomorrow  `commands.task.deadline.for.tomorrow`
- Set Deadline to Next Monday  `commands.task.deadline.next.monday`
- Set Deadline to Today  `commands.task.deadline.today`
- Schedule Task  `commands.task.schedule`
- Clear Schedule  `commands.task.schedule.clear`
- Schedule for Date鈥�  `commands.task.schedule.date`
- Schedule for Today  `commands.task.schedule.for.today`
- Schedule for Tomorrow  `commands.task.schedule.for.tomorrow`
- Schedule for Next Monday  `commands.task.schedule.next.monday`
- Schedule for [0]  `commands.task.schedule.x`

## commands.templates  (1)

- Templates  `commands.templates`

## commands.toggle  (6)

- Toggle all toggles  `commands.toggle.all.toggles`
- Toggle Focus Mode  `commands.toggle.focus.mode`
- Toggle Left Sidebar  `commands.toggle.left.sidebar`
- Toggle sidebar  `commands.toggle.sidebar`
- Toggle Sidebar Visibility  `commands.toggle.sidebar.visibility`
- Toggle sidebar visibility 鈥� [0]  `commands.toggle.sidebar.visibility.tooltip`

## commands.turn  (3)

- Turn into a Collection  `commands.turn.into.collection`
- The selected block could not be turned into a Collection  `commands.turn.into.collection.block.error`
- Some of the blocks could not be turned into Collections  `commands.turn.into.collection.block.error.plural`

## commands.ungroup  (1)

- Ungroup  `commands.ungroup`

## commands.unpin  (1)

- Unpin  `commands.unpin`

## commands.video  (1)

- Save Video  `commands.video.save`

## commands.view  (1)

- View Backups  `commands.view.backups`

## 仍未采到

本文件是**命令名清单**（i18n `commands.*` 全量分组），只证明"官方有这个命令"，不含：

- 每个命令的**快捷键组合** —— 见 `keyboard.md`（104 项，已从枚举解出）。
- 命令在 UI 里的**入口位置**（菜单/右键/工具条/命令面板）与**灰置条件**（权限档、选区态、只读）。
- 命令的**执行后效与可逆性**（是否进撤销栈、reload 后是否仍在）—— 需按 `_harvest/todo-actions.md` 动态验证。
