/**
 * G123 — the local AI history is cleared behind a "cannot be undone" step.
 *
 * Official: `commands.clear.history`「清除历史」 is the action; both ways out of the conversation
 * surface carry an undo warning — `commands.clear.history.desc`「你确定要删除[0]的所有对话记录吗？
 * 此操作无法撤销。」 for the whole history and `assistant.delete.conversation.desc`「你确定要删除此
 * 对话吗？此操作无法撤销。」 for one conversation. This build keeps one local history and no
 * conversation list, so it uses the bare official warning `alert.warning.delete`
 * 「你确定吗？此操作无法撤销。」 — the `[0]` slot in the history sentence is a space name the panel
 * does not have at hand.
 */

export const CLEAR_HISTORY_LABEL = '清除历史';
export const CLEAR_HISTORY_KEY = 'commands.clear.history';

export const CLEAR_HISTORY_CONFIRM = '你确定吗？此操作无法撤销。';
export const CLEAR_HISTORY_CONFIRM_KEY = 'alert.warning.delete';