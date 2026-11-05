import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: true });
addFormats(ajv);
const spec = (version) => JSON.parse(readFileSync(new URL(`../spec/openapi-v${version}.json`, import.meta.url)));
export const specifications = [spec(2), spec(1)];

// Expand local OpenAPI references so clients receive standalone JSON Schemas.
function expand(value, document, stack = []) {
  if (Array.isArray(value)) return value.map((item) => expand(item, document, stack));
  if (!value || typeof value !== 'object') return value;
  if (value.$ref) {
    if (!value.$ref.startsWith('#/') || stack.includes(value.$ref)) throw new Error('Unsupported schema reference');
    const target = value.$ref.slice(2).split('/').reduce((node, key) => node[key], document);
    return expand({ ...target, ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref')) }, document, [...stack, value.$ref]);
  }
  const result = Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['example', 'deprecated', 'xml', 'discriminator', 'nullable'].includes(key))
    .map(([key, item]) => [key, expand(item, document, stack)]));
  if (value.nullable) {
    if (result.type) result.type = [...new Set([...(Array.isArray(result.type) ? result.type : [result.type]), 'null'])];
    else return { anyOf: [result, { type: 'null' }] };
  }
  return result;
}

const snake = (text) => text.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
const preview = (path, method) => method === 'post' && (/\/quotes$/.test(path) || path === '/api/v1/booking-quotes');

function buildOperations() {
  const operations = [];
  for (const document of specifications) {
    for (const [path, item] of Object.entries(document.paths)) {
      // v2 replaces the duplicated v1/headless family. Keep legacy reads/reports.
      if (path.startsWith('/api/v1/headless/')) continue;
      for (const [method, operation] of Object.entries(item)) {
        if (!['get', 'post', 'patch', 'put', 'delete'].includes(method)) continue;
        if (path.startsWith('/api/v1/') && method !== 'get') continue;
        const version = path.startsWith('/api/v2/') ? 2 : 1;
        const name = `podyx_${version === 1 ? 'v1_' : ''}${snake(operation.operationId.replace(/^v2/, ''))}`;
        const readOnly = method === 'get' || preview(path, method);
        const properties = {};
        const required = [];
        const parameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
        for (const location of ['path', 'query']) {
          const params = parameters.filter((parameter) => parameter.in === location);
          if (!params.length) continue;
          const requiredParams = params.filter((parameter) => parameter.required).map((parameter) => parameter.name);
          properties[location] = {
            type: 'object', additionalProperties: false,
            properties: Object.fromEntries(params.map((parameter) => [parameter.name, {
              ...expand(parameter.schema, document), ...(parameter.description ? { description: parameter.description } : {}),
            }])),
            ...(requiredParams.length ? { required: requiredParams } : {}),
          };
          if (requiredParams.length) required.push(location);
        }
        const body = operation.requestBody?.content?.['application/json']?.schema;
        if (body) {
          properties.body = expand(body, document);
          if (operation.requestBody.required) required.push('body');
        }
        if (!readOnly) {
          properties.idempotency_key = { type: 'string', format: 'uuid', description: 'Persist this UUID before the first call. Reuse with identical arguments after a timeout. Use a new UUID for a different action.' };
          properties.confirm = { type: 'boolean', const: true, description: 'Set only after the user authorizes this exact change, including price and cancellation effects.' };
          required.push('idempotency_key', 'confirm');
        }
        const inputSchema = { type: 'object', properties, additionalProperties: false, ...(required.length ? { required } : {}) };
        const description = [operation.summary, `${method.toUpperCase()} ${path}.`, operation.description,
          readOnly ? 'Read/preview only. Follow all pagination; a quote does not reserve a slot or lock a price.' : 'Changes studio data or finances. Preview first where supported; read the returned resource for actual state. Retrying requires the same idempotency_key and identical input.',
        ].filter(Boolean).join(' ');
        operations.push({ name, method, path, parameters, readOnly, description, inputSchema, validate: ajv.compile(inputSchema),
          annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, idempotentHint: true, openWorldHint: true } });
      }
    }
  }
  if (new Set(operations.map(({ name }) => name)).size !== operations.length) throw new Error('Duplicate tool names');
  return operations.sort((a, b) => a.name.localeCompare(b.name));
}

export const operations = buildOperations();
export function visibleOperations({ enableWrites = false } = {}) {
  return operations.filter((operation) => enableWrites || operation.readOnly);
}
export function publicTool({ name, description, inputSchema, annotations }) {
  return { name, description, inputSchema, annotations };
}
