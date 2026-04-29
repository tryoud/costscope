# CostScope

Cost and file-scope routing for AI coding agents. · [costscope.dev](https://costscope.dev)

CostScope is not another AI coding agent. It does not replace Cursor, Claude Code, Codex, Aider, Mistral Vibe, Pi, or custom shell agents. It sits before them to route work and after them to check the diff.

## Problem

AI coding agents can spend premium-model tokens on simple work and often edit a wider file set than the task actually requires.

## Solution

CostScope classifies a coding task, proposes the smallest safe file scope, assigns a cheap/balanced/premium tier, prepares guardrails for the worker, and checks the resulting diff.

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
node packages/cli/dist/cli.js init
node packages/cli/dist/cli.js scope "Add FAQ section to homepage"
node packages/cli/dist/cli.js prompt "Add FAQ section to homepage"
# run your coding agent with the generated prompt
node packages/cli/dist/cli.js check-diff
node packages/cli/dist/cli.js review-prompt "Add FAQ section to homepage" --diff
```

## Example Output

For the Astro fixture:

```sh
node packages/cli/dist/cli.js scope "Add FAQ section to homepage" --root examples/astro-basic --json
```

```json
{
  "classification": {
    "taskType": "ui-section",
    "risk": "low",
    "tier": "cheap"
  },
  "fileScope": {
    "allowedFiles": [
      "src/components/sections/FAQ.astro",
      "src/content/site.json",
      "src/pages/index.astro"
    ],
    "maybeFiles": [
      "src/styles/global.css"
    ]
  },
  "route": {
    "tier": "cheap",
    "recommendedWorker": "mistral-vibe",
    "recommendedReviewer": "gpt-5.5-diff-only"
  }
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

1. Run `costscope scope "<task>"` to classify the task, choose a route, and persist `.costscope/last-scope.json`.
2. Run `costscope prompt "<task>"` and give the generated prompt to your worker agent.
3. After the worker changes files, run `costscope check-diff`.
4. Run `costscope review-prompt "<task>" --diff` for a diff-only review prompt.

## Roadmap

- Pi package
- MCP server
- GitHub Action
- Dashboard later

## License

Apache-2.0
