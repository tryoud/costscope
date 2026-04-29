# VibeRouter

Open-source cost and file-scope router for AI coding agents.

VibeRouter is not another AI coding agent. It sits before and after tools like Cursor, Claude Code, Codex, Aider, Mistral Vibe, Pi, or custom shell agents.

## Problem

AI coding agents can spend premium-model tokens on simple work and often edit a wider file set than the task actually requires.

## Solution

VibeRouter classifies a coding task, proposes the smallest safe file scope, assigns a cheap/balanced/premium tier, prepares guardrails for the worker, and checks the resulting diff.

This MVP includes the local TypeScript monorepo foundation, project detection, deterministic task classification, file-scope planning, routing, prompt generation, diff scope checks, and rough cost estimates.

## What It Is Not

- Not another coding agent.
- Not a Cursor replacement.
- Not a Claude Code replacement.
- Not a cloud service.
- Not a dashboard.

## Quickstart

```sh
pnpm install
pnpm build
pnpm test
pnpm --filter @viberouter/cli exec viberouter init
pnpm --filter @viberouter/cli exec viberouter scan
pnpm --filter @viberouter/cli exec viberouter classify "Add FAQ section to homepage"
pnpm --filter @viberouter/cli exec viberouter scope "Add FAQ section to homepage"
pnpm --filter @viberouter/cli exec viberouter route "Add FAQ section to homepage"
pnpm --filter @viberouter/cli exec viberouter prompt "Add FAQ section to homepage"
pnpm --filter @viberouter/cli exec viberouter check-diff
```

## Example Output

```json
{
  "risk": "low",
  "tier": "cheap",
  "taskType": "ui-section"
}
```

## Supported Project Presets

- Astro
- Next.js
- Vite/React
- WordPress
- Node/generic

## Supported Worker Concepts

- Mistral Vibe
- Aider
- Codex
- Claude Code
- Generic shell agents

## MVP Workflow

1. Run `viberouter scope "<task>"` to classify the task and persist `.viberouter/last-scope.json`.
2. Run `viberouter prompt "<task>"` and give the generated prompt to your worker agent.
3. After the worker changes files, run `viberouter check-diff`.
4. Run `viberouter review-prompt "<task>" --diff` for a diff-only review prompt.

## Roadmap

- Pi package
- MCP server
- GitHub Action
- Dashboard later

## License

Apache-2.0
