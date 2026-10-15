import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { shareViewFromRow } from './local-records';

/**
 * `gap.md` G1508／G1509 —— 官方那一档事实：分享面板的**读**也走本机镜像，断链时看得见现值；
 * 而且面板开着时他端改档，这一侧的选中态会跟着翻新（不用重开面板）。
 *
 * 修好之前两处形状：
 * - 挂载读是 `getOrCreateShare`（服务端 action）⇒ 断链时面板停在「生成链接中…」，档位现值读不到；
 * - 面板不订阅 store ⇒ 他端推得到（G1491 补的广播），但开着的面板只在挂载那一刻读一次，不翻新。
 */
const DIALOG = join(process.cwd(), 'src', 'components', 'share', 'ShareDialog.tsx');
const RECORDS = join(process.cwd(), 'src', 'components', 'sync', 'local-records.ts');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('shareViewFromRow：镜像行 → 面板视图（G1508）', () => {
  it('整行齐备时逐字段解出（口令只报有没有，明文不外传）', () => {
    const view = shareViewFromRow('s-1', {
      documentId: 'doc-1',
      token: 'tok-abc',
      slug: 'my-page',
      isPublished: true,
      passcode: 'secret',
      permission: 'edit',
      shareVersion: 7,
    });
    expect(view).toEqual({
      id: 's-1',
      token: 'tok-abc',
      slug: 'my-page',
      isPublished: true,
      hasPasscode: true,
      permission: 'edit',
      shareVersion: 7,
    });
    expect(JSON.stringify(view)).not.toContain('secret');
  });

  it('口令列为空串 ⇒ hasPasscode:false（不是 undefined：面板要据此把开关掰回去）', () => {
    expect(shareViewFromRow('s-1', { passcode: '' }).hasPasscode).toBe(false);
    expect(shareViewFromRow('s-1', {}).hasPasscode).toBe(false);
  });

  it('slug 缺列 ⇒ undefined，显式 null ⇒ null（两者要分得开：undefined 不覆盖面板 state）', () => {
    expect(shareViewFromRow('s-1', {}).slug).toBeUndefined();
    expect(shareViewFromRow('s-1', { slug: null }).slug).toBeNull();
  });

  it('token 不是字符串 ⇒ undefined（面板据此判定"镜像里没有可用行"，回落 action）', () => {
    expect(shareViewFromRow('s-1', { token: 42 }).token).toBeUndefined();
  });

  it('shareVersion 只认数字；缺列留 undefined（不拿 0 冒充"服务端那一枚"）', () => {
    expect(shareViewFromRow('s-1', { shareVersion: '3' }).shareVersion).toBeUndefined();
    expect(shareViewFromRow('s-1', {}).shareVersion).toBeUndefined();
  });

  it('isPublished／permission 缺列留 undefined，不臆造成 false／默认档', () => {
    const view = shareViewFromRow('s-1', {});
    expect(view.isPublished).toBeUndefined();
    expect(view.permission).toBeUndefined();
  });
});

describe('接线闸：面板读侧先吃镜像、并订阅 store 变化（G1508／G1509）', () => {
  const dialog = read(DIALOG);

  it('挂载那一趟先读本地镜像（findDocumentShare），镜像没有才回落 getOrCreateShare', () => {
    const mount = /useEffect\(\(\) => \{\s*if \(!open\) return;[\s\S]*?reloadShareFromMirror\(\{ seedSlugDraft: true \}\)[\s\S]*?\n  \}, \[open, link, documentId, reloadShareFromMirror\]\)/.exec(dialog)?.[0];
    expect(mount, '找不到"挂载先读镜像"那一趟（判据失效：被断言的对象不存在）').toBeTruthy();
    // 镜像先手：getOrCreateShare 只能出现在镜像未命中的回落分支之后。
    const mirrorIdx = mount!.indexOf('reloadShareFromMirror({ seedSlugDraft: true })');
    const actionIdx = mount!.indexOf('getOrCreateShare(');
    expect(actionIdx, '挂载那一趟没有回落 getOrCreateShare＝首次分享建不出行').toBeGreaterThan(-1);
    expect(actionIdx, '回落 action 跑在了读镜像之前＝又变回"挂载即读服务端"（G1508）').toBeGreaterThan(mirrorIdx);
  });

  it('订阅 document_share 的 store 变化并重读镜像（他端改档时开着的面板跟着翻新，G1509）', () => {
    expect(
      /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{\s*if \(table !== 'document_share'\) return;[\s\S]*?reloadShareFromMirror\(\)/.exec(dialog)?.[0],
      '面板没订阅 document_share＝他端推得到而开着的面板不翻新（G1509）',
    ).toBeTruthy();
  });

  it('翻新那一路只读镜像、不回落 action（建行那一步归挂载那一趟，别把服务端通路搬进每次推送）', () => {
    const sub = /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{[\s\S]*?\n    \}\);/.exec(dialog)?.[0] ?? '';
    expect(sub, '订阅体里没有重读镜像').toContain('reloadShareFromMirror');
    expect(sub, '订阅体里又出现了服务端 action＝每次推送都欠一趟服务端').not.toContain('getOrCreateShare');
  });

  it('镜像行 → 视图的解在 local-records 里（纯函数可单测），面板不自己拼字段', () => {
    expect(read(RECORDS)).toContain('export function shareViewFromRow');
  });
});

describe('接线闸：翻新读不覆盖用户敲着的 slug 草稿（G1522）', () => {
  const dialog = read(DIALOG);

  it('`slugDraft` 只在"种子那一趟"被写：翻新读里只有那一处、且带 seedSlugDraft 守卫', () => {
    const body = /const reloadShareFromMirror = useCallback\([\s\S]*?\n  \);/.exec(dialog)?.[0];
    expect(body, '找不到 reloadShareFromMirror（判据失效）').toBeTruthy();
    const writes = body!.match(/setSlugDraft\(/g) ?? [];
    expect(writes.length, `翻新读里出现了 ${writes.length} 处 setSlugDraft ⇒ 用户敲了一半的地址会被推送盖掉（G1522）`).toBe(1);
    expect(body!, '那一处 setSlugDraft 没有被 seedSlugDraft 守卫住').toMatch(/if \(opts\?\.seedSlugDraft\) setSlugDraft\(/);
  });

  it('挂载那一趟显式播种草稿、订阅那一趟不传（同一函数、两处行为不同）', () => {
    expect(
      /reloadShareFromMirror\(\{ seedSlugDraft: true \}\)/.exec(dialog)?.[0],
      '挂载那一趟没播种草稿 ⇒ 打开面板时输入框是空的',
    ).toBeTruthy();
    const sub = /getSyncManager\(\)\.onStoreChanged\(\(table\) => \{[\s\S]*?\n    \}\);/.exec(dialog)?.[0] ?? '';
    expect(sub, '订阅体里没重读镜像').toContain('reloadShareFromMirror');
    expect(sub, '订阅那一路也播种了草稿 ⇒ G1522 复发').not.toContain('seedSlugDraft');
  });
});
