import { expect, type Page } from '@playwright/test';

/**
 * 侧栏「文件夹」分区（SidebarSection 的 div.py-1）。
 * 区段头按钮的可及名是「收起文件夹／展开文件夹」，用锚定正则卡住它，不会被
 * 名字里带「文件夹」的行误伤。
 */
export function folderSection(page: Page) {
  return page
    .locator('aside')
    .locator('div.py-1')
    .filter({ has: page.getByRole('button', { name: /^(收起|展开)文件夹$/ }) })
    .first();
}

/**
 * 等文件夹树正向就绪：加载态清掉，且渲染出文件夹行或空态。
 *
 * 两个判据都必须对得住真实 DOM：
 * - 加载态文案是 `LOADING = '加载中…'`（`src/lib/browse/official-copy.ts`，U+2026），
 *   不是 ASCII 三个点——按 `'加载中...'` 找永远 count 0，等于没等；
 * - 区段在**行还没来时**就已经有 2 个按钮（区段头 + `action` 位的新建文件夹），
 *   所以 `> 1` 在 t+0 就成立。判据取 `> 2`，即至少一行文件夹。
 */
export async function waitFolderTreeReady(page: Page, timeoutMs = 90_000) {
  const section = folderSection(page);
  await expect(section.getByText(/加载中/)).toHaveCount(0, { timeout: timeoutMs });
  await expect
    .poll(
      async () => {
        if ((await section.getByRole('button').count()) > 2) return true;
        return (await section.getByText('暂无文件夹').count()) > 0;
      },
      { timeout: Math.min(30_000, timeoutMs) },
    )
    .toBe(true);
}

/**
 * 展开「文件夹」分区到全量行。两层折叠：
 * - 区段头（SidebarSection）收着时先点开；
 * - 「再显示 N 项」（G391）只渲染前 20 行——craft-test 有 57 个根夹，新建的夹按
 *   order/createdAt 排在同组末尾，必在折叠线以下。
 *
 * 折叠行是**树重载后的产物**：刚建夹/改名的瞬间，树还在 loading，`再显示` 这一行会短暂
 * 不在 DOM 里。所以这里不是"看一眼有没有、没有就跳过"，而是有界重试——每轮重新等就绪，
 * 直到「显示较少」出现（已展开的幂等快路）。跳过会让调用方拿着折叠窗口里的行数当基线。
 */
export async function expandFolderSection(page: Page, deadlineMs = 90_000) {
  const deadline = Date.now() + deadlineMs;
  const aside = page.locator('aside');
  const expandHeader = aside.getByRole('button', { name: '展开文件夹', exact: true });
  const section = folderSection(page);
  const more = section.getByRole('button', { name: /^再显示 \d+ 项$/ });
  const less = section.getByRole('button', { name: '显示较少', exact: true });

  while (Date.now() < deadline) {
    await waitFolderTreeReady(page, Math.max(5_000, Math.min(30_000, deadline - Date.now())));
    if (await expandHeader.count()) await expandHeader.click();
    if (await less.count()) return;
    if (await more.count()) {
      await more.click();
      await expect(less).toBeVisible({ timeout: 20_000 });
      return;
    }
    // 行数没越过阈值（小账号）或树正在重载：给一拍再重新判断。
    await page.waitForTimeout(1_000);
  }
  // 走完重试仍没有折叠行：要么行数不足 20（本就无需展开），要么树始终没到全量。
  if (await less.count()) return;
  await expect(more.or(less)).toHaveCount(0);
}
