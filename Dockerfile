FROM node:22-bookworm-slim AS base

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl dumb-init \
	&& rm -rf /var/lib/apt/lists/*

RUN corepack enable

FROM base AS deps

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

RUN yarn install --immutable

FROM deps AS build

ENV NODE_ENV=development

COPY . .

RUN yarn prisma generate
RUN yarn build

FROM base AS runtime

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/core/config ./src/core/config
COPY --from=build /app/src/core/graphql ./src/core/graphql

EXPOSE 4200

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]