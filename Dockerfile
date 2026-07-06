FROM node:22-bookworm-slim AS base

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl dumb-init \
	&& rm -rf /var/lib/apt/lists/* \
	&& npm install -g npm@11

FROM base AS deps

COPY package.json package-lock.json ./

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --include=dev --legacy-peer-deps

FROM deps AS build

ENV NODE_ENV=development

COPY . .

RUN npx prisma generate
RUN npx nest build

FROM base AS runtime

ENV PORT=4000
ENV APPLICATION_PORT=4000

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./dist/prisma
COPY --from=build /app/src/core/config ./src/core/config
COPY --from=build /app/src/core/graphql ./src/core/graphql

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]