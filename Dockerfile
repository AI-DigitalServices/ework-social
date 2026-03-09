FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --filter api...

WORKDIR /app/apps/api
RUN pnpm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
