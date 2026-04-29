# CostScope

Cost and file-scope routing for AI coding agents. · [costscope.dev](https://costscope.dev)

CostScope is not another AI coding agent. It does not replace Cursor, Claude Code, Codex, Aider, or custom shell agents. It sits before them to route work and after them to check the diff.

## Install

```sh
npm install -g @costscope/cli
```

Requires Node.js ≥ 20.

## Problem

AI coding agents can spend premium-model tokens on simple work and often edit a wider file set than the task actually requires.

## Solution

CostScope classifies a coding task, proposes the smallest safe file scope, assigns a cheap/balanced/premium tier, prepares guardrails for the worker, and checks the resulting diff.

## What It Is Not

- Not another coding agent.
- Not a Cursor replacement.
- Not a Claude Code replacement.
- Not a cloud service.
- Not a dashboard.

## Why Not X?

**Why not just use a bigger model for everything?**
Premium models cost 10–50× more per token. A CSS change does not need o3. CostScope routes work to the cheapest model that can do it safely.

**Why not Cursor/Windsurf rules?**
IDE rules don't survive copy-paste into a shell agent or CI pipeline. CostScope is CLI-first and CI-ready.

**Why not a custom shell script?**
Writing per-project scripts that classify tasks, plan file scope, generate prompts, and check diffs is exactly what CostScope automates—with tests.

**Why not an LLM to classify the task?**
Classification should be deterministic, auditable, and free. CostScope uses keyword matching so you can trust and override it without spending tokens.

## Workflow

```sh
costscope init                                               # detect project, write .costscope/config.json
costscope scope "Add FAQ section to homepage"                # classify + plan scope
costscope prompt "Add FAQ section to homepage"               # generate worker prompt
# → paste prompt into your coding agent
costscope check-diff                                         # validate what the agent changed
costscope review-prompt "Add FAQ section to homepage" --diff # generate review prompt
```

Pass `--json` to any command for machine-readable output.
Pass `--output <file>` to `prompt` or `review-prompt` to write to a file.

## Example Output

```sh
costscope scope "Add FAQ section to homepage" --root examples/astro-basic --json
```

```json
{
  "classification": { "taskType": "ui-section", "risk": "low", "tier": "cheap" },
  "fileScope": {
    "allowedFiles": [
      "src/components/sections/FAQ.astro",
      "src/content/site.json",
      "src/pages/index.astro"
    ],
    "maybeFiles": ["src/styles/global.css"]
  },
  "route": {
    "tier": "cheap",
    "recommendedWorker": "mistral-vibe",
    "recommendedReviewer": "gpt-5.5-diff-only"
  }
}
```

## Supported Frameworks

Astro · Next.js · Vite · React · WordPress · Node · generic

## Development

```sh
git clone https://github.com/tryoud/costscope.git
cd costscope
pnpm install
pnpm build
pnpm test
# run from source:
node packages/cli/dist/cli.js scope "Add FAQ section to homepage"
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Roadmap

- MCP server adapter
- GitHub Action
- Pi package integration

## License

Apache-2.0 — see [LICENSE](LICENSE).
