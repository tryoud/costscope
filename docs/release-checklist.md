# Release Checklist

Use this checklist before publishing `@costscope/core` and `@costscope/cli`.

## Required Checks

```sh
pnpm install --frozen-lockfile
pnpm -r lint
pnpm -r test
pnpm build
pnpm --filter @costscope/core pack --pack-destination /tmp
pnpm --filter @costscope/cli pack --pack-destination /tmp
```

## Manual Smoke Tests

```sh
node packages/cli/dist/cli.js --root examples/astro-basic scope "Add FAQ section"
node packages/cli/dist/cli.js --root examples/astro-basic run "Add FAQ section" --dry-run
node packages/cli/dist/cli.js --root examples/astro-basic plan "Build landing page with hero, pricing and FAQ"
node packages/cli/dist/cli.js --root examples/astro-basic orchestrate "Build landing page with hero, pricing and FAQ"
```

## Publish

Publish from a clean working tree after the checks above pass.

```sh
pnpm --filter @costscope/core publish --access public
pnpm --filter @costscope/cli publish --access public
```

## Release Notes

- Summarize user-facing CLI changes.
- Note that Aider is an optional external runtime for `costscope run`.
- Note that `costscope orchestrate --execute` currently runs tasks in dependency order, not true parallel worker pools.
- Note that hosted dashboards, MCP, and dedicated GitHub Action wrappers are roadmap items.

