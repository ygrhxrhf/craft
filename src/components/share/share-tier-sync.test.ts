// src/components/share/share-tier-sync.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1491 —— 官方那一档事实：分享权限改了以后，**另一台设备上的分享对话框要能读到最新档**，
 * 而且这个读写在离线时也要成立。
 *
 * 本地此前是三条通路里最坏的一种组合：
 * - 档位写入走 `'use server'` 的 `setSharePermission` ⇒ 离线时整枚面板动不了；
 * - 那枚 action 还**没有**广播（其余三处都有 `emitSyncEventSafe`）⇒ 他端只能等自己下次进面板；
 * - `document_share.cols` 不含 `permission`／`shareVersion` ⇒ 就算客户端改成走内核，增量也带不动。
 *
 * 白名单那一枚由 `src/lib/sync/tables.test.ts` 现读钉住；这里钉的是**接线**：面板确实经 `applyLocal`
 * 写档位、写的那两枚键名确实是白名单里的那两枚、服务端回退那一路确实会广播、以及那个"只增不减"的
 * 过期计数器不会拿镜像里的旧值往回拨。
 */
const DIALOG = join(process.cwd(), 'src', 'components', 'share', 'ShareDialog.tsx');
const ACTIONS = join(process.cwd(), 'src', 'actions', 'document', 'share.ts');
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.prisma');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** 取那一枚处理函数的函数体（箭头函数与 `export async function` 都要能用；靠大括号配对，不靠行号）。 */
function fnBody(src: string, name: string): string {
  const start = new RegExp(`(export async function ${name}\\(|const ${name} = \\()`).exec(src);
  expect(start, `找不到 ${name}＝接线闸的判据失效（被判的对象不存在）`).not.toBeNull();
  const open = src.indexOf('{', src.indexOf(')', start!.index));
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`${name} 的大括号没闭合`);
}

describe('分享档位走离线内核（G1491）', () => {
  const dialog = read(DIALOG);
  const tierBody = fnBody(dialog, 'handleTier');

  it('面板改档走 applyLocal，而不是直连服务端', () => {
    expect(
      /getSyncManager\(\)\.applyLocal\(\{[^}]*table:\s*'document_share'/.exec(tierBody)?.[0],
      '档位仍没经离线内核＝离线时这枚面板依旧整块不可用（G1491）',
    ).toBeTruthy();
  });

  it('写的那两枚键名必须逐字落在白名单里（名字在这里写歪一个字符，增量就被求交丢掉）', () => {
    const patch = /patch:\s*\{([^}]*)\}/.exec(tierBody)?.[1] ?? '';
    const keys = patch.split(',').map((part) => part.split(':')[0].trim()).filter(Boolean);
    expect(keys, `档位补丁的键变成了 ${keys.join('/')}`).toEqual(expect.arrayContaining(['permission', 'shareVersion']));
    const cols = read(join(process.cwd(), 'src', 'lib', 'sync', 'tables.ts'));
    for (const key of keys) {
      const row = /table:\s*'document_share'[^\n]*/.exec(cols)?.[0] ?? '';
      expect(row, `${key} 不在 document_share 那一行的名单里`).toContain(`'${key}'`);
    }
  });

  it('☆☆ 过期计数器只增不减：拿「服务端读回来的那一枚」与「镜像那一枚」的较大值再 +1', () => {
    // 只看镜像会在镜像比服务端旧时把这个数往回拨＝按旧档授权的那条访客连接躲过过期判定。
    expect(
      /Math\.max\(\s*serverVersion\s*,\s*local\?\.shareVersion/.exec(tierBody)?.[0],
      '改档时没有取「服务端那一枚」与「镜像那一枚」的较大值 ⇒ 镜像能把 shareVersion 往回拨',
    ).toBeTruthy();
  });

  it('☆ 本地镜像还没有这一行时也要走内核：连着挂载读到的那一行一起写（一枚 op），而不是退回服务端通路', () => {
    // 否则"离线可用"取决于本机何时恰好拉过这张表——第一次分享那趟必然还是走服务端 action。
    const seed = /if \(shareId\) \{[\s\S]*?applyLocal\(\{[\s\S]*?patch: \{([^}]*)\}/.exec(tierBody)?.[1];
    expect(seed, '没有"镜像缺行时用面板那行补种"那一路').toBeTruthy();
    for (const key of ['documentId', 'token', 'isPublished', 'permission', 'shareVersion']) {
      expect(seed!, `${key} 没在那枚补种补丁里`).toContain(key);
    }
    const branch = tierBody.slice(tierBody.indexOf('if (shareId)'));
    const branchBody = branch.slice(0, branch.indexOf('return;'));
    expect(branchBody, '补种那一路又退回了服务端 action').not.toContain('setSharePermission');
    expect(branchBody).toContain('applyLocal');
  });

  it('服务端回退那一路（本地镜像还没有这一行时）会广播，他端才被告知', () => {
    const body = fnBody(read(ACTIONS), 'setSharePermission');
    expect(body, 'setSharePermission 仍不发广播＝他端只能等下次自己进面板').toContain('emitShare(');
  });

  it('面板读得到 shareVersion：客户端算得出「下一个数」的前提是服务端把当前数回传', () => {
    const src = read(ACTIONS);
    // ☆ 按**出现顺序**判、不要求相邻：`showAuthor`（G38）后来插进了这三枚之间，
    //   旧写法锚的是"hasPasscode 紧挨 permission 紧挨 shareVersion"，一插就假红。
    const order = [/hasPasscode:\s*!!s\.passcode/, /permission:\s*normalizeSharePermission\(s\.permission\)/, /shareVersion:/];
    let cursor = 0;
    for (const re of order) {
      const at = src.slice(cursor).search(re);
      expect(at, `ShareState 少了 ${re} ⇒ 客户端只能拿镜像那一枚往回拨`).toBeGreaterThanOrEqual(0);
      cursor += at + 1;
    }
  });

  it('☆ 白名单不是凭空发明列：contract 里 DocumentShare 真有这两列（否则 push 直接 500）', () => {
    const block = /model DocumentShare \{([\s\S]*?)\n\}/.exec(read(CONTRACT))?.[1] ?? '';
    expect(block, 'contract 里没有 permission 列').toMatch(/^\s*permission\s+String/m);
    expect(block, 'contract 里没有 shareVersion 列').toMatch(/^\s*shareVersion\s+Int/m);
  });
});

/**
 * `gap.md` G38 —— 发布页「显示作者」开关的接线：面板那枚开关必须经 `applyLocal` 写
 * `document_share.showAuthor`（离线也留得住），且该列在 `cols` 白名单与 contract 里都真存在。
 */
describe('发布页「显示作者」接线（G38）', () => {
  const dialog = read(DIALOG);
  const actions = read(ACTIONS);
  const cols = read(join(process.cwd(), 'src', 'lib', 'sync', 'tables.ts'));
  const contract = read(CONTRACT);

  it('开关处理函数经 applyLocal 写 document_share 的 showAuthor 字面量键', () => {
    const body = fnBody(dialog, 'handleShowAuthorChange');
    expect(
      /getSyncManager\(\)\.applyLocal\(\{[^}]*table:\s*'document_share'/.exec(body)?.[0],
      '「显示作者」没走离线内核＝断链时这一列改不动（G38）',
    ).toBeTruthy();
    expect(body, 'patch 里没有 showAuthor 字面量键').toMatch(/patch:\s*\{\s*showAuthor:/);
    expect(body, '镜像缺行时没有服务端回退').toContain('setShareShowAuthor');
  });

  it('showAuthor 在 document_share 白名单与 contract 里都真存在（否则增量被求交丢掉 / push 直接 500）', () => {
    const row = /table:\s*'document_share'[^\n]*/.exec(cols)?.[0] ?? '';
    expect(row, 'showAuthor 不在 document_share.cols ⇒ 这一列出不了这台设备').toContain("'showAuthor'");
    const block = /model DocumentShare \{([\s\S]*?)\n\}/.exec(contract)?.[1] ?? '';
    expect(block, 'contract 里没有 showAuthor 列').toMatch(/^\s*showAuthor\s+Boolean/m);
  });

  it('面板渲染的是逐字常量（开关名＋成对状态句），而不是就地手写的字符串', () => {
    expect(dialog, '面板没有渲染成对状态句').toContain('authorStatusLabel(showAuthor)');
    expect(dialog, '面板没有用官方开关名常量').toContain('SHOW_AUTHOR_LABEL');
    const copy = read(join(process.cwd(), 'src', 'lib', 'share', 'author-visibility.ts'));
    expect(copy, '开关名不是官方逐字').toContain("'显示作者'");
    expect(copy, '状态句（显示）不是官方逐字').toContain("'作者将显示'");
    expect(copy, '状态句（隐藏）不是官方逐字').toContain("'不显示作者'");
  });
});
