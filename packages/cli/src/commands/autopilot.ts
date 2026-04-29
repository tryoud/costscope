// SPDX-License-Identifier: Apache-2.0

import { detectProject, getChangedFiles, isGitRepository, loadConfig, planExecution } from "@costscope/core";
import { CostScopeCliError } from "../errors.js";
import { reviewPromptCommand } from "./reviewPrompt.js";
import { runCommand, type RunCommandResult } from "./run.js";

export interface AutopilotOptions {
  root: string;
  config?: string;
  model?: string;
  dryRun?: boolean;
  maxTasks?: number;
  noCheck?: boolean;
  noReviewPrompt?: boolean;
}

export async function autopilotCommand(goal: string, options: AutopilotOptions) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const plan = planExecution(goal, project, config);
  const batches = executionBatches(plan.tasks);
  const maxTasks = options.maxTasks ?? 10;

  if (options.dryRun) {
    return {
      mode: "autopilot-dry-run",
      plan,
      batches,
      maxTasks,
      reason: ["Autopilot would run auto-run-safe tasks and stop automatically on unsafe routes or failed diff checks."]
    };
  }

  if (!(await isGitRepository(options.root))) {
    throw new CostScopeCliError(`Not a git repository: ${options.root}. Run costscope autopilot from a git repo root.`);
  }

  const beforeFiles = await getChangedFiles(options.root);
  if (beforeFiles.length > 0) {
    throw new CostScopeCliError(`Working tree is not clean: ${beforeFiles.join(", ")}. Commit/stash changes before autopilot.`);
  }

  const results: Array<{ taskId: string; result: RunCommandResult }> = [];
  for (const batch of batches) {
    for (const taskId of batch.taskIds) {
      if (results.length >= maxTasks) {
        return finish(goal, options, plan, batches, results, true, [`Stopped after reaching --max-tasks ${maxTasks}.`]);
      }

      const task = plan.tasks.find((candidate) => candidate.id === taskId);
      if (!task) continue;
      if (!task.route.autoRunAllowed) {
        return finish(goal, options, plan, batches, results, true, [`Stopped before ${taskId} because the route is not auto-run safe.`]);
      }

      const result = await runCommand(task.task, {
        root: options.root,
        config: options.config,
        model: options.model,
        noCheck: options.noCheck,
        allowDirty: results.length > 0
      });
      results.push({ taskId, result });

      if ("execution" in result && result.execution && result.execution.exitCode !== 0) {
        return finish(goal, options, plan, batches, results, true, [`Stopped after ${taskId} because the worker exited with code ${result.execution.exitCode}.`]);
      }

      if ("diffResult" in result && result.diffResult && result.diffResult.verdict !== "pass") {
        return finish(goal, options, plan, batches, results, true, [`Stopped after ${taskId} because diff check returned ${result.diffResult.verdict}.`]);
      }
    }
  }

  return finish(goal, options, plan, batches, results, false, ["Autopilot completed all auto-run-safe tasks."]);
}

async function finish(
  goal: string,
  options: AutopilotOptions,
  plan: ReturnType<typeof planExecution>,
  batches: Array<{ id: string; taskIds: string[]; canRunInParallel: boolean }>,
  results: Array<{ taskId: string; result: RunCommandResult }>,
  stopped: boolean,
  reason: string[]
) {
  const reviewPrompt = options.noReviewPrompt ? undefined : await reviewPromptCommand(goal, { root: options.root, config: options.config, diff: true });
  return {
    mode: "autopilot",
    plan,
    batches,
    results,
    stopped,
    reviewPrompt,
    reason
  };
}

function executionBatches(tasks: Array<{ id: string; dependsOn: string[] }>) {
  const remaining = new Map(tasks.map((task) => [task.id, task]));
  const completed = new Set<string>();
  const batches: Array<{ id: string; taskIds: string[]; canRunInParallel: boolean }> = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((task) => task.dependsOn.every((dependency) => completed.has(dependency)));
    if (ready.length === 0) {
      batches.push({ id: `blocked-${batches.length + 1}`, taskIds: [...remaining.keys()], canRunInParallel: false });
      break;
    }

    const taskIds = ready.map((task) => task.id);
    batches.push({ id: `batch-${batches.length + 1}`, taskIds, canRunInParallel: taskIds.length > 1 });
    for (const taskId of taskIds) {
      remaining.delete(taskId);
      completed.add(taskId);
    }
  }

  return batches;
}
