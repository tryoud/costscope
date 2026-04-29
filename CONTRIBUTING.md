# Contributing to CostScope

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)

## Local setup

```sh
git clone https://github.com/tryoud/costscope.git
cd costscope
pnpm install
pnpm build
pnpm test
```

## Project layout

```
packages/
  core/   – @costscope/core: all logic, no I/O (classify, scope, diff, cost, prompts)
  cli/    – @costscope/cli: Commander commands, human/JSON output
examples/ – fixture projects used for manual smoke tests
docs/     – design documents and roadmap notes
```

## Development loop

Run tests in watch mode while editing:

```sh
cd packages/core
pnpm exec vitest
```

Add a test before changing behaviour. Every `planFileScope` branch and every `checkDiffScope` verdict path should have at least one test.

## Conventions

- All source files start with `// SPDX-License-Identifier: Apache-2.0`.
- TypeScript strict mode; no `any` without a justifying comment.
- Keep `@costscope/core` free of CLI concerns — no `process.exit`, no `console.log`.
- No side-effects at module load time.

## Commit style

Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`.
Keep the subject line under 72 characters.

## Pull requests

1. Fork and create a branch from `main`.
2. Run `pnpm clean && pnpm install && pnpm build && pnpm test` — all must pass.
3. Open a PR against `main`.

## Reporting bugs

Open an issue at https://github.com/tryoud/costscope/issues.
Include your Node version, OS, the exact command, and the full error output.

## License

By contributing you agree your work is released under Apache-2.0.
