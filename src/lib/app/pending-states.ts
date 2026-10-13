/**
 * The asynchronous pending states (G300). Eleven progress sentences, one per long-running action.
 * Two are easy to forget because the action does not look slow: exporting a document and updating
 * a space's avatar both get their own loading line.
 *
 * The keys are the collected ones; note the two pairs that differ only by number — document /
 * documents, invite / invites — so the plural is not an accident of phrasing.
 */
import type { InterpolationKind } from '@/lib/i18n/interpolation';

export type PendingAction =
  | 'creatingDocuments'
  | 'creatingFolders'
  | 'creatingLink'
  | 'deletingAccount'
  | 'deletingDocument'
  | 'deletingDocuments'
  | 'deletingInvite'
  | 'deletingInvites'
  | 'exportingDocuments'
  | 'updatingSpaceAvatar'
  | 'updatingUser';

export interface PendingState {
  label: string;
  key: string;
}

export const PENDING_STATES: Record<PendingAction, PendingState> = {
  creatingDocuments: { label: '正在创建文档', key: 'alert.creating.documents' },
  creatingFolders: { label: '正在创建文件夹', key: 'alert.creating.folders' },
  creatingLink: { label: '正在创建链接', key: 'alert.creating.link' },
  deletingAccount: { label: '正在删除帐户…', key: 'alert.deleting.account' },
  deletingDocument: { label: '正在删除文档', key: 'alert.deleting.document' },
  deletingDocuments: { label: '正在删除文档…', key: 'alert.deleting.documents' },
  deletingInvite: { label: '正在删除邀请…', key: 'alert.deleting.invite' },
  deletingInvites: { label: '正在删除邀请…', key: 'alert.deleting.invites' },
  exportingDocuments: { label: '正在导出文档', key: 'alert.exporting.documents' },
  updatingSpaceAvatar: { label: '正在更新空间头像', key: 'alert.updating.space.avatar' },
  updatingUser: { label: '正在更新用户…', key: 'alert.updating.user' },
};

/** Every action's sentence. */
export function allPendingLabels(): string[] {
  return Object.values(PENDING_STATES).map((state) => state.label);
}

/** The label for one action. */
export function pendingLabel(action: PendingAction): string {
  return PENDING_STATES[action].label;
}

/**
 * Whether a label is one of the collected sentences. A caller building a progress line should not
 * invent a twelfth wording — an uncollected string would read as local copy on screen.
 */
export function isCollectedPendingLabel(label: string): boolean {
  return allPendingLabels().includes(label);
}

/** The interpolation conventions any of these sentences uses — positional, none. */
export function pendingInterpolations(): InterpolationKind[] {
  return [];
}
