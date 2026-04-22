FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# This Dockerfile expects the repository root as the build context.
COPY orot-web/package.json ./package.json
COPY orot-web/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile

COPY orot-web/. ./

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=https://orot.dev
ARG NEXT_PUBLIC_CLIENT_ERROR_LOGGING=true
ARG INTERNAL_API_ORIGIN=http://localhost:4000
ARG WEB_IMAGE_REMOTE_PATTERNS=https://orot.dev/uploads/**
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_CLIENT_ERROR_LOGGING=${NEXT_PUBLIC_CLIENT_ERROR_LOGGING}
ENV INTERNAL_API_ORIGIN=${INTERNAL_API_ORIGIN}
ENV WEB_IMAGE_REMOTE_PATTERNS=${WEB_IMAGE_REMOTE_PATTERNS}

RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# This Dockerfile expects the repository root as the build context.
COPY orot-web/package.json ./package.json
COPY orot-web/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
