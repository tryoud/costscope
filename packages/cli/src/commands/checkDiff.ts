// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkDiffScope, getChangedFiles, type FileScope, type Tier } from "@viberouter/core";

export async function checkDiffCommand(options: { root: string; scopeFile?: string; tier?: Tier }) {
  const scopePath = options.scopeFile ? path.resolve(options.scopeFile) : path.join(options.root, ".viberouter", "last-scope.json");
  const raw = await readFile(scopePath, "utf8");
  const parsed = JSON.parse(raw) as { fileScope?: FileScope } | FileScope;
  const fileScope = "fileScope" in parsed && parsed.fileScope ? parsed.fileScope : parsed;
  const changedFiles = await getChangedFiles(options.root);
  return checkDiffScope(changedFiles, fileScope, options.tier ?? "cheap");
}
