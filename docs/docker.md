# Docker installation and deployment

Docker is optional; Node.js/npx and the native plugin packages remain supported. The container bundles production dependencies and runs as `node` (UID 1000). Release platforms are **linux/amd64** and **linux/arm64**.

The release pipeline publishes `ghcr.io/studio-red-barcelona/podyx-mcp` with tags `X.Y.Z`, `vX.Y.Z` and, for stable releases, `latest`. Images become available only after the first release containing Docker support. Pin an exact version or image digest for reproducible deployments.

## Local MCP over stdio

Create a private environment file outside the checkout, for example `~/.config/podyx-mcp/.env`:

```dotenv
PODYX_API_KEY=YOUR_PODYX_API_KEY
PODYX_ENABLE_WRITES=false
```

Replace the placeholder with your own studio key. Keys are supplied at startup, never in the image, build arguments, repository or chat.

```sh
docker run --rm -i \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --env-file /absolute/path/to/private/podyx.env \
  --mount type=volume,source=podyx-mcp-state,target=/var/lib/podyx-mcp \
  ghcr.io/studio-red-barcelona/podyx-mcp:X.Y.Z
```

Replace `X.Y.Z` with a published version. Use `-i`, **without `-t`**, to preserve MCP stdio framing. No host port is needed. Docker must be running and available to the desktop app. Pull the image before connecting, or allow a longer first startup timeout.

The named volume stores the idempotency journal. Keep it across container recreation, especially when enabling writes. Credential namespaces remain separate. `--rm` removes the stopped container, not this named volume.

From a source checkout, `npm run configs` additionally generates `generated/docker-mcp.json` for JSON-based clients and `generated/codex-docker.toml` for Codex. They use the current package version and the private file under your home directory (or `PODYX_ENV_FILE`). Verify that image version has been published. Enable one Podyx connection per client; avoid duplicate native/Docker entries.

ChatGPT's private tunnel can launch the same Docker command. Grok web still needs an HTTPS endpoint; Docker does not change a client's transport support. See [client setup](clients.md).

## HTTP deployment with Compose

Add a separate random MCP token of at least 32 characters to the private environment file:

```dotenv
PODYX_API_KEY=YOUR_PODYX_API_KEY
PODYX_MCP_TOKEN=YOUR_SEPARATE_RANDOM_MCP_TOKEN
PODYX_ENABLE_WRITES=false
```

Generate the token locally, for example with `openssl rand -hex 32`. Keep the env file readable only by its owner.

```sh
export PODYX_ENV_FILE=/absolute/path/to/private/podyx.env
export PODYX_IMAGE=ghcr.io/studio-red-barcelona/podyx-mcp:X.Y.Z
docker compose pull
docker compose up -d
docker compose ps
```

Compose publishes only host `127.0.0.1:3333`, runs with a read-only root filesystem, drops capabilities and retains the journal in a volume. It restarts unless stopped and has a health check. Set `PODYX_HTTP_PORT` for another loopback host port.

Docker forwarding requires `0.0.0.0` **inside the container**. Compose explicitly sets `PODYX_HTTP_HOST=0.0.0.0`; native HTTP still defaults to `127.0.0.1`. The host port remains loopback-only. `/mcp` requires `Authorization: Bearer <PODYX_MCP_TOKEN>` and retains Host/Origin checks.

For remote access, place an authenticated HTTPS proxy/tunnel in front of that port. Add its exact hostname to `PODYX_ALLOWED_HOSTS` if it forwards that Host header. This repository does not automatically create a public server, DNS record, certificate or OAuth service.

### Updates and rollback

Set `PODYX_IMAGE` to a new exact version and run `docker compose pull && docker compose up -d`. Verify health and MCP discovery. Roll back by restoring the previous version and repeating those commands. Keep the state volume: ordinary `docker compose down` preserves it, while `docker compose down -v` deletes the journal.

## Build and test

```sh
docker build --check .
docker build -t podyx-mcp:test .
npm ci --ignore-scripts
npm run test:docker
PODYX_ENV_FILE=/dev/null docker compose config --quiet
```

The smoke test uses fake keys, validation-only calls and an injected mock upstream for the journal. It makes no real studio mutation or payment. It tests non-root execution, image contents, stdio/HTTP discovery, token/Origin protection and state across recreated containers, and removes its uniquely named test containers/volumes. Override the default image with `PODYX_DOCKER_IMAGE`.

For Compose before a release exists, build locally and set `PODYX_IMAGE=podyx-mcp:test`, then use `docker compose up -d --pull never`.

## CI and release publication

Every PR/main run checks Hadolint (warnings fail), Compose configuration, native amd64/arm64 builds, real container smoke tests and Trivy scans. Scans fail on fixable HIGH/CRITICAL vulnerabilities. `Docker checks` aggregates both architectures and scanning; it fails if any prerequisite fails. The recorded protected-branch rules add `Docker lint` and `Docker checks` to required statuses. Dependabot monitors base-image tags/digests and Docker GitHub Actions.

Publishing runs only after successful main checks and verification that a GitHub Release tag points to the exact checked commit. It runs in the same workflow, avoiding the built-in token's release-event trigger limitation. PR jobs never log in to GHCR or push images. The publisher uses `GITHUB_TOKEN` with `packages: write` only in its own job.

Published images include both architectures, OCI labels, BuildKit SBOM and provenance attestations. The job summary records the immutable `image@sha256:...` reference. Re-run failed release jobs to recover interrupted publication. Publishing an image does not restart a user's server; deployment remains operator-controlled through Compose.

### First GHCR publication

The organization must allow this repository's Actions to create container packages. GitHub may initially make a new package private even for a public source repository. After first publication, inspect its visibility and repository access in the organization's **Packages** settings and make it public for anonymous community pulls. No package exists before first publication, so visibility cannot be verified in advance. No extra PAT is required by this pipeline.
