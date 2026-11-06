# Podyx MCP

[![Checks](https://github.com/Studio-Red-Barcelona/podyx-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/Studio-Red-Barcelona/podyx-mcp/actions/workflows/test.yml)

[Русский](README.ru.md) · [Client setup](docs/clients.md) · [Tools](docs/tools.md) · [Releases](https://github.com/Studio-Red-Barcelona/podyx-mcp/releases) · [Contributing](CONTRIBUTING.md) · [Agent instructions](AGENTS.md)

Unofficial, local-first community MCP server for studio owners using Podyx. Connect your own studio key and ask an assistant about availability, bookings, clients, packages, prices and business performance.

**150 API-backed tools: 65 reads/previews enabled by default and 85 opt-in mutations.** Full v2 operations plus v1 reads and reports, without duplicate v1/headless routes. No Kommo dependency. Includes MCP prompts for a monthly review, finding a session time and preparing a booking change.

## Quick start

Requires Node.js **22+**, npm and a Podyx studio key. Use a key with only the permissions you need. API access must be enabled for the studio; creating commercial entries may need additional Podyx enablement.

Download a client plugin from [Releases](https://github.com/Studio-Red-Barcelona/podyx-mcp/releases) once a release is published, or use this source checkout:

```sh
git clone https://github.com/Studio-Red-Barcelona/podyx-mcp.git
cd podyx-mcp
npm ci
mkdir -p ~/.config/podyx-mcp
cp .env.example ~/.config/podyx-mcp/.env
chmod 600 ~/.config/podyx-mcp/.env
```

Edit that private file: replace `YOUR_PODYX_API_KEY` with a key from **Podyx → Settings → API keys**. Leave `PODYX_ENABLE_WRITES=false` for initial use. Do not paste secrets into chat. `PODYX_ENV_FILE` can point to another private environment file; existing process environment values take precedence.

```sh
npm run configs
```

Merge the appropriate file from `generated/` into your client's settings. They contain absolute local paths and no secret values. The client launches the server on demand. Running `npm start` manually waits for MCP input on stdin; this is normal.

## Clients

| Client | Local connection | Included integration |
|---|---|---|
| Cursor | stdio | Plugin package + generated `mcp.json` entry |
| Codex | stdio | OpenAI plugin package + generated TOML entry |
| Claude Code | stdio | Native plugin with masked key setup + MCP config |
| Claude Desktop | stdio | Generated desktop MCP config |
| ChatGPT | Local server through Secure MCP Tunnel; desktop plugin where supported | OpenAI plugin package + tunnel setup instructions |
| Grok | Local MCP bridge through xAI API, or HTTPS tunnel for Grok web | Runnable local bridge + remote MCP template |

See **[client setup](docs/clients.md)**. Local execution means the MCP process and studio key stay on your machine; selected tool results still go to the AI provider you use. Plugin ZIPs are installation artifacts, not published marketplace listings.

## Examples

- “Find available two-hour slots next Saturday for this setup.”
- “Compare last month's revenue, capacity and customer activity with the previous month.”
- “Explain the surcharge in this booking quote.”
- “How many eligible sessions remain in this client's package?”
- With writes enabled: “Preview extending this session by one hour; show the difference before changing it.”

**[Tool reference](docs/tools.md)** lists every tool and route. Inputs use `path`, `query` and `body` containers matching Podyx. Responses retain upstream pagination and exact decimal amounts. Tools perform one API call per invocation; assistants must follow pagination rather than infer totals from one page.

## Enable changes

Set `PODYX_ENABLE_WRITES=true` in the private environment file and restart/refresh the MCP connection. Podyx key permissions still apply. Every mutation also needs `confirm: true` and a UUID `idempotency_key` that the caller persists before submitting. Preview first where the API provides one; the assistant should obtain authorization for the actual change.

The server stores only an operation name and an argument hash for each request UUID, not the request body or customer data. Default location: `~/.local/state/podyx-mcp`. It rejects reuse of a UUID with changed arguments. This local journal is scoped to the API origin and key; Podyx remains authoritative for replay and financial identities. A timeout is **unknown**, not proof of failure. See [design and limitations](docs/design.md).

## HTTP mode

Generate a separate random token, for example with `openssl rand -hex 32`, and save it as `PODYX_MCP_TOKEN` in the private file. Then:

```sh
npm run start:http
```

The server listens only on `127.0.0.1:3333`, uses Streamable HTTP at `/mcp`, and requires `Authorization: Bearer <PODYX_MCP_TOKEN>`. This token is distinct from the Podyx API key. Set `PODYX_ALLOWED_HOSTS` to exact hostnames if a reverse proxy preserves its public Host header. Browser Origin requests are rejected; this endpoint is for MCP clients and server-side bridges. Do not remove authentication to get a public tunnel working.

## Build community plugin packages

```sh
npm run check
npm test
npm run package:plugins
npm run test:packages
```

`dist/` contains complete Cursor, Claude Code and OpenAI plugin folders and ZIPs, including installed runtime dependencies. Node.js must still be installed. Packaging and archive smoke tests require the `zip` / `unzip` commands (available on macOS and most Linux development machines). Run packaging once into a fresh `dist/`; it refuses existing output directories. Source templates in `plugins/` intentionally do not contain the runtime.

Repository marketplaces are included for Cursor, Claude Code and OpenAI; build packages before using them. Public directory submission, signing, OAuth hosting and account-side installation are separate from building a local package.

## Automated releases

PRs and merges to `main` run tests on Node.js 22/24, enforce matching plugin versions and build/test all release archives. After successful main checks, Release Please opens a version/changelog PR. Merging that PR produces the GitHub tag and release with the tested archives. Configure the GitHub remote, allow Actions to create PRs, and set branch rules once; see **[release pipeline and required checks](docs/releases.md)**.

## Development and status

```sh
npm ci
npm run check
npm test
```

Tests cover schema validation, safe defaults, request construction, error/redaction behavior, uncertain-write recovery, the local Grok bridge, real MCP stdio and real Streamable HTTP on loopback. Upstream behavior is mocked: **live studio operations and client UIs require testing with your own key/account**. No production studio data is bundled.

API snapshots were retrieved on 2026-11-05. Specs are vendored so startup needs no documentation download. Changes to upstream API contracts require review and a new release. MIT for original implementation; see [NOTICE.md](NOTICE.md) for upstream material.

The public repository is maintained by **@d3rky**. Changes use reviewed PRs with passing checks; see [repository governance](docs/repository.md). This project is not affiliated with or endorsed by Podyx.
