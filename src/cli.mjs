#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config.mjs';
import { createServer } from './server.mjs';
import { startHttp } from './http.mjs';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// A shared private file also works when desktop apps do not inherit shell env.
const envFile = process.env.PODYX_ENV_FILE || join(homedir(), '.config', 'podyx-mcp', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('podyx-mcp [--http]\nDefault: MCP stdio. --http: authenticated Streamable HTTP at 127.0.0.1:3333/mcp.\nRequired: PODYX_API_KEY. Optional: PODYX_ENABLE_WRITES=true. HTTP also requires PODYX_MCP_TOKEN.');
} else {
  try {
    if (args.some((arg) => arg !== '--http')) throw new Error('Unknown option. Use --help.');
    const config = readConfig();
    if (args.includes('--http')) {
      const http = await startHttp(config);
      console.error(`Podyx MCP HTTP listening at http://127.0.0.1:${http.address().port}/mcp`);
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => http.close(() => process.exit(0)));
    } else {
      const server = createServer(config);
      await server.connect(new StdioServerTransport());
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
