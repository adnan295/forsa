FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_DOMAIN=nayvo.store
ENV EXPO_PUBLIC_DOMAIN=${EXPO_PUBLIC_DOMAIN}

RUN npm run expo:static:build \
  && npm run server:build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system forsa \
  && useradd --system --gid forsa --create-home forsa

COPY --from=build --chown=forsa:forsa /app/node_modules ./node_modules
COPY --from=build --chown=forsa:forsa /app/server_dist ./server_dist
COPY --from=build --chown=forsa:forsa /app/server/templates ./server/templates
COPY --from=build --chown=forsa:forsa /app/static-build ./static-build
COPY --from=build --chown=forsa:forsa /app/assets ./assets
COPY --from=build --chown=forsa:forsa /app/app.json ./app.json
COPY --from=build --chown=forsa:forsa /app/package.json ./package.json

USER forsa
EXPOSE 5000

CMD ["npm", "run", "server:prod"]
