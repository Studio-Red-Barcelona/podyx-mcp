import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { version } from '../src/version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['cursor', 'claude', 'openai']) {
  const temporary = await mkdtemp(join(tmpdir(), `podyx-${name}-standalone-`));
  const client = new Client({ name: 'standalone-package-test', version });
  try {
    execFileSync('unzip', ['-q', join(root, 'dist', `podyx-${name}-${version}.zip`), '-d', temporary]);
    const config = JSON.parse(await readFile(join(temporary, name === 'claude' ? '.mcp.json' : 'mcp.json'), 'utf8'));
    const entry = config.mcpServers.podyx;
    const args = entry.args.map((argument) => argument.replace(/\$\{(?:PLUGIN_ROOT|CLAUDE_PLUGIN_ROOT|CURSOR_PLUGIN_ROOT)\}/g, temporary));
    await client.connect(new StdioClientTransport({ command: process.execPath, args,
      env: { PATH: process.env.PATH, PODYX_API_KEY: 'pdyx_fake_test', PODYX_ENABLE_WRITES: 'false', PODYX_ENV_FILE: '/nonexistent-podyx-package-test-env' }, stderr: 'pipe' }));
    assert.equal((await client.listTools()).tools.length, 65);
    assert.equal(client.getServerVersion().version, version);
    console.log(`${name}: extracted archive starts independently and discovers 65 tools`);
  } finally { await client.close(); await rm(temporary, { recursive: true }); }
}
