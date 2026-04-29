# Free CLI

The free CLI is CostScope's adoption layer. It should be useful before any hosted service, billing system, or team dashboard exists.

## Goals

- Keep repository code local by default.
- Make routing and file scope visible before an agent edits files.
- Provide machine-readable JSON for CI and future integrations.
- Avoid token spend for deterministic classification, scoping, routing, and diff checks.

## Commands

```sh
costscope init
costscope scan
costscope classify "Add FAQ section"
costscope scope "Add FAQ section"
costscope route "Add FAQ section"
costscope prompt "Add FAQ section"
costscope run "Add FAQ section" --dry-run
costscope plan "Build landing page with hero, pricing and FAQ"
costscope orchestrate "Build landing page with hero, pricing and FAQ"
costscope check-diff
costscope guard --strict
costscope review-prompt "Add FAQ section" --diff
costscope cost "Add FAQ section"
```

## Safe Defaults

- `run` blocks dirty working trees unless `--allow-dirty` is passed.
- `run` requires `--yes` when the route is not auto-run safe.
- `run --dry-run` never invokes a worker.
- `guard` exits non-zero on blocked diffs.
- `guard --strict` also fails on `needs-review`.
- `guard --base <ref>` checks committed PR diffs.

## What Belongs In Paid Layers Later

- Hosted team policies.
- Savings dashboards.
- Audit history.
- PR comments.
- Managed usage limits.
- SSO and organization controls.

