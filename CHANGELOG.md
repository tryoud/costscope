# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [0.3.0] – 2026-05-01

### Added

#### Clarify command
- `costscope clarify <task>` — when a task is ambiguous, asks 3–10 targeted multiple-choice questions before routing. Each question has three options (one recommended) plus a free-text fallback.
- `run` and `autopilot` auto-trigger clarify when they detect a vague goal and stdin is a terminal. Skipped in `--json` mode or non-interactive environments.
- `detectVagueness()` heuristic in `@costscope/core` — keyword, length, and broad-verb detection, fully deterministic and token-free.
- LLM-backed `generateQuestions()` with injectable caller for testing without network calls.
- `parseClarifyResponse()` — tolerant JSON extraction that handles prose, markdown fences, and auto-repairs missing `recommended` flags.

#### Chat REPL
- `costscope chat` — interactive agent REPL with five built-in tools: `read_file`, `write_file`, `search_replace`, `bash`, `grep`.
- Four agent profiles: `default` (read-only), `plan` (no writes), `accept-edits` (auto-accept file edits), `auto-approve` (fully autonomous).
- `--continue` / `--resume <id>` flags to resume previous sessions.
- `--prompt <text>` for single-shot non-interactive use.
- Slash commands: `/help`, `/exit`, `/skills`, `/prompts`, `/sessions`.
- Session persistence at `~/.costscope/sessions/<id>/transcript.json`.
- Trust-folder guard: warns and exits when running outside a trusted directory.

#### Skills and custom prompts
- `SKILL.md` files with YAML frontmatter (`name`, `description`, `trigger`) loaded as slash commands in `chat`.
- `.costscope/prompts/` directory for custom system prompt overrides per project.

#### MCP server
- `costscope mcp-server` — runs CostScope as a stdio JSON-RPC 2.0 MCP server.
- Five tools exposed: `costscope_classify`, `costscope_scope`, `costscope_route`, `costscope_check_diff`, `costscope_cost`.

#### Handoff system (Claude Code / Codex integration)
- `costscope_handoff(task)` MCP tool — classifies a task and returns `verdict: "run"` (cheap/balanced, no sensitive flags) with a ready worker prompt, or `verdict: "do-it-yourself"` (premium or sensitive flags) with file scope and review hints for Claude Code to handle directly.
- `costscope_verify(root, tier)` MCP tool — validates the current git diff post-worker and returns `pass / needs-review / block`.
- `costscope_handoff_batch(tasks[])` MCP tool — evaluates multiple tasks in parallel. Claude Code can dispatch all `run`-verdict tasks concurrently to cheap workers.
- Two configurable model slots: `handoff.easyModel` (cheap tier) and `handoff.balancedModel` (balanced tier) in `.costscope/config.json`.

#### User-level config and provider helpers
- `~/.costscope/config.json` — user-level config merged over project defaults.
- `resolveProvider()`, `applyPreset()`, and `resolveApiKey()` (`${ENV_VAR}` interpolation) in `@costscope/core`.

### Changed
- `costscope run` and `costscope autopilot` now auto-clarify vague tasks interactively before routing.
- `CostScopeConfig` extended with optional `handoff` section (`easyModel`, `balancedModel`).
- `validateConfig` Zod schema updated to include `handoff` field.
- README fully rewritten to cover all commands including `chat`, `clarify`, `mcp-server`, and the handoff system.
- Roadmap updated: MCP server shipped.

### Security
- Trust-folder check in `chat` prevents running the REPL in untrusted directories without explicit opt-in.
- `auto-approve` profile requires the directory to be explicitly trusted before all tools are unlocked.

## [0.2.0] – 2026-04-29

### Added
- Provider configuration for cheap, balanced, premium, and planner tiers.
- `costscope autopilot` as the default automatic loop for planning, safe mini-task execution, diff checks, and review prompt generation.
- `costscope run` for scoped local worker execution through the first Aider adapter.
- `costscope plan` for deterministic large-goal decomposition into scoped mini-tasks.
- `costscope orchestrate` for dependency-ordered orchestration batches.
- `costscope guard` for CI-friendly diff policy checks with non-zero failure exits.
- `costscope guard --base <ref>` for pull-request diffs against a base ref.
- Execution plan types: tasks, dependencies, parallel groups, and merge-risk metadata.
- Release CI workflow for lint, test, and build.

### Changed
- Documentation now covers local execution, orchestration, and CI guard workflows.
- CLI package now treats `execa` as a runtime dependency.

### Security
- Worker execution blocks dirty working trees by default.
- Aider auto-commits are disabled so diff guards can inspect worker changes.
- Provider API keys are never printed in run output.
- `costscope run` requires `--yes` whenever a route is not auto-run safe.

## [0.1.0] – 2026-04-29

### Added
- `@costscope/core`: project detection, deterministic task classification,
  file-scope planning, routing, prompt generation, diff scope checks, cost estimates.
- `@costscope/cli`: `init`, `scan`, `classify`, `scope`, `route`, `prompt`,
  `review-prompt`, `check-diff`, `cost` commands.
- Human-readable and `--json` output modes for all commands.
- `--output <file>` flag on `prompt` and `review-prompt`.
- `check-diff` "Next:" action hint per verdict (pass / needs-review / block).
- Framework presets: Astro, Next.js, Vite, React, WordPress, Node, generic.
- Apache-2.0 license, NOTICE files, CONTRIBUTING guide, and this CHANGELOG.

[0.3.0]: https://github.com/tryoud/costscope/releases/tag/v0.3.0
[0.2.0]: https://github.com/tryoud/costscope/releases/tag/v0.2.0
[0.1.0]: https://github.com/tryoud/costscope/releases/tag/v0.1.0
