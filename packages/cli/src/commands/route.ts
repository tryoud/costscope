// SPDX-License-Identifier: Apache-2.0

import { classifyTask, detectProject, loadConfig, planFileScope, routeTask } from "@viberouter/core";

export async function routeCommand(task: string, options: { root: string; config?: string }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const fileScope = planFileScope(task, project, config);
  const route = routeTask(classification, fileScope, config);
  return { classification, fileScope, route };
}
