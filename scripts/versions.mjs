import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const pluginManifests = [
  'plugins/cursor/.cursor-plugin/plugin.json',
  'plugins/claude/.claude-plugin/plugin.json',
  'plugins/openai/plugin.json',
  'plugins/openai/.codex-plugin/plugin.json',
];
export const marketplaces = [
  '.agents/plugins/marketplace.json',
  '.cursor-plugin/marketplace.json',
  '.claude-plugin/marketplace.json',
];

export async function checkVersions(root) {
  const json = async (file) => JSON.parse(await readFile(join(root, file), 'utf8'));
  const version = (await json('package.json')).version;
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid package version.');
  const match = (actual, source) => { if (actual !== version) throw new Error(`Version mismatch: ${source}=${actual}; package.json=${version}`); };
  const lock = await json('package-lock.json');
  match(lock.version, 'package-lock.json');
  match(lock.packages[''].version, 'package-lock.json packages root');
  for (const file of pluginManifests) match((await json(file)).version, file);
  for (const file of marketplaces) {
    const podyx = (await json(file)).plugins.find((entry) => entry.name === 'podyx');
    if (!podyx) throw new Error(`Missing podyx entry: ${file}`);
    match(podyx.version, file);
  }
  match((await json('.release-please-manifest.json'))['.'], 'release manifest');
  const extra = (await json('release-please-config.json')).packages['.']['extra-files'];
  for (const file of pluginManifests) {
    if (!extra.some((entry) => entry.type === 'json' && entry.path === file && entry.jsonpath === '$.version')) throw new Error(`Release config does not update ${file}`);
  }
  for (const file of marketplaces) {
    if (!extra.some((entry) => entry.type === 'json' && entry.path === file && entry.jsonpath === '$.plugins[0].version')) throw new Error(`Release config does not update ${file}`);
  }
  return version;
}
