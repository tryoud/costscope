# GitHub Action Usage

CostScope does not need a dedicated hosted service to work in CI. Use the CLI as a pull-request guard.

```yaml
name: CostScope Guard

on:
  pull_request:

permissions:
  contents: read

jobs:
  costscope:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm dlx @costscope/cli guard --base origin/${{ github.base_ref }} --strict --json
```

For most teams, generate and commit `.costscope/config.json` with:

```sh
costscope init
```

If you want the guard to compare against a known scope, pass:

```sh
costscope guard --base origin/main --scope-file .costscope/last-scope.json --tier cheap --strict
```

`guard` exits non-zero when the diff is blocked. With `--strict`, `needs-review` also exits non-zero.
