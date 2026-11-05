import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { operations, visibleOperations } from '../src/catalog.mjs';
import { readConfig } from '../src/config.mjs';
import { createApiClient, redact } from '../src/client.mjs';
import { runGrok } from '../src/grok-bridge.mjs';

const op = (name) => operations.find((operation) => operation.name === name);
const config = (extra = {}) => ({ apiKey: 'pdyx_test_not_real', baseUrl: 'https://app.podyx.com', timeoutMs: 1000, enableWrites: false, ...extra });
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('all tools have unique names, standalone schemas and correct read classification', () => {
  assert.equal(operations.length, 150);
  assert.equal(visibleOperations().length, 65);
  assert.equal(new Set(operations.map((x) => x.name)).size, operations.length);
  for (const operation of operations) {
    assert.match(operation.name, /^[a-z0-9_]{1,64}$/);
    assert(!JSON.stringify(operation.inputSchema).includes('"$ref"'));
    assert.equal(operation.readOnly, operation.method === 'get' || operation.path.endsWith('/quotes'));
    if (!operation.readOnly) assert(operation.inputSchema.required.includes('idempotency_key'));
  }
});

test('configuration rejects missing key, insecure origins and malformed write switches', () => {
  assert.throws(() => readConfig({}));
  for (const url of ['http://app.podyx.com', 'https://user:pass@app.podyx.com', 'https://app.podyx.com/elsewhere']) {
    assert.throws(() => readConfig({ PODYX_API_KEY: 'secret', PODYX_BASE_URL: url }));
  }
  assert.throws(() => readConfig({ PODYX_API_KEY: 'secret', PODYX_ENABLE_WRITES: 'yes' }));
  assert.equal(readConfig({ PODYX_API_KEY: 'secret' }).enableWrites, false);
});

test('GET constructs exact path/query, authorization and preserves complete pagination', async () => {
  let request;
  const call = createApiClient(config(), async (url, options) => { request = { url, options }; return json({ data: [], pagination: { total: 123, next_page: 2 } }); });
  const result = await call(op('podyx_v1_list_sessions'), { query: { page: 1 } });
  assert.equal(request.url.pathname, '/api/v1/sessions');
  assert.equal(request.url.searchParams.get('page'), '1');
  assert.equal(request.options.headers.Authorization, 'Bearer pdyx_test_not_real');
  assert.equal(request.options.redirect, 'error');
  assert.equal(result.data.pagination.total, 123);
});

test('invalid dates, IDs, extra properties and zero durations never reach the API', async () => {
  const call = createApiClient(config(), () => { throw new Error('must not fetch'); });
  for (const args of [{ query: { date: '2026-02-30' } }, { query: { duration_minutes: 0 } }, { query: { room_id: '../../secret' } }, { body: {} }]) {
    assert.equal((await call(op('podyx_customer_availability'), args)).error, 'invalid_arguments');
  }
});

test('quotes use POST but remain read-only and need no idempotency key', async () => {
  let options;
  const operation = op('podyx_booking_quote');
  const call = createApiClient(config(), async (_, request) => { options = request; return json({ status: 'incomplete', missing_inputs: ['service'] }); });
  const result = await call(operation, { body: { sessions: [] } });
  assert.equal(result.status, 200);
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Idempotency-Key'], undefined);
});

test('write mode and exact confirmation are required', async () => {
  const operation = op('podyx_create_client');
  await assert.rejects(createApiClient(config())(operation, {}), /disabled/);
  const call = createApiClient(config({ enableWrites: true }), () => { throw new Error('must not fetch'); });
  for (const args of [{ body: { email: 'a@example.com' } }, { body: { email: 'a@example.com' }, confirm: false, idempotency_key: randomUUID() }]) {
    assert.equal((await call(operation, args)).error, 'invalid_arguments');
  }
});

test('write timeout and retry retain the same key; changed arguments conflict without another API call', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'podyx-test-'));
  t.after(() => rm(stateDir, { recursive: true }));
  let requests = 0;
  const keys = [];
  const call = createApiClient(config({ stateDir, enableWrites: true }), async (_, options) => {
    keys.push(options.headers['Idempotency-Key']);
    if (++requests === 1) throw new Error('timeout');
    return json({ action: 'accepted', resource_id: 'known-id' });
  });
  const args = { body: { email: 'a@example.com' }, confirm: true, idempotency_key: randomUUID() };
  assert.equal((await call(op('podyx_create_client'), args)).outcome, 'unknown');
  assert.equal((await call(op('podyx_create_client'), args)).status, 200);
  assert.equal(keys[0], keys[1]);
  await assert.rejects(call(op('podyx_create_client'), { ...args, body: { email: 'b@example.com' } }), /different arguments/);
  assert.equal(requests, 2);
  const namespace = (await readdir(stateDir))[0];
  const stored = await readFile(join(stateDir, namespace, `${args.idempotency_key}.json`), 'utf8');
  assert(!stored.includes('example.com'));
  assert(!stored.includes('pdyx_'));
});

test('errors retain retry-after and redact API keys and payment browser secrets', async () => {
  const call = createApiClient(config(), async () => json({ error: 'busy', debug: 'pdyx_test_not_real', client_secret: 'sensitive' }, 429, { 'retry-after': '1' }));
  const result = await call(op('podyx_v1_reports_summary'));
  assert.equal(result.retry_after, '1');
  assert.equal(result.error, 'podyx_api_error');
  assert.equal(result.data.client_secret, '[REDACTED]');
  assert(!JSON.stringify(result).includes('pdyx_test_not_real'));
  assert.equal(redact('token: other-secret', ['other-secret']), 'token: [REDACTED]');
});

test('simultaneous writes publish complete fingerprint records and retain upstream replay keys', async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), 'podyx-concurrent-'));
  t.after(() => rm(stateDir, { recursive: true }));
  const keys = [];
  const call = createApiClient(config({ stateDir, enableWrites: true }), async (_, options) => {
    keys.push(options.headers['Idempotency-Key']); return json({ action: 'accepted' });
  });
  const args = { body: { email: 'same@example.com' }, confirm: true, idempotency_key: randomUUID() };
  const results = await Promise.all([call(op('podyx_create_client'), args), call(op('podyx_create_client'), args)]);
  assert(results.every((result) => result.status === 200));
  assert.deepEqual(keys, [args.idempotency_key, args.idempotency_key]);
});

test('oversized responses fail explicitly instead of returning partial financial data', async () => {
  const call = createApiClient(config(), async () => new Response('x'.repeat(4 * 1024 * 1024 + 1)));
  assert.equal((await call(op('podyx_v1_reports_revenue'))).error, 'response_too_large');
});

test('non-JSON and interrupted responses are errors, not fabricated results', async () => {
  const call = createApiClient(config(), async () => new Response('<html>failure</html>', { status: 502 }));
  assert.equal((await call(op('podyx_list_room'))).error, 'invalid_upstream_response');
});

test('Grok bridge executes MCP locally and refuses model-requested writes', async () => {
  const executed = [];
  let turns = 0;
  const client = {
    listTools: async () => ({ tools: [{ name: 'read', annotations: { readOnlyHint: true }, inputSchema: { type: 'object' } }, { name: 'write', annotations: { readOnlyHint: false } }] }),
    callTool: async (call) => { executed.push(call); return { content: [] }; },
  };
  const fetchImpl = async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.tools.length, 1);
    if (++turns === 1) return json({ output: [{ type: 'function_call', call_id: '1', name: 'read', arguments: '{}' }, { type: 'function_call', call_id: '2', name: 'write', arguments: '{}' }] });
    assert(body.input.some((item) => item.type === 'function_call_output' && item.output.includes('refused')));
    return json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Complete' }] }] });
  };
  assert.equal(await runGrok({ client, fetchImpl, apiKey: 'fake', model: 'test', prompt: 'Review' }), 'Complete');
  assert.deepEqual(executed, [{ name: 'read', arguments: {} }]);
});
