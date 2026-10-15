import { describe, expect, it } from 'vitest';

import { UPDATE_RELOAD_MESSAGE, shouldShowUpdateBanner } from './update-banner';

/**
 * `gap.md` G73 —— 网页版专属更新横幅。官方逐字（`i18n-zh.tsv:3879`／`longtail.md:48`）。
 */
describe('网页版更新横幅（G73）', () => {
  it('官方那句逐字', () => {
    expect(UPDATE_RELOAD_MESSAGE).toBe('请刷新页面以获取最新版本的应用。');
  });

  it('有 waiting 的新 SW 且已被接管过 ⇒ 显示（＝真有更新）', () => {
    expect(shouldShowUpdateBanner({ waiting: true, hasController: true })).toBe(true);
  });

  it('首次安装（waiting 非空但没有 controller）⇒ 不显示', () => {
    expect(shouldShowUpdateBanner({ waiting: true, hasController: false })).toBe(false);
  });

  it('没有 waiting ⇒ 不显示', () => {
    expect(shouldShowUpdateBanner({ waiting: false, hasController: true })).toBe(false);
    expect(shouldShowUpdateBanner({ waiting: false, hasController: false })).toBe(false);
  });
});
