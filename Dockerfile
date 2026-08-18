# syntax=docker/dockerfile:1

# ---------- deps: install with the lockfile the repo actually uses ----------
FROM node:22.8.0-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build: generate the Prisma client, then compile ----------
FROM node:22.8.0-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma generate
RUN pnpm run build
# Drop dev dependencies from the tree we are about to copy forward.
RUN pnpm prune --prod

# ---------- runtime: no compiler, no sources, non-root ----------
FROM node:22.8.0-alpine AS runtime
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV APP_PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# node:alpine ships an unprivileged `node` user; run as it rather than root.
USER node

EXPOSE 3000

# Matches the readiness probe the app exposes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.APP_PORT||3000)+'/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
