import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export const sources = [
  ['openapi-v1.json', 'https://docs.podyx.com/api/openapi.json'],
  ['openapi-v2.json', 'https://docs.podyx.com/api/openapi-v2.json'],
];

export async function downloadSpec(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Spec download returned HTTP ${response.status}: ${url}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new Error('OpenAPI response exceeds 5 MiB');
    chunks.push(chunk);
  }
  const document = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!/^3\./.test(document.openapi) || !document.info || !document.paths ||
      typeof document.paths !== 'object' || Array.isArray(document.paths) || !Object.keys(document.paths).length) {
    throw new Error('Expected a non-empty OpenAPI 3 document');
  }
  return document;
}

export async function updateSpecs({ root = new URL('../', import.meta.url), fetchImpl = fetch } = {}) {
  // Download and validate both before touching either snapshot.
  const documents = await Promise.all(sources.map(async ([file, url]) => ({
    file: new URL(`spec/${file}`, root), document: await downloadSpec(url, fetchImpl),
  })));
  const changed = [];
  for (const { file, document } of documents) {
    if (isDeepStrictEqual(JSON.parse(await readFile(file, 'utf8')), document)) continue;
    await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
    changed.push(file.pathname.split('/').pop());
  }
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changed = await updateSpecs();
  console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Podyx specifications are unchanged.');
}
