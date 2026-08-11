FROM node:18-alpine

RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Real cache-bust: Railway passes RAILWAY_GIT_COMMIT_SHA as a build var when
# declared as an ARG here. Because it changes on every commit, this RUN layer
# (and everything after it, including the COPY below) can never be served from
# a stale cache -- unlike a Dockerfile comment, which does NOT affect the cache
# key and silently did nothing (see the old "Force fresh layer" comment this
# replaces, which never actually busted anything).
ARG RAILWAY_GIT_COMMIT_SHA
RUN echo "Building commit: ${RAILWAY_GIT_COMMIT_SHA:-unknown}"

COPY apps/api ./apps/api
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --filter api...

WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

EXPOSE 3001
CMD ["node", "dist/main.js"]
