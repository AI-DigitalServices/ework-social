FROM node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy the api app
COPY apps/api ./apps/api
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the api
WORKDIR /app/apps/api
RUN pnpm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
