# CostScope

Cost and file-scope routing for AI coding agents. · [costscope.dev](https://costscope.dev)

CostScope is not another AI coding agent. It does not replace Cursor, Claude Code, Codex, Aider, or custom shell agents. It sits before them to route work and after them to check the diff.

For day-to-day use, start with:

```sh
costscope autopilot "Add FAQ section to homepage"
```

Autopilot plans the goal, runs only auto-run-safe mini-tasks, checks each diff, and stops automatically when scope, route, worker, or diff safety is not good enough. If the goal sounds vague, it asks clarifying questions first.

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
costscope clarify "Build a funnel"                           # ask 3-10 questions, refine vague task
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

## Command Reference

| Command | Purpose |
|---|---|
| `init` | Create `.costscope/config.json` for the repo |
| `scan` | Detect framework, package manager, important paths, and commands |
| `clarify <task>` | Ask 3–10 multiple-choice questions to refine a vague task |
| `classify <task>` | Classify risk and recommended tier |
| `scope <task>` | Produce allowed/maybe/forbidden file scope |
| `route <task>` | Combine classification, scope, worker, and reviewer recommendation |
| `prompt <task>` | Generate a copy-paste worker prompt |
| `review-prompt <task>` | Generate a diff-only reviewer prompt |
| `check-diff` | Check local git changes against the last scope |
| `guard` | CI-friendly policy gate |
| `run <task>` | Route, execute, and diff-check a scoped task |
| `plan <goal>` | Split larger goals into scoped mini-tasks |
| `orchestrate <goal>` | Build dependency batches for larger goals |
| `autopilot <goal>` | Plan and execute auto-run-safe mini-tasks with deterministic gates |
| `chat` | Interactive agent REPL with permission-controlled tools |
| `mcp-server` | Run CostScope as a stdio MCP server for Claude Code / Codex |
| `cost <task>` | Estimate rough tier cost |

## Clarify

When a task is ambiguous, `clarify` asks targeted multiple-choice questions before routing. Each question has three options (one marked as recommended) and a free-text fallback.

```sh
costscope clarify "Build a funnel"
```

`run` and `autopilot` trigger clarify automatically when they detect a vague goal and stdin is a terminal.

To skip clarification entirely, pass a specific task:

```sh
costscope run "Add a FAQ accordion to src/pages/index.astro"
```

## Chat REPL

`costscope chat` opens an interactive agent loop with configurable tool permissions.

```sh
costscope chat                          # default profile (read-only tools)
costscope chat --profile accept-edits   # read + write tools
costscope chat --profile auto-approve   # all tools without prompts
costscope chat --continue               # resume the most recent session
costscope chat --resume <session-id>    # resume a specific session
costscope chat --prompt "fix the types" # single-shot non-interactive mode
```

Available profiles:

| Profile | Read | Write | Bash | Description |
|---|---|---|---|---|
| `default` | always | ask | ask | Safe exploration |
| `plan` | always | never | never | Read-only planning |
| `accept-edits` | always | always | ask | Auto-accept file edits |
| `auto-approve` | always | always | always | Fully autonomous |

Sessions are stored under `~/.costscope/sessions/` and can be resumed.

Custom skills can be added as `SKILL.md` files. Custom system prompts live in `.costscope/prompts/`.

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
costscope autopilot "Build landing page with hero, pricing and FAQ" --dry-run
costscope autopilot "Build landing page with hero, pricing and FAQ"
costscope plan "Build landing page with hero, pricing and FAQ"
costscope orchestrate "Build landing page with hero, pricing and FAQ"
costscope orchestrate "Build landing page with hero, pricing and FAQ" --execute
```

Autopilot runs only tasks CostScope considers auto-run safe and stops on unsafe routes, worker failures, or non-passing diff checks.

## Claude Code / Codex Integration (MCP)

Run CostScope as an MCP server and connect it to Claude Code or any Codex-compatible client:

```sh
costscope mcp-server
```

This exposes eight tools over stdio JSON-RPC:

| Tool | Purpose |
|---|---|
| `costscope_classify` | Classify risk and tier for a task |
| `costscope_scope` | Plan allowed/maybe/forbidden files |
| `costscope_route` | Full routing decision |
| `costscope_check_diff` | Validate current git diff against scope |
| `costscope_cost` | Estimate cost for a tier |
| `costscope_handoff` | Decide if CostScope runs the task or hands it back |
| `costscope_verify` | Verify a completed diff post-worker |
| `costscope_handoff_batch` | Evaluate multiple tasks in parallel |

### Handoff System

`costscope_handoff` is the core integration point for Claude Code and Codex. It returns one of two verdicts:

- **`run`** — task is cheap or balanced without sensitive flags. CostScope returns a ready worker prompt including the configured model. Claude Code dispatches it to a cheap agent.
- **`do-it-yourself`** — task is premium tier or involves sensitive flags (auth, payments, migrations, secrets). CostScope returns the file scope and review hints. Claude Code handles it directly with a stronger model.

```json
// verdict: run → dispatch to cheap worker
{ "verdict": "run", "tier": "cheap", "prompt": "..." }

// verdict: do-it-yourself → Claude Code handles it
{ "verdict": "do-it-yourself", "tier": "premium", "scope": {...}, "reviewPromptHint": "..." }
```

`costscope_handoff_batch` evaluates multiple tasks in parallel so Claude Code can dispatch all `run`-verdict tasks concurrently to cheap workers while it only supervises.

Configure the two model slots in `.costscope/config.json`:

```json
{
  "handoff": {
    "easyModel": "codestral-latest",
    "balancedModel": "deepseek/deepseek-chat"
  }
}
```

### Claude Code Setup

Add to your `~/.claude/settings.json` or project `.claude/settings.json`:

```json
{
  "mcpServers": {
    "costscope": {
      "command": "costscope",
      "args": ["mcp-server"]
    }
  }
}
```

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

- Hosted team policies and savings reports
- Local LLM executor adapters
- GitHub Action wrapper around `costscope guard`
- Parallel worker pools with conflict isolation

## License

Apache-2.0 — see [LICENSE](LICENSE).
