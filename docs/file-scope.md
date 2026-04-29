# File Scope

File scope planning returns allowed, maybe, and forbidden files. Unknown tasks should keep allowed files empty.

`viberouter scope` writes `.viberouter/last-scope.json`, which `viberouter check-diff` can use after a worker agent edits files.
