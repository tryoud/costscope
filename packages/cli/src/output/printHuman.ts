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

  if (isRecord(value) && value.mode === "run") {
    printRunResult(value);
    return;
  }

  if (isRecord(value) && value.mode === "dry-run") {
    printRunPlan(value);
    return;
  }

  if (isRecord(value) && "goal" in value && "tasks" in value && "parallelGroups" in value) {
    printExecutionPlan(value);
    return;
  }

  if (isRecord(value) && typeof value.mode === "string" && value.mode.startsWith("orchestrate")) {
    printOrchestration(value);
    return;
  }

  if (isRecord(value) && typeof value.mode === "string" && value.mode.startsWith("autopilot")) {
    printAutopilot(value);
    return;
  }

  if (isRecord(value) && value.mode === "guard") {
    printGuard(value);
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

function printAutopilot(value: Record<string, unknown>): void {
  printList("Reasons", asStrings(value.reason));
  if (typeof value.maxTasks === "number") console.log(`${colors.cyan("Max tasks")}: ${value.maxTasks}`);
  if (isRecord(value.plan)) {
    console.log("");
    console.log(colors.bold("Plan"));
    printExecutionPlan(value.plan);
  }
  console.log("");
  console.log(colors.bold("Execution Batches"));
  const batches = Array.isArray(value.batches) ? value.batches : [];
  for (const batch of batches) {
    if (!isRecord(batch)) continue;
    console.log(`- ${String(batch.id)}: ${asStrings(batch.taskIds).join(", ") || "(none)"}`);
    console.log(`  ${colors.cyan("parallel")}: ${String(batch.canRunInParallel)}`);
  }
  if (Array.isArray(value.results)) {
    console.log("");
    console.log(colors.bold("Results"));
    for (const item of value.results) {
      if (!isRecord(item)) continue;
      const result = isRecord(item.result) ? item.result : {};
      const diff = isRecord(result.diffResult) ? result.diffResult : undefined;
      const execution = isRecord(result.execution) ? result.execution : undefined;
      const status = diff ? String(diff.verdict) : execution ? `exit ${String(execution.exitCode)}` : "completed";
      console.log(`- ${String(item.taskId)}: ${status}`);
    }
  }
  if (isRecord(value.reviewPrompt) && typeof value.reviewPrompt.prompt === "string") {
    console.log("");
    console.log(colors.bold("Review Prompt"));
    console.log(value.reviewPrompt.prompt);
  }
}

function printGuard(value: Record<string, unknown>): void {
  const passed = value.passed === true;
  console.log(`${colors.cyan("Passed")}: ${passed ? colors.green("true") : colors.red("false")}`);
  console.log(`${colors.cyan("Strict")}: ${String(value.strict)}`);
  printList("Reasons", asStrings(value.reason));
  if (isRecord(value.diffResult)) {
    console.log("");
    console.log(colors.bold("Diff Result"));
    printDiffResult(value.diffResult);
  }
}

function printOrchestration(value: Record<string, unknown>): void {
  printList("Reasons", asStrings(value.reason));
  if (isRecord(value.plan)) {
    console.log("");
    console.log(colors.bold("Plan"));
    printExecutionPlan(value.plan);
  }
  console.log("");
  console.log(colors.bold("Execution Batches"));
  const batches = Array.isArray(value.batches) ? value.batches : [];
  for (const batch of batches) {
    if (!isRecord(batch)) continue;
    console.log(`- ${String(batch.id)}: ${asStrings(batch.taskIds).join(", ") || "(none)"}`);
    console.log(`  ${colors.cyan("parallel")}: ${String(batch.canRunInParallel)}`);
  }
  if (Array.isArray(value.results)) {
    console.log("");
    console.log(colors.bold("Results"));
    for (const item of value.results) {
      if (!isRecord(item)) continue;
      const result = isRecord(item.result) ? item.result : {};
      const diff = isRecord(result.diffResult) ? result.diffResult : undefined;
      console.log(`- ${String(item.taskId)}: ${diff ? String(diff.verdict) : "completed"}`);
    }
  }
}

function printExecutionPlan(value: Record<string, unknown>): void {
  console.log(`${colors.cyan("Goal")}: ${String(value.goal)}`);
  printList("Reasons", asStrings(value.reason));
  console.log("");
  console.log(colors.bold("Mini Tasks"));
  const tasks = Array.isArray(value.tasks) ? value.tasks : [];
  for (const task of tasks) {
    if (!isRecord(task)) continue;
    const tier = isRecord(task.route) ? String(task.route.tier) : "unknown";
    const workerHint = tier === "cheap" ? colors.green("vibe") : tier === "premium" ? colors.yellow("claude-code") : "aider";
    console.log(`- ${String(task.id)}: ${String(task.task)}`);
    console.log(`  ${colors.cyan("tier")}: ${tier} → ${workerHint}`);
    console.log(`  ${colors.cyan("merge risk")}: ${String(task.mergeRisk)}`);
    console.log(`  ${colors.cyan("parallel group")}: ${String(task.parallelGroup)}`);
    console.log(`  ${colors.cyan("depends on")}: ${asStrings(task.dependsOn).join(", ") || "(none)"}`);
  }
  console.log("");
  console.log(colors.bold("Parallel Groups"));
  const groups = Array.isArray(value.parallelGroups) ? value.parallelGroups : [];
  for (const group of groups) {
    if (!isRecord(group)) continue;
    console.log(`- ${String(group.id)}: ${asStrings(group.taskIds).join(", ") || "(none)"}`);
    console.log(`  ${colors.cyan("parallel")}: ${String(group.canRunInParallel)}`);
  }
}

function printRunPlan(value: Record<string, unknown>): void {
  console.log(colors.bold("Plan"));
  printClassification(value.classification);
  printRoute(value.route);
  printProvider(value.provider);
  printScope(value.fileScope);
  if (isRecord(value.workerPrompt) && typeof value.workerPrompt.prompt === "string") {
    console.log("");
    console.log(colors.bold("Worker Prompt"));
    console.log(value.workerPrompt.prompt);
  }
}

function printRunResult(value: Record<string, unknown>): void {
  printRunPlan(value);
  if (isRecord(value.execution)) {
    console.log("");
    console.log(colors.bold("Execution"));
    console.log(`${colors.cyan("Exit code")}: ${String(value.execution.exitCode)}`);
    if (typeof value.execution.output === "string" && value.execution.output.length > 0) {
      console.log(value.execution.output);
    }
  }
  if (isRecord(value.diffResult)) {
    console.log("");
    console.log(colors.bold("Diff Check"));
    printDiffResult(value.diffResult);
  }
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

function printProvider(value: unknown): void {
  if (!isRecord(value)) return;
  console.log("");
  console.log(colors.bold("Provider"));
  const executor = String(value.executor);
  const executorLabel = executor === "vibe" ? colors.green(executor) : executor === "claude-code" ? colors.yellow(executor) : colors.cyan(executor);
  console.log(`${colors.cyan("Executor")}: ${executorLabel}`);
  console.log(`${colors.cyan("Model")}: ${String(value.model)}`);
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
  console.log("");
  if (verdict === "block") {
    console.log(`${colors.bold("Next:")} Revert forbidden/out-of-scope files, then re-run ${colors.cyan("costscope check-diff")}.`);
  } else if (verdict === "needs-review") {
    console.log(`${colors.bold("Next:")} Run ${colors.cyan('costscope review-prompt "<task>" --diff')} and send to your reviewer.`);
  } else {
    console.log(`${colors.bold("Next:")} Run ${colors.cyan('costscope review-prompt "<task>" --diff')} for a final review, then merge.`);
  }
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
