import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { operations, visibleOperations } from '../src/catalog.mjs';
import { fileURLToPath } from 'node:url';
import { checkVersions } from './versions.mjs';

await checkVersions(fileURLToPath(new URL('../', import.meta.url)));

for (const operation of operations) {
  assert.match(operation.name, /^[a-z0-9_]{1,64}$/);
  assert.equal(JSON.stringify(operation.inputSchema).includes('"$ref"'), false);
  assert.equal(operation.readOnly, operation.method === 'get' || operation.path.endsWith('/quotes'));
}
for (const client of ['cursor', 'claude', 'openai']) {
  const base = new URL(`../plugins/${client}/`, import.meta.url);
  const filename = client === 'claude' ? '.mcp.json' : 'mcp.json';
  const mcp = JSON.parse(await readFile(new URL(filename, base), 'utf8'));
  assert(mcp.mcpServers.podyx.command);
  assert.equal(JSON.stringify(mcp).includes('YOUR_PODYX_API_KEY'), false);
}
const rows = operations.map((op) => `| \`${op.name}\` | ${op.readOnly ? 'Read / preview' : 'Write (opt-in)'} | \`${op.method.toUpperCase()} ${op.path}\` |`);
await writeFile(new URL('../docs/tools.md', import.meta.url), `# Tool reference\n\nGenerated from the vendored Podyx OpenAPI snapshots in \`spec/\`. ${operations.length} tools; ${visibleOperations().length} enabled by default.\n\nArguments are grouped under \`path\`, \`query\`, and \`body\` according to the API contract. Writes additionally require \`confirm: true\` and a persisted UUID \`idempotency_key\`. Omit absent optional values; do not send null unless the schema permits it.\n\n| Tool | Mode | API route |\n|---|---|---|\n${rows.join('\n')}\n`);
console.log(`Validated ${operations.length} tool schemas and plugin wiring.`);
