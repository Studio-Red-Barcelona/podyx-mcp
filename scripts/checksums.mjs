import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from '../src/version.mjs';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
const expected = ['cursor', 'claude', 'openai'].map((name) => `podyx-${name}-${version}.zip`).concat(`podyx-mcp-${version}.tgz`).sort();
const actual = (await readdir(directory)).filter((name) => /\.(zip|tgz)$/.test(name)).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Release assets missing, unexpected or stale. Build into a fresh dist/.');
const lines = await Promise.all(expected.map(async (name) => `${createHash('sha256').update(await readFile(join(directory, name))).digest('hex')}  ${name}`));
await writeFile(join(directory, 'SHA256SUMS'), lines.join('\n') + '\n');
console.log(`Checksummed ${lines.length} release assets for v${version}.`);
