import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { version } from '../src/version.mjs';

// GitHub-side only. Release Please owns release notes and tags.
export async function releaseMatchesCommit({ repository, tag, sha, token, fetchImpl = fetch }) {
  const get = async (path) => {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub release lookup returned HTTP ${response.status}`);
    return response.json();
  };
  if (!await get(`releases/tags/${encodeURIComponent(tag)}`)) return false;
  const ref = await get(`git/ref/tags/${encodeURIComponent(tag)}`);
  if (!ref) throw new Error('Release exists without its tag.');
  let object = ref.object;
  for (let depth = 0; object.type === 'tag' && depth < 5; depth++) {
    const annotated = await get(`git/tags/${object.sha}`);
    if (!annotated) throw new Error('Cannot resolve annotated release tag.');
    object = annotated.object;
  }
  return object.type === 'commit' && object.sha === sha;
}

export async function uploadReleaseAssets() {
  const tag = `v${version}`;
  const { GITHUB_REPOSITORY: repository, GITHUB_SHA: sha, GH_TOKEN: token } = process.env;
  if (!repository || !sha || !token) throw new Error('GitHub repository, commit and token are required.');
  if (!await releaseMatchesCommit({ repository, tag, sha, token })) {
    console.log(`No ${tag} release at this commit; only the release PR may have been updated.`);
    return;
  }
  execFileSync('shasum', ['-a', '256', '-c', 'SHA256SUMS'], { cwd: 'dist', stdio: 'inherit' });
  const assets = (await readdir('dist')).filter((name) => /\.(zip|tgz)$/.test(name) || name === 'SHA256SUMS').map((name) => `dist/${name}`);
  execFileSync('gh', ['release', 'upload', tag, ...assets, '--clobber', '--repo', repository], { stdio: 'inherit' });
}

if (process.argv[1]?.endsWith('/upload-release-assets.mjs')) await uploadReleaseAssets();
