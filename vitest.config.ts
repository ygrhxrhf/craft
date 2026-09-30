import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 必须是 **/ 前缀：构建上下文等仓库内副本目录里也有 e2e/，用 e2e/** 只能排掉顶层那份
    exclude: ['**/node_modules/**', '**/e2e/**', '**/test-results/**'],
  },
});
