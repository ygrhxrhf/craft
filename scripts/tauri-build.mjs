// 桌面壳打包：把生产 web 地址经 TAURI_CONFIG 注入 frontendDist（spec 8.1「首版加载编译期注入的 URL」）。
// 不写死在 tauri.conf.json 里，避免域名/自定义域变更要改仓库。
import { spawnSync } from 'node:child_process';

const url = process.env.CRAFTY_WEB_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

if (!url) {
  console.error('缺少 CRAFTY_WEB_URL（生产 web 服务地址），拒绝打包：否则会打出指向 localhost 的壳。');
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(`CRAFTY_WEB_URL 不是合法 URL: ${url}`);
  process.exit(2);
}
if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
  console.error(`CRAFTY_WEB_URL 协议必须是 http/https，收到 ${parsed.protocol}`);
  process.exit(2);
}
if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
  console.error(`CRAFTY_WEB_URL 指向 ${parsed.hostname}，这是开发地址，拒绝用于打包。`);
  process.exit(2);
}

const tauriConfig = JSON.stringify({ build: { frontendDist: url } });
console.log(`TAURI_CONFIG=${tauriConfig}`);

if (process.env.TAURI_BUILD_DRY_RUN === '1') {
  console.log('dry-run：已校验 URL 并生成 TAURI_CONFIG，未执行 tauri build。');
  process.exit(0);
}

const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(bin, ['tauri', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, TAURI_CONFIG: tauriConfig },
});

process.exit(result.status ?? 1);
