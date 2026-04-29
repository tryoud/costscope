// SPDX-License-Identifier: Apache-2.0

import { detectProject, loadConfig, planExecution } from "@costscope/core";
import { runCommand } from "./run.js";

export interface OrchestrateOptions {
  root: string;
  config?: string;
  execute?: boolean;
  yes?: boolean;
  model?: string;
  noCheck?: boolean;
}

export async function orchestrateCommand(goal: string, options: OrchestrateOptions) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const plan = planExecution(goal, project, config);
  const batches = executionBatches(plan.tasks);

  if (!options.execute) {
    return {
      mode: "orchestrate-dry-run",
      plan,
      batches,
      reason: ["Use --execute to run batches sequentially. Parallel execution is planned but intentionally not enabled yet."]
    };
  }

  const results = [];
  for (const batch of batches) {
    for (const taskId of batch.taskIds) {
      const task = plan.tasks.find((candidate) => candidate.id === taskId);
      if (!task) continue;
      const result = await runCommand(task.task, {
        root: options.root,
        config: options.config,
        model: options.model,
        yes: options.yes,
        noCheck: options.noCheck,
        allowDirty: results.length > 0
      });
      results.push({ taskId, result });
      if ("diffResult" in result && result.diffResult && result.diffResult.verdict === "block") {
        return {
          mode: "orchestrate",
          plan,
          batches,
          results,
          stopped: true,
          reason: [`Stopped after ${taskId} because diff scope check blocked the changes.`]
        };
      }
    }
  }

  return {
    mode: "orchestrate",
    plan,
    batches,
    results,
    stopped: false,
    reason: ["All scheduled tasks completed."]
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

