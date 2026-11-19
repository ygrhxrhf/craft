import type { Page } from '@playwright/test';

export type EditorPanelTab = '插入' | '格式' | '样式' | '信息';

/**
 * G1660：顶栏那排右栏 tab 图标撤掉后，右栏的入口是顶栏右侧的「编辑器工具面板」开关，
 * 停在哪一档由面板自己的 tablist 决定——官方就是这个形态（tab 条在右栏顶部，不在顶栏）。
 *
 * 这些用例原来直接点顶栏的 tab 图标，现在统一走这里。两条路：
 *   - 面板已经开着（桌面 rail 或紧凑 Sheet）：**直接点档**。紧凑布局下 Sheet 一开，顶栏就落进
 *     `aria-hidden`，按名字根本找不到那枚开关——所以先看 tablist 在不在，在就只切档。
 *   - 面板关着：点开关开面板（它会回到上一档），再点目标档。
 */
export async function openEditorPanel(page: Page, tab: EditorPanelTab) {
  const tablist = page.getByRole('tablist', { name: '编辑器工具' });
  const tabButton = () => tablist.getByRole('tab', { name: tab, exact: true });

  // 刷新后「开没开」是持久态，而首帧总是先画成关着，hydrate 之后才打开（G956 的设计）。
  // 这段时间里读到 aria-pressed=false 就会去点开关，把本来要自己打开的面板点关掉。
  // 先给面板 2 秒自己开出来；它确实关着时才走开关那条路。
  if ((await tablist.count()) === 0) {
    await tablist.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  }

  if ((await tablist.count()) > 0) {
    if ((await tabButton().getAttribute('aria-selected')) !== 'true') await tabButton().click();
    return;
  }

  // exact：右栏那枚「关闭编辑器工具面板」的名字里也含这几个字，不加 exact 会两枚命中。
  const toggle = page.getByRole('button', { name: '编辑器工具面板', exact: true });
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
  // 开关重开时会回到上一档，可能正好就是这一档；而点已选中的 tab 会把面板关掉，所以先读再点。
  if ((await tabButton().getAttribute('aria-selected')) !== 'true') await tabButton().click();
}
