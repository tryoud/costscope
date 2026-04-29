// SPDX-License-Identifier: Apache-2.0

import { classifyTask, detectProject, estimateCost, loadConfig, planFileScope, routeTask } from "@viberouter/core";

export async function costCommand(task: string, options: { root: string; config?: string }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const fileScope = planFileScope(task, project, config);
  const route = routeTask(classification, fileScope, config);
  return { classification, route, cost: estimateCost(route.tier) };
}
