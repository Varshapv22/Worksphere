# syntax=docker/dockerfile:1
#
# WorkSphere frontend image (Next.js 15).
#
# NOTE: this Dockerfile assumes `output: 'standalone'` is set in
# frontend/next.config.ts, e.g.:
#
#   const nextConfig: NextConfig = {
#     output: 'standalone',
#   };
#
# That's a one-line addition if the scaffolded project doesn't already have
# it. It makes `next build` emit a minimal, self-contained server bundle
# (.next/standalone) with only the node_modules it actually needs, so the
# runtime image doesn't need a full `npm ci --omit=dev` layer or the whole
# node_modules tree copied in -- much smaller image, faster deploys.

########################################
# Stage 1: dependencies
########################################
FROM node:20-alpine AS deps

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

########################################
# Stage 2: build
########################################
FROM node:20-alpine AS builder

WORKDIR /app

# Next.js inlines NEXT_PUBLIC_* variables into the client bundle at build
# time, so this has to be a build ARG exported as an env var before
# `npm run build` runs -- setting it only at container `docker run` time
# would be too late.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

RUN npm run build

########################################
# Stage 3: runtime (standalone output)
########################################
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output already contains a minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
