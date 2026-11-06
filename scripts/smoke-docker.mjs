import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { version } from '../src/version.mjs';

const image = process.env.PODYX_DOCKER_IMAGE || 'podyx-mcp:test';
const suffix = randomUUID();
const container = `podyx-mcp-smoke-${suffix}`;
const volume = `podyx-mcp-smoke-${suffix}`;
const docker = (args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 60000 }).trim();
const hardening = ['--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges'];
const fakeEnv = ['-e', 'PODYX_API_KEY=pdyx_fake_container_test', '-e', 'PODYX_ENV_FILE=/not-present'];
const token = '0123456789abcdef0123456789abcdef';
const client = (name) => new Client({ name, version });
const assertDiscovery = async (mcp) => {
  assert.equal((await mcp.listTools()).tools.length, 65);
  assert.equal(mcp.getServerVersion().version, version);
  const invalid = await mcp.callTool({ name: 'podyx_customer_availability', arguments: { query: { duration_minutes: -1 } } });
  assert.equal(invalid.isError, true);
};

const info = JSON.parse(docker(['image', 'inspect', image]))[0];
assert.equal(info.Config.User, 'node');
assert.equal(docker(['run', '--rm', ...hardening, '--entrypoint', 'id', image, '-u']), '1000');
const files = JSON.parse(docker(['run', '--rm', ...hardening, '--entrypoint', 'node', image, '-e', 'console.log(JSON.stringify(require("fs").readdirSync("/app")))']));
assert.deepEqual(files.sort(), ['LICENSE', 'NOTICE.md', 'node_modules', 'package.json', 'spec', 'src'].sort());

const stdio = client('docker-stdio-smoke');
try {
  await stdio.connect(new StdioClientTransport({ command: 'docker', args: ['run', '--rm', '-i', ...hardening, ...fakeEnv, image], stderr: 'pipe' }));
  await assertDiscovery(stdio);
  console.log('Container stdio: non-root, read-only, discovery and validation passed.');
} finally { await stdio.close(); }

docker(['volume', 'create', volume]);
try {
  const key = randomUUID();
  const code = `
    import {readConfig} from './src/config.mjs';
    import {createApiClient} from './src/client.mjs';
    import {operations} from './src/catalog.mjs';
    const call=createApiClient(readConfig(),async()=>new Response(JSON.stringify({action:'accepted'})));
    const args={body:{email:process.env.SMOKE_EMAIL},confirm:true,idempotency_key:process.env.SMOKE_KEY};
    try {
      const result=await call(operations.find(o=>o.name==='podyx_create_client'),args);
      if(process.env.SMOKE_EXPECT_CONFLICT==='true'||result.status!==200)throw new Error('Unexpected acceptance');
      console.log('accepted');
    } catch(error) {
      if(process.env.SMOKE_EXPECT_CONFLICT!=='true'||!error.message.includes('different arguments'))throw error;
      console.log('conflict');
    }`;
  const run = (email, conflict) => docker(['run', '--rm', ...hardening, ...fakeEnv,
    '--mount', `type=volume,source=${volume},target=/var/lib/podyx-mcp`,
    '-e', 'PODYX_ENABLE_WRITES=true', '-e', `SMOKE_KEY=${key}`, '-e', `SMOKE_EMAIL=${email}`,
    '-e', `SMOKE_EXPECT_CONFLICT=${conflict}`, '--entrypoint', 'node', image, '--input-type=module', '-e', code]);
  assert.equal(run('first@example.test', false), 'accepted');
  assert.equal(run('changed@example.test', true), 'conflict');
  console.log('Container state: journal survives container recreation and rejects changed retries (mock upstream only).');
} finally { docker(['volume', 'rm', volume]); }

const http = client('docker-http-smoke');
try {
  docker(['run', '--rm', '-d', '--name', container, ...hardening, ...fakeEnv,
    '-e', `PODYX_MCP_TOKEN=${token}`, '-e', 'PODYX_HTTP_HOST=0.0.0.0', '-p', '127.0.0.1::3333', image, '--http']);
  const address = docker(['port', container, '3333/tcp']);
  const base = `http://127.0.0.1:${address.split(':').at(-1)}`;
  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { healthy = (await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* process may be starting */ }
    if (healthy) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(healthy, 'Container HTTP health endpoint did not become ready');
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://untrusted.example' }, body: '{}' })).status, 403);
  await http.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  await assertDiscovery(http);
  console.log('Container HTTP: published loopback port, health, authentication, Origin protection and MCP discovery passed.');
} finally {
  await http.close();
  try { docker(['rm', '-f', container]); } catch { /* already removed */ }
}
