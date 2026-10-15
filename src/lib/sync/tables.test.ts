import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLES } from './tables';

/**
 * `gap.md` G03 的教训：设置面板的开关是乐观绘制＋`applyLocal`，而 `applyLocal` 的
 * payload 在服务端与 `def.cols` **求交**——白名单漏一列，那一列就在两个方向上都永远
 * 到不了库，屏上却已经改完了。这条闸从 `Preferences` 那个类型里现读键名，
 * 所以"加了偏好列忘了加白名单"从下一次起当场红（此前 `user` 那行从没被钉过）。
 */
function preferenceColumns(): string[] {
  const src = readFileSync(join(process.cwd(), 'src', 'actions', 'user', 'preferences.ts'), 'utf8');
  const block = /export type Preferences = \{([\s\S]*?)\n\};/.exec(src);
  if (!block) throw new Error('找不到 Preferences 类型＝判据失效，请复核这条闸');
  return [...block[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
}

/**
 * G1489＝G03 那一类的推广。`cols` 是全仓唯一的交集点（push `route.ts:271`／pull `route.ts:92`
 * 双向求交），而 UI 是乐观绘制＋`applyLocal` 立即返回 ⇒ "客户端写了、服务端永远收不到"
 * 在屏上与"没写"完全不可分辨。上一批只钉了 `user` 一张表（从 `Preferences` 类型现读），
 * 这道闸把它钉到**所有表的所有调用点**：静态扫 `src/**`，每一处
 * `applyLocal({ table: '…', patch: { … } })` 的字面量键都必须在该表 `cols` 里。
 *
 * 判不出来的写法（spread `...x`、计算键 `[k]`、`patch` 整体是变量/三元）不判、
 * 单独计数并钉上限（对象简写 `{ k }` 的键名≡标识符，判得出）——新增一处就得先抬基线，
 * 等于逼人来人工复核。
 */
interface Site { file: string; table: string | null; patchKind: 'literal' | 'other'; keys: { name: string; resolved: boolean }[] }

// 现跑测量回填（第 188 批）＝38 个 applyLocal 站点里 70 枚键判得出、13 处判不出来：
// 8 处 `patch` 整体是变量/三元（calendar、tasks-local、TasksView、DocumentEditor、
//   MembersSection、两个树行、toggle-local），
// 4 处 `...spread`（CommentSection 两处、SettingsPanels 的 `{...patch}`、favoritePatch），
// 1 处计算键 `{ [key]: value }`（开关面板——这一路的列名由 G03 那道闸从 `Preferences` 类型现读兜住）。
// 新增一处判不出来的写法就得先抬这条基线，等于逼人来人工复核。
const UNRESOLVED_BASELINE = 13;

/** 服务端写侧把 payload.userId 无条件覆盖成会话 userId 的表（`route.ts:161` 的
 * `USER_ID_TABLES`，用在 `:284`）。这些表的 `userId` 不在 cols 里也不算丢列——列照发，
 * 只是取服务端值（I1(c)，防跨用户转移行）。从服务端源文件现读，不在测试里抄一份。 */
function serverOwnedUserIdTables(): Set<string> {
  const src = readFileSync(join(process.cwd(), 'src', 'app', 'api', 'v1', 'sync', 'route.ts'), 'utf8');
  const block = /const USER_ID_TABLES = new Set\(\[([\s\S]*?)\]\);/.exec(src);
  if (!block) throw new Error('找不到 USER_ID_TABLES＝判据失效，请复核这条闸');
  return new Set([...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 从 openIdx 处的 '{' 找到配对的 '}'（跳过字符串字面量）。 */
function matchBrace(text: string, openIdx: number): number {
  let depth = 0, str: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (str) { if (c === str && text[i - 1] !== '\\') str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** 对象字面量的顶层键。`k:` 与 `{ k }`（简写：键名≡标识符）都能判定；
 *  `...spread`、`[computed]`、带引号的键标为判不出来，由调用方计数钉基线。 */
function topLevelKeys(obj: string): { name: string; resolved: boolean }[] {
  const keys: { name: string; resolved: boolean }[] = [];
  let depth = 0, str: string | null = null, i = 1;
  const ch = (k: number) => obj[k];
  /** 走到下一条顶层条目（顶层逗号处连同逗号一起跨过）；顶层 '}' 则停下。 */
  const toNextEntry = (extra = 0) => {
    let d = depth + extra;
    while (i < obj.length - 1) {
      const c = ch(i);
      if (str) { if (c === str && ch(i - 1) !== '\\') str = null; i++; continue; }
      if (c === '"' || c === "'" || c === '`') { str = c; i++; continue; }
      if ('{(['.includes(c)) { d++; i++; continue; }
      if ('})]'.includes(c)) { if (d === 0) break; d--; i++; continue; }
      if (c === ',' && d === 0) { i++; break; }
      i++;
    }
  };
  while (i < obj.length - 1) {
    const c = ch(i);
    if (str) { if (c === str && ch(i - 1) !== '\\') str = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { keys.push({ name: '(带引号的键)', resolved: false }); i++; continue; }
    if (depth !== 0 || /\s|,|:/.test(c)) { i++; continue; }
    if (c === '[') { keys.push({ name: '(计算键)', resolved: false }); i++; toNextEntry(1); continue; }
    if ('{(['.includes(c)) { depth++; i++; continue; }
    if ('})]'.includes(c)) { depth--; i++; continue; }
    if (c === '.') { keys.push({ name: '...', resolved: false }); i += 3; toNextEntry(); continue; }
    let j = i;
    while (j < obj.length && /[\w$]/.test(ch(j))) j++;
    if (j === i) { i++; continue; }
    let k = j;
    while (k < obj.length && /\s/.test(ch(k))) k++;
    if (ch(k) !== ':') {
      // 简写只有在后面直接是 `,` 或 `}` 时才成立（`{ foo }`＝foo: foo）；其余写法判不出来
      const shorthand = ch(k) === ',' || ch(k) === '}';
      keys.push({ name: obj.slice(i, j), resolved: shorthand });
      if (shorthand) { i = k; continue; }
      i = j;
      continue;
    }
    keys.push({ name: obj.slice(i, j), resolved: true });
    i = k + 1;
    toNextEntry();
  }
  return keys;
}

function scanApplyLocalPatches(): Site[] {
  const sites: Site[] = [];
  const root = join(process.cwd(), 'src');
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(process.cwd().length + 1).replace(/\\/g, '/');
    // 同一文件里的 `const NAME = {…}` 与 `NAME.k = …`：`patch` 走变量时也能把键追回来
    const literals = new Map<string, Set<string>>();
    for (const c of text.matchAll(/\bconst (\w+) = \{/g)) {
      const open = text.indexOf('{', c.index + c[0].length - 1);
      const close = matchBrace(text, open);
      if (close < 0) continue;
      const bag = literals.get(c[1]) ?? new Set<string>();
      for (const k of topLevelKeys(text.slice(open, close + 1))) if (k.resolved) bag.add(k.name);
      literals.set(c[1], bag);
    }
    for (const a of text.matchAll(/\b(\w+)\.(\w+)\s*=[^=]/g)) {
      const bag = literals.get(a[1]);
      if (bag) bag.add(a[2]);
    }
    for (const m of text.matchAll(/applyLocal\(\s*\{/g)) {
      const open = text.indexOf('{', m.index + m[0].length - 1);
      const close = matchBrace(text, open);
      if (close < 0) continue;
      const body = text.slice(open, close + 1);
      const table = /table:\s*'([a-z_]+)'/.exec(body)?.[1] ?? null;
      const pm = /patch:\s*\{/.exec(body);
      if (!pm) {
        // `patch: null` ＝ 删除 op（`ApplyLocalOpts.patch === null`），不带任何列 ⇒ 不可能
        // 出现"白名单外的键"，不算 unresolved（它没有键可判）。
        if (/patch:\s*null\b/.test(body)) {
          sites.push({ file: rel, table, patchKind: 'literal', keys: [] });
          continue;
        }
        const varName = /patch:\s*(\w+)/.exec(body)?.[1] ?? (/[{,]\s*patch\s*[,}]/.test(body) ? 'patch' : null);
        const bag = varName ? literals.get(varName) : undefined;
        if (bag) {
          sites.push({
            file: rel, table, patchKind: 'literal',
            keys: [...bag].map((name) => ({ name, resolved: true })),
          });
          continue;
        }
        sites.push({ file: rel, table, patchKind: 'other', keys: [] });
        continue;
      }
      const po = open + body.indexOf('{', pm.index);
      const pc = matchBrace(text, po);
      const keys = pc < 0 ? [] : topLevelKeys(text.slice(po, pc + 1));
      const spreadFrom = /patch:\s*\{\s*\.\.\.(\w+)/.exec(body)?.[1];
      if (spreadFrom && literals.has(spreadFrom)) {
        for (const name of literals.get(spreadFrom)!) keys.push({ name, resolved: true });
      }
      sites.push({ file: rel, table, patchKind: 'literal', keys });
    }
  }
  return sites;
}

describe('SYNC_TABLES coverage (R-9)', () => {
  it('user 的白名单覆盖设置面板能写的每一列偏好（G03）', () => {
    const user = SYNC_TABLES.find((d) => d.table === 'user');
    expect(user).toBeDefined();
    const prefs = preferenceColumns();
    expect(prefs.length).toBeGreaterThanOrEqual(6);
    for (const col of prefs) expect(user!.cols, `${col} 不在 user.cols ⇒ 它永远出不了这台设备`).toContain(col);
  });

  it('☆ G1505：铸造闸逐表配置（不整体锁死），且每一枚必需键都在 cols 里', () => {
    // 配错的两种死法都在这里红：① 把 folder/favorite 一起锁死＝离线新建文件夹点不动；
    // ② 必需键不在 cols＝payload 求交后永远带不上它＝那张表从此再也建不出行（静默死锁）。
    const gated = SYNC_TABLES.filter(d => (d.createRequires?.length ?? 0) > 0);
    expect(gated.map(d => d.table)).toEqual(['document']);
    for (const d of gated) {
      for (const k of d.createRequires ?? []) {
        expect(d.cols, `${d.table}.${k} 不在 cols ⇒ 离线新建永远过不了这道闸`).toContain(k);
      }
    }
    // 键形判据的本体：离线新建文档确实一定带 title（哪怕空串）——读源码，别只信注释
    const createLocal = readFileSync(
      join(process.cwd(), 'src', 'components', 'sync', 'create-local.ts'), 'utf8');
    expect(createLocal).toMatch(/title: input\.title \?\? ''/);
  });

  it('☆ G1489：全仓每一处 applyLocal 的字面量 patch 键都必须在所属表的 cols 里', () => {
    const sites = scanApplyLocalPatches();
    expect(sites.length, '扫描器一处都没找到＝判据失效，请复核这条闸').toBeGreaterThan(25);
    const byTable = new Map(SYNC_TABLES.map((d) => [d.table, new Set(d.cols)]));
    const serverUserId = serverOwnedUserIdTables();
    const dropped: string[] = [];
    let literalKeys = 0, unresolved = 0;
    for (const s of sites) {
      if (s.patchKind !== 'literal') { unresolved++; continue; }
      const cols = byTable.get(s.table!);
      if (!cols) { dropped.push(`${s.file}：表 ${s.table} 根本没注册`); continue; }
      for (const k of s.keys) {
        if (k.resolved) {
          literalKeys++;
          if (k.name === 'userId' && serverUserId.has(s.table!)) continue;
          if (!cols.has(k.name)) {
            dropped.push(`${s.file} ${s.table}.${k.name} 不在 cols ⇒ 本地已改，却永远推不到服务端`);
          }
        } else unresolved++;
      }
    }
    expect(dropped).toEqual([]);
    // 本批由这道闸第一次照出来的一枚真丢列＝`document.isTemplate`（`create-local.ts` 在写、
    // `contract.prisma:74` 有这一列、而 `DOC_META_COLS` 没有）⇒ 钉住它，防止被下一次重构再打掉。
    expect(byTable.get('document')!.has('isTemplate'), 'isTemplate 又不在 document.cols 里了').toBe(true);
    expect(serverUserId.size, 'USER_ID_TABLES 解析出来是空的＝判据失效').toBeGreaterThanOrEqual(10);
    expect(literalKeys, '字面量键解析得太少＝这条闸在空转').toBeGreaterThan(60);
    expect(unresolved, '新增一处 spread/计算键/变量 patch ⇒ 静态面判不出来，请人工复核后回填基线')
      .toBeLessThanOrEqual(UNRESOLVED_BASELINE);
  });

  it('注册 whiteboard 表：tsCol=metaUpdatedAt，payload 排除 data', () => {
    const wb = SYNC_TABLES.find(d => d.table === 'whiteboard');
    expect(wb).toBeDefined();
    expect(wb!.model).toBe('Whiteboard');
    expect(wb!.tsCol).toBe('metaUpdatedAt');
    expect(wb!.cols).toEqual([
      'id', 'name', 'shareToken', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt',
    ]);
    expect(wb!.cols).not.toContain('data'); // spec: whiteboard payload excludes data
    expect(wb!.id({ id: 'wb-1' })).toBe('wb-1');
  });

  it('注册 document_member：tsCol=updatedAt，列为 contract 实际字段（无 deletedAt）', () => {
    const m = SYNC_TABLES.find(d => d.table === 'document_member');
    expect(m).toBeDefined();
    expect(m!.model).toBe('DocumentMember');
    expect(m!.tsCol).toBe('updatedAt');
    expect(m!.cols).toEqual([
      'id', 'documentId', 'userId', 'role', 'addedBy', 'createdAt', 'updatedAt',
    ]);
    expect(m!.cols).not.toContain('deletedAt');
    expect(m!.id({ id: 'mem-1' })).toBe('mem-1');
  });

  it('注册 notification 表：model=Notification，tsCol=updatedAt，payload 取 contract 全列', () => {
    const n = SYNC_TABLES.find(d => d.table === 'notification');
    expect(n).toBeDefined();
    expect(n!.model).toBe('Notification');
    expect(n!.tsCol).toBe('updatedAt');
    expect(n!.cols).toEqual([
      'id', 'userId', 'kind', 'taskId', 'documentId', 'title',
      'remindAt', 'isResolved', 'resolvedAt', 'createdAt', 'updatedAt',
    ]);
    expect(n!.id({ id: 'ntf-1' })).toBe('ntf-1');
  });

  it('folder cols 包含 id（spec 5.1 全列，payload data 需带 id）', () => {
    const folder = SYNC_TABLES.find(d => d.table === 'folder');
    expect(folder).toBeDefined();
    expect(folder!.cols).toContain('id');
  });

  it('☆ G1491：document_share.cols 必须带档位那两列，否则分享面板改了档他端永远读不到', () => {
    const share = SYNC_TABLES.find(d => d.table === 'document_share');
    expect(share).toBeDefined();
    // push 侧 `route.ts:283` 与 pull 侧 `:104` 都是「与 cols 求交」＝名单外直接丢，
    // 所以 `permission` 不在名单里时，本机面板照样乐观选中、服务端一行没变（G1487 那一族失真）。
    expect(share!.cols, 'permission 不在 document_share.cols ⇒ 档位出不了这台设备').toContain('permission');
    // 这一枚决定的是「按旧档授权的那条访客连接要被认成过期」，漏了它=改档不生效到访客身上。
    expect(share!.cols, 'shareVersion 不在 document_share.cols ⇒ 改档的过期计数出不了这台设备')
      .toContain('shareVersion');
  });

  it('brief Step 7 的所有表组仍在注册表（无移除）', () => {
    const tables = SYNC_TABLES.map(d => d.table);
    const expected = [
      'document', 'folder', 'tag', 'document_tag', 'favorite', 'task',
      'daily_notes_config', 'user',
      'collection', 'collection_item', 'collection_property', 'collection_value', 'collection_view',
      'comment', 'comment_thread', 'document_share', 'document_member',
      'notification',
      'whiteboard',
    ];
    for (const t of expected) expect(tables).toContain(t);
    expect(tables.length).toBe(new Set(tables).size); // 无重复
  });
});
