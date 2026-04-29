# File Scope

File scope planning returns allowed, maybe, and forbidden files. Unknown tasks should keep allowed files empty.

`costscope scope` writes `.costscope/last-scope.json`, which `costscope check-diff` can use after a worker agent edits files.

Diff outcomes:

- `pass`: every changed file is inside `allowedFiles`.
- `needs-review`: a changed file is in `maybeFiles` or outside the known scope.
- `block`: a forbidden file, secret-like file, package file, lockfile, or config file is touched in cheap mode.

`check-diff` must run inside a Git repository. If no scope file exists, run `costscope scope "<task>"` first or pass `--scope-file`.
