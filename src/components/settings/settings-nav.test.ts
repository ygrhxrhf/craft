import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { NOTIFICATION_EVENTS } from '@/lib/app/notification-settings';

/**
 * A settings section that is not wired must not appear in the navigation (G24). The ledger's rule is
 * that a section is either backed by real state or its entry is removed, so the modal filters on
 * the wiring table instead of listing every section.
 */
const source = readFileSync(fileURLToPath(new URL('./SettingsModal.tsx', import.meta.url)), 'utf8');

describe('the settings navigation', () => {
  it('drops the sections the wiring table marks as shells', () => {
    expect(source).toContain('settingsSection(key)?.wired !== false');
  });

  it('hides a group once every item in it is a shell', () => {
    expect(source).toContain('if (visible.length === 0) return null');
  });
});

/**
 * G03：通知分区里曾有一行「时间 08:00」——官方语言包**没有任何可配摘要时刻的键**，而它带着按钮式
 * 外框与 ChevronsUpDown 图标、看着能点却是个无处理器/无输入的裸 DIV。伪造的可供性已删，钉住别回来。
 */
describe('the notifications panel does not fake a daily-digest time', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('has no hard-coded digest clock in the rendered markup', () => {
    // 断言只看 JSX 文本节点，不看注释（注释里会引用那条旧文案作说明）。
    expect(panels).not.toMatch(/>\s*08:00\s*</);
  });

  it('keeps the real daily-email switch and its verbatim sentence', () => {
    // 句子的唯一声明处迁到了 NOTIFICATION_EVENTS（生产代码不再手抄），此处钉常量值＋面板的引用形态。
    expect(NOTIFICATION_EVENTS.dailyTasks.label).toBe(
      '接收当天所有任务和提醒的摘要。你还将收到今天截止的摘要推送通知。',
    );
    expect(panels).toContain('{NOTIFICATION_EVENTS.dailyTasks.label}');
    expect(panels).toContain("setSwitch('notifyDaily'");
  });
});

/**
 * About 面板曾写死官方版本号 `3.6.3`（本包实际是 `0.1.0`），并挂着一枚 inert 的「检查更新」——
 * 它点了不跳转、不提示，且宿主根本不存在（G1533：本仓无 Tauri updater 通道）。两处都不该在。
 */
describe('the about panel does not fake its version or an update button', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('prints the real version from the package manifest', () => {
    expect(panels).toContain('APP_VERSION');
    expect(panels).not.toMatch(/>\s*3\.6\.3\s*</);
  });

  it('has no update-check button, since nothing hosts one', () => {
    expect(panels).not.toMatch(/>\s*检查更新\s*</);
  });
});

/**
 * G164 改头像：相机按钮此前是 inert（无 onClick），头像也只渲染首字母。上传通道与 `User.image`
 * 其实都在，缺的只是接线。钉住它别再退回成装饰。
 */
describe('the account panel can actually change the avatar', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('wires the camera button to a file picker rather than leaving it inert', () => {
    expect(panels).toMatch(/aria-label="更换头像"[\s\S]{0,400}onClick=/);
    expect(panels).toContain('avatarInputRef.current?.click()');
  });

  it('routes the upload through the shared channel and the offline kernel', () => {
    expect(panels).toContain("from '@/lib/upload-client'");
    expect(panels).toMatch(/applyLocal\(\{\s*table:\s*'user'[\s\S]{0,80}image/);
  });

  it('renders the stored image, falling back to the initial', () => {
    expect(panels).toContain('avatarUrl ?');
    expect(panels).toContain('profile?.name?.slice(0, 1)');
  });

  it('re-syncs when the async profile lands', () => {
    // profile 由父组件异步取 ⇒ 初值那刻是 null，没有这条 effect 头像永远停在首字母。
    expect(panels).toMatch(/if \(profile\?\.image\) setAvatarUrl\(profile\.image\)/);
  });
});

/**
 * G164 改名：名称行右侧那枚铅笔此前是**裸 `<EditIcon />`**——不是按钮、没有处理，看着能点却
 * 什么也不做。官方明确有改名，且 `user.name` 在 sync 白名单里、`promptDialog` 也在 ⇒ 接线即可。
 */
describe('the account panel can actually rename the user', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('makes the pencil a real button with a handler', () => {
    expect(panels).toMatch(/aria-label="更改名称"[\s\S]{0,200}onClick=/);
    expect(panels).toContain('renameSelf');
  });

  it('collects the new name through the shared dialog, not window.prompt', () => {
    expect(panels).toContain('promptDialog');
    expect(panels).not.toContain('window.prompt');
  });

  it('writes the name through the offline kernel', () => {
    expect(panels).toMatch(/applyLocal\(\{\s*table:\s*'user'[\s\S]{0,80}name:\s*trimmed/);
  });

  it('treats an empty or unchanged name as no edit', () => {
    expect(panels).toMatch(/if \(!trimmed \|\| trimmed === displayName\) return/);
  });
});

/**
 * G179：空间分区曾有两枚**无宿主**的假控件——「更换空间图标」相机按钮（无 onClick）与
 * 「空间名称」右侧的裸 `<EditIcon />`。本地没有 `Space` 实体（空间名由用户 name 派生、
 * 图标是固定渐变）⇒ 没有可写入的地方，只能移除。判据与 G164 同一把尺，结论相反：
 * 那边有 `user.name`／`image` 列可接，这边没有。
 */
describe('the space panel does not fake controls it cannot back', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('has no space-icon camera button', () => {
    // 只看属性位置，不看注释（注释里会引用那条旧标签作说明）。
    expect(panels).not.toMatch(/aria-label="更换空间图标"/);
  });

  it('still shows the space name and its icon', () => {
    expect(panels).toContain('空间名称');
    expect(panels).toContain('<SpaceIcon');
  });

  it('keeps the avatar camera button, which has a real column behind it', () => {
    // 与空间图标形成对照：这枚相机是接真了的（写 user.image）。
    expect(panels).toContain('更换头像');
    expect(panels).toContain('avatarInputRef.current?.click()');
  });
});

/**
 * G164 邮箱那半：账户面板「电子邮件」行右侧也曾有一枚裸 `<EditIcon />`，但本地**没有任何改
 * 邮箱能力**（全仓零 `changeEmail`／`updateEmail`／`verifyEmail`），`email` 还被 spec 5.1
 * 排除在 sync 白名单外 ⇒ 无宿主。按同一把尺移除，邮箱只作只读展示。
 */
describe('the email row is read-only, not a fake edit affordance', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('renders the address without a pencil next to it', () => {
    // 账户那一格内只留一枚 pencil（名称，包在真按钮里）；邮箱那格不再有。
    const start = panels.indexOf("case 'account'");
    const block = panels.slice(start, panels.indexOf("case 'subscription'"));
    expect((block.match(/<EditIcon \/>/g) ?? []).length).toBe(1);
    expect(block).toContain('你用于此帐户的电子邮件地址。');
  });

  it('has no email-change capability anywhere, which is why it cannot be wired', () => {
    // 钉住"移除"的理由：能力不存在，接不了。（只查调用式，避开注释里的说明文字。）
    expect(panels).not.toMatch(/\bchangeEmail\s*\(/);
    expect(panels).not.toMatch(/\bupdateEmail\s*\(/);
  });
});

/**
 * G163：通知分区末尾那行「空间」承诺"你可以覆盖单个空间的这些设置"、还带 ChevronRight 暗示可进入，
 * 但本地**没有任何按空间的通知存储**（零 spaceId／perSpace 列）⇒ 承诺了一个不存在的功能。
 * 按同一把尺移除该行，三档真开关保留。
 */
describe('the notifications panel does not promise per-space overrides it cannot store', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('drops the per-space row', () => {
    expect(panels).not.toContain('覆盖单个空间的这些设置');
  });

  it('keeps the three real switches and their verbatim sentences', () => {
    expect(panels).toContain("setSwitch('notifyComments'");
    expect(panels).toContain("setSwitch('notifyReminders'");
    expect(panels).toContain("setSwitch('notifyDaily'");
    // 同上：提醒句的唯一声明处是 NOTIFICATION_EVENTS，面板只渲染常量。
    expect(NOTIFICATION_EVENTS.reminders.label).toBe('当需要提醒时，Craft 会向你发送通知。');
    expect(panels).toContain('{NOTIFICATION_EVENTS.reminders.label}');
  });
});

/**
 * About 面板末尾两枚按钮此前都是 inert（无 onClick）。按同一把尺分开处置：社媒那枚有可推导的
 * 目标（官方串逐字给了句柄）故**接线**；反馈那枚的宿主是官方一个 13 键弹窗（G1414 记其"没上屏、
 * 实际长什么样未证"）而本地零反馈弹窗基建，故**移除**。
 */
describe('the about panel buttons are wired or removed, never inert', () => {
  const panels = readFileSync(
    fileURLToPath(new URL('./SettingsPanels.tsx', import.meta.url)),
    'utf8',
  );

  it('opens the official X profile with noopener', () => {
    expect(panels).toMatch(/window\.open\('https:\/\/x\.com\/CraftDocs', '_blank', 'noopener,noreferrer'\)/);
  });

  it('drops the feedback button it cannot host', () => {
    expect(panels).toContain('有想法、功能请求或发现了错误');
    expect(panels).not.toMatch(/<button[^>]*>\s*意见反馈\s*<\/button>/);
  });
});
