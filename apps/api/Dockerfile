# Build context is the REPO ROOT, not this folder, because npm workspaces put the
# lockfile and the hoisted node_modules up there:
#   docker build -f apps/api/Dockerfile .
# docker-compose.yml already does this.

# ---------------------------------------------------------------------------
# Pinned to bookworm rather than the floating `node:24-slim` tag on purpose.
# Debian 12 carries OpenSSL 3.0, which is what the Prisma schema's
# `debian-openssl-3.0.x` binary target expects. When `24-slim` eventually retags to
# a newer Debian with a newer OpenSSL, a floating tag would break the query engine
# at runtime with a confusing missing-library error, months after this was written.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS base

# node:*-slim ships with NO OpenSSL at all — verified by looking inside the image,
# there is no libssl or libcrypto anywhere. Prisma's query engine links against it,
# so without this the container builds fine and then dies on the first query. This
# is the single most common way Prisma in Docker fails.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo


# ---------------------------------------------------------------------------
# Dependencies. Only the manifests are copied first, so this layer is reused on
# every build where no dependency changed — which is most of them.
# ---------------------------------------------------------------------------
FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# `npm ci` and not `npm install`: it installs exactly the lockfile and fails if the
# two disagree, which is what makes a build reproducible.
RUN npm ci


# ---------------------------------------------------------------------------
# Build. The shared package compiles first because the API imports from its dist.
# ---------------------------------------------------------------------------
FROM deps AS build

COPY packages/shared packages/shared
RUN npm run build --workspace @bistro/shared

COPY apps/api apps/api

# Generate before compiling: the API's types come from the generated client.
RUN npm run db:generate --workspace @bistro/api
RUN npm run build --workspace @bistro/api


# ---------------------------------------------------------------------------
# Migrations. A stage of its own, kept out of the runtime image.
#
# It has the Prisma CLI, which is a devDependency and carries a vulnerable
# transitive package that cannot yet be resolved (see SECURITY-NOTES.md). Keeping
# it in a separate stage is what lets the runtime image stay free of it while
# `prisma migrate deploy` is still runnable from the same Dockerfile.
# ---------------------------------------------------------------------------
FROM build AS migrate
WORKDIR /repo/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]


# ---------------------------------------------------------------------------
# Runtime. Production dependencies only, no compiler, no CLI, no source.
# ---------------------------------------------------------------------------
FROM base AS runtime

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# ---------------------------------------------------------------------------
# Install, then remove the Prisma CLI and its dependency tree — in ONE layer.
#
# `--omit=dev` does not drop it, which is worth knowing: @prisma/client declares
# `prisma` and `typescript` as PEER dependencies, and npm installs peers of a
# production dependency as production. Neither `--omit=dev` nor `--omit=peer`
# removes them — both were tried. So they come out by hand.
#
# Two reasons this is worth the four ugly lines. It is about 110MB of a CLI that a
# running server never invokes. And @prisma/config pulls in deepmerge-ts, which
# carries an advisory with no upgrade path yet (see SECURITY-NOTES.md) — deleting it
# here is what actually keeps it out of the deployed image, rather than assuming
# --omit=dev did.
#
# Migrations are unaffected: they run from the `migrate` stage, which keeps the CLI.
#
# The install and the delete share one RUN because layers are additive: as a separate
# step the `rm` only writes a whiteout entry and the bytes stay in the layer below,
# so the image does not actually shrink. Measured both ways before settling on this.
# ---------------------------------------------------------------------------
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && rm -rf \
      node_modules/prisma \
      node_modules/typescript \
      node_modules/@prisma/config \
      node_modules/@prisma/engines \
      node_modules/@prisma/fetch-engine \
      node_modules/effect \
      node_modules/deepmerge-ts \
      node_modules/c12 \
      node_modules/empathic \
      node_modules/fast-check

# The generated client is copied from the build stage rather than regenerated,
# because regenerating would need the Prisma CLI in this image.
COPY --from=build /repo/node_modules/.prisma node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client node_modules/@prisma/client

COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
# Schema and migrations travel with the image so the migrate stage and any
# operator debugging are looking at the same versions the code was built against.
COPY --from=build /repo/apps/api/prisma apps/api/prisma

# Drop privileges. The `node` user ships with the image; running as root inside a
# container is a free privilege escalation if anything else goes wrong.
USER node

WORKDIR /repo/apps/api

# Render and most platforms inject PORT. env.ts reads it, and this is only the
# default for a plain `docker run`.
ENV PORT=4000
EXPOSE 4000

# No shell form, so the process is PID 1 and receives SIGTERM directly. Wrapped in
# `sh -c` it would not, and the graceful shutdown in server.ts would never run.
CMD ["node", "dist/server.js"]
