# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS runtime
LABEL org.opencontainers.image.title="Podyx MCP" \
    org.opencontainers.image.description="Local-first community MCP server for Podyx studios" \
    org.opencontainers.image.source="https://github.com/Studio-Red-Barcelona/podyx-mcp" \
    org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production \
    PODYX_STATE_DIR=/var/lib/podyx-mcp
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY spec/ ./spec/
COPY LICENSE NOTICE.md ./
RUN mkdir -p /var/lib/podyx-mcp \
    && chown node:node /var/lib/podyx-mcp \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
EXPOSE 3333
ENTRYPOINT ["node", "src/cli.mjs"]
