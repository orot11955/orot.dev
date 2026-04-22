FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# This Dockerfile expects the repository root as the build context.
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

# This Dockerfile expects the repository root as the build context.
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
COPY orot-api/docker-migrate.sh /migration.sh
RUN chmod +x /entrypoint.sh /migration.sh

EXPOSE 4000

CMD ["/entrypoint.sh"]
