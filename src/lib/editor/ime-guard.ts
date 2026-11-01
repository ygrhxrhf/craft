/**
 * G490 —— IME 组合中（`keyCode === 229`）**跳过整条键盘分发**（`keyboard.md` §十四 2 条 1）。
 *
 * 中文/日文输入法候选词未上屏时，浏览器把按键派发成 `keyCode 229`（`key` 常是 `"Process"`）。
 * 官方那支在分发器入口就 `return`，于是**候选期间的 Esc／Enter 不会**被当成"关弹层／提交单元格／
 * 新建块"——那是输入法自己在消化这两个键。本地此前全仓零守卫（`grep isComposing|keyCode === 229`
 * 无命中），候选期间按 Esc 会同时关掉弹层、按 Enter 会新建块，与官方行为相反。
 *
 * 判据取**两条任一**：`isComposing` 为真（标准）或 `keyCode === 229`（旧浏览器与部分 IME 只给这个）。
 * 后者是官方那支的原始判据，前者是它的标准等价物；两者都认才挡得住全部输入法。
 */
export function isImeComposing(event: {
  isComposing?: boolean;
  keyCode?: number;
  key?: string;
}): boolean {
  if (event.isComposing === true) return true;
  if (event.keyCode === 229) return true;
  // Some engines report the synthetic key without either flag.
  return event.key === 'Process';
}
