// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkDiffScope, getChangedFiles, isGitRepository, type FileScope, type Tier } from "@costscope/core";
import { CostScopeCliError } from "../errors.js";

export async function checkDiffCommand(options: { root: string; scopeFile?: string; tier?: Tier }) {
  const scopePath = options.scopeFile ? path.resolve(options.scopeFile) : path.join(options.root, ".costscope", "last-scope.json");
  if (!(await isGitRepository(options.root))) {
    throw new CostScopeCliError(`Not a git repository: ${options.root}. Run check-diff from a git repo root.`);
  }

  let raw: string;
  try {
    raw = await readFile(scopePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CostScopeCliError(`No file scope found at ${scopePath}. Run costscope scope "<task>" first or pass --scope-file.`);
    }
    throw error;
  }

  let parsed: { fileScope?: FileScope } | FileScope;
  try {
    parsed = JSON.parse(raw) as { fileScope?: FileScope } | FileScope;
  } catch {
    throw new CostScopeCliError(`Invalid JSON in scope file: ${scopePath}`);
  }

  const fileScope = readFileScope(parsed, scopePath);
  const changedFiles = await getChangedFiles(options.root);
  return checkDiffScope(changedFiles, fileScope, options.tier ?? "cheap");
}

function readFileScope(parsed: { fileScope?: FileScope } | FileScope, scopePath: string): FileScope {
  const candidate = "fileScope" in parsed && parsed.fileScope ? parsed.fileScope : parsed;
  if (
    !("allowedFiles" in candidate) ||
    !("maybeFiles" in candidate) ||
    !("forbiddenFiles" in candidate) ||
    !Array.isArray(candidate.allowedFiles) ||
    !Array.isArray(candidate.maybeFiles) ||
    !Array.isArray(candidate.forbiddenFiles)
  ) {
    throw new CostScopeCliError(`Invalid file scope shape in ${scopePath}.`);
  }
  return candidate;
}
