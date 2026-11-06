export async function dispatchReleaseChecks({ repository, token, pullRequests, fetchImpl = fetch }) {
  const requests = JSON.parse(pullRequests || '[]');
  if (!Array.isArray(requests)) throw new Error('Invalid release PR output.');
  for (const pr of requests) {
    if (!Number.isSafeInteger(pr.number) || pr.number < 1) throw new Error('Invalid release PR number.');
    const api = async (path, options = {}) => {
      const response = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, {
        ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(30000), redirect: 'error',
      });
      if (!response.ok) throw new Error(`GitHub release-check dispatch returned HTTP ${response.status}`);
      return response.status === 204 ? null : response.json();
    };
    const current = await api(`pulls/${pr.number}`);
    if (current.state !== 'open' || current.base.ref !== 'main' || current.head.repo.full_name !== repository ||
      !current.head.ref.startsWith('release-please--')) throw new Error('Refusing to dispatch a non-release PR.');
    // workflow_dispatch is explicitly allowed to trigger a run with GITHUB_TOKEN.
    // The workflow checks out the branch SHA selected at dispatch time. Its release
    // job is push/main-only, so this cannot recursively create another release PR.
    await api('actions/workflows/test.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: current.head.ref }) });
    console.log(`Dispatched checks for release PR #${pr.number}.`);
  }
}

if (process.argv[1]?.endsWith('/dispatch-release-checks.mjs')) {
  await dispatchReleaseChecks({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN, pullRequests: process.env.RELEASE_PRS });
}
