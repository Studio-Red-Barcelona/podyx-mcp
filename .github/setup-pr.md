Adds @d3rky as the default CODEOWNER and documents how to use, contribute to and maintain Podyx MCP.

- Adds English/Russian README navigation, AGENTS.md and repository governance documentation.
- Records the protected-branch ruleset, including reviewed PRs, required CI checks and squash merging.
- Adds weekly Dependabot updates and a concise PR template.
- Adds a narrowly scoped manual setup-PR job so the PR can be authored by GitHub Actions and reviewed by @d3rky; it never approves or merges anything.

Validation: existing MCP tests, version/schema checks and independently extracted plugin package smoke tests run before this PR is opened.

Repository settings are applied separately through GitHub. CODEOWNERS becomes effective for subsequent PRs once this file lands on main. No runtime or API behavior changes.
