import { createServer as createHttpServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';

function matches(actual, expected) {
  const a = Buffer.from(actual || '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startHttp(config, dependencies = {}) {
  if (!config.httpToken || config.httpToken.length < 32 || config.httpToken === config.apiKey || /[\r\n]/.test(config.httpToken)) {
    throw new Error('HTTP requires a separate PODYX_MCP_TOKEN of at least 32 characters.');
  }
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new Error('Invalid PORT.');
  const server = createHttpServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const hostname = (req.headers.host || '').split(':')[0].toLowerCase();
    if (!config.allowedHosts.includes(hostname) || req.headers.origin) { res.writeHead(403).end(); return; }
    if (req.url === '/health' && req.method === 'GET') { res.writeHead(200).end('ok'); return; }
    if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
    if (!matches(req.headers.authorization, `Bearer ${config.httpToken}`)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Bearer realm="podyx-mcp"' }).end(); return;
    }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 1024 * 1024 });
    const mcp = createServer(config, dependencies);
    res.on('close', () => { transport.close().catch(() => {}); mcp.close().catch(() => {}); });
    try { await mcp.connect(transport); await transport.handleRequest(req, res); }
    catch { if (!res.headersSent) res.writeHead(500).end(); else res.end(); }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '127.0.0.1', resolve); });
  return server;
}
