# syntax=docker/dockerfile:1
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS runtime
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
