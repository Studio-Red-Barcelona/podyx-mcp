import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, link, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const stable = (value) => JSON.stringify(value, (_, node) => node && typeof node === 'object' && !Array.isArray(node)
  ? Object.fromEntries(Object.keys(node).sort().map((key) => [key, node[key]])) : node);

async function claimRequest(config, operation, args) {
  const directory = join(config.stateDir, createHash('sha256').update(config.baseUrl + config.apiKey).digest('hex').slice(0, 24));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const fingerprint = createHash('sha256').update(stable({ operation: operation.name, ...args })).digest('hex');
  const filename = join(directory, `${args.idempotency_key}.json`);
  const temporary = join(directory, `.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify({ fingerprint, operation: operation.name }), { mode: 0o600, flag: 'wx' });
  try {
    // Publish a complete record atomically, including across simultaneous processes.
    await link(temporary, filename);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const previous = JSON.parse(await readFile(filename, 'utf8'));
    if (previous.fingerprint !== fingerprint) throw new Error('Idempotency key already belongs to different arguments. Recover the original action before starting a new one.');
  } finally { await unlink(temporary); }
}

export function redact(value, secrets = []) {
  if (typeof value === 'string') {
    let output = value.replace(/pdyx_[A-Za-z0-9_-]+/g, '[REDACTED]');
    for (const secret of secrets.filter(Boolean)) output = output.split(secret).join('[REDACTED]');
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /^(authorization|api_key|access_token|refresh_token|client_secret|square_token|password)$/i.test(key) ? '[REDACTED]' : redact(item, secrets)]));
  return value;
}

export function createApiClient(config, fetchImpl = fetch) {
  return async function call(operation, args = {}) {
    if (!operation.readOnly && !config.enableWrites) throw new Error('Writes are disabled. Set PODYX_ENABLE_WRITES=true explicitly to enable them.');
    if (!operation.validate(args)) {
      const details = operation.validate.errors.map(({ instancePath, message, params }) => ({ path: instancePath, message, details: params }));
      return { error: 'invalid_arguments', details };
    }
    const path = operation.path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(args.path[key]));
    const url = new URL(path, config.baseUrl);
    for (const [key, value] of Object.entries(args.query ?? {})) {
      if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item));
      else if (value !== null) url.searchParams.set(key, String(value));
    }
    const headers = { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' };
    if (args.body !== undefined) headers['Content-Type'] = 'application/json';
    if (!operation.readOnly) {
      await claimRequest(config, operation, args);
      headers['Idempotency-Key'] = args.idempotency_key;
    }
    let response;
    try {
      response = await fetchImpl(url, { method: operation.method.toUpperCase(), headers,
        ...(args.body !== undefined ? { body: JSON.stringify(args.body) } : {}),
        redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs) });
    } catch {
      return { error: 'transport_error', outcome: operation.readOnly ? 'read_failed' : 'unknown',
        recovery: operation.readOnly ? 'Retry this read.' : 'Do not create another action. Retry identical input with the SAME idempotency_key, then read the returned resource.' };
    }
    // Read a bounded body; never silently truncate financial or pagination facts.
    const reader = response.body?.getReader();
    let size = 0;
    const chunks = [];
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 4 * 1024 * 1024) { await reader.cancel(); return { error: 'response_too_large', outcome: operation.readOnly ? 'read_failed' : 'unknown', recovery: 'Use smaller pagination. For a write, retain its idempotency key and recover current resource state.' }; }
          chunks.push(value);
        }
      } catch { return { error: 'response_interrupted', outcome: operation.readOnly ? 'read_failed' : 'unknown', recovery: 'For a write, retry identical input with the same idempotency_key.' }; }
    }
    const text = Buffer.concat(chunks).toString('utf8');
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { return { error: 'invalid_upstream_response', status: response.status, outcome: operation.readOnly ? 'read_failed' : 'unknown' }; }
    const result = { status: response.status, ...(response.ok ? { data } : { error: 'podyx_api_error', data }),
      ...(response.headers.get('retry-after') ? { retry_after: response.headers.get('retry-after') } : {}) };
    return redact(result, [config.apiKey, config.httpToken]);
  };
}
