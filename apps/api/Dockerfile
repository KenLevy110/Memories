# Multi-stage build for @memories/api targeting Cloud Run.
# Build context is the repo root so workspace dependencies (packages/shared)
# resolve via the npm workspaces protocol.
#
#   docker build -f apps/api/Dockerfile -t memories-api:local .
#
# The runtime image listens on $PORT (default 8080) per Cloud Run conventions.

FROM node:22-bookworm-slim AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspaces --include-workspace-root --ignore-scripts

COPY packages packages
COPY apps/api apps/api

RUN npm run build -w @memories/api

# Drop dev dependencies so the runtime image only ships production deps.
RUN npm prune --workspaces --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
WORKDIR /app

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/packages/shared ./packages/shared

USER node
EXPOSE 8080
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
