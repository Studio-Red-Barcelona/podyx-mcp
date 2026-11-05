# Contributing

Use Node.js 22+, run `npm ci`, `npm run check` and `npm test`. Tests must not depend on a production studio, personal customer data or real payments. Verify mutations against Podyx's configured test environment before claiming live support.

Keep default mode read-only. When adding a route, review the actual method semantics: POST quotes are reads, financial reports and approvals are writes. Preserve exact decimal strings, currency, pagination, timezone, idempotency and independent payment/approval/fulfillment state.

For API snapshot updates, download the two public OpenAPI files to `spec/`, review the diff, regenerate the tool reference and rerun tests. The expected tool counts in tests deliberately require review when the contract changes. Do not fetch or execute remote code at server startup.

Build plugin archives only from a clean installation, with private files outside the checkout. Confirm the archive contains its runtime dependencies, manifests resolve to bundled files, no keys or customer data are present, and it initializes with a fake key without making API calls.

Do not publish API secrets in issues. Include sanitized request IDs and reproduction inputs with customer identifiers removed. Native client UI testing and upstream test-environment results should be recorded separately from local protocol test results.
