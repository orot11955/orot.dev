FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY orot-api/package.json ./package.json
COPY orot-api/yarn.lock ./yarn.lock
COPY orot-api/prisma/ ./prisma/
COPY orot-api/prisma.config.ts ./
COPY orot-api/tsconfig.json ./
RUN yarn install --frozen-lockfile

COPY orot-api/. ./
RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY orot-api/package.json ./package.json
COPY orot-api/yarn.lock ./yarn.lock
COPY orot-api/prisma/ ./prisma/
COPY orot-api/prisma.config.ts ./
COPY orot-api/tsconfig.json ./
RUN yarn install --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY orot-api/src/prisma ./src/prisma

RUN mkdir -p /app/uploads

COPY orot-api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/entrypoint.sh"]
