import { mkdir, cp, copyFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { version } from '../src/version.mjs';
import { checkVersions } from './versions.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await checkVersions(root);
const output = join(root, 'dist');
await mkdir(output, { recursive: true });
for (const client of ['cursor', 'claude', 'openai']) {
  const target = join(output, `podyx-${client}`);
  // Build in a fresh directory so stale files or user-created .env files cannot enter an archive.
  try { await mkdir(target); } catch { throw new Error(`${target} already exists. Move the old dist directory before rebuilding.`); }
  await cp(join(root, 'plugins', client), target, { recursive: true });
  const runtime = join(target, 'server');
  await mkdir(runtime);
  for (const directory of ['src', 'spec', 'node_modules']) await cp(join(root, directory), join(runtime, directory), { recursive: true });
  for (const file of ['package.json', 'package-lock.json']) await copyFile(join(root, file), join(runtime, file));
  // Development-only packages are not shipped in plugin runtime archives.
  execFileSync('npm', ['prune', '--omit=dev', '--ignore-scripts', '--offline', '--no-audit', '--no-fund'], { cwd: runtime, stdio: 'pipe' });
  for (const file of ['LICENSE', 'NOTICE.md', '.env.example']) await copyFile(join(root, file), join(target, file));
  // Include all installed transitive dependencies so consumers need only Node.js.
  const forbidden = [];
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.env' || entry.name === '.git') forbidden.push(entry.name);
      if (entry.isDirectory()) await scan(join(directory, entry.name));
    }
  }
  await scan(target);
  if (forbidden.length) throw new Error('Refusing to package private files.');
  execFileSync('zip', ['-qr', join(output, `podyx-${client}-${version}.zip`), '.'], { cwd: target });
  console.log(`Packaged podyx-${client}-${version}.zip`);
}
