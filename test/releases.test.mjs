import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { checkVersions, pluginManifests, marketplaces } from '../scripts/versions.mjs';
import { validTitle } from '../scripts/check-pr-title.mjs';
import { releaseMatchesCommit } from '../scripts/upload-release-assets.mjs';
import { version } from '../src/version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'podyx-release-test-'));
  t.after(() => rm(directory, { recursive: true }));
  for (const file of ['package.json', 'package-lock.json', '.release-please-manifest.json', 'release-please-config.json', ...pluginManifests, ...marketplaces]) {
    await cp(join(root, file), join(directory, file), { recursive: true });
  }
  return directory;
}

test('runtime, lock, release manifest and every plugin/marketplace version agree', async () => {
  assert.equal(await checkVersions(root), version);
});

test('a forgotten plugin version fails CI', async (t) => {
  const directory = await fixture(t);
  const file = join(directory, pluginManifests[0]);
  const plugin = await readJson(file);
  plugin.version = '99.0.0';
  await writeFile(file, JSON.stringify(plugin));
  await assert.rejects(checkVersions(directory), /Version mismatch/);
});

test('a simulated release updates every JSON path and passes version validation', async (t) => {
  const directory = await fixture(t);
  const next = '2.3.4';
  const mutate = async (name, update) => {
    const file = join(directory, name);
    const json = await readJson(file);
    update(json);
    await writeFile(file, JSON.stringify(json));
  };
  await mutate('package.json', (json) => { json.version = next; });
  await mutate('package-lock.json', (json) => { json.version = next; json.packages[''].version = next; });
  await mutate('.release-please-manifest.json', (json) => { json['.'] = next; });
  const config = await readJson(join(directory, 'release-please-config.json'));
  for (const extra of config.packages['.']['extra-files']) {
    await mutate(extra.path, (json) => {
      if (extra.jsonpath === '$.version') json.version = next;
      else if (extra.jsonpath === '$.plugins[0].version') json.plugins[0].version = next;
      else assert.fail(`Unverified release JSONPath: ${extra.jsonpath}`);
    });
  }
  assert.equal(await checkVersions(directory), next);
});

test('PRs and main run tests and packaging; release is gated behind both', async () => {
  const document = parseDocument(await readFile(join(root, '.github/workflows/test.yml'), 'utf8'), { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  const workflow = document.toJS();
  assert.deepEqual(workflow.on.pull_request.branches, ['main']);
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.permissions.contents, 'read');
  assert.deepEqual(workflow.jobs.test.strategy.matrix.node, [22, 24]);
  assert.equal(workflow.jobs.packages.needs, 'test');
  assert(workflow.jobs.packages.steps.some((step) => step.run === 'npm run test:packages'));
  assert.deepEqual(workflow.jobs.release.needs, ['test', 'packages']);
  assert.equal(workflow.jobs.release.if, "github.event_name == 'push' && github.ref == 'refs/heads/main'");
  const release = workflow.jobs.release.steps.find((step) => step.uses?.startsWith('googleapis/release-please-action@'));
  assert.equal(release.with.token, '${{ secrets.RELEASE_PLEASE_TOKEN }}');
  assert.equal(release.if, "steps.current.outputs.ready == 'true'");
});

test('Conventional Commit PR titles accept release PRs and reject ambiguous titles', () => {
  for (const title of ['feat: add reports', 'fix(api): handle timeout', 'feat!: remove old endpoint', 'chore(main): release 0.2.0']) assert(validTitle(title));
  for (const title of ['Update things', 'feat:', 'feat: ', 'feat: one\nfix: two']) assert(!validTitle(title));
});

const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const releaseConfig = { repository: 'owner/podyx-mcp', tag: 'v1.2.3', sha: 'expected', token: 'fake' };
test('ordinary commits never overwrite assets on an older version tag', async () => {
  const fetchImpl = async (url) => url.includes('/releases/') ? json({ id: 1 }) : json({ object: { type: 'commit', sha: 'previous' } });
  assert.equal(await releaseMatchesCommit({ ...releaseConfig, fetchImpl }), false);
});

test('release upload can resume for both lightweight and annotated tags at the checked commit', async () => {
  for (const type of ['commit', 'tag']) {
    const fetchImpl = async (url) => {
      if (url.includes('/releases/')) return json({ id: 1 });
      if (url.includes('/git/tags/')) return json({ object: { type: 'commit', sha: 'expected' } });
      return json({ object: { type, sha: type === 'commit' ? 'expected' : 'tag-object' } });
    };
    assert.equal(await releaseMatchesCommit({ ...releaseConfig, fetchImpl }), true);
  }
});

test('missing releases are skipped; GitHub auth/API errors fail rather than pretending success', async () => {
  assert.equal(await releaseMatchesCommit({ ...releaseConfig, fetchImpl: async () => json({}, 404) }), false);
  await assert.rejects(releaseMatchesCommit({ ...releaseConfig, fetchImpl: async () => json({}, 403) }), /HTTP 403/);
});
