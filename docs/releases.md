# Releases and CI

All clients ship together under one version. The OpenAI package serves Codex and compatible ChatGPT desktop use; the Grok adapter uses the server's package version. They are not separate independently versioned products.

## What happens automatically

1. A PR targeting `main` runs the **Checks** workflow: Conventional Commit title validation, lockfile install, version consistency, API/schema checks, generated-document drift check and tests on Node.js 22 and 24.
2. If tests pass, **Package smoke tests** builds every plugin ZIP, extracts each into an independent temporary directory and initializes it through MCP. It also creates the installable npm tarball and SHA-256 checksums. These files are kept as a workflow artifact for 14 days.
3. After any push/merge to `main`, the same checks and packaging run again against the actual resulting commit. No release job runs from a PR or fork.
4. Only after both test jobs and packaging succeed does Release Please create or update one release PR from Conventional Commits. That PR updates `package.json`, the lockfile, every plugin manifest, the marketplace version entries, `.release-please-manifest.json` and `CHANGELOG.md`.
5. The release PR receives the same PR checks. Review and merge it; the next successful `main` run creates `vX.Y.Z` and a GitHub Release whose notes come from the reviewed changelog. The already tested ZIPs, npm tarball and `SHA256SUMS` are attached from that exact run, without rebuilding them after release.

Normal feature merges update the pending release PR; they do not publish a release. Documentation-only changes may not require a new release. There is no automatic merge, npm registry publication or vendor marketplace submission.

## One-time GitHub setup

The public repository is [Studio-Red-Barcelona/podyx-mcp](https://github.com/Studio-Red-Barcelona/podyx-mcp), with `main` as the release branch. Inspect current runs in [GitHub Actions](https://github.com/Studio-Red-Barcelona/podyx-mcp/actions). Repository governance and the protected-branch rules are documented in [repository.md](repository.md).

No personal token or additional secret is required. The release job uses the short-lived **`GITHUB_TOKEN`** provided automatically by GitHub Actions. Its job-scoped permissions allow contents, issues, pull requests and explicit workflow dispatches.

Enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. The workflow only creates/updates PRs; it never approves or merges them.

After Release Please creates or updates a release PR, the workflow explicitly sends `workflow_dispatch` for its same-repository release branch. That event can start checks using `GITHUB_TOKEN`, so no PAT is needed. Dispatched runs validate/package the release branch and cannot execute the push/main-only release job. GitHub may also display approval-required native PR runs; the explicit dispatch supplies automatic checks without relying on those runs.

See [GitHub workflow trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## Make checks mandatory before merge

The workflow runs checks; a GitHub branch ruleset makes them mandatory. In repository **Settings → Rules → Rulesets** protect `main`, require pull requests and these status checks:

- `Test (Node 22)`
- `Test (Node 24)`
- `Package smoke tests`
- `Docker lint`
- `Docker checks`

Do not require the release job: it intentionally does not run on PRs. Enable the rule that the PR branch must be up to date if desired. Allow squash merging and configure its default commit message to use the PR title. The required-title check provides a Conventional Commit subject; a merge strategy using arbitrary commit messages can otherwise prevent automatic version selection.

## Commit / PR titles and versioning

- `fix: handle expired keys` → patch bump.
- `feat: add a report` → minor bump.
- `feat!: change the tool interface` or a `BREAKING CHANGE:` footer → breaking bump; while below 1.0.0, breaking changes bump the minor version.
- `chore(main): release ...` is the generated release PR, not an ordinary feature.

Current source version `0.1.0` is the baseline. Release Please computes the next version from the release manifest and eligible Conventional Commits; the first public release can therefore be newer than that baseline. Version updates belong in release PRs; manually changing just one plugin version fails CI.

Runtime server metadata, the Grok bridge and archive filenames read the root package version, so they need no textual version replacement. The JSON `extra-files` entries in `release-please-config.json` update all plugin and marketplace manifests. Tests ensure no manifest is forgotten.

## Output files

Releases containing Docker support also publish `ghcr.io/studio-red-barcelona/podyx-mcp` for amd64/arm64, tagged with the package version and `latest` for stable releases. Docker lint, native runtime tests and vulnerability scans gate the release. Publication runs in the same checked main workflow after verifying the release tag's commit; PRs never publish images. See [Docker operations](docker.md).

Each release contains:

```text
podyx-cursor-X.Y.Z.zip
podyx-claude-X.Y.Z.zip
podyx-openai-X.Y.Z.zip
podyx-mcp-X.Y.Z.tgz
SHA256SUMS
```

Users can pin the GitHub tag or install the tarball through npm/npx without a working checkout. Node.js and their own studio key are still required. Publishing to npm would be an additional pipeline with separate registry credentials; it is not implied by creating a GitHub Release.

## Retry and recovery

If asset upload fails after Release Please has created the release, rerun the workflow jobs while that commit is still the tip of `main`. The uploader finds the release's actual Git tag, checks that it resolves to the checked commit (including annotated tags), verifies checksums and replaces missing/partial assets with `--clobber`. It never attaches files to an older release from an unrelated feature commit. If `main` has moved on, download the successful original artifact and attach it to the matching tag manually.

A superseded main run skips release management and leaves it to the newer commit's checks. Concurrent `main` runs are not cancelled halfway through publication; obsolete PR checks may be cancelled.

Local validation can prove version updates, workflow syntax, artifact packaging and protocol startup. Creating the actual PR, triggering GitHub checks and publishing a real tag/release require the configured GitHub repository with Actions enabled.

## Weekly upstream specification updates

[Update Podyx specifications](../.github/workflows/update-spec.yml) runs every Monday at 08:17 UTC (09:17 Madrid in winter, 10:17 in summer), or manually from Actions. Scheduled starts can be delayed by GitHub.

It downloads the public v1/v2 OpenAPI documents without a studio key, rejects failed/invalid/oversized responses, and ignores formatting or object-key-order changes. Changed snapshots are checked with the current MCP generator and tests before one reusable PR is opened or updated. The PR includes `spec/` and the regenerated tool reference. No change means no new PR. Incompatible upstream schemas or failing tests (including changed tool-count expectations) produce a draft PR and fail the Action for maintainer investigation. Download failures leave snapshots untouched and do not open a PR.

Full Checks (including packaging and Docker scans) are explicitly dispatched on the bot branch because PR events from `GITHUB_TOKEN` do not trigger them. The main-only release gate remains in place. CODEOWNER approval and required checks still apply; the workflow never merges. After merging the spec PR, the normal release process distributes the updated tools. Existing pinned installations require an update to that release.

To reproduce locally: `node scripts/update-spec.mjs`, then `npm run check` and `npm test`.
