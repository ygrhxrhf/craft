/**
 * G1414：反馈弹窗全族。官方中文语言包里这一族正好 **13 条键**（`feedback.*`），逐字抄在
 * `FEEDBACK_KEYS` 里；另有两条来自屏上读数而非这一族：输入框占位「主题」与主按钮「意见反馈」
 * （后者与 G1415 的 `preferences.send.feedback` 同一句）。
 *
 * 屏上真值（第 416 批）：标题「你对 Craft 有什么感想？」＋副标「选择你喜欢的（可多选）」＋
 * 两行共 10 枚 emoji（第一行 😠😕😐😄🤩、第二行 ✌️🎉🤯🔥🚀）＋提示「每一条反馈都很重要！」＋
 * 「主题」输入框＋「告诉我们你喜欢什么或不喜欢什么……」多行框＋主按钮「意见反馈」（**初始为禁用
 * 的浅蓝**）＋右上 ×；登录态下**没有**「邮箱」栏（`feedback.email.optional` 只在匿名用户下渲染）。
 * 形态：`popup-backdrop=1` 而 `role=dialog=0` ⇒ 自绘遮罩，不给 overlay 加 role=dialog。
 *
 * 提交落点：官方那条是桌面壳的网络通路，本地没有采集端、也没有邮件基建 ⇒ 弹窗止于感谢屏，
 * **不发明网络目标**（见 ledger G1414 note）。
 */

export const FEEDBACK_KEYS = {
  'feedback.email.optional': '电子邮件（可选）',
  'feedback.feel.about.craft': '你对 Craft 有什么感想？',
  'feedback.form.subtitle': '选择你喜欢的（可多选）',
  'feedback.input.like.or.not': '告诉我们你喜欢什么或不喜欢什么……',
  'feedback.input.subtitle': '每一条反馈都很重要！',
  'feedback.join.the.community':
    '加入 Craft 社区，了解最新的功能、技巧和窍门，甚至可能影响我们的路线图！',
  'feedback.rate.craft': '评价 Craft',
  'feedback.rate.in.store': '你介意花几秒钟在商店中为 Craft 评分吗？',
  'feedback.table.missing.function': '缺少功能？告诉我们！',
  'feedback.thanks.secondarybutton': '以后再说',
  'feedback.thanks.subtitle': '我们期待了解更多',
  'feedback.thanks.support': '感谢你的支持！',
  'feedback.thanks.title': '谢谢！',
} as const;

export type FeedbackKey = keyof typeof FEEDBACK_KEYS;

/** 屏上逐字读数（非语言包键）：主题占位与主按钮。 */
export const FEEDBACK_SUBJECT_PLACEHOLDER = '主题';
export const FEEDBACK_SUBMIT_LABEL = '意见反馈';

/** 两行 emoji，顺序即屏上顺序（第一行 5 枚、第二行 5 枚，共 10 枚）。 */
export const FEEDBACK_EMOJI_ROWS: readonly (readonly string[])[] = [
  ['😠', '😕', '😐', '😄', '🤩'],
  ['✌️', '🎉', '🤯', '🔥', '🚀'],
];

export const FEEDBACK_EMOJI: readonly string[] = FEEDBACK_EMOJI_ROWS.flat();

/** 「以后再说」是感谢屏上的次要按钮，也是评分引导的退出口（同一句键）。 */
export const FEEDBACK_THANKS_LATER = FEEDBACK_KEYS['feedback.thanks.secondarybutton'];

export interface FeedbackDraft {
  moods: readonly string[];
  subject: string;
  message: string;
}

/**
 * 主按钮是否可点。屏上只读到「初始为禁用态的浅蓝」，可点条件未采 ⇒ 本地的推论（已记台账）：
 * 任一枚 emoji 被选中，或主题/正文里有非空白内容，即认为用户表达了东西。
 */
export function canSubmitFeedback(draft: FeedbackDraft): boolean {
  return draft.moods.length > 0 || draft.subject.trim() !== '' || draft.message.trim() !== '';
}

/**
 * 「邮箱」这一格只在匿名用户下渲染（官方 `isAnonymousUser` 门）。本地所有请求都带登录态，
 * 因此默认不渲染；仍按纯函数保留开关，便于回归与以后接入匿名会话。
 */
export function showFeedbackEmail(anonymous: boolean): boolean {
  return anonymous;
}

/** 官方桌面桥：`window.topApi.rateAppInStore()`（index@1300803）。商店评分交给桌面壳。 */
export interface RateAppHost {
  rateAppInStore?: () => unknown;
}

declare global {
  interface Window {
    topApi?: RateAppHost;
  }
}

export interface RateAppOutcome {
  /** 是否有宿主可调。 */
  hosted: boolean;
  /** 是否真的调用了宿主动作。 */
  invoked: boolean;
}

/**
 * 调宿主的商店评分。没有 `topApi.rateAppInStore` 时**不假装成功**：`hosted=false`，
 * 评分引导在本地即不可达（不渲染入口），而不是留一枚 inert 按钮。
 */
export function rateAppInStore(host?: RateAppHost | null): RateAppOutcome {
  const resolved =
    host ?? (typeof window !== 'undefined' ? (window.topApi ?? null) : null);
  if (!resolved || typeof resolved.rateAppInStore !== 'function') {
    return { hosted: false, invoked: false };
  }
  resolved.rateAppInStore();
  return { hosted: true, invoked: true };
}

/** 这个运行时此刻能否把评分交给桌面壳 —— 决定评分引导是否作为可达入口出现。 */
export function storeRatingAvailable(host?: RateAppHost | null): boolean {
  const resolved =
    host ?? (typeof window !== 'undefined' ? (window.topApi ?? null) : null);
  return Boolean(resolved && typeof resolved.rateAppInStore === 'function');
}
