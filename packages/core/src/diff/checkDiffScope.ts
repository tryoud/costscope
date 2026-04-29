// SPDX-License-Identifier: Apache-2.0

import type { DiffScopeResult, FileScope, Tier } from "../types.js";

const cheapBlockedFiles = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
const cheapBlockedPatterns = [/^astro\.config\./, /^next\.config\./, /^vite\.config\./];
const highRiskPatterns = [/\.env(\.|$)/, /\.pem$/, /\.key$/, /(^|\/)id_rsa$/, /(^|\/)id_ed25519$/, /^wp-config\.php$/];

export function checkDiffScope(changedFiles: string[], fileScope: FileScope, tier: Tier = "cheap"): DiffScopeResult {
  const forbiddenTouched = changedFiles.filter((file) => matchesAny(file, fileScope.forbiddenFiles));
  const outOfScopeFiles = changedFiles.filter(
    (file) => !matchesAny(file, fileScope.allowedFiles) && !matchesAny(file, fileScope.maybeFiles)
  );
  const maybeTouched = changedFiles.filter((file) => matchesAny(file, fileScope.maybeFiles) && !matchesAny(file, fileScope.allowedFiles));
  const cheapBlockedTouched =
    tier === "cheap"
      ? changedFiles.filter((file) => cheapBlockedFiles.includes(file) || cheapBlockedPatterns.some((pattern) => pattern.test(file)))
      : [];
  const highRiskTouched = changedFiles.filter((file) => highRiskPatterns.some((pattern) => pattern.test(file)));

  const reason: string[] = [];
  if (forbiddenTouched.length > 0) reason.push(`Forbidden files touched: ${forbiddenTouched.join(", ")}`);
  if (cheapBlockedTouched.length > 0) reason.push(`Cheap mode blocked package/config files: ${cheapBlockedTouched.join(", ")}`);
  if (highRiskTouched.length > 0) reason.push(`High-risk files touched: ${highRiskTouched.join(", ")}`);
  if (outOfScopeFiles.length > 0) reason.push(`Files outside allowed/maybe scope: ${outOfScopeFiles.join(", ")}`);
  if (maybeTouched.length > 0) reason.push(`Maybe-scope files require review: ${maybeTouched.join(", ")}`);

  const verdict =
    forbiddenTouched.length > 0 || cheapBlockedTouched.length > 0 || highRiskTouched.length > 0
      ? "block"
      : outOfScopeFiles.length > 0 || maybeTouched.length > 0
        ? "needs-review"
        : "pass";

  return {
    ok: verdict === "pass",
    changedFiles: [...changedFiles].sort(),
    allowedFiles: fileScope.allowedFiles,
    outOfScopeFiles: outOfScopeFiles.sort(),
    forbiddenTouched: [...new Set([...forbiddenTouched, ...cheapBlockedTouched, ...highRiskTouched])].sort(),
    verdict,
    reason: reason.length > 0 ? reason : ["Changed files stayed inside allowed scope."]
  };
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(file, pattern));
}

function matchesPattern(file: string, pattern: string): boolean {
  if (pattern === file) return true;
  if (pattern.endsWith("/**")) return file.startsWith(pattern.slice(0, -3));
  if (pattern.includes("**/*.")) {
    const suffix = pattern.slice(pattern.indexOf("**/*.") + 4);
    return file.endsWith(suffix);
  }
  if (pattern.endsWith(".*")) return file === pattern.slice(0, -2) || file.startsWith(pattern.slice(0, -1));
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp(`^${escaped}$`).test(file);
  }
  return false;
}
