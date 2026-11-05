import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttp } from '../src/http.mjs';
import { request } from 'node:http';

const config = { apiKey: 'pdyx_fake_test', baseUrl: 'https://app.podyx.com', timeoutMs: 1000, enableWrites: false,
  httpToken: '0123456789abcdef0123456789abcdef', allowedHosts: ['127.0.0.1', 'localhost'], port: 0 };

test('stdio initializes, advertises tools/prompts, validates calls and rejects writes', async () => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../src/cli.mjs', import.meta.url))],
    env: { PATH: process.env.PATH, PODYX_API_KEY: 'pdyx_fake_test', PODYX_ENABLE_WRITES: 'false', PODYX_ENV_FILE: '/nonexistent-podyx-test-env' }, stderr: 'pipe' });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 65);
    assert.equal((await client.listPrompts()).prompts.length, 3);
    const prompt = await client.getPrompt({ name: 'studio-monthly-review', arguments: { month: '2026-10' } });
    assert(prompt.messages[0].content.text.includes('2026-10'));
    const invalid = await client.callTool({ name: 'podyx_customer_availability', arguments: { query: { duration_minutes: -1 } } });
    assert.equal(invalid.isError, true);
    const disabled = await client.callTool({ name: 'podyx_create_client', arguments: {} });
    assert.equal(disabled.isError, true);
  } finally { await client.close(); }
});

test('HTTP requires a separate sufficiently long token', async () => {
  await assert.rejects(startHttp({ ...config, httpToken: '' }), /separate/);
  await assert.rejects(startHttp({ ...config, httpToken: config.apiKey }), /separate/);
});

test('HTTP handles real MCP discovery/calls, auth, host and origin protection', async () => {
  const server = await startHttp(config, { fetchImpl: async () => new Response(JSON.stringify({ data: [{ id: 'room' }] })) });
  const url = new URL(`http://127.0.0.1:${server.address().port}/mcp`);
  const client = new Client({ name: 'http-test', version: '1.0.0' });
  try {
    assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${config.httpToken}`, Origin: 'https://evil.example' }, body: '{}' })).status, 403);
    const hostStatus = await new Promise((resolve, reject) => {
      const req = request(url, { method: 'POST', headers: { Host: 'evil.example', Authorization: `Bearer ${config.httpToken}` } }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject); req.end('{}');
    });
    assert.equal(hostStatus, 403);
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${config.httpToken}` } } }));
    assert.equal((await client.listTools()).tools.length, 65);
    const result = await client.callTool({ name: 'podyx_list_room', arguments: {} });
    assert.equal(result.structuredContent.data.data[0].id, 'room');
  } finally { await client.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
