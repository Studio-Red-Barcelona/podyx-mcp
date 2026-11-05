#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runGrok } from '../src/grok-bridge.mjs';

const envFile = process.env.PODYX_ENV_FILE || join(homedir(), '.config', 'podyx-mcp', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const prompt = process.argv.slice(2).join(' ');
if (!process.env.XAI_API_KEY || !process.env.GROK_MODEL || !prompt) {
  console.error('Set XAI_API_KEY and GROK_MODEL; run node scripts/grok.mjs "your request". Uses the paid xAI API.');
  process.exitCode = 1;
} else {
  const client = new Client({ name: 'podyx-grok-local', version: '0.1.0' });
  try {
    const transport = new StdioClientTransport({ command: process.execPath,
      args: [fileURLToPath(new URL('../src/cli.mjs', import.meta.url))],
      env: { ...process.env, PODYX_ENABLE_WRITES: 'false' },
    });
    await client.connect(transport);
    console.log(await runGrok({ client, apiKey: process.env.XAI_API_KEY, model: process.env.GROK_MODEL, prompt }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await client.close(); }
}
