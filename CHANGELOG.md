# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [0.2.0] – 2026-04-29

### Added
- Provider configuration for cheap, balanced, premium, and planner tiers.
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

[0.2.0]: https://github.com/tryoud/costscope/releases/tag/v0.2.0
[0.1.0]: https://github.com/tryoud/costscope/releases/tag/v0.1.0
