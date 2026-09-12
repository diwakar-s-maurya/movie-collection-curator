# Two stages: one that installs every workspace dependency and builds both
# apps, and a runtime carrying only what the two processes open.
#
# nginx fronts the API and serves the built SPA, so the browser sees one
# origin — the session cookie stays same-origin and the API needs no CORS.
# It strips `/api` exactly as the dev proxy does, so the API is mounted at the
# root in both.

ARG NODE_VERSION=24.16.0

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Corepack's shims resolve the version pinned in package.json#packageManager on
# first use, so there is one place the pnpm version is written down.
RUN mkdir -p $PNPM_HOME && corepack enable --install-directory $PNPM_HOME
# Kept off $PNPM_HOME, which holds the shims and must not be mounted over.
ENV PNPM_STORE_DIR=/pnpm-store
WORKDIR /app


FROM base AS build

# OpenSSL is Prisma's engine dependency, needed when `prisma generate` runs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Manifests first: this layer is what the dependency cache keys on, so editing
# source does not reinstall node_modules.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/tmdb/package.json packages/tmdb/

# The API's postinstall runs `prisma generate`, which needs the schema.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/src/env.ts apps/api/src/

RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
  pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM base AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends openssl nginx \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# The port the API listens on, behind nginx. nginx alone is public, on 8080.
ENV PORT=3000

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/tmdb/dist packages/tmdb/dist
COPY --from=build /app/packages/tmdb/package.json packages/tmdb/
COPY --from=build /app/packages/tmdb/node_modules packages/tmdb/node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist

# Carried so `fly.toml`'s release_command can run `prisma migrate deploy`:
# the CLI reads the TypeScript config, which supplies the datasource URL.
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/
COPY --from=build /app/apps/api/src/env.ts apps/api/src/

# Served by nginx, which also proxies `/api` to the API above.
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /entrypoint.sh

# nginx and the temp paths its config names must be writable by the runtime
# user, which is not root.
RUN mkdir -p /var/lib/nginx /var/log/nginx \
  && chown -R node:node /var/lib/nginx /var/log/nginx

WORKDIR /app
EXPOSE 8080
USER node
CMD ["/entrypoint.sh"]
