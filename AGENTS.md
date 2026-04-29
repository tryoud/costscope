# AGENTS.md

## Project
VibeRouter is an open-source cost and file-scope router for AI coding agents.

## Philosophy
- Do not build another coding agent.
- Build routing, file scope, prompt generation, and diff guard logic.
- Keep the core platform-independent.
- All integrations must be thin adapters over @viberouter/core.

## Commands
- Install: pnpm install
- Build: pnpm build
- Test: pnpm test
- Lint: pnpm lint if available

## Code Style
- TypeScript
- ESM
- Strict types
- Zod validation at boundaries
- No cloud dependencies in core
- No telemetry by default

## Architecture
- packages/core contains all product logic.
- packages/cli contains only CLI adapter logic.
- Future packages like pi, mcp, github-action must depend on core.

## Safety
- Never read or print .env files.
- Never include secrets in prompts.
- Never recommend changing forbidden files in cheap mode.
- Conservative routing is preferred over risky automation.

## Licensing
- Apache-2.0
- Add SPDX headers to source files.
