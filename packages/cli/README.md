# @costscope/cli

CLI for [CostScope](https://costscope.dev) — cost and file-scope routing for AI coding agents.

## Install

```sh
npm install -g @costscope/cli
```

Requires Node.js ≥ 20.

## Usage

```sh
costscope init                                          # detect project, write .costscope/config.json
costscope scope "Add FAQ section to homepage"           # classify + plan file scope
costscope plan "Build landing page with hero and FAQ"   # split larger goals into mini-tasks
costscope prompt "Add FAQ section to homepage"          # generate worker prompt (stdout)
costscope run "Add FAQ section to homepage" --dry-run   # plan a local worker run
costscope orchestrate "Build landing page with FAQ"     # plan dependency batches
costscope check-diff                                    # validate agent changes vs scope
costscope guard --strict                                # CI-friendly diff gate
costscope review-prompt "Add FAQ section" --diff        # generate review prompt with diff
```

Pass `--json` to any command for machine-readable output.
Pass `--output <file>` to `prompt` or `review-prompt` to write to a file.

`run` currently supports the Aider executor. Install Aider separately with `pip install aider-chat` and configure provider keys in `.costscope/config.json` or the environment.

For full documentation see [github.com/tryoud/costscope](https://github.com/tryoud/costscope).

## License

Apache-2.0
