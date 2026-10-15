import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isLazyLoadError, LAZY_LOAD_DESC, LAZY_LOAD_TITLE } from './lazy-load';

/**
 * `gap.md` G90 —— 懒加载 chunk 失败要有**专门**文案（官方 `alert.lazy.load.*`）。
 * 这里钉两件事：判据能把 chunk 失败从别的错误里分出来；边界文件里那两句是**官方逐字**。
 */
describe('懒加载失败判据（G90）', () => {
  it('打包器/浏览器实际抛的那几种 message 都认', () => {
    const cases = [
      new Error('Loading chunk 1234 failed. (missing: /_next/static/chunks/x.js)'),
      new Error('ChunkLoadError: Loading chunk 5 failed.'),
      new Error('Failed to fetch dynamically imported module: /_next/x.js'),
      new Error('error loading dynamically imported module'),
      new Error('Importing a module script failed.'),
      'Loading chunk 9 failed', // 非 Error 的抛出物也认
    ];
    for (const c of cases) expect(isLazyLoadError(c), String(c)).toBe(true);
  });

  it('别的错误不认（否则那条专门文案会被通用兜底吞掉）', () => {
    for (const c of [
      new Error('Unauthorized'),
      new Error('Cannot read properties of undefined'),
      null,
      undefined,
      {},
      '',
    ]) {
      expect(isLazyLoadError(c), String(c)).toBe(false);
    }
  });

  it('官方两句话逐字（`feature-catalog.md:422-423`：请检查你的网络连接或重新加载页面。／某些功能无法加载）', () => {
    expect(LAZY_LOAD_TITLE).toBe('某些功能无法加载');
    expect(LAZY_LOAD_DESC).toBe('请检查你的网络连接或重新加载页面。');
  });

  it('边界文件确实按判据选文案，而不是写死一句', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'app', 'error.tsx'), 'utf8');
    expect(src, '错误边界应当用 isLazyLoadError 分流').toContain('isLazyLoadError(error)');
    expect(src, '懒加载那支要用官方逐字常量').toContain('LAZY_LOAD_TITLE');
    expect(src, 'chunk 失败给的是"重新加载页面"').toContain('重新加载页面');
    expect(src, '第一行必须是 use client（错误边界是客户端组件）').toMatch(/^'use client';/);
  });
});
