import { appendFile } from 'node:fs/promises';
import { version } from '../src/version.mjs';
import { releaseMatchesCommit } from './upload-release-assets.mjs';

// Run in the gated main release job; never infer release publication from a tag
// string alone. Checking its commit also permits safe job retries.
const { GITHUB_REPOSITORY: repository, GITHUB_SHA: sha, GH_TOKEN: token, GITHUB_OUTPUT: output } = process.env;
if (!repository || !sha || !token || !output) throw new Error('GitHub release context is required.');
const publish = await releaseMatchesCommit({ repository, sha, token, tag: `v${version}` });
await appendFile(output, `publish=${publish}\nversion=${version}\nimage=ghcr.io/${repository.toLowerCase()}\n`);
