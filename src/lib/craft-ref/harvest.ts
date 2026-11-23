import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `docs/craft-ref/features/_harvest/` 是官方客户端的采集产物，被 `.gitignore` 排除：
 * 只有跑过采集的机器上有，CI 与干净检出上没有。引用它的用例按 `hasHarvest()` 跳过，
 * 而不是在 import 阶段抛 ENOENT 把整个测试文件判红。
 */
const HARVEST_DIR = join(process.cwd(), 'docs', 'craft-ref', 'features', '_harvest');

export function hasHarvest(file = 'i18n-zh.tsv'): boolean {
  return existsSync(join(HARVEST_DIR, file));
}

export function readHarvest(file = 'i18n-zh.tsv'): string {
  return readFileSync(join(HARVEST_DIR, file), 'utf8');
}
