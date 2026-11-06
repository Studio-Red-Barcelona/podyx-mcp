# Client setup

Checked against public client documentation on 2026-11-05. An installable package is not a marketplace publication. Actual availability depends on client version, workspace policy and account features. Tests validate the wire protocol with the official MCP client; each vendor UI still needs account-side validation.

## Shared private configuration

The server loads `~/.config/podyx-mcp/.env` unless `PODYX_ENV_FILE` specifies another file. Set `PODYX_API_KEY` there. Existing environment variables take precedence. Keep this file private and outside the repository. On Windows, the default is under the user's home directory too; create `.config/podyx-mcp/.env` there. Use an absolute Node executable in desktop configs if Node is not on the GUI application's PATH.

Run `npm run configs` after cloning/moving the repository. Files in `generated/` use this checkout's absolute path and actual Node executable. Merge entries into existing configs rather than replacing the whole file. Never put the example placeholder in a live configuration.

## Cursor

Merge `generated/cursor.json` into `~/.cursor/mcp.json` (personal) or `.cursor/mcp.json` (project). Reload Cursor and enable `podyx` in MCP settings. This directly runs the local server and reads the shared private environment file.

Alternatively build packages and use the native Cursor plugin under `dist/podyx-cursor`. The repository's `.cursor-plugin/marketplace.json` references it. The plugin declares `PODYX_API_KEY` and `PODYX_ENABLE_WRITES` variables for configuration; it uses `${CURSOR_PLUGIN_ROOT}` for its bundled executable path.

Sources: [MCP configuration](https://prod.cursor.com/docs/mcp), [plugin structure and variables](https://prod.cursor.com/docs/reference/plugins).

## Codex

Append `generated/codex.toml` to your Codex `config.toml` (usually `~/.codex/config.toml`), then reload the MCP connection or restart Codex. It contains only the local command and arguments. For CLI registration, use `codex mcp add podyx -- node /absolute/path/to/podyx-mcp/src/cli.mjs`. The private file supplies the studio key.

For a plugin install, build packages first. The repo marketplace at `.agents/plugins/marketplace.json` references `dist/podyx-openai`. Open this repository in the desktop app, refresh/restart the app and install `podyx` from the `podyx-community` local source if that surface supports local marketplaces. The package includes portable `plugin.json`, `mcp.json` and a Codex compatibility manifest. Avoid installing both the plugin and direct MCP config simultaneously.

Sources: [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [local plugin marketplaces](https://developers.openai.com/plugins/build/plugins).

## Claude Code

Recommended native plugin: build packages, then run `claude --plugin-dir /absolute/path/to/podyx-mcp/dist/podyx-claude`. The plugin prompts for a masked Podyx API key using sensitive user configuration. Writes default to false. Requires a Claude Code version supporting plugin `userConfig`.

For ongoing marketplace installation, add this repository with `/plugin marketplace add /absolute/path/to/podyx-mcp`, then `/plugin install podyx@podyx-community`.

Fallback for older versions: merge `generated/claude-code.json` into your project's `.mcp.json`, or use `claude mcp add --transport stdio --scope user podyx -- node /absolute/path/to/podyx-mcp/src/cli.mjs`. The direct configuration uses the shared private file. Confirm discovery with `/mcp`.

Source: [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference).

## Claude Desktop

Merge `generated/claude-desktop.json` into the desktop MCP configuration, then restart the application. On macOS this is normally `~/Library/Application Support/Claude/claude_desktop_config.json`. The desktop configuration is distinct from the Claude Code plugin manifest; use the generated direct MCP config here.

## ChatGPT

### Private local use through Secure MCP Tunnel

The MCP still runs on your machine. OpenAI's tunnel client forwards authorized requests to the local stdio process; you do not need the HTTP endpoint or a public incoming port.

1. Configure your private Podyx environment file and verify local stdio discovery first.
2. Follow OpenAI's current Secure MCP Tunnel setup to create a tunnel associated with the intended ChatGPT workspace. Install the current official `tunnel-client` release.
3. Use a local stdio profile with the command in `generated/chatgpt-tunnel-command.txt`. Example (replace paths and the tunnel ID):

```sh
tunnel-client init --sample sample_mcp_stdio_local --profile podyx --tunnel-id YOUR_TUNNEL_ID --mcp-command 'node /absolute/path/to/podyx-mcp/src/cli.mjs'
tunnel-client doctor --profile podyx --explain
tunnel-client run --profile podyx
```

The tunnel client's OpenAI control-plane credentials are configured separately, as described in its documentation; the Podyx key stays in the local private file. For paths containing spaces, use the quoted command generated by `npm run configs`. Keep the tunnel process running.

4. In ChatGPT Plugins, choose **Add custom MCP server → Connection: Tunnel**, select the tunnel, and complete installation. For this private stdio setup the tunnel is the access boundary; no extra OAuth server is implemented by this package.

### Desktop plugin package

The versioned `dist/podyx-openai-<version>.zip` is also the OpenAI desktop plugin package. Local/repo installation depends on the desktop surface. The package declares that a local executor is required. Publishing a desktop-only plugin in the public directory currently requires OpenAI partner allowlisting and review; merely distributing this ZIP does not bypass that requirement. Use the private tunnel route if your surface cannot load a local package.

Sources: [custom MCP connection](https://developers.openai.com/api/docs/guides/custom-mcp-server), [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels), [desktop-only plugins](https://developers.openai.com/plugins/deploy/desktop-only).

## Grok

### Local bridge, no tunnel

Grok function calling can drive a local MCP client. Included `scripts/grok.mjs` launches Podyx MCP as a child process, advertises only read-only tools and executes requested calls locally. Model inference runs through the paid xAI API. Set `XAI_API_KEY` and `GROK_MODEL` in your environment or private env file, then:

```sh
node scripts/grok.mjs 'Find available two-hour studio slots next Saturday'
```

Choose an available tool-capable model from your xAI account. The bridge forces Podyx writes off even if they are enabled elsewhere. It supports up to eight model turns per request. This is a runnable local CLI adapter, not an extension installed inside grok.com.

### Grok web / remote MCP

Grok's custom web connector requires a publicly reachable URL; it cannot connect directly to stdio or localhost. Start authenticated HTTP mode and expose `/mcp` through your chosen HTTPS tunnel. Add the exact tunnel hostname to `PODYX_ALLOWED_HOSTS` if necessary.

In Grok Connectors, create a custom connector with the HTTPS `/mcp` URL and configure server authentication if the UI supports the required bearer header. If it only offers OAuth, this server does not implement OAuth: use the local bridge or the xAI API remote-MCP integration instead. Do not disable authentication.

`generated/grok-tool.json` is an xAI Responses API MCP tool template with an explicit Authorization header placeholder and a small read-only allowlist. Supply the separate MCP token, not the Podyx API key. No tunnel or connector is automatically created by this repository.

Sources: [Grok connectors](https://docs.x.ai/grok/connectors), [remote MCP headers](https://docs.x.ai/developers/tools/remote-mcp), [local function execution](https://docs.x.ai/developers/tools/function-calling).

## Verify after connecting

Ask the assistant to list Podyx tools, inspect the authenticated key/studio and read the catalog. The default discovery returns 65 read/preview tools and three prompts. Try an availability or monthly-summary read with actual studio data. Confirm writes are absent before enabling mutation tools. API refusals such as 401/403 are reported, not automatically bypassed with a different key.
