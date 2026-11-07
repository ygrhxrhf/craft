/**
 * G1446 —— 收藏／取消收藏的**同一条反馈**：一枚 toast ＋ 一枚埋点。
 *
 * 官方是 `flashMessage({type:"info", title:i(o?"starred":"unstarred"), subTitle:r}, 1500, s)`
 * 跟一条 `logEvent`，四件可读：
 *   1. toast 档是 **`info`**（不是成功绿勾）——收藏不是"操作成功"，只是状态换了一面；
 *   2. 标题走**成对文案**，按切换后的状态取词；
 *   3. 副标题位可空——本地没有副标题，所以这一档不填；
 *   4. 时长 **1500 毫秒**，比默认 toast 短，因为这是一次轻量的状态回显。
 *
 * 埋在 `components/ui` 而不是收藏写路径里，是因为写路径 `lib/favorite/toggle-local` 是
 * 纯数据层（离线队列），不该知道 toast 长什么样；菜单、卡片网格、信息面板各自把结果交给
 * 这里，文案只此一份。
 */
import { toast } from './toast';

/** 官方 `flashMessage(..., 1500, s)` 的时长参数。 */
export const FAVORITE_FEEDBACK_DURATION_MS = 1500;

/** 收藏反馈的成对文案：切换后的状态 ⇒ 标题。 */
export const FAVORITE_FEEDBACK_TITLES = {
  starred: '已收藏',
  unstarred: '未收藏',
} as const;

export interface FavoriteFeedback {
  type: 'info';
  title: string;
  /** `subTitle:r` 在本地恒为空，所以这一档没有 subtitle 字段。 */
  timeout: number;
}

/** 纯核：给定切换后的状态，产出那一枚 toast 的完整载荷（可单测，不碰 DOM）。 */
export function favoriteFeedback(favored: boolean): FavoriteFeedback {
  return {
    type: 'info',
    title: favored ? FAVORITE_FEEDBACK_TITLES.starred : FAVORITE_FEEDBACK_TITLES.unstarred,
    timeout: FAVORITE_FEEDBACK_DURATION_MS,
  };
}

/** 把那一枚 toast 真的发出去；返回载荷，调用方可以据此埋点。 */
export function showFavoriteFeedback(favored: boolean): FavoriteFeedback {
  const feedback = favoriteFeedback(favored);
  toast.add({ type: feedback.type, title: feedback.title, timeout: feedback.timeout });
  return feedback;
}