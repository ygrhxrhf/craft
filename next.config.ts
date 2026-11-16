import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits `.next/standalone` so the server ships without a full node_modules
  // tree — the target box has ~5.8 GB free and cannot afford one.
  output: "standalone",
  experimental: {
    serverActions: {
      // The default 1MB cap silently fails document saves: the whole TipTap JSON
      // goes through one action, and a long note clears it easily.
      bodySizeLimit: "10mb",
    },
  },
  /**
   * `storage-local.ts`（动态 uploadDir）与 `export/pdf.ts`（动态字体路径）都是运行期才
   * 知道路径的 fs 访问，Turbopack 对此的判据是「整仓进 trace」——实测 `.next/standalone`
   * 因此膨胀到 3.9 GB（含 `src-tauri/target` 3.4 GB、`docs` 385 MB、`uploads` 1.3 万文件），
   * 而目标机只剩约 5.8 GB。这里按运行期不需要的目录显式排除；`public` 与
   * `src/prisma/contract.json` 由 `deploy/package.sh` 单独入包，不靠 trace。
   * ☆ 不要把 `src/**` 排掉：`contract.json` 与部分运行期读取的 json 仍在里面。
   */
  outputFileTracingExcludes: {
    '/*': [
      'uploads/**/*',
      'src-tauri/**/*',
      'docs/**/*',
      'e2e/**/*',
      'screenshots/**/*',
      'test-results/**/*',
      'deploy/**/*',
      'scripts/**/*',
      'migrations/**/*',
      'prisma/**/*',
      'public/**/*',
      // `.env` 不在 trace 集合里（Next 的 env 加载会单独把它复制进 standalone，
      // outputFileTracingExcludes 管不到）⇒ 由 `deploy/package.sh` 打包前剥掉并拒发。
    ],
  },
};

export default nextConfig;
