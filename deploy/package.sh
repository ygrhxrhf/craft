#!/usr/bin/env bash
# Package Crafty for the 1 GB Debian target.
#
# Run this on a machine with plenty of RAM — NOT on the target box. `next build`
# on this project peaks at 2-4 GB and will OOM a 964 MiB VM.
#
#   npm ci
#   npm run contract:emit     # generates src/prisma/contract.json
#   npm run build             # emits .next/standalone
#   ./deploy/package.sh
#
# Produces crafty-deploy-<utc-stamp>.tar.gz in the repo root.

set -euo pipefail

cd "$(dirname "$0")/.."

for f in .next/standalone/server.js src/prisma/contract.json src/collab/server.mjs; do
  if [ ! -e "$f" ]; then
    echo "error: missing $f — run 'npm run contract:emit' and 'npm run build' first" >&2
    exit 1
  fi
done

STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="$(pwd)/crafty-deploy-${STAMP}.tar.gz"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

echo "==> staging Next.js standalone"
mkdir -p "$STAGE/web"
cp -a .next/standalone/. "$STAGE/web/"
cp -a public "$STAGE/web/public"
mkdir -p "$STAGE/web/.next"
cp -a .next/static "$STAGE/web/.next/static"

# 运行时密钥只来自 /etc/crafty/crafty.env。仓库根的 `.env` 是本机开发用的；
# Next 的 env 加载会把它单独复制进 standalone（trace excludes 管不到这一支），
# 所以打包前必须再剥一次。
echo "==> stripping local env files"
find "$STAGE/web" -maxdepth 1 -type f -name '.env*' -delete

echo "==> staging collab + tldraw servers"
mkdir -p "$STAGE/collab"
cp -a src/collab/*.mjs "$STAGE/collab/"
rm -f "$STAGE/collab"/*.test.mjs
cp deploy/collab-package.json "$STAGE/collab/package.json"

echo "==> staging prisma contract"
# Both src/prisma/db.ts and src/collab/persist.mjs resolve the contract as
# path.resolve(process.cwd(), 'src/prisma/contract.json'). The two processes
# do **not** share a cwd: systemd starts collab at /opt/crafty (root), while the
# Next standalone server chdirs into web/ before the first DB touch. So each
# needs its own copy — a single root copy makes /api/health (and every DB page)
# fail with ENOENT under web/.
mkdir -p "$STAGE/src/prisma"
cp -a src/prisma/contract.json "$STAGE/src/prisma/contract.json"
mkdir -p "$STAGE/web/src/prisma"
cp -a src/prisma/contract.json "$STAGE/web/src/prisma/contract.json"

echo "==> staging deploy assets"
mkdir -p "$STAGE/deploy"
cp -a deploy/systemd deploy/postgres deploy/backup "$STAGE/deploy/"
cp -a deploy/Caddyfile deploy/env.template deploy/README.md "$STAGE/deploy/"

# 构建机是 Windows（core.autocrlf=true），仓库文件到工作区是 CRLF。目标机是 Debian：
# `#!/usr/bin/env bash\r` 会变成 bad interpreter，systemd/Caddy/PG 配置也可能解析失败。
# `.gitattributes` 已强制 LF，这里再按实际字节归一化一次，然后拒发仍带 CR 的产物。
echo "==> normalizing deploy asset line endings"
# 用 Node 而不是 sed/grep：MSYS 的 grep -r 会按文本模式读文件（CR 模式命中每一行），
# 而 bash 的 $'\r' 在本项目的 Git Bash 下过 find -exec 会退化成空串（两台机器上都实测过）。
node -e '
const fs = require("fs"), path = require("path");
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(process.argv[1])) {
  const s = fs.readFileSync(f, "utf8");
  if (s.includes("\r")) fs.writeFileSync(f, s.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
}
' "$STAGE/deploy"
chmod +x "$STAGE"/deploy/backup/*.sh
node -e '
const fs = require("fs"), path = require("path");
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const bad = walk(process.argv[1]).filter(f => fs.readFileSync(f, "utf8").includes("\r"));
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
' "$STAGE/deploy" || { echo "error: CR still present in staged deploy assets" >&2; exit 8; }

echo "==> packing"
tar -czf "$OUT" -C "$STAGE" web collab src deploy

# 最后一道：产物里出现任何 .env 都拒发（密钥只走目标机的 /etc/crafty/crafty.env）。
if tar -tzf "$OUT" | grep -qE '(^|/)\.env(\.|$)'; then
  echo "error: $OUT contains a .env file — refusing to ship local secrets" >&2
  rm -f "$OUT"
  exit 7
fi

echo "==> wrote $OUT"
echo "    scp $OUT root@<host>:/opt/"
