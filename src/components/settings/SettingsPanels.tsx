'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import {
  Camera,
  ChevronRight,
  Pencil,
  SquarePlus,
} from 'lucide-react';
import { getPreferences, updatePreferences } from '@/actions/user/preferences';
import { APP_VERSION } from '@/lib/app/app-version';
import { NOTIFICATION_EVENTS, EMAIL_PER_SPACE_DESC } from '@/lib/app/notification-settings';
import {
  getSpaceEmailNotification,
  setSpaceEmailNotification,
  type SpaceEmailNotification,
} from '@/actions/space/space-notifications';
import type { Preferences } from '@/actions/user/preferences';
import { logout } from '@/actions/user/profile';
import { getSyncManager } from '@/lib/sync-core';
import { uploadFile } from '@/lib/upload-client';
import { promptDialog, confirmDialog } from '@/lib/dialog/show';
import { ACCENTS as ACCENT_KEYS, pickAccent, readAccent, type Accent } from '@/lib/accent';
import { Switch } from '@/components/ui/switch';
import { RichText } from '@/components/ui/rich-text';
import { loggedInAsText } from '@/lib/i18n/account-copy';
import { SCOPE_COPY } from '@/lib/app/settings-scope';
import { SPACE_ICON_PRESETS, spaceIconPreset } from '@/lib/app/space-icons';
import {
  changeTeamRole,
  createTeam,
  declareDomain,
  disconnectDomain,
  getDomainContext,
  getSpaceContext,
  getTeamContext,
  guestWarningFor,
  inviteSpaceMember,
  resolveDomainVerification,
  setSpaceIcon,
  setSpaceName,
  type DomainContext,
  type SpaceSummary,
  type TeamSummary,
} from '@/actions/space/space';
// G187：邀请去重的三句与判据是纯文案/纯判据，放在 lib 里（`'use server'` 文件不能导出它们）。
import {
  INVITE_ALREADY_MEMBER,
  INVITE_ALREADY_MEMBER_SUBTITLE,
  INVITE_ALREADY_MEMBER_TITLE,
} from '@/lib/share/invite-duplicate';
import { GUEST_WARNING_CONFIRM, GUEST_WARNING_DESC } from '@/lib/share/guest-warning';
import { MANAGE_PINNED, PINNED_LIMIT_REACHED, PINNED_TAG_LIMIT, PIN_KEY_TAGS_HINT } from '@/lib/browse/pinned-tags';
import {
  TAGS_KEEP_ON,
  TAGS_OFF_CONFIRM,
  TAGS_OFF_CONFIRM_DESC,
  TAGS_OFF_CONFIRM_TITLE,
  TAGS_SAVE_ERROR,
  TAGS_SCOPE_NOTE,
  USE_TAGS_LABEL,
  readTagsHiddenNow,
  serverTagsHidden,
  shouldConfirmTagTurnOff,
  subscribeTagsVisibility,
  writeTagsHidden,
} from '@/lib/browse/tag-visibility';
import { getTags } from '@/actions/tag/tag';
import {
  addIgnoreRule,
  deleteIgnoreRule,
  getIgnoreOverview,
  renameIgnoreRule,
  type IgnoreRule,
} from '@/actions/tag/ignore-rules';
import {
  ADD_RULE_LABEL,
  IGNORE_LIST_DESC,
  IGNORE_LIST_TITLE,
  TEXT_TO_IGNORE,
  deleteRuleMessage,
  ignoredByRuleLabel,
} from '@/lib/tag/ignore-copy';
import { toast } from '@/components/ui/toast';
import {
  DISCONNECT_CONFIRM,
  DISCONNECT_DESC,
  DNS_RECORD_TABLE,
} from '@/lib/share/domain-lifecycle';

/** G183：四态的中文名（面板展示用）。 */
const DOMAIN_STATE_LABELS = {
  unset: '未设置',
  declared: '等待验证',
  verified: '已验证',
  disconnected: '已断开',
} as const;
import type { SettingsSection } from '@/lib/store/use-settings-store';
import { cn } from 'cn';
import {
  COMPLETED_TASK_APPEARANCE_DESC,
  COMPLETED_TASK_APPEARANCE_LABELS,
  COMPLETED_TASK_APPEARANCE_TITLE,
  COMPLETED_TASK_APPEARANCES,
} from '@/lib/task/completed-appearance';
import { ShortcutsPanel } from './ShortcutsPanel';
import { AssistantPanel } from './AssistantPanel';
import {
  RESET_CACHE_ACTION,
  RESET_CACHE_BUSY,
  RESET_CACHE_CONFIRM_MESSAGE,
  RESET_CACHE_DESC,
  RESET_CACHE_DONE,
  RESET_CACHE_FAILED,
  RESET_CACHE_TITLE,
  resetDocumentCache,
} from './reset-cache';
import {
  readShowDailyNotes,
  serverShowDailyNotes,
  storeShowDailyNotes,
  subscribeShowDailyNotes,
} from '@/lib/browse/daily-notes-visibility';

/**
 * G164：账户面板的"进行时+成功+失败"三件套与删除后果句，逐字取自语言包：
 * `preferences.name.updating` / `preferences.name.updated` / `preferences.alert.change.name`
 * `preferences.profile.photo.updated` / `preferences.alert.update.photo`
 * `preferences.account.delete.message`
 */
const NAME_UPDATING = '正在更新名称…';
const NAME_UPDATED = '名称已更新';
const NAME_UPDATE_FAILED = '无法更改名称';
const PROFILE_PHOTO_UPDATED = '个人资料照片已更新';
const IMAGE_UPDATE_FAILED = '无法更新照片';
const DELETE_ACCOUNT_MESSAGE = '删除帐户将永久删除你的所有文档。此操作无法撤消。';

interface PanelProps {
  section: SettingsSection;
  profile: { name: string; email: string; image?: string | null } | null;
  spaceName: string;
}

function RowCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl bg-foreground/4', className)}>{children}</div>;
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-semibold">{children}</h3>;
}

function GroupDesc({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[13px] text-foreground/55">{children}</p>;
}

/**
 * `value` is undefined while the preferences are still loading. A switch has no
 * neutral state, so rendering one then would announce a value the server has not
 * answered yet — the row shows that it is loading instead.
 */
function NotifySwitch({
  value,
  busy = false,
  onChange,
}: {
  value: boolean | undefined;
  busy?: boolean;
  onChange: (next: boolean) => void;
}) {
  if (value === undefined) {
    return <span className="text-[12px] text-foreground/45">载入中…</span>;
  }
  return (
    <Switch
      checked={value}
      disabled={busy}
      onCheckedChange={(next) => onChange(next === true)}
      className="data-checked:bg-(--craft-accent)"
    />
  );
}

function EditIcon() {
  return <Pencil className="size-3.5 shrink-0 text-foreground/45" />;
}

/**
 * G179 —— 空间图标预设表与 `spaceInitial` 挪到 `@/lib/app/space-icons`，侧栏的空间行共用。
 */
function SpaceIcon({
  icon,
  initial,
  className,
}: {
  icon?: string | null;
  initial?: string;
  className?: string;
}) {
  const preset = spaceIconPreset(icon);
  return (
    <div
      className={cn('flex items-center justify-center font-semibold text-white', className)}
      style={{ backgroundImage: `linear-gradient(to bottom right, ${preset.from}, ${preset.to})` }}
    >
      {initial ?? '我'}
    </div>
  );
}

function ThemePreview({ variant }: { variant: 'system' | 'light' | 'dark' }) {
  const light = (
    <div className="flex-1 bg-gradient-to-b from-[#e8c9a0] to-[#cf9f74]">
      <div className="ml-[15%] mt-[12%] h-[76%] w-[70%] rounded-md bg-white p-2">
        <div className="h-1 w-1/2 rounded bg-foreground/25" />
        <div className="mt-1.5 h-1 w-2/3 rounded bg-foreground/15" />
        <div className="mt-1 h-1 w-1/3 rounded bg-[#2e6de9]" />
      </div>
    </div>
  );
  const dark = (
    <div className="flex-1 bg-gradient-to-b from-[#4a5368] to-[#23262e]">
      <div className="ml-[15%] mt-[12%] h-[76%] w-[70%] rounded-md bg-[#1c1c1e] p-2">
        <div className="h-1 w-1/2 rounded bg-white/30" />
        <div className="mt-1.5 h-1 w-2/3 rounded bg-white/15" />
        <div className="mt-1 h-1 w-1/3 rounded bg-[#71b2ff]" />
      </div>
    </div>
  );
  return (
    <div className="flex h-[116px] overflow-hidden rounded-lg">
      {variant === 'light' && light}
      {variant === 'dark' && dark}
      {variant === 'system' && (
        <>
          <div className="flex flex-1">{light}</div>
          <div className="flex flex-1">{dark}</div>
        </>
      )}
    </div>
  );
}

const ACCENT_SWATCH: Record<Accent, string> = {
  blue: '#2e6de9',
  pink: '#d6179b',
  green: '#00c2a6',
  purple: '#5e02d2',
  yellow: '#e4c011',
  gray: '#525c66',
};

type SwitchKey = 'notifyComments' | 'notifyReminders' | 'notifyDaily';

export function SettingsPanel({ section, profile, spaceName }: PanelProps) {
  const { setTheme } = useTheme();
  const { data: session } = useSession();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [accent, setAccent] = useState<Accent>(() => readAccent() ?? 'blue');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.image ?? null);
  const [displayName, setDisplayName] = useState<string | null>(profile?.name ?? null);
  // G300: saving the profile name has its own progress sentence.
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // G163：邮件通知按空间覆盖（每名成员各管自己那枚）。
  const [spaceEmail, setSpaceEmail] = useState<SpaceEmailNotification | null>(null);
  const [savingSpaceEmail, setSavingSpaceEmail] = useState(false);
  const [spaceEmailError, setSpaceEmailError] = useState<string | null>(null);
  // G324/G166：空间与团队实体（本批新落库）。
  const [space, setSpace] = useState<SpaceSummary | null>(null);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  // G179：图标选择器默认收起；保存中禁用、失败落到 spaceError（与改名同一套三件套）。
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [savingIcon, setSavingIcon] = useState(false);
  // G187：邀请命中"已是成员/待处理邀请"时出 title+subtitle 那一块，而不是再弹一句错误。
  const [inviteAlreadyMember, setInviteAlreadyMember] = useState(false);
  // G161：重置文档缓存。
  const [resettingCache, setResettingCache] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  // G161：每日笔记默认显示——与浏览页工具栏「显示每日笔记」同一面本机旗。
  const showDailyNotes = useSyncExternalStore(
    subscribeShowDailyNotes,
    readShowDailyNotes,
    serverShowDailyNotes,
  );
  // G183：自定义域名四态。
  const [domain, setDomain] = useState<DomainContext | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  // G173：固定标签数（管理入口上的引导句/上限句据此切换）。
  const [pinnedCount, setPinnedCount] = useState(0);
  // G171：忽略规则列表与每条规则命中的标签（来源标注）。
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([]);
  const [ignoreMatches, setIgnoreMatches] = useState<Record<string, string[]>>({});
  const [ignoreDraft, setIgnoreDraft] = useState('');
  const [savingIgnore, setSavingIgnore] = useState(false);
  const [ignoreError, setIgnoreError] = useState<string | null>(null);
  // G174：「使用标签」是"隐藏不是删除"——关掉之前先把后果说清楚（官方两句按钮文案）。
  const tagsHidden = useSyncExternalStore(
    subscribeTagsVisibility,
    readTagsHiddenNow,
    serverTagsHidden,
  );
  const [confirmingTagsOff, setConfirmingTagsOff] = useState(false);
  const [tagSwitchError, setTagSwitchError] = useState<string | null>(null);

  useEffect(() => {
    getSpaceContext().then(setSpace).catch(() => setSpace(null));
    getTeamContext().then(setTeam).catch(() => setTeam(null));
    getDomainContext().then(setDomain).catch(() => setDomain(null));
    getTags()
      .then((tags) => setPinnedCount(tags.filter((tag) => tag.pinned).length))
      .catch(() => setPinnedCount(0));
  }, []);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setPrefs(null));
    getSpaceEmailNotification()
      .then(setSpaceEmail)
      .catch(() => setSpaceEmail(null));
    getIgnoreOverview()
      .then(({ rules, matches }) => {
        setIgnoreRules(rules);
        setIgnoreMatches(matches);
      })
      .catch(() => {
        setIgnoreRules([]);
        setIgnoreMatches({});
      });
  }, []);

  // profile 是父组件异步取的（`SettingsModal` 的 useEffect）⇒ 初值那一刻它还是 null。
  // 拿到之后再补一次，否则头像永远停在首字母。渲染期按上一值调整，不在 effect 里同步 setState。
  const profileImage = profile?.image ?? null;
  const profileName = profile?.name ?? null;
  const [syncedProfile, setSyncedProfile] = useState({ image: profileImage, name: profileName });
  if (profileImage !== null && syncedProfile.image !== profileImage) {
    setSyncedProfile((prev) => ({ ...prev, image: profileImage }));
    setAvatarUrl(profileImage);
  }
  if (profileName !== null && syncedProfile.name !== profileName) {
    setSyncedProfile((prev) => ({ ...prev, name: profileName }));
    setDisplayName(profileName);
  }

  const setPref = async (patch: Partial<{
    theme: string;
    editorFont: string;
    editorWidth: string;
    completedTaskAppearance: string;
  }>) => {
    // A click can land before the initial preferences fetch resolves; join it instead of dropping it.
    const base = prefs ?? (await getPreferences().catch(() => null));
    if (!base) return;

    // 偏好（user 表）→ applyLocal；本地已乐观更新，失败（IDB 异常）才回滚。
    // 主题本身随写入一起改：applyLocal 只入队，不再有"服务端未接受"的窗口。
    const next = { ...base, ...patch };
    setPrefs(next);
    if (patch.theme) setTheme(patch.theme);
    const userId = session?.user?.id;
    if (!userId) {
      await updatePreferences(patch).catch(() => setPrefs(base));
      return;
    }
    await getSyncManager()
      .applyLocal({ table: 'user', id: userId, patch: { ...patch } })
      .catch(() => setPrefs(base));
  };

  /**
   * G164 改头像：上传走与编辑器图片同一条通道（`uploadFile`），落库走 `applyLocal(table:'user')`
   * 写 `image`——元数据仍过离线内核，不新开 Server Action。失败给一句、并把乐观值撤回。
   * 三件套：进行时＝按钮禁用＋spinner，成功＝`preferences.profile.photo.updated`，
   * 失败＝`preferences.alert.update.photo`（两句逐字）。
   */
  const changeAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSwitchError('仅支持图片文件');
      return;
    }
    const userId = session?.user?.id;
    if (!userId) return;
    const previous = avatarUrl;
    setUploadingAvatar(true);
    setSwitchError(null);
    try {
      const { url } = await uploadFile(file);
      setAvatarUrl(url);
      await getSyncManager().applyLocal({ table: 'user', id: userId, patch: { image: url } });
      toast.add({ type: 'success', title: PROFILE_PHOTO_UPDATED });
    } catch {
      setAvatarUrl(previous);
      setSwitchError(IMAGE_UPDATE_FAILED);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * G164 改名。官方给这一档配"进行时+成功+失败"三件套（`preferences.name.updating` /
   * `preferences.name.updated` / `preferences.alert.change.name`，三句逐字）；本地走
   * `promptDialog` 收名字、`applyLocal(table:'user')` 写 `name`（元数据过离线内核，不新开
   * Server Action）。空串/纯空格按"没改"处理（官方那套也 trim 后再落）。
   */
  const renameSelf = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const next = await promptDialog({
      title: '更改姓名',
      placeholder: '你的名字',
      confirmLabel: '保存',
    });
    const trimmed = next?.trim();
    if (!trimmed || trimmed === displayName) return;
    const previous = displayName;
    setDisplayName(trimmed);
    setSwitchError(null);
    setSavingProfile(true);
    try {
      await getSyncManager().applyLocal({ table: 'user', id: userId, patch: { name: trimmed } });
      toast.add({ type: 'success', title: NAME_UPDATED });
    } catch {
      setDisplayName(previous);
      setSwitchError(NAME_UPDATE_FAILED);
    } finally {
      setSavingProfile(false);
    }
  };

  /** G179：写空间图标（`Space.icon`）。失败一句；成功就地换掉预览并收起选择器。 */
  const chooseSpaceIcon = async (icon: string) => {
    setSavingIcon(true);
    setSpaceError(null);
    try {
      setSpace(await setSpaceIcon(icon));
      setIconPickerOpen(false);
    } catch {
      setSpaceError('没有改成空间图标，请重试');
    } finally {
      setSavingIcon(false);
    }
  };

  /**
   * G161 「重置文档缓存」：官方这枚动作只清本地缓存，先过确认（会丢未同步的修改），
   * 成功后重载一次——离线内核的实例还拿着被删掉的那个库的句柄。
   */
  const resetCache = async () => {
    const ok = await confirmDialog({
      title: RESET_CACHE_TITLE,
      message: RESET_CACHE_CONFIRM_MESSAGE,
      confirmLabel: RESET_CACHE_ACTION,
    });
    if (!ok) return;
    setCacheNotice(null);
    setResettingCache(true);
    try {
      if (typeof window === 'undefined' || !window.indexedDB) throw new Error('no indexedDB');
      await resetDocumentCache({ indexedDB: window.indexedDB });
      setCacheNotice(RESET_CACHE_DONE);
      window.location.reload();
    } catch {
      setCacheNotice(RESET_CACHE_FAILED);
    } finally {
      setResettingCache(false);
    }
  };

  const setSwitch = async (key: SwitchKey, value: boolean) => {    const base = prefs ?? (await getPreferences().catch(() => null));
    if (!base) return;

    // 开关同 setPref：乐观更新 + applyLocal，失败回滚。
    setSavingSwitch(true);
    setSwitchError(null);
    setPrefs({ ...base, [key]: value });
    const userId = session?.user?.id;
    try {
      if (!userId) {
        await updatePreferences({ [key]: value });
      } else {
        await getSyncManager().applyLocal({ table: 'user', id: userId, patch: { [key]: value } });
      }
    } catch {
      setPrefs(base);
      setSwitchError('开关没有保存，请重试');
    } finally {
      setSavingSwitch(false);
    }
  };

  /** G163：写当前空间的邮件覆盖值；`null` 恢复跟随全局。 */
  const setSpaceEmailPref = async (enabled: boolean | null) => {
    setSavingSpaceEmail(true);
    setSpaceEmailError(null);
    try {
      setSpaceEmail(await setSpaceEmailNotification(enabled));
    } catch {
      setSpaceEmailError('按空间的设置没有保存，请重试');
    } finally {
      setSavingSpaceEmail(false);
    }
  };

  /** G174：写入"隐藏标签"这面旗；存不下就用官方那句失败句。 */
  const applyTagsHidden = (hidden: boolean) => {
    setTagSwitchError(null);
    const saved = writeTagsHidden(
      typeof window === 'undefined' ? undefined : window.localStorage,
      hidden,
    );
    if (!saved) setTagSwitchError(TAGS_SAVE_ERROR);
    setConfirmingTagsOff(false);
  };

  const setTagsEnabled = (next: boolean) => {
    // 关掉要先确认（「此空间中的标签仍处于活动状态……」）；重新打开不需要。
    if (shouldConfirmTagTurnOff(next)) {
      setTagSwitchError(null);
      setConfirmingTagsOff(true);
      return;
    }
    applyTagsHidden(false);
  };

  /** G171：规则增删改之后重读规则与来源标注。 */
  const refreshIgnore = async () => {
    const overview = await getIgnoreOverview();
    setIgnoreRules(overview.rules);
    setIgnoreMatches(overview.matches);
  };

  const addIgnore = async () => {
    const text = ignoreDraft.trim();
    if (!text) return;
    setSavingIgnore(true);
    setIgnoreError(null);
    try {
      await addIgnoreRule(text);
      setIgnoreDraft('');
      await refreshIgnore();
      toast.add({ title: '已添加到忽略列表', type: 'success' });
    } catch {
      setIgnoreError('规则没有保存，请重试');
    } finally {
      setSavingIgnore(false);
    }
  };

  const renameIgnore = async (rule: IgnoreRule) => {
    const next = await promptDialog({
      title: TEXT_TO_IGNORE,
      defaultValue: rule.text,
      confirmLabel: '保存',
    });
    if (next === null) return;
    setSavingIgnore(true);
    setIgnoreError(null);
    try {
      await renameIgnoreRule(rule.id, next);
      await refreshIgnore();
    } catch {
      setIgnoreError('规则没有保存，请重试');
    } finally {
      setSavingIgnore(false);
    }
  };

  const removeIgnore = async (rule: IgnoreRule) => {
    const confirmed = await confirmDialog({
      title: IGNORE_LIST_TITLE,
      message: deleteRuleMessage(rule.text),
      confirmLabel: '删除',
    });
    if (!confirmed) return;
    setSavingIgnore(true);
    setIgnoreError(null);
    try {
      await deleteIgnoreRule(rule.id);
      await refreshIgnore();
    } catch {
      setIgnoreError('规则没有删除，请重试');
    } finally {
      setSavingIgnore(false);
    }
  };

  switch (section) {
    case 'space':
      return (
        <div className="space-y-6">
          {spaceError && (
            <p role="status" className="text-[12px] text-destructive">
              {spaceError}
            </p>
          )}
          <div className="flex justify-center pt-6">
            <SpaceIcon
              icon={space?.icon}
              initial={(space?.name ?? spaceName ?? '我').slice(0, 1)}
              className="size-32 rounded-[28px] text-5xl"
            />
          </div>
          {/* G179：图标有 `Space.icon` 可写 ⇒ 相机按钮接 `setSpaceIcon`（此前无处理器被移除）。
              owner 才有能力，失败给一句、选择器保持打开。 */}
          {space?.capabilities.canChangeSettings ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                aria-label="更换空间图标"
                data-testid="space-icon-picker"
                aria-expanded={iconPickerOpen}
                disabled={savingIcon}
                onClick={() => setIconPickerOpen((open) => !open)}
                className="mt-2 rounded-md px-2 py-1 text-[12px] text-(--craft-accent) hover:bg-foreground/4 disabled:opacity-40"
              >
                更换空间图标
              </button>
              {iconPickerOpen && (
                <div
                  role="group"
                  aria-label="选择空间图标"
                  className="mt-2 flex flex-wrap justify-center gap-2"
                >
                  {SPACE_ICON_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-label={`空间图标：${preset.label}`}
                      aria-pressed={spaceIconPreset(space.icon).id === preset.id}
                      disabled={savingIcon}
                      onClick={() => void chooseSpaceIcon(preset.id)}
                      className="size-9 rounded-xl ring-offset-2 transition-transform hover:scale-105 disabled:opacity-40 aria-pressed:ring-2 aria-pressed:ring-craft-accent"
                      style={{
                        backgroundImage: `linear-gradient(to bottom right, ${preset.from}, ${preset.to})`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {/* G324：空间现在是真实体——名字可改（owner 才有能力，`capabilities.canChangeSettings`），
              且给出调用者在这个空间里的角色与那句官方说明。此前这里是只读的派生名。 */}
          <RowCard className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs text-foreground/55">空间名称</div>
              <div className="mt-1 truncate text-[15px]">{space?.name ?? spaceName}</div>
            </div>
            {space?.capabilities.canChangeSettings ? (
              <button
                type="button"
                aria-label="重命名空间"
                data-testid="space-rename"
                onClick={() => {
                  void promptDialog({
                    title: '空间名称',
                    defaultValue: space.name,
                    confirmLabel: '保存',
                  }).then(async (next) => {
                    if (!next) return;
                    setSpaceError(null);
                    try {
                      setSpace(await setSpaceName(next));
                    } catch {
                      setSpaceError('没有改成空间名称，请重试');
                    }
                  });
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/4 hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
            ) : null}
          </RowCard>
          {space && (
            <RowCard className="px-4 py-3">
              <div className="text-xs text-foreground/55">你的空间角色</div>
              <div className="mt-1 text-[15px]">
                {space.role === 'owner' ? '所有者' : space.role === 'guest' ? '访客' : '成员'}
              </div>
              {/* G324：官方那句角色说明逐字（guest 档是本地词）。 */}
              <p className="mt-1 text-[12px] text-foreground/55">{space.roleDescription}</p>
            </RowCard>
          )}
          {/* G228：邀成员——owner 才有能力（`canInviteMembers`）。非成员＝访客 ⇒ 先出后果确认框
              （`guest.warning.desc` 逐字），确认后才落库。
              G187：已有成员行（含待处理邀请）时服务端以那句判据拒绝 ⇒ 面板出 title+subtitle 一块。 */}
          {space?.capabilities.canInviteMembers && (
            <RowCard className="px-4 py-3">
              <button
                type="button"
                data-testid="space-invite"
                onClick={() => {
                  void promptDialog({
                    title: '邀请成员',
                    placeholder: '对方的登录邮箱',
                    confirmLabel: '下一步',
                  }).then(async (email) => {
                    if (!email) return;
                    setSpaceError(null);
                    setInviteAlreadyMember(false);
                    try {
                      if (await guestWarningFor(email)) {
                        const ok = await confirmDialog({
                          title: '邀请非团队成员',
                          message: GUEST_WARNING_DESC,
                          confirmLabel: GUEST_WARNING_CONFIRM,
                        });
                        if (!ok) return;
                      }
                      setSpace(await inviteSpaceMember({ email, role: 'guest' }));
                    } catch (error) {
                      const message = error instanceof Error ? error.message : '';
                      if (message === INVITE_ALREADY_MEMBER) {
                        setInviteAlreadyMember(true);
                        return;
                      }
                      setSpaceError('没有邀请成功，请重试');
                    }
                  });
                }}
                className="flex items-center gap-2 text-[13px] font-medium text-(--craft-accent)"
              >
                <SquarePlus className="size-4" />
                邀请新成员
              </button>
              {inviteAlreadyMember && (
                <div
                  role="status"
                  data-testid="invite-already-member"
                  className="mt-2 rounded-lg bg-foreground/4 px-3 py-2"
                >
                  <div className="text-[13px] font-medium">{INVITE_ALREADY_MEMBER_TITLE}</div>
                  <p className="mt-0.5 text-[12px] text-foreground/55">
                    {INVITE_ALREADY_MEMBER_SUBTITLE}
                  </p>
                </div>
              )}
            </RowCard>
          )}
        </div>
      );

    case 'published':
      return (
        <div className="space-y-4">
          <RowCard className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs text-foreground/55">craft.me 链接</div>
              <div className="mt-1 text-[15px] text-(--craft-accent)">craft.me/s/crafty</div>
            </div>
            <EditIcon />
          </RowCard>
          <RowCard className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs text-foreground/55">自定义域名</div>
                {/* G183：四态生命周期（未设置→已声明→已验证／已断开），域名有真列可落。 */}
                <div className="mt-1 truncate text-[15px]">
                  {domain?.domain ?? (domain?.state === 'disconnected' ? '已断开 · craft.me' : '未设置')}
                </div>
                {domain && domain.state !== 'unset' && (
                  <p className="mt-0.5 text-[12px] text-foreground/55">{DOMAIN_STATE_LABELS[domain.state]}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {(!domain || domain.state === 'unset' || domain.state === 'disconnected') && (
                  <button
                    type="button"
                    data-testid="domain-declare"
                    onClick={() => {
                      void promptDialog({
                        title: '自定义域名',
                        placeholder: 'example.com',
                        confirmLabel: '我已添加 DNS 记录',
                      }).then(async (name) => {
                        if (!name) return;
                        setDomainError(null);
                        try {
                          setDomain(await declareDomain({ domain: name, tier: 'external' }));
                        } catch {
                          setDomainError('没有设置域名，请先创建团队');
                        }
                      });
                    }}
                    className="rounded-md px-2 py-1 text-[12px] text-(--craft-accent) hover:bg-foreground/4"
                  >
                    设置域名
                  </button>
                )}
                {domain?.state === 'declared' && (
                  <button
                    type="button"
                    data-testid="domain-verify"
                    onClick={() => {
                      void resolveDomainVerification(true).then(setDomain).catch(() => {
                        setDomainError('验证失败，请重试');
                      });
                    }}
                    className="rounded-md px-2 py-1 text-[12px] text-(--craft-accent) hover:bg-foreground/4"
                  >
                    验证 DNS
                  </button>
                )}
                {domain && domain.state !== 'unset' && domain.state !== 'disconnected' && (
                  <button
                    type="button"
                    data-testid="domain-disconnect"
                    onClick={() => {
                      void confirmDialog({
                        title: '断开自定义域名',
                        // G183：换 Craft 域会让所有现有外链失效——那句后果写在确认长文里。
                        message: `${DISCONNECT_DESC}${DISCONNECT_CONFIRM}`,
                        confirmLabel: '断开',
                      }).then(async (ok) => {
                        if (!ok) return;
                        setDomain(await disconnectDomain());
                      });
                    }}
                    className="rounded-md px-2 py-1 text-[12px] text-destructive hover:bg-foreground/4"
                  >
                    断开
                  </button>
                )}
              </div>
            </div>
            {/* G183：外部域展示 DNS 记录表（名称/主机、值/指向）。 */}
            {domain?.tier === 'external' && domain.dnsRecords.length > 0 && (
              <div className="mt-3 rounded-lg border border-border">
                <div className="border-b border-border px-3 py-1.5 text-[12px] font-medium">
                  {DNS_RECORD_TABLE.title}
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-foreground/55">
                      <th className="px-3 py-1 text-left font-normal">{DNS_RECORD_TABLE.nameColumn}</th>
                      <th className="px-3 py-1 text-left font-normal">{DNS_RECORD_TABLE.valueColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.dnsRecords.map((row) => (
                      <tr key={row.name} className="border-t border-border">
                        <td className="px-3 py-1">{row.name}</td>
                        <td className="px-3 py-1 font-mono">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {domainError && (
              <p role="status" className="mt-2 text-[12px] text-destructive">
                {domainError}
              </p>
            )}
          </RowCard>
        </div>
      );

    case 'tags':
      return (
        <div className="space-y-4">
          {/* G174：官方这枚开关是"关闭 ≠ 删除"——确认句逐字说明标签仍处于活动状态、
              只是在所有位置隐藏；同一处还有"每用户×每空间"的作用域句。 */}
          <RowCard className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium">{USE_TAGS_LABEL}</div>
              <Switch
                checked={!tagsHidden}
                aria-label={USE_TAGS_LABEL}
                data-testid="space-tags-switch"
                onCheckedChange={(next) => setTagsEnabled(next === true)}
                className="data-checked:bg-(--craft-accent)"
              />
            </div>
            <p className="mt-1 text-[12px] text-foreground/45">{TAGS_SCOPE_NOTE}</p>
            {confirmingTagsOff && (
              <div
                role="alertdialog"
                aria-label={TAGS_OFF_CONFIRM_TITLE}
                data-testid="tags-off-confirm"
                className="mt-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="text-[13px] font-medium">{TAGS_OFF_CONFIRM_TITLE}</div>
                <p className="mt-1 text-[12px] text-foreground/55">{TAGS_OFF_CONFIRM_DESC}</p>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingTagsOff(false)}
                    className="rounded-md px-2.5 py-1 text-[12px] text-foreground/70 hover:bg-foreground/4"
                  >
                    {TAGS_KEEP_ON}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTagsHidden(true)}
                    className="rounded-md bg-(--craft-accent) px-2.5 py-1 text-[12px] text-white"
                  >
                    {TAGS_OFF_CONFIRM}
                  </button>
                </div>
              </div>
            )}
            {tagSwitchError && (
              <p role="status" className="mt-2 text-[12px] text-destructive">
                {tagSwitchError}
              </p>
            )}
          </RowCard>
          {/* G173：官方「管理固定标签」入口 + 固定关键标签的引导句 / 到上限那句。 */}
          <RowCard className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[13px] font-medium">{MANAGE_PINNED}</div>
              <p className="mt-0.5 text-[12px] text-foreground/45">{pinnedCount >= PINNED_TAG_LIMIT ? PINNED_LIMIT_REACHED : PIN_KEY_TAGS_HINT}</p>
            </div>
            <Link
              href="/tags"
              className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              管理
            </Link>
          </RowCard>
          {/* G171：忽略列表——自定义规则是一等实体，命中后标签从侧栏与标签页消失。 */}
          <div>
            <GroupTitle>{IGNORE_LIST_TITLE}</GroupTitle>
            <GroupDesc>{IGNORE_LIST_DESC}</GroupDesc>
            <RowCard className="mt-3 space-y-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={ignoreDraft}
                  onChange={(event) => setIgnoreDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void addIgnore();
                  }}
                  placeholder={TEXT_TO_IGNORE}
                  aria-label={TEXT_TO_IGNORE}
                  className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-[13px] outline-none focus:border-foreground/30"
                />
                <button
                  type="button"
                  disabled={savingIgnore || !ignoreDraft.trim()}
                  onClick={() => void addIgnore()}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {ADD_RULE_LABEL}
                </button>
              </div>
              {ignoreRules.length === 0 ? (
                <p className="text-[12px] text-foreground/45">还没有忽略规则</p>
              ) : (
                ignoreRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start justify-between gap-3 border-t border-foreground/6 pt-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{rule.text}</div>
                      {ignoreMatches[rule.id]?.length ? (
                        <p className="mt-0.5 text-[12px] text-foreground/45">
                          {ignoredByRuleLabel(ignoreMatches[rule.id])}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2 text-[12px] text-foreground/55">
                      <button
                        type="button"
                        aria-label={`重命名规则 ${rule.text}`}
                        disabled={savingIgnore}
                        onClick={() => void renameIgnore(rule)}
                        className="hover:underline disabled:opacity-40"
                      >
                        重命名
                      </button>
                      <button
                        type="button"
                        aria-label={`删除规则 ${rule.text}`}
                        disabled={savingIgnore}
                        onClick={() => void removeIgnore(rule)}
                        className="hover:underline disabled:opacity-40"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
              {ignoreError && (
                <p role="status" className="text-[12px] text-destructive">
                  {ignoreError}
                </p>
              )}
            </RowCard>
          </div>
        </div>
      );

    case 'appearance':
      return (
        <div className="space-y-4">
          <RowCard className="grid grid-cols-3 gap-4 p-4">
            {(['system', 'light', 'dark'] as const).map((variant) => {
              const selected = (prefs?.theme ?? 'system') === variant;
              return (
                <button
                  key={variant}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPref({ theme: variant })}
                >
                  <div className={cn('rounded-lg', selected && 'ring-2 ring-(--craft-accent)')}>
                    <ThemePreview variant={variant} />
                  </div>
                  <div
                    className={cn(
                      'mt-2 text-center text-[13px]',
                      selected ? 'font-medium text-(--craft-accent)' : 'text-foreground/45'
                    )}
                  >
                    {variant === 'system' ? '系统' : variant === 'light' ? '浅色' : '深色'}
                  </div>
                </button>
              );
            })}
          </RowCard>
          <RowCard className="w-[360px] p-4">
            <div className="text-[15px] font-semibold">强调色</div>
            <div className="mt-0.5 text-xs text-foreground/55">选择强调色</div>
            <div className="mt-3 flex gap-3">
              {ACCENT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={accent === key}
                  onClick={() => {
                    setAccent(key);
                    pickAccent(key);
                  }}
                  className={cn(
                    'size-8 rounded-full',
                    accent === key && 'ring-2 ring-(--craft-accent) ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: ACCENT_SWATCH[key] }}
                />
              ))}
            </div>
          </RowCard>
        </div>
      );

    case 'language':
      // The interface has one language, so this is a statement rather than a control that looks
      // like it opens a list and then does nothing.
      return (
        <RowCard className="flex w-[360px] items-center justify-between px-4 py-3">
          <div className="text-[13px] font-medium">语言</div>
          <div className="text-[13px] text-foreground/70">简体中文</div>
        </RowCard>
      );

    case 'advanced': {
      const fontOptions = [
        { value: 'system', label: '默认' },
        { value: 'system-serif', label: '衬线' },
        { value: 'system-mono', label: '等宽' },
        { value: 'system-rounded', label: '圆体' },
      ];
      const widthOptions = [
        { value: 'narrow', label: '窄' },
        { value: 'default', label: '默认' },
        { value: 'wide', label: '宽' },
      ];
      return (
        <div className="space-y-4">
          {/* G166：官方按作用域标注一句。本批已落空间/团队实体 ⇒ 有团队时三层是真存在的
              （空间可覆盖团队、团队可覆盖个人），按当前所处的层说对应那句；无团队时只有个人层。 */}
          <p className="px-1 text-xs text-foreground/55" data-testid="settings-scope-note">
            {space?.teamId ? SCOPE_COPY.override.label : SCOPE_COPY.personal.label}
          </p>
          <RowCard className="px-4 py-3">
            <div className="text-[13px] font-medium">编辑器字体</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {fontOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPref({ editorFont: value })}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/4',
                    prefs?.editorFont === value && 'bg-foreground/8 font-medium'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </RowCard>
          {/* G160：官方 preferences.advanced.completed.task.appearance.*（标题/说明/三档标签逐字） */}
          <RowCard className="px-4 py-3">
            <div className="text-[13px] font-medium">{COMPLETED_TASK_APPEARANCE_TITLE}</div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{COMPLETED_TASK_APPEARANCE_DESC}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMPLETED_TASK_APPEARANCES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`完成任务的外观：${COMPLETED_TASK_APPEARANCE_LABELS[value]}`}
                  onClick={() => setPref({ completedTaskAppearance: value })}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/4',
                    prefs?.completedTaskAppearance === value && 'bg-foreground/8 font-medium'
                  )}
                >
                  {COMPLETED_TASK_APPEARANCE_LABELS[value]}
                </button>
              ))}
            </div>
          </RowCard>
          <RowCard className="px-4 py-3">
            <div className="text-[13px] font-medium">编辑器宽度</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {widthOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPref({ editorWidth: value })}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/4',
                    prefs?.editorWidth === value && 'bg-foreground/8 font-medium'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </RowCard>
          {/* G161：官方高级设置里的「每日笔记默认显示」——本地这面旗已存在于浏览页
              （`craft.browse.showDailyNotes`），这里把它也放到高级设置里，同一面旗、同一默认值。 */}
          <RowCard className="flex items-center justify-between px-4 py-3">
            <div className="text-[13px] font-medium">每日笔记默认显示</div>
            <Switch
              checked={showDailyNotes}
              aria-label="每日笔记默认显示"
              data-testid="advanced-daily-notes-default"
              onCheckedChange={(next) => storeShowDailyNotes(next === true)}
              className="data-checked:bg-(--craft-accent)"
            />
          </RowCard>
          {/* G161：官方高级设置里的「重置文档缓存」——本地唯一的文档缓存是离线内核的 IndexedDB，
              先确认（会丢未同步修改）再删库。官方该处确认长文未采集逐字，用本地措辞。 */}
          <RowCard className="px-4 py-3" data-testid="advanced-reset-cache">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{RESET_CACHE_TITLE}</div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{RESET_CACHE_DESC}</p>
              </div>
              <button
                type="button"
                disabled={resettingCache}
                onClick={() => void resetCache()}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] text-destructive transition-colors hover:bg-muted disabled:opacity-40"
              >
                {resettingCache ? RESET_CACHE_BUSY : RESET_CACHE_ACTION}
              </button>
            </div>
            {cacheNotice && (
              <p
                role="status"
                className={cn(
                  'mt-2 text-[12px]',
                  cacheNotice === RESET_CACHE_DONE ? 'text-foreground/55' : 'text-destructive',
                )}
              >
                {cacheNotice}
              </p>
            )}
          </RowCard>
        </div>
      );
    }

    case 'account':
      return (
        <div className="space-y-4">
          <RowCard className="flex gap-6 p-6">
            <div className="relative shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-26 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-26 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 text-4xl font-semibold text-white">
                  {profile?.name?.slice(0, 1) ?? '我'}
                </div>
              )}
              {/* G164：改头像。官方该按钮配"进行时+成功+失败"三件套；本地走同一上传通道
                  （`uploadFile`）＋`applyLocal(table:'user')` 写 `image`。 */}
              <button
                type="button"
                aria-label="更换头像"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 flex size-10 items-center justify-center rounded-full bg-background shadow-(--shadow-xxs)"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void changeAvatar(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="min-w-0 flex-1 divide-y divide-foreground/4">
              <div className="flex items-start justify-between pb-4">
                <div>
                  <div className="text-xs text-foreground/55">名称</div>
                  <div className="mt-1 text-[15px]">{displayName || '未设置'}</div>
                  {savingProfile && (
                    <div role="status" aria-live="polite" className="mt-1 text-xs text-foreground/55">
                      {NAME_UPDATING}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-foreground/55">
                    你的姓名在你通过共享链接和电子邮件与他人共享的文档中可见。
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="更改名称"
                  title="更改名称"
                  onClick={() => void renameSelf()}
                  className="shrink-0 rounded p-1 hover:bg-foreground/4"
                >
                  <EditIcon />
                </button>
              </div>
              <div className="flex items-start justify-between pt-4">
                <div>
                  <div className="text-xs text-foreground/55">电子邮件</div>
                  <div className="mt-1 text-[15px]">{profile?.email || '—'}</div>
                  <div className="mt-1 text-xs text-foreground/55">你用于此帐户的电子邮件地址。</div>
                  {/* G320：官方那句带 `<strong>` 标签（`blockdetails.you.are.logged.in.as.strong`），
                      走 RichText 渲染而不是把标签原样打印出来。 */}
                  {profile?.email ? (
                    <RichText
                      value={loggedInAsText(profile.email)}
                      className="mt-1 block text-xs text-foreground/55"
                    />
                  ) : null}
                </div>
                {/* G164：这里原有第三枚裸铅笔图标（EditIcon）——同样"不是按钮"，且本地
                    **没有任何改邮箱能力**（全仓零 `changeEmail`／`updateEmail`／`verifyEmail`），
                    `email` 还被 spec 5.1 明确排除在 sync 白名单外 ⇒ 无宿主可写。按"有列就接线、
                    没列就移除"的同一把尺删掉：邮箱只作只读展示。（改邮箱要收信验证，属于本仓零
                    发信通路的一部分，见 G1488。） */}
              </div>
            </div>
          </RowCard>
          <RowCard className="px-4 py-3">
            <button
              type="button"
              onClick={() => logout()}
              className="text-[13px] font-medium text-(--craft-accent)"
            >
              退出登录
            </button>
          </RowCard>
          <div className="pt-2">
            <GroupTitle>危险区</GroupTitle>
            <RowCard className="mt-3 px-4 py-3">
              <div className="text-[15px] font-semibold text-destructive">删除帐户</div>
              <div className="mt-1 text-[13px] text-foreground/55">
                {DELETE_ACCOUNT_MESSAGE}
              </div>
            </RowCard>
          </div>
        </div>
      );

    case 'subscription':
      return (
        <RowCard className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs text-foreground/55">当前方案</div>
            <div className="mt-1 text-[15px]">Free</div>
          </div>
          <EditIcon />
        </RowCard>
      );

    case 'team':
      // G421：团队现在是真实体——建团队／列出成员与两档权限／逐成员改档。此前这里只有一枚
      // 「创建新团队」按钮，点了什么都不发生（无团队表可落）。
      if (!team) {
        return (
          <RowCard className="px-4 py-3">
            <button
              type="button"
              onClick={() => {
                void promptDialog({ title: '团队名称', confirmLabel: '创建' }).then(async (name) => {
                  if (!name) return;
                  try {
                    setTeam(await createTeam(name));
                  } catch {
                    setSpaceError('没有创建团队，请重试');
                  }
                });
              }}
              className="flex items-center gap-2 text-[13px] font-medium text-(--craft-accent)"
            >
              <SquarePlus className="size-4" />
              创建新团队
            </button>
          </RowCard>
        );
      }
      return (
        <div className="space-y-3">
          <div className="text-[15px] font-semibold">{team.name}</div>
          {team.members.map((member) => (
            <RowCard key={member.userId} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{member.name}</div>
                  <p className="mt-0.5 text-[12px] text-foreground/55">{member.subtitle}</p>
                </div>
                {/* G421：两档（admin/member），逐成员切换。管理员可多人 ⇒ 不限制唯一。 */}
                <div className="flex shrink-0 gap-1">
                  {(['admin', 'member'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={member.role === role}
                      onClick={() => {
                        void changeTeamRole(member.userId, role).then(setTeam).catch(() => {
                          setSpaceError('没有改成员角色，请重试');
                        });
                      }}
                      className={cn(
                        'rounded-md px-2 py-1 text-[12px]',
                        member.role === role
                          ? 'bg-(--craft-accent) text-white'
                          : 'text-muted-foreground hover:bg-foreground/4',
                      )}
                    >
                      {role === 'admin' ? '管理员' : '成员'}
                    </button>
                  ))}
                </div>
              </div>
            </RowCard>
          ))}
        </div>
      );

    case 'integrations':
      return (
        <RowCard className="px-4 py-3 text-[13px] text-foreground/55">暂无已连接的集成。</RowCard>
      );

    case 'assistant':
      return <AssistantPanel />;

    case 'notifications':
      return (
        <div className="space-y-6">
          {switchError && (
            <p role="status" className="text-[12px] text-destructive">
              {switchError}
            </p>
          )}
          <div>
            <GroupTitle>评论和提及</GroupTitle>
            <GroupDesc>{NOTIFICATION_EVENTS.commentsAndMentions.label}</GroupDesc>
            <RowCard className="mt-3 flex items-center justify-between px-4 py-3">
              <div className="text-[13px] font-medium">电子邮件通知</div>
              <NotifySwitch
                value={prefs?.notifyComments}
                busy={savingSwitch}
                onChange={(next) => void setSwitch('notifyComments', next)}
              />
            </RowCard>
          </div>
          <div>
            <GroupTitle>提醒</GroupTitle>
            <GroupDesc>{NOTIFICATION_EVENTS.reminders.label}</GroupDesc>
            <RowCard className="mt-3 flex items-center justify-between px-4 py-3">
              <div className="text-[13px] font-medium">电子邮件通知</div>
              <NotifySwitch
                value={prefs?.notifyReminders}
                busy={savingSwitch}
                onChange={(next) => void setSwitch('notifyReminders', next)}
              />
            </RowCard>
          </div>
          <div>
            <GroupTitle>每日电子邮件</GroupTitle>
            <GroupDesc>{NOTIFICATION_EVENTS.dailyTasks.label}</GroupDesc>
            <RowCard className="mt-3 flex items-center justify-between px-4 py-3">
              <div className="text-[13px] font-medium">电子邮件通知</div>
              <NotifySwitch
                value={prefs?.notifyDaily}
                busy={savingSwitch}
                onChange={(next) => void setSwitch('notifyDaily', next)}
              />
            </RowCard>
            {/* G03：这里原有一行「时间 08:00」——官方语言包里**没有任何可配摘要时刻的键**
                （只有 `preferences.daily.email` 与其 desc），且该行带按钮式外框与 ChevronsUpDown
                图标、看着能点却是个无处理器/无输入的裸 DIV ⇒ 已删除，不再伪造一个不存在的设置。 */}
          </div>
          {/* G163：邮件通知可按空间覆盖。覆盖值按成员分格存进 `Space.settings`，
              面板只列当前空间；「恢复全局」清掉覆盖值。 */}
          {spaceEmail && (
            <div>
              <GroupTitle>空间</GroupTitle>
              <GroupDesc>{EMAIL_PER_SPACE_DESC}</GroupDesc>
              <RowCard className="mt-3 flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{spaceEmail.spaceName}</div>
                  <p className="mt-0.5 text-[12px] text-foreground/55">
                    {spaceEmail.emailComments === null ? '跟随全局设置' : '仅此空间'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {spaceEmail.emailComments !== null && (
                    <button
                      type="button"
                      onClick={() => void setSpaceEmailPref(null)}
                      className="text-[12px] text-foreground/55 hover:underline"
                    >
                      恢复全局
                    </button>
                  )}
                  <NotifySwitch
                    value={spaceEmail.emailComments ?? (prefs?.notifyComments ?? spaceEmail.globalEmailComments)}
                    busy={savingSpaceEmail}
                    onChange={(next) => void setSpaceEmailPref(next)}
                  />
                </div>
              </RowCard>
              {spaceEmailError && (
                <p role="status" className="mt-2 text-[12px] text-destructive">
                  {spaceEmailError}
                </p>
              )}
            </div>
          )}
        </div>
      );

    case 'shortcuts':
      return <ShortcutsPanel />;

    case 'about':
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-fuchsia-500 to-blue-600 text-2xl font-black text-white">
              C
            </div>
            <div>
              <div className="text-[15px] font-semibold">Craft</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[13px] text-foreground/55">{APP_VERSION}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-foreground/4 pt-6">
            <GroupTitle>法律信息</GroupTitle>
            <div className="mt-3 space-y-2 text-[13px] font-medium text-(--craft-accent)">
              <div>条款和条件</div>
              <div>隐私政策</div>
              <div>许可证和开源说明</div>
            </div>
          </div>
          <div className="border-t border-foreground/4 pt-6">
            <GroupTitle>社交媒体</GroupTitle>
            <GroupDesc>对 Craft 的新功能和即将推出的功能感兴趣？ 在 X 上关注我们，第一时间了解最新信息！</GroupDesc>
            {/* G164 复核：这枚按钮此前是 inert（无 onClick）。官方串逐字给了句柄
                （`preferences.follow.craftdocs.app.x`「在 X 上关注 @CraftDocs」）⇒ URL 可推导，接线。 */}
            <button
              type="button"
              onClick={() => window.open('https://x.com/CraftDocs', '_blank', 'noopener,noreferrer')}
              className="mt-3 rounded-lg border border-foreground/8 px-4 py-2 text-[13px] font-medium"
            >
              在 X 上关注 @CraftDocs
            </button>
          </div>
          <div className="border-t border-foreground/4 pt-6">
            <GroupTitle>意见反馈</GroupTitle>
            <GroupDesc>有想法、功能请求或发现了错误？ 请告诉我们，我们会尽快处理！</GroupDesc>
            {/* G164 复核：这里原有第二枚 inert 按钮。官方那是个 **13 键的反馈弹窗**（G1414：
                subject／email／message 三字段＋提交屏＋感谢屏；`email` 格只在匿名用户下渲染），
                而本目录明确记该弹窗**没上屏、实际长什么样未证**，本地也没有任何反馈弹窗基建
                ⇒ 无宿主。按"有列就接线、没列就移除"删掉按钮，只留说明文字。 */}
          </div>
        </div>
      );

    default:
      return null;
  }
}
