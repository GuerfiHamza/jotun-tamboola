# syntax=docker/dockerfile:1

# =====================================================================
# jotun-tamboola — production image (Next.js 16 standalone)
# x86_64 VPS. Build directly on the server:
#   docker compose up -d --build
# or build locally (same arch) and ship:
#   docker build -t jotun:latest .
# =====================================================================

# ---- deps: install node_modules (incl. sharp native binaries) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Installed inside the image (x86_64), so sharp/libvips pull the matching
# binaries. .dockerignore excludes the host node_modules so nothing stale
# leaks in.
COPY package.json package-lock.json* ./
RUN npm ci --include=optional

# ---- builder: compile Next.js ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time env stubs (real secrets are injected at runtime via compose).
# next/font fetches Geist from Google Fonts at build time — the builder needs
# outbound network for that (it does, during `docker build`).
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at runtime — must come in as a build ARG, not a compose `environment:`.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
RUN npm run build

# ---- runner: minimal runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone server + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# pdfkit / exceljs / sharp are kept external (serverExternalPackages) and load
# asset/native files from node_modules at runtime — standalone tracing usually
# copies them, but we copy explicitly to be safe.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp   ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfkit  ./node_modules/pdfkit
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/exceljs ./node_modules/exceljs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img    ./node_modules/@img

# Persistent invoice uploads (mounted as a volume in compose)
RUN mkdir -p /app/private_uploads && chown nextjs:nodejs /app/private_uploads

USER nextjs
EXPOSE 3000

# Drizzle migrations are applied separately (see compose 'migrate' note);
# the server just runs the standalone entrypoint.
CMD ["node", "server.js"]