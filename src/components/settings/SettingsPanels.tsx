'use client';

import { useEffect, useRef, useState } from 'react';
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
import { NOTIFICATION_EVENTS } from '@/lib/app/notification-settings';
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
  setSpaceName,
  type DomainContext,
  type SpaceSummary,
  type TeamSummary,
} from '@/actions/space/space';
import { GUEST_WARNING_CONFIRM, GUEST_WARNING_DESC } from '@/lib/share/guest-warning';
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

function SpaceIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center font-semibold text-white', className)}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgb(255 255 255 / .16) 0 26px, rgb(255 255 255 / 0) 26px 68px), linear-gradient(to bottom right, #d33bf0, #7e22ce)',
      }}
    >
      Zs
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // G324/G166：空间与团队实体（本批新落库）。
  const [space, setSpace] = useState<SpaceSummary | null>(null);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  // G183：自定义域名四态。
  const [domain, setDomain] = useState<DomainContext | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    getSpaceContext().then(setSpace).catch(() => setSpace(null));
    getTeamContext().then(setTeam).catch(() => setTeam(null));
    getDomainContext().then(setDomain).catch(() => setDomain(null));
  }, []);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setPrefs(null));
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
    } catch (error) {
      setAvatarUrl(previous);
      setSwitchError(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  /**
   * G164 改名。官方给这一档配"进行时+成功+失败"三件套；本地走 `promptDialog` 收名字、
   * `applyLocal(table:'user')` 写 `name`（元数据过离线内核，不新开 Server Action），
   * 失败给一句并把乐观值撤回。空串/纯空格按"没改"处理（官方那套也 trim 后再落）。
   */
  const renameSelf = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const next = await promptDialog({
      title: '更改名称',
      placeholder: '你的名字',
      confirmLabel: '保存',
    });
    const trimmed = next?.trim();
    if (!trimmed || trimmed === displayName) return;
    const previous = displayName;
    setDisplayName(trimmed);
    setSwitchError(null);
    try {
      await getSyncManager().applyLocal({ table: 'user', id: userId, patch: { name: trimmed } });
    } catch (error) {
      setDisplayName(previous);
      setSwitchError(error instanceof Error ? error.message : '名称更新失败');
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
            <SpaceIcon className="size-32 rounded-[28px] text-5xl" />
          </div>
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
              （`guest.warning.desc` 逐字），确认后才落库。 */}
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
                    } catch {
                      setSpaceError('没有邀请成功，请重试');
                    }
                  });
                }}
                className="flex items-center gap-2 text-[13px] font-medium text-(--craft-accent)"
              >
                <SquarePlus className="size-4" />
                邀请新成员
              </button>
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
          <RowCard className="flex items-center justify-between px-4 py-3">
            <div className="text-[13px] font-medium">使用标签</div>
            <Switch defaultChecked className="data-checked:bg-(--craft-accent)" />
          </RowCard>
          <GroupDesc>忽略列表中的标签不会显示在侧栏与设置里。</GroupDesc>
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
                className="absolute -right-1 -bottom-1 flex size-10 items-center justify-center rounded-full bg-background shadow-(--shadow-xxs) disabled:opacity-50"
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
                删除帐户将永久删除你的所有文档。 此操作无法撤销。
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
      return <RowCard className="px-4 py-3 text-[13px] text-foreground/55">助手未启用。</RowCard>;

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
          {/* G163：这里原有「空间」一行——文案承诺可以按空间覆盖这些设置、右侧还带
              ChevronRight 暗示可进入，但实测是裸 DIV（不在 button 里、无 onClick），而且本地
              **没有任何按空间的通知存储**（零 spaceId／perSpace 列，`per-space` 只作为
              `notification-settings.ts` 里的一句描述存在）⇒ 它承诺了一个不存在的功能。
              按"有列就接线、没列就移除"的同一把尺删掉：三档开关（真落库）保留，不画按空间那层。 */}
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
