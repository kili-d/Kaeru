# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS build-deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM build-deps AS build
COPY index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
RUN npm run build

FROM base AS prod-deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS runner
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=5173 \
  DATABASE_URL=file:/data/kaeru.sqlite \
  ALLOW_REGISTRATION=false \
  ENABLE_TOTP=false \
  LOG_LEVEL=info

RUN groupadd --system --gid 1001 kaeru \
  && useradd --system --uid 1001 --gid kaeru --home-dir /app kaeru \
  && mkdir -p /data \
  && chown -R kaeru:kaeru /data /app

COPY --from=prod-deps --chown=kaeru:kaeru /app/node_modules ./node_modules
COPY --from=build --chown=kaeru:kaeru /app/dist ./dist
COPY --chown=kaeru:kaeru package.json package-lock.json ./
COPY --chown=kaeru:kaeru server ./server
COPY --chown=kaeru:kaeru src/data ./src/data
COPY --chown=kaeru:kaeru src/state ./src/state

USER kaeru
EXPOSE 5173
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const port = process.env.PORT || 5173; fetch('http://127.0.0.1:' + port + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
