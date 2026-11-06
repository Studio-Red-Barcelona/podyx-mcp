import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { readConfig } from '../src/config.mjs';

test('HTTP network binding is an explicit opt-in and defaults to loopback', () => {
  assert.equal(readConfig({ PODYX_API_KEY: 'fake' }).httpHost, '127.0.0.1');
  assert.equal(readConfig({ PODYX_API_KEY: 'fake', PODYX_HTTP_HOST: '0.0.0.0' }).httpHost, '0.0.0.0');
  assert.throws(() => readConfig({ PODYX_API_KEY: 'fake', PODYX_HTTP_HOST: 'untrusted.example' }), /PODYX_HTTP_HOST/);
});

const yaml = async (path) => {
  const document = parseDocument(await readFile(new URL(path, import.meta.url), 'utf8'), { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  return document.toJS();
};

test('PR Docker checks do not publish and releases gate publication on verified main release', async () => {
  const workflow = await yaml('../.github/workflows/test.yml');
  const runtime = workflow.jobs.docker_runtime;
  assert.deepEqual(runtime.strategy.matrix.include.map((entry) => entry.platform).sort(), ['linux/amd64', 'linux/arm64']);
  const build = runtime.steps.find((step) => step.uses?.startsWith('docker/build-push-action@'));
  assert.equal(build.with.push, false);
  assert(runtime.steps.some((step) => step.run === 'npm run test:docker'));
  assert(runtime.steps.some((step) => step.uses?.startsWith('aquasecurity/trivy-action@') && step.with['exit-code'] === '1'));
  assert.equal(workflow.jobs.docker.if, 'always()');
  assert(workflow.jobs.release.needs.includes('docker'));
  const publish = workflow.jobs.publish_container;
  assert.equal(publish.if, "needs.release.outputs.publish_image == 'true'");
  assert.deepEqual(publish.needs, ['release', 'docker']);
  assert.equal(publish.permissions.packages, 'write');
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.permissions.packages, undefined);
  const push = publish.steps.find((step) => step.uses?.startsWith('docker/build-push-action@'));
  assert.equal(push.with.platforms, 'linux/amd64,linux/arm64');
  assert.equal(push.with.sbom, true);
  assert.equal(push.with.provenance, 'mode=max');
});

test('Compose keeps the public bind inside the container and the host listener local', async () => {
  const compose = await yaml('../compose.yaml');
  const service = compose.services.podyx;
  assert.equal(service.environment.PODYX_HTTP_HOST, '0.0.0.0');
  assert(service.ports.every((port) => port.startsWith('127.0.0.1:')));
  assert.equal(service.read_only, true);
  assert.deepEqual(service.cap_drop, ['ALL']);
  assert(service.volumes.includes('podyx-state:/var/lib/podyx-mcp'));
  assert(!JSON.stringify(service).includes('pdyx_'));
});

test('Dependabot monitors container bases and Docker status checks are required by the recorded ruleset', async () => {
  const config = await yaml('../.github/dependabot.yml');
  assert(config.updates.some((entry) => entry['package-ecosystem'] === 'docker' && entry.directory === '/'));
  const rules = JSON.parse(await readFile(new URL('../.github/repository-rules.json', import.meta.url), 'utf8'));
  const checks = rules.rules.find((rule) => rule.type === 'required_status_checks').parameters.required_status_checks.map((check) => check.context);
  assert(checks.includes('Docker lint'));
  assert(checks.includes('Docker checks'));
});
