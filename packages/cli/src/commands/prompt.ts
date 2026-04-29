// SPDX-License-Identifier: Apache-2.0

import { classifyTask, detectProject, generateWorkerPrompt, loadConfig, planFileScope, routeTask } from "@costscope/core";

export async function promptCommand(task: string, options: { root: string; config?: string; agent?: string }) {
  const [project, config] = await Promise.all([detectProject(options.root), loadConfig(options.root, options.config)]);
  const classification = classifyTask(task, project);
  const fileScope = planFileScope(task, project, config);
  const route = routeTask(classification, fileScope, config);
  const finalRoute = options.agent ? { ...route, recommendedWorker: options.agent } : route;
  return generateWorkerPrompt(task, classification, fileScope, finalRoute, project);
}
