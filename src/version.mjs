import { readFileSync } from 'node:fs';

// Package metadata is the runtime source of truth, including bundled plugins.
export const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
