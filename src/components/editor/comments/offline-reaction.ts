/**
 * Reactions are refused while offline (G36), and the refusal names which way the click would have
 * gone: adding one and taking one back are different sentences.
 */
export const OFFLINE_ADD_REACTION = '离线状态下无法添加表情';
export const OFFLINE_REMOVE_REACTION = '离线状态下无法移除表情';

export function offlineReactionMessage(alreadyReacted: boolean): string {
  return alreadyReacted ? OFFLINE_REMOVE_REACTION : OFFLINE_ADD_REACTION;
}
