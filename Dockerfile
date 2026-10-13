# syntax=docker/dockerfile:1
# P4 单镜像三启动命令（spec 3.1）
#  - web:     npm run start            (next start, REST / Server Actions / 静态资源)
#  - collab:  npm run start:collab     (node src/collab/server.mjs, Hocuspocus, minInstances≥1)
#  - tldraw:  npm run start:tldraw     (node src/collab/tldraw-server.mjs, 常驻内存 Room)
# 凭证/DATABASE_URL 仅运行时环境变量注入，严禁写入镜像层

FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 生成 Prisma contract 类型与客户端（依赖 @prisma/orm-*，需先 emit）
RUN npm run contract:emit
# Next.js 构建（复用 next.config.ts，产出 .next）
RUN npm run build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 仅拷贝运行必需
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/prisma ./src/prisma
# next.config 需随镜像发布（若改为 standalone 可进一步瘦身）
COPY --from=builder /app/next.config.ts ./next.config.ts

# uploads 目录由 COS 接管时无需持久化；本地驱动下可挂 volume（默认空）
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000 3001 3002

# 默认 web；云托管 collab/tldraw 以同一镜像覆写 CMD：
#   docker run ... crafty:tag npm run start:collab
#   docker run ... crafty:tag npm run start:tldraw
CMD ["npm", "run", "start"]
