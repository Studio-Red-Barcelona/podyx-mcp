# Podyx openai plugin

Build the distributable from the repository with `npm ci && npm run package:plugins`. Use the complete `dist/podyx-openai` folder or ZIP, not this template alone. The archive includes the runtime and dependencies; Node.js 22+ must be installed and available to the desktop app.

Create a private `~/.config/podyx-mcp/.env` with `PODYX_API_KEY=...` and `PODYX_ENABLE_WRITES=false`, or set PODYX_ENV_FILE to an existing private file. No secret is embedded in the manifest. Local plugin loading is surface-dependent; use the generated Codex MCP config or Secure MCP Tunnel if local plugin installation is unavailable. Directory publication is a separate reviewed process.

See the repository docs/clients.md for client-specific setup, transport limitations and verification.
