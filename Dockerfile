FROM node:18-alpine

RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Force fresh layer - 2026-04-25
COPY apps/api ./apps/api
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --filter api...

WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

EXPOSE 3001
CMD ["node", "dist/main.js"]
