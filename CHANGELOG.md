# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) ·
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

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

[0.1.0]: https://github.com/tryoud/costscope/releases/tag/v0.1.0
