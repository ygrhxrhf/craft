import { readFileSync, writeFileSync } from 'node:fs';

const p = 'features.md';
let s = readFileSync(p, 'utf8');

const tail = '第 99 批·尾记〔★★★ **用户点头后执行了那 12 条具名沙盒的永久清除＝本目录第一次跑通"精确范围破坏"**（全选 → **反选 3 条无标题** → 闸门读回"选中集标题前缀"＝`namedChosen:12／untitledChosen:0` → `variantPlainDanger` 按钮 → 确认框「删除 12 个项目 你确定吗？你无法撤销此操作。」→ 五判据复核：`trash` 3／`unsorted` 3 逐 id 未动／`reminders` 0／`search QODER-HARVEST` 无命中／**硬重载屏**只剩 3 张「无标题文档」）＋ ★★★ **永久删除连带抹掉任务行＝`tasks list --scope all` 14 → 9**（与 G671"软删保留行"＋ G934"UI 不显示"合成三态完整对照）＋ ★★★ **一条给既有铁律加例外的判据门槛＝破坏性动作之后禁用"指纹没变⇒换通路重试"**（确认框零 ARIA ⇒ `role=dialog`／卡片数／「已选 N 项」三指纹同时"没变"，唯一信号是新增文案；此处判废重试＝二次触发不可逆动作）＋ ★★ **一屏四套 CSS Module hash 族并存**（`1j891` 菜单项／`16nf6` 浮层壳／`1bml7` DS 按钮含 `variantPlainDanger`／`1fgll` 复选框）＋ ★★ **三处"坐标在同一次操作内自己动"**（全选框 mixed→true 时 x 822→815／滚动后卡片复选框 y 变／确认框按钮 rect 需重取）＋ ★ **一条主动放弃的采集项**＝确认框按钮 class 族（屏上只剩非授权项 ⇒ 误点代价不可逆，宁可不采，登记在未采到） ⇒ **G1000–G1008、V93、internals §三十七、longtail §二十三**；★ **`manifest.jsonl` 本段追加 1 条 `kind:"purge"`＝133 → 134 行**（本段是写入批、且不可逆，与上一段"零写入不追加"口径分别写清）〕＋ ';

const jobs = [
  ['`gap.md` **991 条（最大 G999）**', '`gap.md` **1000 条（最大 G1008）**'],
  ['第 1–99 批批次日志（第 99 批〔', '第 1–99 批批次日志（' + tail + '第 99 批〔'],
];

for (const [a, b] of jobs) {
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS n=' + n + ' :: ' + a.slice(0, 34));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST FAIL');
    process.exit(1);
  }
}

writeFileSync(p, s);
console.log('OK features.md: 1000=' + s.includes('**1000 条（最大 G1008）**') + ' tail clause=' + s.includes('第 99 批·尾记〔'));
