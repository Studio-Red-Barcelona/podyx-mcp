import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { downloadSpec, updateSpecs, sources } from '../scripts/update-spec.mjs';
import { parseDocument } from 'yaml';

const spec = { openapi: '3.0.0', info: { title: 'Fixture', version: '1' }, paths: { '/api/v2/example': {} } };
const response = (value) => new Response(JSON.stringify(value));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'podyx-spec-'));
  t.after(() => rm(dir, { recursive: true }));
  await mkdir(join(dir, 'spec'));
  for (const [file] of sources) await writeFile(join(dir, 'spec', file), JSON.stringify(spec));
  return pathToFileURL(`${dir}/`);
}

test('spec sync ignores formatting/key ordering and updates changed contracts', async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await updateSpecs({ root, fetchImpl: async () => response({ paths: spec.paths, info: spec.info, openapi: spec.openapi }) }), []);
  const updated = { ...spec, info: { ...spec.info, version: '2' } };
  assert.equal((await updateSpecs({ root, fetchImpl: async () => response(updated) })).length, 2);
  assert.deepEqual(JSON.parse(await readFile(new URL('spec/openapi-v2.json', root))), updated);
});

test('failed download leaves both snapshots intact', async (t) => {
  const root = await fixture(t);
  await assert.rejects(updateSpecs({ root, fetchImpl: async (url) => url.endsWith('openapi-v2.json')
    ? new Response('unavailable', { status: 503 }) : response({ ...spec, info: { version: '2' } }) }), /HTTP 503/);
  for (const [file] of sources) assert.deepEqual(JSON.parse(await readFile(new URL(`spec/${file}`, root))), spec);
});

test('download rejects HTML, empty contracts, oversized responses and redirects', async () => {
  await assert.rejects(downloadSpec('https://example.test', async () => new Response('<html>error</html>')), SyntaxError);
  await assert.rejects(downloadSpec('https://example.test', async () => response({ ...spec, paths: {} })), /non-empty OpenAPI/);
  await assert.rejects(downloadSpec('https://example.test', async () => new Response(' '.repeat(5 * 1024 * 1024 + 1))), /exceeds/);
  await downloadSpec('https://example.test', async (_, options) => {
    assert.equal(options.redirect, 'error');
    assert(options.signal);
    return response(spec);
  });
});

test('scheduled spec sync stays main-only and dispatches gated full checks', async () => {
  const doc = parseDocument(await readFile(new URL('../.github/workflows/update-spec.yml', import.meta.url), 'utf8'));
  assert.deepEqual(doc.errors, []);
  const workflow = doc.toJS();
  assert.equal(workflow.on.schedule[0].cron, '17 8 * * 1');
  assert.equal(workflow.jobs.update.if, "github.ref == 'refs/heads/main'");
  const steps = workflow.jobs.update.steps;
  assert(steps.find(s => s.run === 'npm test'));
  const pr = steps.find(s => s.id === 'pr');
  assert.equal(pr.with.base, 'main');
  assert.equal(pr.with.branch, 'automation/podyx-spec-sync');
  assert.deepEqual(pr.with['add-paths'].trim().split('\n'), ['spec/openapi-v1.json', 'spec/openapi-v2.json', 'docs/tools.md']);
  assert(steps.some(s => s.run?.includes('gh workflow run test.yml --ref "$branch"')));
  assert.equal(steps.find(s => s.id === 'validate')['continue-on-error'], true);
  assert.equal(steps.find(s => s.id === 'tests')['continue-on-error'], true);
  assert(pr.with.draft.includes("steps.tests.outcome != 'success'"));
  assert(steps.at(-1).run.includes('exit 1'));
});
