import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setUploadDirForTest, saveUpload, saveUploadBuffer, readUpload, deleteUpload, resolveUploadPath } from './storage-local';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'crafty-up-'));
  setUploadDirForTest(dir);
});

afterEach(() => setUploadDirForTest(null));

const file = (name: string, body: string) =>
  new File([Buffer.from(body, 'utf8')], name, { type: 'text/plain' });

describe('storage-local', () => {
  it('saveUpload 落盘并返回 uuid 化的名字与字节数', async () => {
    const r = await saveUpload(file('a.txt', 'hello'));
    expect(r.name).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(r.size).toBe(5);
    expect((await readdir(dir)).length).toBe(1);
  });

  it('saveUpload 对没有合法扩展名的原始名丢弃扩展名', async () => {
    const r = await saveUpload(file('noext', 'x'));
    expect(r.name).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('saveUploadBuffer 拼上给定扩展名', async () => {
    const r = await saveUploadBuffer(Buffer.from('abc'), '.png');
    expect(r.name.endsWith('.png')).toBe(true);
    expect(r.size).toBe(3);
  });

  it('readUpload 原样读回', async () => {
    const r = await saveUploadBuffer(Buffer.from('round-trip'), '.txt');
    expect((await readUpload(r.name)).toString('utf8')).toBe('round-trip');
  });

  it('deleteUpload 对不存在的文件不抛错（吞掉）', async () => {
    await expect(deleteUpload('missing.txt')).resolves.toBeUndefined();
  });

  it('resolveUploadPath 拒绝非法文件名', () => {
    // brief 原输入是 '../etc/passwd'，但 path.basename 会把它化简成 'passwd'（NAME_RE 通过），
    // 旧实现同样不抛 —— 那是 brief 的用例缺陷，不是实现缺陷。抛错守的是字符白名单。
    expect(() => resolveUploadPath('bad name.txt')).toThrow('非法文件名');
  });

  it('resolveUploadPath 把目录穿越中和到上传目录内', () => {
    // basename 之后，任何解析结果都必须仍落在 uploadDir() 里。
    // 注意 '..%2f..%2fx' 这类含 '%' 的输入会被字符白名单直接拒掉，属于上一条用例的范畴。
    for (const evil of ['../etc/passwd', 'a/../../b.png', '/abs/path.txt', 'sub/dir/f.txt']) {
      const resolved = resolveUploadPath(evil);
      expect(path.dirname(path.resolve(resolved))).toBe(path.resolve(dir));
    }
  });

  it('resolveUploadPath 拒绝逃出上传目录的纯点号名', () => {
    // NAME_RE 放行 '.' 与 '..'，而 path.join(dir,'..') 会真的跳到父目录 —— 这是唯一真实的逃逸口子。
    // 基线（以及搬迁初稿）都会把 '..' 放行成 <dir>/.. ；Task 5 之后 GET /api/files/.. 的名字
    // 也会走到这里，所以这一条必须锁死。
    expect(() => resolveUploadPath('..')).toThrow('非法文件名');
    expect(() => resolveUploadPath('.')).toThrow('非法文件名');
  });
});
