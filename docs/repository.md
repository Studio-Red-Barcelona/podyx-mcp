# Repository governance

Repository: [d3rky/podyx-mcp](https://github.com/d3rky/podyx-mcp). This is a public, unofficial community project. Maintainer and default CODEOWNER: **@d3rky**.

## Protected branches

`main` is the default branch. The active ruleset also covers `master` if it is created. Changes require a PR, one approving review and CODEOWNER approval for owned files. New commits dismiss stale approvals; review threads must be resolved. Required GitHub Actions checks are `Test (Node 22)`, `Test (Node 24)` and `Package smoke tests`, and the branch must be up to date.

No bypass actors are configured, including administrators and bots. Force pushes and branch deletion are blocked. History is linear and PRs merge by squash only. Feature branches are deleted automatically after merging. There is no automatic approval or automatic merge.

The declarative ruleset is recorded in `.github/repository-rules.json`; changing that file does not itself modify GitHub settings. Maintainers must deliberately apply a reviewed change through the GitHub API/settings and verify the active ruleset.

## CODEOWNERS bootstrap

CODEOWNERS is evaluated from the PR's base branch. The first ownership PR introduces `.github/CODEOWNERS`; its required ordinary approval is already enforced, and the named owner rules apply to subsequent PRs after that file is merged. GitHub does not allow an author to approve their own PR. The one-time setup PR is therefore opened by GitHub Actions for @d3rky to review manually.

`Require approval of the most recent reviewable push` is not enabled: commits pushed by the only human maintainer would otherwise prevent that maintainer from approving the bot-authored setup PR. Stale-approval dismissal is enabled.

## Automation and security

- Tests and packaging run on PRs and pushes to `main`.
- Releases require successful checks and a separately reviewed release PR.
- Actions use least-privilege job permissions and the built-in GitHub token; no extra PAT is required.
- Dependabot checks npm dependencies and GitHub Actions weekly. Updates are reviewed, not auto-merged.
- Vulnerability alerts, automated security fixes and private vulnerability reporting are enabled at repository level where GitHub supports them. Report sensitive findings through the repository Security tab, not a public issue.
- No API keys, studio exports or generated client settings belong in the repository. See `AGENTS.md`, `CONTRIBUTING.md` and `docs/design.md`.

Vendor marketplace submission and npm publication remain separate explicit operations. A GitHub Release does not install or publish the project in those external directories.
