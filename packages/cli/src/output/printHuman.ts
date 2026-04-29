// SPDX-License-Identifier: Apache-2.0

import { colors } from "./colors.js";

export function printHuman(title: string, value: unknown): void {
  console.log(colors.bold(title));
  if (isRecord(value) && typeof value.prompt === "string" && Object.keys(value).length === 1) {
    console.log(value.prompt);
    return;
  }

  if (isRecord(value) && typeof value.agent === "string" && typeof value.prompt === "string") {
    console.log(`${colors.cyan("Agent")}: ${value.agent}`);
    console.log("");
    console.log(value.prompt);
    return;
  }

  if (isRecord(value) && "classification" in value && "fileScope" in value) {
    printClassification(value.classification);
    printRoute(value.route);
    printScope(value.fileScope);
    return;
  }

  if (isRecord(value) && "ok" in value && "verdict" in value) {
    printDiffResult(value);
    return;
  }

  if (isRecord(value) && "projectType" in value) {
    printProject(value);
    return;
  }

  if (isRecord(value) && "risk" in value && "tier" in value) {
    printClassification(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function printProject(value: Record<string, unknown>): void {
  console.log(`${colors.cyan("Type")}: ${String(value.projectType)}`);
  console.log(`${colors.cyan("Package manager")}: ${String(value.packageManager)}`);
  printOptional("Build", value.buildCommand);
  printOptional("Lint", value.lintCommand);
  printOptional("Test", value.testCommand);
  printList("Important paths", asStrings(value.importantPaths));
}

function printClassification(value: unknown): void {
  if (!isRecord(value)) return;
  console.log(`${colors.cyan("Task type")}: ${String(value.taskType)}`);
  console.log(`${colors.cyan("Risk")}: ${String(value.risk)}`);
  console.log(`${colors.cyan("Tier")}: ${String(value.tier)}`);
  if (typeof value.confidence === "number") console.log(`${colors.cyan("Confidence")}: ${value.confidence.toFixed(2)}`);
  printList("Reasons", asStrings(value.reason));
}

function printRoute(value: unknown): void {
  if (!isRecord(value)) return;
  console.log("");
  console.log(colors.bold("Route"));
  console.log(`${colors.cyan("Tier")}: ${String(value.tier)}`);
  console.log(`${colors.cyan("Worker")}: ${String(value.recommendedWorker)}`);
  console.log(`${colors.cyan("Reviewer")}: ${String(value.recommendedReviewer)}`);
  console.log(`${colors.cyan("Auto-run")}: ${String(value.autoRunAllowed)}`);
  console.log(`${colors.cyan("Manual review")}: ${String(value.manualReviewRequired)}`);
}

function printScope(value: unknown): void {
  if (!isRecord(value)) return;
  console.log("");
  console.log(colors.bold("File Scope"));
  printList("Allowed", asStrings(value.allowedFiles));
  printList("Maybe", asStrings(value.maybeFiles));
  printList("Forbidden", asStrings(value.forbiddenFiles));
  printList("Reasons", asStrings(value.reason));
}

function printDiffResult(value: Record<string, unknown>): void {
  const verdict = String(value.verdict);
  const label = verdict === "pass" ? colors.green(verdict) : verdict === "block" ? colors.red(verdict) : colors.yellow(verdict);
  console.log(`${colors.cyan("Verdict")}: ${label}`);
  console.log(`${colors.cyan("OK")}: ${String(value.ok)}`);
  printList("Changed files", asStrings(value.changedFiles), "(none)");
  printList("Out of scope", asStrings(value.outOfScopeFiles), "(none)");
  printList("Forbidden touched", asStrings(value.forbiddenTouched), "(none)");
  printList("Reasons", asStrings(value.reason));
}

function printOptional(label: string, value: unknown): void {
  if (typeof value === "string" && value.length > 0) console.log(`${colors.cyan(label)}: ${value}`);
}

function printList(label: string, values: string[], empty = "(none)"): void {
  console.log(`${colors.cyan(label)}:`);
  if (values.length === 0) {
    console.log(`  ${empty}`);
    return;
  }
  for (const value of values) console.log(`  - ${value}`);
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
