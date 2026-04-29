// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { execa } from "execa";
import { checkDiffScope, getChangedFiles, loadConfig, type FileScope, type Tier } from "@costscope/core";
import { checkDiffCommand } from "./checkDiff.js";
import { CostScopeCliError } from "../errors.js";

export async function guardCommand(options: { root: string; scopeFile?: string; tier?: Tier; strict?: boolean; base?: string }) {
  const diffResult = await shouldUseScopeFile(options)
    ? await guardWithScopeFile(options)
    : await guardWithoutScopeFile(options);
  const shouldFail = diffResult.verdict === "block" || (options.strict === true && diffResult.verdict === "needs-review");

  return {
    mode: "guard",
    passed: !shouldFail,
    strict: Boolean(options.strict),
    diffResult,
    reason: shouldFail
      ? ["Guard failed because the diff is blocked or requires strict review."]
      : ["Guard passed for the configured policy."]
  };
}

async function guardWithScopeFile(options: { root: string; scopeFile?: string; tier?: Tier; base?: string }) {
  if (!options.base) return checkDiffCommand(options);
  const fileScope = await readScopeFile(options);
  const changedFiles = await getChangedFilesFromBase(options.root, options.base);
  return checkDiffScope(changedFiles, fileScope, options.tier ?? "cheap");
}

async function shouldUseScopeFile(options: { root: string; scopeFile?: string }): Promise<boolean> {
  const scopePath = options.scopeFile ? path.resolve(options.scopeFile) : path.join(options.root, ".costscope", "last-scope.json");
  try {
    await access(scopePath);
    return true;
  } catch {
    return false;
  }
}

async function guardWithoutScopeFile(options: { root: string; tier?: Tier; base?: string }) {
  const config = await loadConfig(options.root);
  const changedFiles = options.base ? await getChangedFilesFromBase(options.root, options.base) : await getChangedFiles(options.root);
  const fileScope: FileScope = {
    allowedFiles: ["**"],
    maybeFiles: [],
    forbiddenFiles: config.guardrails.forbiddenFiles,
    reason: ["No last scope file was found; guarding global forbidden files and tier-level blocked files."]
  };
  return checkDiffScope(changedFiles, fileScope, options.tier ?? "cheap");
}

async function getChangedFilesFromBase(root: string, baseRef: string): Promise<string[]> {
  const result = await execa("git", ["diff", "--name-only", `${baseRef}...HEAD`], { cwd: root, reject: false });
  if (result.exitCode !== 0) return [];
  return [...new Set(result.stdout.split("\n").map((line) => line.trim()).filter(Boolean))].sort();
}

async function readScopeFile(options: { root: string; scopeFile?: string }): Promise<FileScope> {
  const scopePath = options.scopeFile ? path.resolve(options.scopeFile) : path.join(options.root, ".costscope", "last-scope.json");
  let parsed: { fileScope?: FileScope } | FileScope;
  try {
    parsed = JSON.parse(await readFile(scopePath, "utf8")) as { fileScope?: FileScope } | FileScope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CostScopeCliError(`No file scope found at ${scopePath}.`);
    }
    throw error;
  }

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
