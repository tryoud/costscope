# @costscope/cli

CLI for [CostScope](https://costscope.dev) — cost and file-scope routing for AI coding agents.

## Install

```sh
npm install -g @costscope/cli
```

Requires Node.js ≥ 20.

## Quick Start

```sh
costscope init                                          # detect project, write .costscope/config.json
costscope autopilot "Add FAQ section to homepage"       # plan + run safe mini-tasks automatically
```

If the goal sounds vague, `autopilot` and `run` ask clarifying questions before routing.

## Commands

```sh
costscope init                                          # setup wizard
costscope scan                                          # detect project type and commands
costscope clarify "Build a funnel"                      # ask 3-10 questions to refine a vague task
costscope classify "Add FAQ section to homepage"        # risk + tier
costscope scope "Add FAQ section to homepage"           # allowed/maybe/forbidden file scope
costscope route "Add FAQ section to homepage"           # scope + worker + reviewer recommendation
costscope prompt "Add FAQ section to homepage"          # generate worker prompt (stdout)
costscope review-prompt "Add FAQ section" --diff        # generate review prompt with git diff
costscope run "Add FAQ section to homepage" --dry-run   # plan a local worker run
costscope run "Add FAQ section to homepage"             # route, run, and diff-check
costscope plan "Build landing page with hero and FAQ"   # split goal into mini-tasks
costscope orchestrate "Build landing page with FAQ"     # plan dependency batches
costscope autopilot "Build landing page with FAQ"       # plan + run all auto-safe tasks
costscope check-diff                                    # validate agent changes vs scope
costscope guard --strict                                # CI-friendly diff gate (exits non-zero)
costscope chat                                          # interactive agent REPL
costscope mcp-server                                    # run as stdio MCP server
costscope cost "Add FAQ section to homepage"            # estimate task cost
```

Pass `--json` to any command for machine-readable output.
Pass `--output <file>` to `prompt` or `review-prompt` to write to a file.

## Chat REPL

```sh
costscope chat                          # default profile
costscope chat --profile accept-edits   # auto-accept file edits
costscope chat --profile auto-approve   # fully autonomous
costscope chat --continue               # resume most recent session
costscope chat --resume <id>            # resume a specific session
costscope chat --prompt "fix the types" # single-shot non-interactive mode
```

## MCP Server (Claude Code / Codex)

```sh
costscope mcp-server
```

Exposes eight tools: `costscope_classify`, `costscope_scope`, `costscope_route`, `costscope_check_diff`, `costscope_cost`, `costscope_handoff`, `costscope_verify`, `costscope_handoff_batch`.

Add to `~/.claude/settings.json`:

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

The `costscope_handoff` tool returns `verdict: "run"` (cheap/balanced task — ready worker prompt included) or `verdict: "do-it-yourself"` (premium or sensitive — Claude Code handles it). `costscope_handoff_batch` evaluates a list of tasks in parallel.

## Local Execution

`run` supports the Aider executor. Install Aider separately:

```sh
pip install aider-chat
export MISTRAL_API_KEY=...
```

## For full documentation

See [github.com/tryoud/costscope](https://github.com/tryoud/costscope).

## License

Apache-2.0
