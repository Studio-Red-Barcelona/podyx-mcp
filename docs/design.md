# Design, security and limits

## API mapping

The registry maps every v2 operation and non-headless v1 GET operation from the bundled OpenAPI snapshots into a named MCP tool. v1/headless duplicates and legacy write routes are intentionally excluded. v1 supplies studio/key inspection, lists of sessions/bookings/clients and business reports. v2 supplies catalog authoring, quotes, purchases, package rights, aftercare, external money and recovery operations.

Input references are expanded into standalone JSON Schemas. AJV validates dates, UUIDs, enums, required fields and additional-property constraints without coercion or applying defaults. Query parameters and path IDs are encoded; request bodies are JSON. The upstream domain still validates studio-specific policies, permissions, calendar availability and commercial eligibility.

Tools return a wrapper with HTTP `status` and original parsed response under `data`. API errors include `error`, `status`, upstream JSON and `retry_after` where present. MCP results contain both text and structured content. Pagination is explicit and preserved; one call never claims it enumerated the entire studio. No automatic financial aggregation, currency conversion or pagination across mutable records occurs.

## Credentials and transports

Studio credentials are process configuration, never tool arguments. The API base origin is fixed by operator configuration, HTTPS-only, and cannot be selected by a model. Redirects are rejected so a Podyx credential is not forwarded to a different origin. There is no analytics/telemetry service or shared credential backend.

stdio is the default. Streamable HTTP uses the official SDK in stateless JSON-response mode, binds to IPv4 loopback, limits request bodies to 1 MiB and requires a separate static bearer token. Exact Host checks and rejection of browser Origin requests reduce DNS-rebinding/browser access. This is a single-studio local server, not a multi-tenant hosted OAuth service. Health checks reveal only `ok`.

## Mutations and retries

All GETs and documented quote/preview POSTs are read-only. Other operations are hidden until the operator sets `PODYX_ENABLE_WRITES=true`. Mutation inputs must include `confirm: true` and a UUID `idempotency_key`. Confirmation is a caller authorization contract, not independent proof of a human click; host approval controls and API permissions remain necessary.

A private, per-origin/key request journal stores argument fingerprints and operation names. Complete records are published atomically. Exact retries pass through to Podyx with the same UUID. Changed arguments for a recorded UUID are refused locally. Records are not automatically deleted; deleting or losing state weakens local conflict detection. Key rotation creates a new journal namespace; Podyx's credential-specific receipt rules and independent collection/refund/cycle IDs still apply. A local journal cannot replace durable financial reconciliation.

No automatic retry of writes, change of tender or invented financial IDs occurs. Network failure, incomplete bodies and oversize responses report uncertainty. A successful HTTP response is not proof of payment settlement, approval or fulfillment. Fetch the current returned resource and follow upstream recovery rules.

## Payment and privacy boundaries

Podyx keys, common credential fields and payment browser client secrets are redacted from returned results. Customer data and authorized financial facts remain visible to the connected assistant. The repository does not build a Stripe/Square browser UI; payment SDK token entry and final browser confirmation require an additional authorized application. Native instructions may therefore be incomplete for a model-only interaction. External payment reports record actual studio-collected money; they do not perform bank transfers. Refund obligations are distinct from executed refunds.

The Grok CLI bridge executes MCP calls locally but sends tool definitions and selected results to xAI. It only advertises/executes read-only tools. It is tested with a mocked xAI response cycle; no paid API call was made during implementation.

## Current boundaries

- The published contracts do not expose administration of dynamic price-rule definitions, including a weekend percentage modifier. Quotes can explain applied rules.
- There is no documented Podyx delegated OAuth login implemented here; use a studio API key.
- No Kommo sync, background scheduler, webhook receiver, customer login or automatic email campaign is included.
- No universal local plugin installation exists across all five clients. See the client matrix for native packages, direct configs and bridges.
- Tests cover local protocol and mocked upstream contracts, not successful production studio operations, financial settlement or vendor UI installation.

Upstream: [v2 guides](https://docs.podyx.com/api/docs/guides), [v2 contract](https://docs.podyx.com/api/openapi-v2.json), [v1 contract](https://docs.podyx.com/api/openapi.json).
