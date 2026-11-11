// src/components/share/share-dialog-copy.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * G931/G932/G933 接线闸：分享浮层的官方文案逐字来自 `invite-copy.ts`，
 * 档位触发器展示的是所选档名本身（不是状态词），尾部是帮助链接。
 */
const DIALOG = join(process.cwd(), 'src', 'components', 'share', 'ShareDialog.tsx');
const COPY = join(process.cwd(), 'src', 'lib', 'share', 'invite-copy.ts');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('分享浮层官方文案接线（G931/G932/G933）', () => {
  const dialog = read(DIALOG);
  const copy = read(COPY);

  it('G931 头部：标题／说明／邀请输入／邀请按钮都渲染 invite-copy 的逐字常量', () => {
    expect(dialog).toContain('{INVITE_TITLE}');
    expect(dialog).toContain('{INVITE_DESCRIPTION}');
    expect(dialog).toContain('placeholder={INVITE_EMAIL_PLACEHOLDER}');
    expect(dialog, '邀请按钮没有渲染官方「邀请」标签').toContain('INVITE_SEND_LABEL');
    expect(copy).toContain("'邀请协作'");
    expect(copy).toContain("'即使没有 Craft 帐户，也能轻松与任何人协作'");
    expect(copy).toContain("'添加邮箱以邀请'");
    expect(copy).toContain("'邀请'");
  });

  it('G931 尾部：帮助链接「共享功能如何使用？」逐字渲染', () => {
    expect(dialog).toContain('{SHARE_HELP_LABEL}');
    expect(dialog).toContain('href={SHARE_HELP_HREF}');
    expect(copy).toContain("'共享功能如何使用？'");
  });

  it('G931：复制按钮用成对状态句（复制链接／已复制）', () => {
    expect(dialog).toContain('copied ? COPY_LINK_DONE : COPY_LINK_LABEL');
    expect(copy).toContain("'复制链接'");
    expect(copy).toContain("'已复制'");
  });

  it('G932：档位说明句逐字渲染在选择器之前', () => {
    const descriptionAt = dialog.indexOf('{SHARE_TIER_DESCRIPTION}');
    const triggerAt = dialog.indexOf('data-testid="share-tier-trigger"');
    expect(descriptionAt, '面板没有渲染档位说明句').toBeGreaterThan(-1);
    expect(triggerAt, '面板没有档位触发器').toBeGreaterThan(-1);
    expect(descriptionAt, '档位说明句必须出现在触发器之前（官方顺序）').toBeLessThan(triggerAt);
    expect(copy).toContain("'将链接设置为\"查看\"或\"编辑\"以方便协作，无需 Craft 帐户。'");
  });

  it('G932：官方选择器是下拉单值——收起时只显示当前档名（触发器可开合）', () => {
    expect(
      /aria-haspopup="listbox"/.exec(dialog)?.[0],
      '档位选择器不是下拉单值 ⇒ 与官方载体不同',
    ).toBeTruthy();
    expect(
      /data-testid="share-tier-trigger"[\s\S]{0,400}data-share-permission-value=\{permission \?\? ''\}/.exec(dialog)?.[0],
      '触发器没有把当前档写进 data 属性 ⇒ 测试读不到状态',
    ).toBeTruthy();
    expect(
      /TIERS\.find\(\(tier\) => tier\.value === permission\)\?\.label/.exec(dialog)?.[0],
      '触发器没有按所选档取 TIERS 的 label ⇒ 展示的不是档名',
    ).toBeTruthy();
    const triggerAt = dialog.indexOf('data-testid="share-tier-trigger"');
    const listboxAt = dialog.indexOf('role="listbox"');
    expect(listboxAt, '下拉档位列表不见了').toBeGreaterThan(triggerAt);
  });
});
