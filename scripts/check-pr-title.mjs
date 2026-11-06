import { readFileSync } from 'node:fs';

export function validTitle(title) {
  return /^(feat|fix|perf|refactor|docs|test|build|ci|chore|revert)(\([a-zA-Z0-9_./ -]+\))?!?: \S[^\r\n]*$/.test(title);
}

if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (!validTitle(event.pull_request.title)) {
    console.error('PR title must follow Conventional Commits, e.g. feat: add package reports or fix: handle expired keys. Squash-merge using that title.');
    process.exitCode = 1;
  }
}
