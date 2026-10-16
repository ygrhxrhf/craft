import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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
    expect(panels).toContain('接收当天所有任务和提醒的摘要。你还将收到今天截止的摘要推送通知。');
    expect(panels).toContain("setSwitch('notifyDaily'");
  });
});
