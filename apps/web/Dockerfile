# Build context is the REPO ROOT:
#   docker build -f apps/web/Dockerfile .

FROM node:24-bookworm-slim AS base
WORKDIR /repo


FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci


FROM deps AS build

COPY packages/shared packages/shared
RUN npm run build --workspace @bistro/shared

COPY apps/web apps/web

# ---------------------------------------------------------------------------
# Both of these are needed at BUILD time, for different reasons.
#
# NEXT_PUBLIC_* is inlined into the client bundle, so passing it only at runtime
# does nothing: the string is already baked into the JavaScript the browser
# downloaded. This is what makes a canonical URL come out as "bistro.example".
#
# API_INTERNAL_URL is less obvious and was caught by testing the running container.
# `rewrites()` in next.config.ts is not evaluated per request — Next compiles the
# destinations into .next/routes-manifest.json during the build. Supplied only at
# runtime, the manifest keeps the default "http://localhost:4000", which inside a
# container is the web container talking to itself, and every proxied API call
# returns 500 while the API sits there perfectly healthy.
#
# It is ALSO needed at runtime, because server components call the API directly on
# each request. Same value in both places; compose passes it twice on purpose.
# ---------------------------------------------------------------------------
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

# The build prerenders pages that fetch the menu. fetchMenu returns null instead of
# throwing when the API is unreachable, so this succeeds either way and the pages
# fill in on their first revalidation. A build must not depend on a backend being
# awake.
RUN npm run build --workspace @bistro/web


# ---------------------------------------------------------------------------
# Runtime. Only the standalone bundle, which already contains the exact subset of
# node_modules the server needs — so there is no npm install in this stage.
# ---------------------------------------------------------------------------
FROM base AS runtime

ENV NODE_ENV=production

# The standalone output reproduces the monorepo layout, which is why
# outputFileTracingRoot had to point at the repo root: without it this tree would be
# missing the hoisted packages.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
# Static assets and the public folder are deliberately not traced into standalone
# and have to be copied alongside it. Forgetting this is why a containerised Next
# app renders with no CSS.
COPY --from=build --chown=node:node /repo/apps/web/.next/static apps/web/.next/static
# public/ is currently empty — every icon is an inline SVG component and the
# photography comes from Unsplash — but it is kept in the repo with a .gitkeep and
# copied anyway. Dropping this line would mean the first favicon or robots.txt
# anyone adds is silently absent from the image, which is a much worse afternoon
# than an empty directory.
COPY --from=build --chown=node:node /repo/apps/web/public apps/web/public

USER node

ENV PORT=3000
# Without this the server binds to localhost inside the container and nothing
# outside it can connect, which looks exactly like a crashed app.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
