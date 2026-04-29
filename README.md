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
- Not a managed LLM credit reseller.
- Not a cloud dashboard in the local CLI release.

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
costscope scan                                               # inspect project type and commands
costscope classify "Add FAQ section to homepage"             # risk + tier only
costscope route "Add FAQ section to homepage"                # scope + worker route
costscope scope "Add FAQ section to homepage"                # classify + plan scope
costscope prompt "Add FAQ section to homepage"               # generate worker prompt
# → paste prompt into your coding agent
costscope check-diff                                         # validate what the agent changed
costscope review-prompt "Add FAQ section to homepage" --diff # generate review prompt
```

Pass `--json` to any command for machine-readable output.
Pass `--output <file>` to `prompt` or `review-prompt` to write to a file.

## Free CLI Surface

The free local CLI is the adoption layer. These commands do not require a CostScope cloud account:

| Command | Purpose |
|---|---|
| `init` | Create `.costscope/config.json` for the repo |
| `scan` | Detect framework, package manager, important paths, and commands |
| `classify` | Classify risk and recommended tier |
| `scope` | Produce allowed/maybe/forbidden file scope |
| `route` | Combine classification, scope, worker, and reviewer recommendation |
| `prompt` | Generate a copy-paste worker prompt |
| `review-prompt` | Generate a diff-only reviewer prompt |
| `check-diff` | Check local git changes against the last scope |
| `guard` | CI-friendly policy gate |
| `run --dry-run` | Show the full local execution plan without running a worker |
| `plan` | Split larger goals into scoped mini-tasks |
| `orchestrate` | Build dependency batches for larger goals |
| `cost` | Estimate rough tier cost |

## Local Execution

`costscope run` closes the loop for small tasks. It routes the task, generates the worker prompt, runs the configured executor, and checks the resulting diff.

```sh
costscope run "Add FAQ section to homepage" --dry-run
costscope run "Add FAQ section to homepage"
```

The default cheap worker is configured for Aider with `mistral/codestral-latest`. Install Aider separately if you want execution:

```sh
pip install aider-chat
export MISTRAL_API_KEY=...
```

Execution is intentionally conservative:

- dirty working trees are blocked unless `--allow-dirty` is passed
- Aider auto-commits are disabled so CostScope can inspect the diff
- manual-review routes require `--yes`
- `--no-check` skips the post-run guard only when you explicitly ask for it

## Orchestration

For larger goals, CostScope can split work into mini-tasks with dependencies and parallel batches.

```sh
costscope plan "Build landing page with hero, pricing and FAQ"
costscope orchestrate "Build landing page with hero, pricing and FAQ"
costscope orchestrate "Build landing page with hero, pricing and FAQ" --execute
```

The current local orchestrator plans parallel batches but executes conservatively in dependency order. This avoids merge conflicts while preserving the data model needed for future worker pools and local LLM executors.

## CI Guard

Use `guard` as a CI-friendly policy gate. It exits non-zero when the diff violates scope. With `--strict`, `needs-review` also fails.

```sh
costscope guard --scope-file .costscope/last-scope.json --tier cheap
costscope guard --base origin/main --strict --json
costscope guard --strict --json
```

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
- Hosted team policies and savings reports
- Local LLM executor adapters
- GitHub Action wrapper around `costscope guard`
- Parallel worker pools with conflict isolation

## License

Apache-2.0 — see [LICENSE](LICENSE).
