# syntax=docker/dockerfile:1

# ---------- base: pnpm, at the version package.json pins ----------
# Deliberately NOT `corepack enable`: with no version to resolve, corepack asks
# the registry for "latest stable" and verifies the response against the signing
# keys bundled in the Node image. Those keys are frozen at image-build time, so
# once the registry rotates them every build fails with
# "Cannot find matching keyid". Installing pnpm directly skips that machinery.
FROM node:22.8.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Reading the version out of packageManager keeps one source of truth, so the
# image can never silently build with a different pnpm than CI or a developer.
COPY package.json ./
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")" \
  && pnpm --version

# ---------- deps: full install, including native builds ----------
FROM base AS deps
# bcrypt compiles a native addon; build it here against this image's musl libc.
RUN apk add --no-cache python3 make g++
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build: generate the Prisma client and compile ----------
# Dev dependencies are still present here on purpose: this stage is also what
# docker-compose runs `prisma migrate deploy` from, since the Prisma CLI is a dev
# dependency and the runtime image ships without it.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-lock.yaml tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma generate
RUN pnpm run build

# ---------- prod-deps: the dependency tree the runtime actually needs ----------
FROM build AS prod-deps
RUN pnpm prune --prod

# ---------- runtime: no compiler, no sources, non-root ----------
FROM node:22.8.0-alpine AS runtime
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV APP_PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
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
