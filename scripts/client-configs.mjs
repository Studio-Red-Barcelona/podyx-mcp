import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { version } from '../src/version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || join(root, 'generated'));
const server = { command: process.execPath, args: [join(root, 'src', 'cli.mjs')] };
await mkdir(output, { recursive: true });
for (const name of ['cursor', 'claude-desktop', 'claude-code']) {
  await writeFile(join(output, `${name}.json`), JSON.stringify({ mcpServers: { podyx: server } }, null, 2) + '\n', { mode: 0o600 });
}
// JSON basic strings are valid TOML basic strings for these absolute paths.
await writeFile(join(output, 'codex.toml'), `[mcp_servers.podyx]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\nstartup_timeout_sec = 30\ntool_timeout_sec = 60\n`, { mode: 0o600 });
const docker = { command: 'docker', args: ['run', '--rm', '-i', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges',
  '--env-file', process.env.PODYX_ENV_FILE || join(homedir(), '.config', 'podyx-mcp', '.env'),
  '--mount', 'type=volume,source=podyx-mcp-state,target=/var/lib/podyx-mcp',
  `ghcr.io/studio-red-barcelona/podyx-mcp:${version}`] };
await writeFile(join(output, 'docker-mcp.json'), JSON.stringify({ mcpServers: { podyx: docker } }, null, 2) + '\n', { mode: 0o600 });
await writeFile(join(output, 'codex-docker.toml'), `[mcp_servers.podyx]\ncommand = "docker"\nargs = ${JSON.stringify(docker.args)}\nstartup_timeout_sec = 120\ntool_timeout_sec = 60\n`, { mode: 0o600 });
await writeFile(join(output, 'chatgpt-tunnel-command.txt'), `${JSON.stringify(server.command)} ${JSON.stringify(server.args[0])}\n`, { mode: 0o600 });
await writeFile(join(output, 'grok-tool.json'), JSON.stringify({ type: 'mcp', server_label: 'podyx',
  server_url: 'https://YOUR_HTTPS_TUNNEL_HOST/mcp',
  headers: { Authorization: 'Bearer YOUR_SEPARATE_PODYX_MCP_TOKEN' },
  allowed_tools: ['podyx_customer_availability', 'podyx_v1_reports_summary', 'podyx_v1_reports_revenue'],
}, null, 2) + '\n');
console.log(`Client templates written to ${output}. Existing client settings were not changed.`);
