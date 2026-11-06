import { homedir } from 'node:os';
import { join } from 'node:path';

export function readConfig(env = process.env) {
  const apiKey = env.PODYX_API_KEY?.trim();
  if (!apiKey || /[\r\n]/.test(apiKey) || apiKey.includes('YOUR_')) throw new Error('Set PODYX_API_KEY to your studio API key (Settings → API keys).');
  const baseUrl = new URL(env.PODYX_BASE_URL || 'https://app.podyx.com');
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    throw new Error('PODYX_BASE_URL must be an HTTPS origin without credentials, path or query.');
  }
  // Custom origins are explicit operator configuration for a Podyx test environment.
  if (env.PODYX_ENABLE_WRITES && !['true', 'false'].includes(env.PODYX_ENABLE_WRITES)) throw new Error('PODYX_ENABLE_WRITES must be true or false.');
  const timeoutMs = Number(env.PODYX_TIMEOUT_MS ?? 30000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) throw new Error('PODYX_TIMEOUT_MS must be 100..120000.');
  const httpHost = env.PODYX_HTTP_HOST || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0'].includes(httpHost)) throw new Error('PODYX_HTTP_HOST must be 127.0.0.1 or 0.0.0.0 (explicit container/network opt-in).');
  return { apiKey, baseUrl: baseUrl.origin, enableWrites: env.PODYX_ENABLE_WRITES === 'true', timeoutMs,
    stateDir: env.PODYX_STATE_DIR || join(homedir(), '.local', 'state', 'podyx-mcp'),
    httpToken: env.PODYX_MCP_TOKEN, httpHost, port: Number(env.PORT ?? 3333),
    allowedHosts: (env.PODYX_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map((value) => value.trim()),
  };
}
